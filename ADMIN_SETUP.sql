-- Admin Setup for Voice Matrix
-- Run this in Supabase SQL Editor AFTER running FINAL_SCHEMA.sql

-- Add admin role to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS admin_privileges JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free';

-- Update existing users to have 'user' role (if any exist)
UPDATE profiles SET role = 'user' WHERE role IS NULL;

-- Create admin policies (admins can access everything)
CREATE POLICY "Admin full access profiles" ON profiles FOR ALL TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admin full access businesses" ON businesses FOR ALL TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "Admin full access assistants" ON assistants FOR ALL TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'  
);

CREATE POLICY "Admin full access call_logs" ON call_logs FOR ALL TO authenticated 
USING (
  (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
);

-- Function to make a user admin (run this with your email)
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
  user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO user_id FROM profiles WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RETURN 'User not found: ' || user_email;
  END IF;
  
  -- Update user to admin with special privileges
  UPDATE profiles 
  SET 
    role = 'admin',
    tier = 'admin_unlimited',
    admin_privileges = '{
      "unlimited_assistants": true,
      "unlimited_calls": true,
      "system_access": true,
      "user_management": true,
      "billing_management": true
    }'::jsonb
  WHERE id = user_id;
  
  RETURN 'Successfully made ' || user_email || ' an admin with unlimited tier!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant admin access to specific email (REPLACE WITH YOUR EMAIL)
-- SELECT make_user_admin('your-admin-email@example.com');

SELECT 'Admin setup complete! Run make_user_admin(''your-email@example.com'') to grant admin access.' as result;