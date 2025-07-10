import { GuidelineService } from '../src/services/GuidelineService';
import { AgentService } from '../src/services/AgentService';

async function testSetup() {
  console.log('🧪 Testing Guideline-Aware AI Agent setup...\n');

  try {
    const guidelineService = new GuidelineService();
    const agentService = new AgentService();

    // Test 1: Fetch guidelines
    console.log('1️⃣ Testing guideline retrieval...');
    const guidelines = await guidelineService.getGuidelines({ isActive: true });
    console.log(`✅ Found ${guidelines.length} active guidelines`);
    
    if (guidelines.length > 0) {
      console.log(`   - Sample: "${guidelines[0].name}" (Priority: ${guidelines[0].priority})`);
    }

    // Test 2: Context-based guideline selection
    console.log('\n2️⃣ Testing context-based guideline selection...');
    const applicableGuidelines = await guidelineService.getApplicableGuidelines({
      userIntent: 'pricing_inquiry',
      conversationStage: 'objection_handling',
      keywords: ['price', 'expensive']
    });
    console.log(`✅ Found ${applicableGuidelines.length} applicable guidelines for pricing context`);

    // Test 3: AI agent interaction
    console.log('\n3️⃣ Testing AI agent interaction...');
    if (process.env.OPENAI_API_KEY) {
      const response = await agentService.processMessage({
        message: 'This seems too expensive for our budget',
        context: {
          user_intent: 'pricing_inquiry',
          keywords: ['expensive', 'budget']
        }
      });
      
      console.log(`✅ Agent responded successfully`);
      console.log(`   - Response length: ${response.response.length} characters`);
      console.log(`   - Applied guidelines: ${response.appliedGuidelines.join(', ')}`);
      console.log(`   - Conversation ID: ${response.conversationId}`);
    } else {
      console.log('⚠️  OpenAI API key not found - skipping AI interaction test');
    }

    console.log('\n🎉 All tests passed! Your setup is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('relation "guidelines" does not exist')) {
        console.log('\n💡 Please run the database setup first:');
        console.log('   1. Run the SQL in database-setup.sql in your Supabase SQL editor');
        console.log('   2. Or run: npm run setup');
      } else if (error.message.includes('OPENAI_API_KEY')) {
        console.log('\n💡 Please add your OpenAI API key to the .env file');
      } else if (error.message.includes('SUPABASE')) {
        console.log('\n💡 Please check your Supabase credentials in the .env file');
      }
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testSetup().then(() => {
    process.exit(0);
  });
}

export { testSetup };
