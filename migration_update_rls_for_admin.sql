-- Update RLS policies to allow admins to view all reports
-- First, drop existing policies
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON reports;
DROP POLICY IF EXISTS "Users can update own reports" ON reports;

-- Create new policies
-- Allow all authenticated users to insert their own reports
CREATE POLICY "Users can insert own reports"
ON reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow all authenticated users to view all reports
-- (This allows admins to see everything)
CREATE POLICY "Authenticated users can view all reports"
ON reports FOR SELECT
TO authenticated
USING (true);

-- Allow users to update only their own reports
CREATE POLICY "Users can update own reports"
ON reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);
