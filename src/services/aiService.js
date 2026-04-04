import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "../supabaseClient";

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GOOGLE_API_KEY);

/**
 * AI Service for analyzing campus reports and identifying transportation hotspots.
 */
export const aiService = {
    /**
     * Triggers the AI analysis to group reports into thematic hotspots.
     */
    async refreshHotspots() {
        try {
            // 1. Fetch current reports
            const { data: reports, error: reportsError } = await supabase
                .from('reports')
                .select('id, category, description, lat, lng');
            
            console.log(`Step 1: Fetched ${reports?.length || 0} reports.`);
            if (reportsError) throw reportsError;
            if (!reports || reports.length === 0) {
                console.warn("No reports found to analyze.");
                return { success: false, message: 'No reports to analyze. Submit some pins first!' };
            }

            // 2. Fetch existing hotspots for context
            const { data: existingHotspots } = await supabase
                .from('transportation_hotspots')
                .select('id, theme_title');

            // 3. Prepare the Prompt
            // Using the ultra-capable and fast Gemini 3.1 Flash Lite model
            const modelName = "gemini-3.1-flash-lite-preview";
            console.log(`Step 2: Connecting to AI (${modelName})...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const prompt = `
                You are a "Mobility Design" Analyst specialized in campus accessibility. 
                Task: Extract and identify EVERY unique "Mobility Issue" from the following campus reports.
                
                CRITICAL GOAL: MAXIMUM GRANULARITY. 
                Do not group different problems into broad categories. If three reports point to three different broken sidewalk sections, create three distinct issues. 
                Find as many unique mobility issues as possible.
                
                CRITICAL RULE: Focus ONLY on "Problems". DO NOT provide solutions.
                
                Existing Mobility Themes: ${existingHotspots?.map(h => h.theme_title).join(', ') || 'None yet'}
                
                Reports to Analyze:
                ${reports.map(r => `ID: ${r.id}, Category: ${r.category}, Description: ${r.description}`).join('\n')}
                
                Guidelines:
                1. Split issues by location and specific type of friction. 
                2. If two reports are nearly identical, they can be grouped, but if there is any unique nuance, split them.
                3. The title must reflect a "Problem" (e.g., "Sharp Curb at Entrance B" instead of "Campus Curbs").
                4. For each issue, provide:
                   - title: Highly specific problem name.
                   - summary: Detailed problem statement from the report.
                   - severity: 1-5.
                   - reportIds: IDs for this specific issue.
                    
                Output MUST be valid JSON only:
                {
                  "hotspots": [
                    { "title": "Specific Mobility Issue", "summary": "...", "severity": 4, "reportIds": ["id1"] }
                  ]
                }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            console.log("Step 3: AI Response received. Processing Mobility Issues...");
            
            // Extract JSON from response (handling markdown code blocks more strictly)
            const jsonBody = responseText.includes('```json') 
                ? responseText.split('```json')[1].split('```')[0]
                : responseText.match(/\{[\s\S]*\}/)?.[0];

            if (!jsonBody) {
                console.error("Raw AI Response:", responseText);
                throw new Error("Could not extract JSON from AI response.");
            }

            const { hotspots } = JSON.parse(jsonBody);
            console.log(`Step 4: Parsed ${hotspots?.length || 0} thematic hotspots.`);

            // 4. Process and Calculate Boundaries
            const processedHotspots = hotspots.map(hotspot => {
                const associatedReports = reports.filter(r => hotspot.reportIds.includes(r.id));
                
                if (associatedReports.length === 0) return null;

                // Simple Centroid Calculation
                const avgLat = associatedReports.reduce((sum, r) => sum + r.lat, 0) / associatedReports.length;
                const avgLng = associatedReports.reduce((sum, r) => sum + r.lng, 0) / associatedReports.length;

                // Simple Max-Radius Calculation (in approximate meters)
                // 1 degree lat is ~111,000 meters. This is a rough estimation for circles.
                const maxDistDegrees = associatedReports.reduce((max, r) => {
                    const dist = Math.sqrt(Math.pow(r.lat - avgLat, 2) + Math.pow(r.lng - avgLng, 2));
                    return Math.max(max, dist);
                }, 0);
                
                const radiusMeters = Math.max(50, maxDistDegrees * 111000); // Min 50m radius

                return {
                    ...hotspot,
                    boundary_data: {
                        center: [avgLng, avgLat],
                        radius: radiusMeters
                    }
                };
            }).filter(Boolean);

            // 5. Update Supabase
            console.log("Step 5: Cleaning up old hotspots and updating database...");
            
            // DELETE OLD DATA
            const { error: delLinksError } = await supabase.from('hotspot_reports').delete().neq('hotspot_id', '00000000-0000-0000-0000-000000000000');
            const { error: delHotspotsError } = await supabase.from('transportation_hotspots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
            
            if (delLinksError || delHotspotsError) {
                console.error("Cleanup Error:", delLinksError || delHotspotsError);
            }

            let insertedCount = 0;
            for (const h of processedHotspots) {
                const { data: newHotspot, error: hError } = await supabase
                    .from('transportation_hotspots')
                    .insert({
                        theme_title: h.title,
                        summary: h.summary,
                        severity: h.severity,
                        boundary_data: h.boundary_data,
                        last_analyzed_at: new Date().toISOString()
                    })
                    .select()
                    .single();

                if (hError) {
                    console.error(`Error inserting hotspot "${h.title}":`, hError);
                    continue;
                }

                if (newHotspot) {
                    insertedCount++;
                    const links = h.reportIds.map(rid => ({
                        hotspot_id: newHotspot.id,
                        report_id: rid
                    }));
                    const { error: linkError } = await supabase.from('hotspot_reports').insert(links);
                    if (linkError) console.error("Error linking reports:", linkError);
                }
            }

            console.log(`Success! Inserted ${insertedCount} hotspots.`);
            return { success: true, count: insertedCount };
        } catch (error) {
            console.error("AI Refresh Error:", error);
            return { success: false, error: error.message };
        }
    }
};
