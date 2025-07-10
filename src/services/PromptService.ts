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

  constructSystemPrompt(guidelines: Guideline[], context?: any): string {
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
- Always explain WHY a product is suitable for the customer
- Mention key benefits like price, features, or ratings when relevant
- Be natural - don't force product recommendations if they don't fit the conversation
- Focus on solving the customer's problem first, then suggest products`;

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
    context?: any
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
    const words = message.toLowerCase().split(/\s+/);
    
    // Simple keyword extraction - in a real app, you might use NLP libraries
    const salesKeywords = [
      'price', 'cost', 'budget', 'expensive', 'cheap', 'affordable',
      'feature', 'benefit', 'advantage', 'comparison', 'competitor',
      'demo', 'trial', 'test', 'evaluation', 'review',
      'contract', 'agreement', 'terms', 'payment', 'billing',
      'support', 'service', 'help', 'assistance', 'training',
      'integration', 'setup', 'implementation', 'customization',
      'security', 'compliance', 'privacy', 'data protection',
      'scale', 'growth', 'enterprise', 'team', 'users',
      // Product-specific keywords
      'phone', 'smartphone', 'laptop', 'computer', 'tablet', 'ipad',
      'beauty', 'skincare', 'makeup', 'fragrance', 'perfume',
      'home', 'decoration', 'furniture', 'kitchen', 'bedroom',
      'clothing', 'fashion', 'shirt', 'dress', 'shoes', 'accessories',
      'grocery', 'food', 'snacks', 'beverages', 'cooking',
      'health', 'wellness', 'vitamins', 'supplements', 'fitness',
      'products', 'product'
    ];

    return words.filter(word => salesKeywords.includes(word));
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

    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
      return 'pricing_inquiry';
    }
    if (lowerMessage.includes('demo') || lowerMessage.includes('trial') || lowerMessage.includes('test')) {
      return 'demo_request';
    }
    if (lowerMessage.includes('feature') || lowerMessage.includes('how does') || lowerMessage.includes('what can')) {
      return 'feature_inquiry';
    }
    if (lowerMessage.includes('compare') || lowerMessage.includes('alternative') || lowerMessage.includes('vs')) {
      return 'comparison_request';
    }
    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || lowerMessage.includes('get started')) {
      return 'purchase_intent';
    }
    if (lowerMessage.includes('problem') || lowerMessage.includes('issue') || lowerMessage.includes('concern')) {
      return 'objection_handling';
    }

    return 'general_inquiry';
  }
}
