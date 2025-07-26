-- MIGRATION: Remove businesses dependency and add user_id to assistants
-- Run this in Supabase SQL Editor

-- Step 1: Add user_id column to assistants table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assistants' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE assistants ADD COLUMN user_id UUID;
        -- Add the foreign key constraint after populating the column
    END IF;
END $$;

-- Step 2: Populate user_id from businesses table if it exists and assistants has business_id
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'businesses') AND 
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'assistants' AND column_name = 'business_id') THEN
        
        UPDATE assistants 
        SET user_id = businesses.user_id 
        FROM businesses 
        WHERE assistants.business_id = businesses.id 
        AND assistants.user_id IS NULL;
        
    END IF;
END $$;

-- Step 3: For any remaining assistants without user_id, you'll need to manually assign them
-- Uncomment and modify this line with your email:
-- UPDATE assistants SET user_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com') WHERE user_id IS NULL;

-- Step 4: Add foreign key constraint to user_id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'assistants_user_id_fkey'
    ) THEN
        ALTER TABLE assistants 
        ADD CONSTRAINT assistants_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Make user_id NOT NULL after ensuring all rows have values
-- ALTER TABLE assistants ALTER COLUMN user_id SET NOT NULL;

-- Step 6: Update RLS policies for assistants to use user_id instead of business relationship
DROP POLICY IF EXISTS "Users can view own assistants" ON assistants;
DROP POLICY IF EXISTS "Users can create own assistants" ON assistants;
DROP POLICY IF EXISTS "Users can update own assistants" ON assistants;
DROP POLICY IF EXISTS "Users can delete own assistants" ON assistants;

CREATE POLICY "Users can view own assistants" ON assistants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assistants" ON assistants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assistants" ON assistants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assistants" ON assistants
  FOR DELETE USING (auth.uid() = user_id);

-- Step 7: Create index for performance
CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);

-- Step 8: Optional - Drop business_id column and businesses table after confirming everything works
-- DROP INDEX IF EXISTS idx_assistants_business_id;
-- ALTER TABLE assistants DROP COLUMN IF EXISTS business_id;
-- DROP TABLE IF EXISTS businesses CASCADE;

COMMIT;