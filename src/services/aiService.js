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
            
            if (reportsError) throw reportsError;
            if (!reports || reports.length === 0) return { success: false, message: 'No reports to analyze.' };

            // 2. Fetch existing hotspots for context
            const { data: existingHotspots } = await supabase
                .from('transportation_hotspots')
                .select('id, theme_title');

            // 3. Prepare the Prompt
            // We ask for a strict JSON format to parse it easily.
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            
            const prompt = `
                You are a campus transportation analyst. 
                Task: Group the following campus reports into thematic "Transportation Problems" hotspots.
                
                Existing Themes: ${existingHotspots?.map(h => h.theme_title).join(', ') || 'None yet'}
                
                Reports to Analyze:
                ${reports.map(r => `ID: ${r.id}, Category: ${r.category}, Description: ${r.description}`).join('\n')}
                
                Guidelines:
                1. Use existing themes if possible to maintain stability.
                2. Only create a NEW theme if the reports don't fit existing ones.
                3. Connect every report to a theme.
                4. For each theme, provide:
                   - title: A concise name (max 5 words).
                   - summary: A 1-sentence consolidated summary of the issues.
                   - severity: A number from 1 (low) to 5 (critical).
                   - reportIds: An array of IDs belonging to this theme.
                   
                Output MUST be valid JSON only, in this format:
                {
                  "hotspots": [
                    { "title": "Theme Title", "summary": "...", "severity": 3, "reportIds": ["id1", "id2"] }
                  ]
                }
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            // Extract JSON from response (handling potential markdown formatting)
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("Failed to parse AI response as JSON");
            const { hotspots } = JSON.parse(jsonMatch[0]);

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
            // For simplicity in this version, we clear and re-insert (but using the same titles for stability)
            // A more advanced version would diff them.
            
            // Delete old links and hotspots
            await supabase.from('hotspot_reports').delete().neq('hotspot_id', '00000000-0000-0000-0000-000000000000');
            await supabase.from('transportation_hotspots').delete().neq('id', '00000000-0000-0000-0000-000000000000');

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

                if (hError) console.error("Error inserting hotspot:", hError);

                if (newHotspot) {
                    const links = h.reportIds.map(rid => ({
                        hotspot_id: newHotspot.id,
                        report_id: rid
                    }));
                    await supabase.from('hotspot_reports').insert(links);
                }
            }

            return { success: true, count: processedHotspots.length };
        } catch (error) {
            console.error("AI Refresh Error:", error);
            return { success: false, error: error.message };
        }
    }
};
