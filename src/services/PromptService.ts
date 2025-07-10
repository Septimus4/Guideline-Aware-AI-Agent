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
    shopping_intent?: string;
    applied_guidelines?: string[];
    purchase_readiness?: number;
  }): string {
    const basePrompt = `You are an expert AI Shopping Assistant designed to help customers browse, compare, and purchase products. Your primary goal is to provide exceptional shopping experiences that lead to satisfied customers and successful purchases.

CORE BEHAVIOR:
- Be enthusiastic and helpful about shopping
- Ask clarifying questions to understand customer needs, budget, and preferences
- Provide detailed product information including specifications, reviews, and comparisons
- Address concerns about price, quality, shipping, and returns with confidence
- Guide customers through the entire shopping journey from discovery to purchase
- Offer personalized recommendations based on their specific requirements
- Create urgency appropriately (limited stock, deals ending soon) but never pressure

SHOPPING ASSISTANCE FOCUS:
- Help customers discover products that match their needs and budget
- Provide detailed comparisons between similar products
- Explain value propositions and highlight key benefits
- Address common shopping concerns (shipping, returns, warranty)
- Suggest complementary products and accessories
- Guide customers to make confident purchase decisions
- Provide post-purchase support and follow-up

PRODUCT RECOMMENDATIONS:
- Use the suggested_products in context to make highly relevant recommendations
- Always explain WHY a product is perfect for the customer based on actual product data
- Mention specific details like exact price, original price, discounts, ratings, stock levels, and availability
- Include shipping information, warranty details, and return policies when available
- Be natural - recommendations should feel helpful, not pushy
- Focus on solving the customer's problem first, then suggest the best products
- When comparing products, use actual specifications, prices, and customer reviews from the product data
- If customer asks about specific products, prioritize showing actual available products with real data
- Highlight special offers, discounts, and deals when available
- Alert customers to low stock situations appropriately

SHOPPING INSIGHTS:
- Use purchase_readiness score to adapt your approach (higher score = more direct sales focus)
- Incorporate shopping insights like price alerts, stock alerts, and recommendations
- Reference similar customer behaviors and popular choices when relevant
- Suggest budget-friendly alternatives when appropriate
- Highlight value for money and long-term benefits`;

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
    shoppingIntent?: string;
    budgetRange?: string;
  } {
    const keywords = this.extractKeywords(message);
    const userIntent = this.classifyIntent(message);
    const shoppingIntent = this.classifyShoppingIntent(message);
    const budgetRange = this.extractBudgetRange(message);

    return {
      userIntent,
      keywords,
      shoppingIntent,
      budgetRange
    };
  }

  private extractKeywords(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(/\s+/);
    
    // Enhanced keyword extraction with better shopping categorization
    const shoppingKeywords = [
      // Price and budget keywords
      'price', 'cost', 'budget', 'expensive', 'cheap', 'affordable', 'deal', 'discount', 'sale', 'offer',
      'under', 'below', 'maximum', 'minimum', 'range', 'around', 'approximately', 'about',
      
      // Product features
      'feature', 'specification', 'specs', 'quality', 'rating', 'review', 'brand', 'model',
      'size', 'color', 'capacity', 'storage', 'memory', 'battery', 'camera', 'screen',
      
      // Shopping actions
      'buy', 'purchase', 'order', 'checkout', 'cart', 'wishlist', 'compare', 'vs', 'versus',
      'difference', 'similar', 'alternative', 'option', 'choice', 'recommendation',
      
      // Product categories
      'phone', 'smartphone', 'mobile', 'laptop', 'computer', 'tablet', 'headphones', 'camera',
      'tv', 'television', 'gaming', 'console', 'electronics', 'tech', 'gadget',
      'clothing', 'fashion', 'shirt', 'dress', 'shoes', 'jeans', 'jacket', 'bag', 'watch',
      'beauty', 'skincare', 'makeup', 'fragrance', 'cosmetics', 'perfume',
      'home', 'furniture', 'kitchen', 'bedroom', 'decor', 'appliance',
      'book', 'novel', 'textbook', 'magazine', 'reading',
      'health', 'fitness', 'sports', 'exercise', 'gym', 'outdoor',
      'food', 'grocery', 'snack', 'organic', 'beverage',
      
      // Shopping concerns
      'shipping', 'delivery', 'return', 'warranty', 'guarantee', 'support', 'service',
      'availability', 'stock', 'inventory', 'sold', 'out', 'available',
      'trustworthy', 'reliable', 'authentic', 'genuine', 'fake', 'counterfeit',
      
      // Intent keywords
      'help', 'assist', 'find', 'search', 'looking', 'need', 'want', 'interested',
      'recommendation', 'suggest', 'advise', 'guide', 'best', 'top', 'popular'
    ];

    return words.filter(word => 
      shoppingKeywords.includes(word) || 
      /^\d+$/.test(word) || // Numbers (prices, quantities)
      /\$\d+/.test(word) || // Dollar amounts
      word.length > 3 // Longer words that might be product names
    );
  }

  private classifyShoppingIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || 
        lowerMessage.includes('order') || lowerMessage.includes('checkout')) {
      return 'buying';
    }
    
    if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || 
        lowerMessage.includes('versus') || lowerMessage.includes('difference')) {
      return 'comparing';
    }
    
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || 
        lowerMessage.includes('question') || lowerMessage.includes('return') ||
        lowerMessage.includes('shipping') || lowerMessage.includes('warranty')) {
      return 'support';
    }
    
    return 'browsing';
  }

  private extractBudgetRange(message: string): string | undefined {
    const lowerMessage = message.toLowerCase();
    
    // Look for explicit budget mentions
    const budgetPatterns = [
      /under\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /below\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /maximum\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /budget\s*(?:of|is)?\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /around\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /about\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i,
      /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:or\s*less|max|maximum)/i
    ];

    for (const pattern of budgetPatterns) {
      const match = message.match(pattern);
      if (match) {
        const amount = parseFloat(match[1].replace(',', ''));
        if (amount <= 100) return 'under-100';
        if (amount <= 300) return '100-300';
        if (amount <= 500) return '300-500';
        if (amount <= 1000) return '500-1000';
        if (amount <= 2000) return '1000-2000';
        return 'over-2000';
      }
    }

    // Look for range patterns
    const rangePattern = /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:to|-)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const rangeMatch = message.match(rangePattern);
    if (rangeMatch) {
      const min = parseFloat(rangeMatch[1].replace(',', ''));
      const max = parseFloat(rangeMatch[2].replace(',', ''));
      return `${min}-${max}`;
    }

    // Look for general budget indicators
    if (lowerMessage.includes('cheap') || lowerMessage.includes('budget') || 
        lowerMessage.includes('affordable')) {
      return 'budget-friendly';
    }
    
    if (lowerMessage.includes('premium') || lowerMessage.includes('high-end') || 
        lowerMessage.includes('expensive') || lowerMessage.includes('luxury')) {
      return 'premium';
    }

    return undefined;
  }

  private classifyIntent(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (!message.trim()) {
      return 'unknown';
    }

    // Shopping-specific intent patterns
    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || 
        lowerMessage.includes('order') || lowerMessage.includes('get')) {
      return 'purchase_intent';
    }

    if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || 
        lowerMessage.includes('difference') || lowerMessage.includes('better')) {
      return 'comparison_request';
    }

    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || 
        lowerMessage.includes('best') || lowerMessage.includes('need')) {
      return 'product_recommendation';
    }

    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || 
        lowerMessage.includes('budget') || lowerMessage.includes('expensive')) {
      return 'pricing_inquiry';
    }

    if (lowerMessage.includes('feature') || lowerMessage.includes('spec') || 
        lowerMessage.includes('how does') || lowerMessage.includes('what can')) {
      return 'feature_inquiry';
    }

    if (lowerMessage.includes('review') || lowerMessage.includes('rating') || 
        lowerMessage.includes('quality') || lowerMessage.includes('good')) {
      return 'review_inquiry';
    }

    if (lowerMessage.includes('available') || lowerMessage.includes('stock') || 
        lowerMessage.includes('inventory') || lowerMessage.includes('in stock')) {
      return 'availability_inquiry';
    }

    if (lowerMessage.includes('shipping') || lowerMessage.includes('delivery') || 
        lowerMessage.includes('return') || lowerMessage.includes('warranty')) {
      return 'service_inquiry';
    }

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || 
        lowerMessage.match(/^(hello|hi|hey)$/)) {
      return 'greeting';
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('assistance') || 
        lowerMessage.includes('support')) {
      return 'help_request';
    }

    return 'general_inquiry';
  }
}
