-- COMPLETE DATABASE SETUP FOR NEW SUPABASE PROJECT
-- Run this entire script in Supabase SQL Editor

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Step 2: Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise', 'unlimited')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create assistants table
CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  phone_number TEXT,
  vapi_assistant_id TEXT,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'configuring')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Create call_logs table
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  phone_number TEXT,
  duration INTEGER, -- in seconds
  status TEXT CHECK (status IN ('completed', 'failed', 'busy', 'no-answer')),
  vapi_call_id TEXT,
  transcript TEXT,
  summary TEXT,
  lead_captured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 5: Create knowledge_base table for RAG
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embeddings
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Auto-create profile function
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = NEW.email;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail user creation if profile creation fails
    RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create trigger for auto profile creation
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Step 8: Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Step 9: Create RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Step 10: Create RLS Policies for assistants
CREATE POLICY "Users can manage own assistants" ON assistants
  FOR ALL USING (auth.uid() = user_id);

-- Admins can manage all assistants
CREATE POLICY "Admins can manage all assistants" ON assistants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Step 11: Create RLS Policies for call_logs
CREATE POLICY "Users can view own call logs" ON call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assistants 
      WHERE assistants.id = call_logs.assistant_id 
      AND assistants.user_id = auth.uid()
    )
  );

-- Admins can view all call logs
CREATE POLICY "Admins can view all call logs" ON call_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Step 12: Create RLS Policies for knowledge_base
CREATE POLICY "Users can manage own knowledge base" ON knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assistants 
      WHERE assistants.id = knowledge_base.assistant_id 
      AND assistants.user_id = auth.uid()
    )
  );

-- Admins can manage all knowledge base
CREATE POLICY "Admins can manage all knowledge base" ON knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Step 13: Create indexes for performance
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_assistants_user_id ON assistants(user_id);
CREATE INDEX idx_assistants_status ON assistants(status);
CREATE INDEX idx_call_logs_assistant_id ON call_logs(assistant_id);
CREATE INDEX idx_call_logs_created_at ON call_logs(created_at DESC);
CREATE INDEX idx_knowledge_base_assistant_id ON knowledge_base(assistant_id);

-- Step 14: Create admin helper function
CREATE OR REPLACE FUNCTION make_user_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    user_record profiles%ROWTYPE;
BEGIN
    -- Find user by email
    SELECT * INTO user_record FROM profiles WHERE email = user_email;
    
    IF NOT FOUND THEN
        RETURN 'User not found with email: ' || user_email;
    END IF;
    
    -- Update user to admin with unlimited tier
    UPDATE profiles 
    SET role = 'admin', tier = 'unlimited'
    WHERE email = user_email;
    
    RETURN 'Successfully made ' || user_email || ' an admin with unlimited tier!';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 15: Create vector similarity search function for RAG
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  assistant_uuid uuid
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    knowledge_base.id,
    knowledge_base.content,
    knowledge_base.metadata,
    1 - (knowledge_base.embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE knowledge_base.assistant_id = assistant_uuid
    AND 1 - (knowledge_base.embedding <=> query_embedding) > match_threshold
  ORDER BY knowledge_base.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 16: Success message
SELECT 'Database setup complete! 🎉' as status;

-- AFTER RUNNING THIS SCRIPT:
-- 1. Sign up for an account normally
-- 2. Then run: SELECT make_user_admin('your-email@example.com');
-- 3. You'll have admin access with unlimited tier!