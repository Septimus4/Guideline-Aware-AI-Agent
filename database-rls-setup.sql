-- Enable Row Level Security (RLS) for Guideline-Aware AI Agent tables
-- Run this script in your Supabase SQL Editor

-- Enable RLS on guidelines table
ALTER TABLE public.guidelines ENABLE ROW LEVEL SECURITY;

-- Create policy for guidelines table
-- This allows public read access to active guidelines
CREATE POLICY "Allow public read access to active guidelines" 
ON public.guidelines 
FOR SELECT 
USING (is_active = true);

-- Optional: Create policy for authenticated users to manage guidelines
CREATE POLICY "Allow authenticated users to manage guidelines" 
ON public.guidelines 
FOR ALL 
TO authenticated 
USING (true);

-- Enable RLS on conversations table
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Create policy for conversations table
-- This allows users to access their own conversations
CREATE POLICY "Users can access their own conversations" 
ON public.conversations 
FOR ALL 
USING (true); -- For now, allow all access since we don't have user authentication

-- Optional: If you want to add user authentication later, you can modify the conversations policy
-- CREATE POLICY "Users can access their own conversations" 
-- ON public.conversations 
-- FOR ALL 
-- USING (auth.uid()::text = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.guidelines TO anon;
GRANT SELECT ON public.guidelines TO authenticated;
GRANT ALL ON public.guidelines TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO anon;
GRANT ALL ON public.conversations TO authenticated;

-- Note: conversations table uses UUID primary key (gen_random_uuid()) 
-- so no sequence permissions are needed
