-- Add user_email column to reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Update existing reports with user emails (this will be NULL for existing reports)
-- New reports will have this populated automatically from the frontend
