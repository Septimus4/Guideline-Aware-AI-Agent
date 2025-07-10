-- Guideline-Aware AI Agent Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create guidelines table
CREATE TABLE IF NOT EXISTS guidelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  tags TEXT[] DEFAULT '{}',
  conditions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for guidelines table
CREATE INDEX IF NOT EXISTS guidelines_category_idx ON guidelines(category);
CREATE INDEX IF NOT EXISTS guidelines_is_active_idx ON guidelines(is_active);
CREATE INDEX IF NOT EXISTS guidelines_priority_idx ON guidelines(priority);
CREATE INDEX IF NOT EXISTS guidelines_tags_idx ON guidelines USING GIN(tags);
CREATE INDEX IF NOT EXISTS guidelines_conditions_idx ON guidelines USING GIN(conditions);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  messages JSONB NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for conversations table
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at);

-- Insert sample guidelines
INSERT INTO guidelines (name, description, content, priority, category, tags, conditions) VALUES

('Handle Pricing Objections', 
 'Guidelines for responding to price-related concerns',
 'When a prospect mentions price concerns, acknowledge their budget constraints, then pivot to value proposition. Ask: "What are you currently spending on [current solution]?" Highlight ROI and cost of inaction.',
 9,
 'objection_handling',
 '{"pricing", "objections", "value"}',
 '{"user_intent": ["pricing_inquiry", "objection_handling"], "context_keywords": ["price", "cost", "expensive", "budget", "affordable"]}'::jsonb
),

('Demo Request Protocol',
 'Standard approach for handling demo requests',
 'Before scheduling a demo, qualify the prospect: Who else would be involved in the evaluation? What specific challenges are you looking to solve? What would success look like? Then schedule a tailored demo focused on their use case.',
 8,
 'demo_qualification',
 '{"demo", "qualification", "discovery"}',
 '{"user_intent": ["demo_request"], "context_keywords": ["demo", "trial", "test", "evaluation", "see"]}'::jsonb
),

('Feature Comparison Strategy',
 'How to handle competitor comparisons',
 'When prospects compare features, focus on business outcomes rather than feature lists. Ask: "What specific business challenge does this feature solve for you?" Position our unique value proposition and highlight integration benefits.',
 7,
 'competitive',
 '{"competition", "features", "differentiation"}',
 '{"user_intent": ["comparison_request", "feature_inquiry"], "context_keywords": ["compare", "competitor", "alternative", "vs", "versus", "feature"]}'::jsonb
),

('Introduction Best Practices',
 'First interaction guidelines',
 'Start with a warm introduction: "Hi! I''m here to help you find the right solution for your needs. To get started, could you tell me a bit about your current process and what challenges you''re facing?"',
 6,
 'introduction',
 '{"introduction", "discovery", "rapport"}',
 '{"conversation_stage": ["introduction"]}'::jsonb
),

('Security Concerns Response',
 'Addressing security and compliance questions',
 'For security questions, immediately highlight our SOC 2 Type II certification, GDPR compliance, and enterprise-grade encryption. Offer to connect them with our security team for detailed discussions.',
 8,
 'technical_objections',
 '{"security", "compliance", "technical"}',
 '{"context_keywords": ["security", "compliance", "gdpr", "data", "privacy", "encryption"]}'::jsonb
);

-- Verify the setup
SELECT 
  'Guidelines created: ' || COUNT(*) as status 
FROM guidelines;

SELECT 
  'Tables created successfully' as status
WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'guidelines')
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations');
