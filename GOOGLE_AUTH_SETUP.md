# Google Authentication Setup Guide

## Step 1: Enable Google OAuth in Supabase

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/uxrirnfulghhrjgbnosq
2. Navigate to **Authentication** → **Providers** in the left sidebar
3. Find **Google** in the list and click to expand it
4. Toggle **Enable Sign in with Google** to ON
5. You'll see fields for **Client ID** and **Client Secret** - keep this page open

## Step 2: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
5. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: **CampusTrace**
   - User support email: Your email
   - Developer contact: Your email
   - Click **Save and Continue** through the remaining steps
6. Back in Credentials, click **+ CREATE CREDENTIALS** → **OAuth client ID**
7. Application type: **Web application**
8. Name: **CampusTrace**
9. **Authorized JavaScript origins**: Add `http://localhost:5173`
10. **Authorized redirect URIs**: Add your Supabase callback URL:
    - Format: `https://uxrirnfulghhrjgbnosq.supabase.co/auth/v1/callback`
11. Click **CREATE**
12. Copy the **Client ID** and **Client Secret**

## Step 3: Configure Supabase with Google Credentials

1. Go back to your Supabase **Authentication** → **Providers** → **Google**
2. Paste the **Client ID** from Google Cloud Console
3. Paste the **Client Secret** from Google Cloud Console
4. Click **Save**

## Step 4: Run Database Migration

In your Supabase SQL Editor, run this migration:

\`\`\`sql
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
\`\`\`

## Step 5: Test the Authentication

1. Refresh your app at `http://localhost:5173`
2. You should be redirected to the login page
3. Click "Continue with Google"
4. Sign in with your Google account
5. You'll be redirected back to the map
6. Try submitting a report - it should now be linked to your account!

## Troubleshooting

**"Redirect URI mismatch" error:**
- Make sure the redirect URI in Google Cloud Console exactly matches: `https://uxrirnfulghhrjgbnosq.supabase.co/auth/v1/callback`

**"Invalid client" error:**
- Double-check that you copied the Client ID and Secret correctly
- Make sure you saved the configuration in Supabase

**Can't submit reports:**
- Make sure you ran the database migration
- Check browser console for errors
