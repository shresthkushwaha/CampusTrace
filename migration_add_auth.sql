-- Add user_id column to link reports to authenticated users
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

-- Drop existing policies
DROP POLICY IF EXISTS "Reports are private" ON reports;
DROP POLICY IF EXISTS "Anyone can submit reports" ON reports;
DROP POLICY IF EXISTS "No public updates" ON reports;

-- New policies for authenticated users

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own reports
CREATE POLICY "Users can insert own reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
ON reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Note: Admin access will be handled separately through service role
-- The admin dashboard will need to use the service role key to bypass RLS
