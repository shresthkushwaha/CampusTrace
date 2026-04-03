-- 1. Drop old policy
DROP POLICY IF EXISTS "Users can view own reports" ON reports;

-- 2. Create new policy for global visibility
-- Allow any authenticated user to see all reports
CREATE POLICY "Users can view all reports"
ON reports FOR SELECT
TO authenticated
USING (true);

-- 3. Add DELETE policy for owners
-- Allow authenticated users to delete only their own reports
CREATE POLICY "Users can delete own reports"
ON reports FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Note: No changes needed for INSERT and UPDATE (already owner-only)
