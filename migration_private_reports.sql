-- Add IP address column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_ip text;

-- Drop existing policies
DROP POLICY IF EXISTS "Public reports are viewable by everyone" ON reports;
DROP POLICY IF EXISTS "Anyone can upload a report" ON reports;
DROP POLICY IF EXISTS "Anyone can update reports" ON reports;

-- New policy: NO ONE can view reports (only through service role/admin)
-- This effectively hides all reports from the public
CREATE POLICY "Reports are private"
ON reports FOR SELECT
TO anon
USING (false);

-- Allow anyone to INSERT reports (but they won't see them after)
CREATE POLICY "Anyone can submit reports"
ON reports FOR INSERT
TO anon
WITH CHECK (true);

-- Only allow updates through service role (for admin dashboard)
-- We'll handle admin updates through a different mechanism
CREATE POLICY "No public updates"
ON reports FOR UPDATE
TO anon
USING (false);
