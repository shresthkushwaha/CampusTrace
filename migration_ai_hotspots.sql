-- Create the transportation hotspots table
CREATE TABLE IF NOT EXISTS transportation_hotspots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme_title TEXT NOT NULL,
    summary TEXT NOT NULL,
    severity INTEGER CHECK (severity >= 1 AND severity <= 5),
    boundary_data JSONB NOT NULL, -- { "center": [lng, lat], "radius": meters }
    last_analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the junction table between hotspots and reports
CREATE TABLE IF NOT EXISTS hotspot_reports (
    hotspot_id UUID REFERENCES transportation_hotspots(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    PRIMARY KEY (hotspot_id, report_id)
);

-- Enable Row Level Security
ALTER TABLE transportation_hotspots ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotspot_reports ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read hotspots
CREATE POLICY "Allow public read of hotspots"
ON transportation_hotspots FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to read hotspot-report links
CREATE POLICY "Allow public read of hotspot links"
ON hotspot_reports FOR SELECT
TO authenticated
USING (true);

-- Allow service role (or admin) to manage hotspots
-- Note: In a production app, you'd use a more restrictive policy or edge functions.
-- For this prototype, we'll allow all authenticated users to perform updates
-- but we only show the 'Refresh' button to admins in the UI.
CREATE POLICY "Allow admin management of hotspots"
ON transportation_hotspots FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow admin management of hotspot links"
ON hotspot_reports FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
