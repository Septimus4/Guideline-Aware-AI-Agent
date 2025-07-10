import { supabase } from '../src/config/database';

async function setupDatabase() {
  console.log('🔧 Setting up database tables...');

  try {
    // Since we can't use RPC to execute DDL, we'll just insert the sample data
    // The tables need to be created manually in Supabase SQL editor
    
    console.log('📝 Inserting sample guidelines...');
    
    const sampleGuidelines = [
      {
        name: 'Handle Pricing Objections',
        description: 'Guidelines for responding to price-related concerns',
        content: 'When a prospect mentions price concerns, acknowledge their budget constraints, then pivot to value proposition. Ask: "What are you currently spending on [current solution]?" Highlight ROI and cost of inaction.',
        priority: 9,
        category: 'objection_handling',
        tags: ['pricing', 'objections', 'value'],
        conditions: {
          user_intent: ['pricing_inquiry', 'objection_handling'],
          context_keywords: ['price', 'cost', 'expensive', 'budget', 'affordable']
        }
      },
      {
        name: 'Demo Request Protocol',
        description: 'Standard approach for handling demo requests',
        content: 'Before scheduling a demo, qualify the prospect: Who else would be involved in the evaluation? What specific challenges are you looking to solve? What would success look like? Then schedule a tailored demo focused on their use case.',
        priority: 8,
        category: 'demo_qualification',
        tags: ['demo', 'qualification', 'discovery'],
        conditions: {
          user_intent: ['demo_request'],
          context_keywords: ['demo', 'trial', 'test', 'evaluation', 'see']
        }
      },
      {
        name: 'Feature Comparison Strategy',
        description: 'How to handle competitor comparisons',
        content: 'When prospects compare features, focus on business outcomes rather than feature lists. Ask: "What specific business challenge does this feature solve for you?" Position our unique value proposition and highlight integration benefits.',
        priority: 7,
        category: 'competitive',
        tags: ['competition', 'features', 'differentiation'],
        conditions: {
          user_intent: ['comparison_request', 'feature_inquiry'],
          context_keywords: ['compare', 'competitor', 'alternative', 'vs', 'versus', 'feature']
        }
      },
      {
        name: 'Introduction Best Practices',
        description: 'First interaction guidelines',
        content: 'Start with a warm introduction: "Hi! I\'m here to help you find the right solution for your needs. To get started, could you tell me a bit about your current process and what challenges you\'re facing?"',
        priority: 6,
        category: 'introduction',
        tags: ['introduction', 'discovery', 'rapport'],
        conditions: {
          conversation_stage: ['introduction']
        }
      },
      {
        name: 'Security Concerns Response',
        description: 'Addressing security and compliance questions',
        content: 'For security questions, immediately highlight our SOC 2 Type II certification, GDPR compliance, and enterprise-grade encryption. Offer to connect them with our security team for detailed discussions.',
        priority: 8,
        category: 'technical_objections',
        tags: ['security', 'compliance', 'technical'],
        conditions: {
          context_keywords: ['security', 'compliance', 'gdpr', 'data', 'privacy', 'encryption']
        }
      }
    ];

    // First, check if guidelines already exist
    const { data: existingGuidelines, error: checkError } = await supabase
      .from('guidelines')
      .select('name')
      .limit(1);

    if (checkError) {
      console.log('⚠️  Tables don\'t exist yet. Please create them in Supabase SQL editor first.');
      console.log('\n📋 Run this SQL in your Supabase SQL editor:');
      console.log(`
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

-- Create indexes
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

-- Create index
CREATE INDEX IF NOT EXISTS conversations_created_at_idx ON conversations(created_at);
      `);
      console.log('\nThen run this script again with: npm run setup');
      return;
    }

    // Check if sample data already exists
    if (existingGuidelines && existingGuidelines.length > 0) {
      console.log('✅ Guidelines table already has data. Skipping sample data insertion.');
      console.log('🎉 Database is ready to go!');
      return;
    }

    // Insert sample guidelines
    for (const guideline of sampleGuidelines) {
      const { error } = await supabase
        .from('guidelines')
        .insert([guideline]);

      if (error) {
        console.error(`Error inserting guideline "${guideline.name}":`, error);
      } else {
        console.log(`✅ Inserted guideline: ${guideline.name}`);
      }
    }

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📋 Sample guidelines created:');
    sampleGuidelines.forEach((g, i) => {
      console.log(`${i + 1}. ${g.name} (Priority: ${g.priority})`);
    });

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    if (error instanceof Error && error.message.includes('relation "guidelines" does not exist')) {
      console.log('\n⚠️  Please create the database tables first using the SQL provided above.');
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase().then(() => {
    console.log('\n✅ Setup complete! You can now start the server.');
    process.exit(0);
  });
}

export { setupDatabase };
