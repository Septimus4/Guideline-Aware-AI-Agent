import OpenAI from 'openai';
import { Guideline, ChatMessage } from '../types';

export class PromptService {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  constructSystemPrompt(guidelines: Guideline[], context?: {
    user_intent?: string;
    conversation_stage?: string;
    applied_guidelines?: string[];
  }): string {
    const basePrompt = `You are a sales-focused AI agent designed to help close deals. Your primary objective is to engage prospects, understand their needs, handle objections, and guide them toward making a purchase decision.

CORE BEHAVIOR:
- Be professional but conversational
- Ask clarifying questions to understand the prospect's needs
- Address objections with empathy and evidence
- Always look for opportunities to advance the conversation toward a close
- Provide value in every interaction
- When appropriate, mention specific products that match the customer's needs

PRODUCT RECOMMENDATIONS:
- Use the suggested_products in context to make relevant recommendations
- Always explain WHY a product is suitable for the customer based on the actual product data
- Mention specific details like exact price, features, ratings, and availability when available
- Be natural - don't force product recommendations if they don't fit the conversation
- Focus on solving the customer's problem first, then suggest products
- When comparing products, use actual specifications and prices from the product data
- If the customer asks about specific products (like iPhone models), prioritize showing actual available products over generic information`;

    const contextText = context ? `

CURRENT CONTEXT:
${Object.entries(context)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join('\n')}` : '';

    if (guidelines.length === 0) {
      return basePrompt + contextText;
    }

    const guidelineText = guidelines
      .map((guideline, index) => {
        return `${index + 1}. [${guideline.category.toUpperCase()}] ${guideline.name}
   Priority: ${guideline.priority}/10
   ${guideline.content}`;
      })
      .join('\n\n');

    return `${basePrompt}

ACTIVE GUIDELINES:
You must follow these guidelines in order of priority. Higher priority guidelines (closer to 10) take precedence over lower priority ones.

${guidelineText}${contextText}

Remember: These guidelines are critical for successful sales interactions. Follow them consistently while maintaining a natural, helpful conversation flow.`;
  }

  async generateResponse(
    messages: ChatMessage[],
    guidelines: Guideline[],
    context?: {
      user_intent?: string;
      conversation_stage?: string;
      applied_guidelines?: string[];
    }
  ): Promise<string> {
    const systemPrompt = this.constructSystemPrompt(guidelines, context);

    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content
      }))
    ];

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || 'I apologize, but I was unable to generate a response.';
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw new Error('Failed to generate response');
    }
  }

  extractContextFromMessage(message: string): {
    userIntent?: string;
    keywords: string[];
  } {
    const keywords = this.extractKeywords(message);
    const userIntent = this.classifyIntent(message);

    return {
      userIntent,
      keywords
    };
  }

  private extractKeywords(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);
    
    // Enhanced keyword extraction with better categorization
    const salesKeywords = [
      'price', 'cost', 'budget', 'expensive', 'cheap', 'affordable',
      'feature', 'benefit', 'advantage', 'comparison', 'competitor',
      'demo', 'trial', 'test', 'evaluation', 'review',
      'contract', 'agreement', 'terms', 'payment', 'billing',
      'support', 'service', 'help', 'assistance', 'training',
      'integration', 'setup', 'implementation', 'customization',
      'security', 'compliance', 'privacy', 'data protection',
      'scale', 'growth', 'enterprise', 'team', 'users'
    ];

    // Product-specific keywords with better phone detection
    const productKeywords = [
      // Phone keywords
      'phone', 'smartphone', 'iphone', 'android', 'mobile', 'cell', 'cellular',
      'galaxy', 'pixel', 'oneplus', 'huawei', 'xiaomi', 'nokia', 'motorola',
      // Computer keywords  
      'laptop', 'computer', 'tablet', 'ipad', 'macbook', 'pc', 'desktop',
      // Electronics
      'camera', 'headphones', 'speaker', 'watch', 'smartwatch',
      // Other categories
      'beauty', 'skincare', 'makeup', 'fragrance', 'perfume',
      'home', 'decoration', 'furniture', 'kitchen', 'bedroom',
      'clothing', 'fashion', 'shirt', 'dress', 'shoes', 'accessories',
      'grocery', 'food', 'snacks', 'beverages', 'cooking',
      'health', 'wellness', 'vitamins', 'supplements', 'fitness'
    ];

    // Also check for specific model names and brand patterns
    const phoneModels = [
      'iphone 5', 'iphone 6', 'iphone 7', 'iphone 8', 'iphone x', 'iphone 11', 'iphone 12', 'iphone 13', 'iphone 14', 'iphone 15',
      'galaxy s', 'pixel', 'oneplus', 'note'
    ];

    const extractedKeywords = new Set<string>();
    
    // Add matching individual words
    words.forEach(word => {
      if (salesKeywords.includes(word) || productKeywords.includes(word)) {
        extractedKeywords.add(word);
      }
    });

    // Add matching phone model patterns
    phoneModels.forEach(model => {
      if (lowerMessage.includes(model)) {
        extractedKeywords.add(model.replace(/\s+/g, '_'));
      }
    });

    // Special handling for "lost" or "broken" phone scenarios
    if (lowerMessage.includes('lost') || lowerMessage.includes('broken') || lowerMessage.includes('damaged')) {
      extractedKeywords.add('replacement');
      extractedKeywords.add('phone');
    }

    return Array.from(extractedKeywords);
  }

  private classifyIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (!message.trim()) {
      return 'unknown';
    }

    // Greeting patterns
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi ') || lowerMessage.includes('hey ') || 
        lowerMessage.match(/^(hello|hi|hey)$/)) {
      return 'greeting';
    }

    // Help patterns
    if (lowerMessage.includes('help') || lowerMessage.includes('assistance') || lowerMessage.includes('support')) {
      return 'help_request';
    }

    // Enhanced phone/product specific intent detection
    if (lowerMessage.includes('phone') || lowerMessage.includes('iphone') || lowerMessage.includes('smartphone') || 
        lowerMessage.includes('mobile') || lowerMessage.includes('android') || lowerMessage.includes('galaxy') ||
        lowerMessage.includes('lost') && (lowerMessage.includes('phone') || lowerMessage.includes('mobile'))) {
      
      if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('need')) {
        return 'product_recommendation';
      }
      if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || lowerMessage.includes('difference')) {
        return 'product_comparison';
      }
      if (lowerMessage.includes('spec') || lowerMessage.includes('feature') || lowerMessage.includes('detail')) {
        return 'product_inquiry';
      }
      return 'product_recommendation';
    }

    // Pricing patterns
    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget') ||
        lowerMessage.includes('expensive') || lowerMessage.includes('cheap') || lowerMessage.includes('affordable')) {
      return 'pricing_inquiry';
    }

    // Comparison patterns
    if (lowerMessage.includes('compare') || lowerMessage.includes('alternative') || lowerMessage.includes('vs') ||
        lowerMessage.includes('difference') || lowerMessage.includes('better')) {
      return 'comparison_request';
    }

    // Demo/trial patterns
    if (lowerMessage.includes('demo') || lowerMessage.includes('trial') || lowerMessage.includes('test')) {
      return 'demo_request';
    }

    // Feature inquiry patterns
    if (lowerMessage.includes('feature') || lowerMessage.includes('how does') || lowerMessage.includes('what can') ||
        lowerMessage.includes('spec') || lowerMessage.includes('specification')) {
      return 'feature_inquiry';
    }

    // Purchase intent patterns
    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('get started') ||
        lowerMessage.includes('order') || lowerMessage.includes('want to get')) {
      return 'purchase_intent';
    }

    // Problem/objection patterns
    if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('concern') ||
        lowerMessage.includes('worry') || lowerMessage.includes('doubt')) {
      return 'objection_handling';
    }

    return 'general_inquiry';
  }
}
