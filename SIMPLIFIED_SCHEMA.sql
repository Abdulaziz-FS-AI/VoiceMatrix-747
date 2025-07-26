-- Simplified schema without businesses table
-- Run this in Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Create profiles table (auto-created on signup)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise', 'unlimited')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- First, add user_id column to existing assistants table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'assistants' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE assistants ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create assistants table (linked directly to user) if it doesn't exist
CREATE TABLE IF NOT EXISTS assistants (
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

-- If you have existing assistants without user_id, you'll need to manually set them
-- UPDATE assistants SET user_id = (SELECT id FROM profiles WHERE email = 'your-email@example.com') WHERE user_id IS NULL;

-- Create call_logs table
CREATE TABLE IF NOT EXISTS call_logs (
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

-- Create knowledge_base table for RAG
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assistant_id UUID NOT NULL REFERENCES assistants(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embeddings
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile trigger
CREATE OR REPLACE FUNCTION create_profile_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
CREATE TRIGGER create_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_for_user();

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Assistants policies
CREATE POLICY "Users can view own assistants" ON assistants
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assistants" ON assistants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assistants" ON assistants
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assistants" ON assistants
  FOR DELETE USING (auth.uid() = user_id);

-- Call logs policies (via assistant relationship)
CREATE POLICY "Users can view own call logs" ON call_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assistants 
      WHERE assistants.id = call_logs.assistant_id 
      AND assistants.user_id = auth.uid()
    )
  );

-- Knowledge base policies (via assistant relationship)
CREATE POLICY "Users can manage own knowledge base" ON knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assistants 
      WHERE assistants.id = knowledge_base.assistant_id 
      AND assistants.user_id = auth.uid()
    )
  );

-- Admin policies (admins can see everything)
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all assistants" ON assistants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_assistants_user_id ON assistants(user_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_assistant_id ON call_logs(assistant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_assistant_id ON knowledge_base(assistant_id);

-- Create vector similarity search function
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