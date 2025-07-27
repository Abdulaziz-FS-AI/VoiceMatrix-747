-- Delete All Tables Script
-- WARNING: This will permanently delete ALL data in your Supabase database
-- Run this in Supabase SQL Editor to clear everything

-- Drop all tables in the correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS call_logs CASCADE;
DROP TABLE IF EXISTS qa_pairs CASCADE;
DROP TABLE IF EXISTS knowledge_chunks CASCADE;
DROP TABLE IF EXISTS knowledge_bases CASCADE;
DROP TABLE IF EXISTS assistants CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS call_status CASCADE;
DROP TYPE IF EXISTS assistant_status CASCADE;
DROP TYPE IF EXISTS persona_type CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS search_knowledge_chunks CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

SELECT 'All tables and data deleted! 🗑️' as result;