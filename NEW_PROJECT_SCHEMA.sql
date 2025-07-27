-- AI Receptionist SaaS - Fresh Database Schema
-- Run this ONCE in your NEW Supabase project SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Create types
CREATE TYPE persona_type AS ENUM ('restaurant', 'sales', 'medical', 'legal', 'general');
CREATE TYPE assistant_status AS ENUM ('pending', 'active', 'paused', 'error');
CREATE TYPE call_status AS ENUM ('active', 'completed', 'failed', 'transferred');

-- Core Tables
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  paypal_subscription_id TEXT,
  subscription_plan TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  website TEXT,
  hours_of_operation JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  persona persona_type NOT NULL,
  transfer_phone_number TEXT NOT NULL,
  vapi_assistant_id TEXT,
  vapi_phone_number_id TEXT,
  status assistant_status DEFAULT 'pending',
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE UNIQUE,
  content TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE knowledge_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id UUID REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  chunk_index INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE qa_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assistant_id UUID REFERENCES assistants(id) ON DELETE CASCADE,
  caller_number TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  transcript JSONB,
  summary TEXT,
  vapi_call_id TEXT UNIQUE,
  status call_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Essential Indexes
CREATE INDEX idx_assistants_business ON assistants(business_id);
CREATE INDEX idx_call_logs_assistant ON call_logs(assistant_id, created_at DESC);
CREATE INDEX idx_knowledge_chunks_embedding ON knowledge_chunks 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Users can manage own profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own business" ON businesses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own assistants" ON assistants FOR ALL USING (
  auth.uid() IN (SELECT b.user_id FROM businesses b WHERE b.id = assistants.business_id)
);
CREATE POLICY "Users can access own knowledge" ON knowledge_bases FOR ALL USING (
  auth.uid() IN (
    SELECT b.user_id FROM businesses b 
    JOIN assistants a ON b.id = a.business_id 
    WHERE a.id = knowledge_bases.assistant_id
  )
);
CREATE POLICY "Users can access own chunks" ON knowledge_chunks FOR ALL USING (
  auth.uid() IN (
    SELECT b.user_id FROM businesses b 
    JOIN assistants a ON b.id = a.business_id 
    JOIN knowledge_bases kb ON a.id = kb.assistant_id
    WHERE kb.id = knowledge_chunks.knowledge_base_id
  )
);
CREATE POLICY "Users can manage own qa" ON qa_pairs FOR ALL USING (
  auth.uid() IN (
    SELECT b.user_id FROM businesses b 
    JOIN assistants a ON b.id = a.business_id 
    WHERE a.id = qa_pairs.assistant_id
  )
);
CREATE POLICY "Users can view own calls" ON call_logs FOR SELECT USING (
  auth.uid() IN (
    SELECT b.user_id FROM businesses b 
    JOIN assistants a ON b.id = a.business_id 
    WHERE a.id = call_logs.assistant_id
  )
);

-- Vector Search Function
CREATE OR REPLACE FUNCTION search_knowledge_chunks(
  assistant_id UUID,
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE SQL AS $$
  SELECT kc.id, kc.content, '{}'::JSONB as metadata,
         1 - (kc.embedding <=> query_embedding) AS similarity
  FROM knowledge_chunks kc
  JOIN knowledge_bases kb ON kc.knowledge_base_id = kb.id
  WHERE kb.assistant_id = search_knowledge_chunks.assistant_id
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

SELECT 'Fresh schema setup complete! 🚀' as result;