import { GuidelineService } from './GuidelineService';
import { PromptService } from './PromptService';
import { ConversationService } from './ConversationService';
import { ProductService } from './ProductService';
import { ChatRequest, ChatMessage, ProductSuggestion, EnhancedChatRequest, Product } from '../types';

export class AgentService {
  private guidelineService: GuidelineService;
  private promptService: PromptService;
  private conversationService: ConversationService;
  private productService: ProductService;

  constructor() {
    this.guidelineService = new GuidelineService();
    this.promptService = new PromptService();
    this.conversationService = new ConversationService();
    this.productService = new ProductService();
  }

  async processMessage(request: ChatRequest | EnhancedChatRequest): Promise<{
    response: string;
    conversationId: string;
    appliedGuidelines: string[];
    context: {
      user_intent?: string;
      conversation_stage?: string;
      shopping_intent?: string;
      applied_guidelines?: string[];
      purchase_readiness?: number;
      budget_analysis?: {
        inBudget: number;
        slightlyOver: number;
        overBudget: number;
      };
    };
    smartSuggestions?: ProductSuggestion[];
    shoppingInsights?: {
      recommendedActions: string[];
      priceAlerts: string[];
      stockAlerts: string[];
      similarCustomers: string[];
    };
  }> {
    try {
      // Extract context from the user message
      const messageContext = this.promptService.extractContextFromMessage(request.message);
      
      // Merge with provided context
      const fullContext = {
        ...messageContext,
        ...request.context
      };

      // Get or create conversation
      let conversation;
      let messages: ChatMessage[] = [];
      let isTopicChange = false;

      if (request.conversation_id) {
        conversation = await this.conversationService.getConversation(request.conversation_id);
        if (conversation) {
          messages = conversation.messages;
          // Check for topic change in existing conversation
          isTopicChange = this.detectTopicChange(messages, request.message, messageContext);
        }
      }

      // Update context with topic change information
      if (isTopicChange) {
        (fullContext as any).topic_change = true;
      }

      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: request.message,
        timestamp: new Date().toISOString()
      };
      messages.push(userMessage);

      // Determine conversation stage
      const conversationStage = this.conversationService.determineConversationStage(messages);
      fullContext.conversation_stage = conversationStage;

      // Get applicable guidelines based on context
      const applicableGuidelines = await this.guidelineService.getApplicableGuidelines(fullContext);
      
      // Generate smart product suggestions
      const smartSuggestions = await this.generateSmartSuggestions({
        userMessage: request.message,
        conversationStage,
        userIntent: fullContext.userIntent,
        keywords: fullContext.keywords,
        budgetRange: fullContext.budgetRange,
        shoppingContext: 'shopping_context' in request ? request.shopping_context : undefined,
        isTopicChange
      });

      // Analyze shopping intent and purchase readiness
      const shoppingAnalysis = this.analyzeShoppingIntent(request.message, fullContext, smartSuggestions);
      const purchaseReadiness = this.calculatePurchaseReadiness(messages, smartSuggestions);
      
      // Generate shopping insights
      const shoppingInsights = await this.generateShoppingInsights({
        userMessage: request.message,
        suggestions: smartSuggestions,
        shoppingContext: 'shopping_context' in request ? request.shopping_context : undefined,
        conversationStage,
        purchaseReadiness
      });

      // Enhance context with product information for AI response
      const enhancedContext = {
        ...fullContext,
        shopping_intent: shoppingAnalysis.intent,
        purchase_readiness: purchaseReadiness,
        budget_analysis: shoppingAnalysis.budgetAnalysis,
        suggested_products: smartSuggestions?.slice(0, 3).map(s => ({
          id: s.product.id,
          name: s.product.title,
          price: `$${s.product.price}`,
          original_price: s.product.discountPercentage > 0 ? `$${(s.product.price / (1 - s.product.discountPercentage / 100)).toFixed(2)}` : undefined,
          discount: s.product.discountPercentage > 0 ? `${s.product.discountPercentage}% off` : undefined,
          description: s.product.description,
          rating: s.product.rating,
          category: s.product.category,
          brand: s.product.brand,
          stock: s.product.stock,
          availability: s.product.availabilityStatus,
          shipping: s.product.shippingInformation,
          warranty: s.product.warrantyInformation,
          return_policy: s.product.returnPolicy,
          reason: s.reason,
          confidence: s.confidence,
          purchase_urgency: s.product.stock < 10 ? 'low_stock' : 'normal'
        })),
        shopping_insights: {
          recommended_actions: shoppingInsights.recommendedActions,
          price_alerts: shoppingInsights.priceAlerts,
          stock_alerts: shoppingInsights.stockAlerts,
          similar_customers: shoppingInsights.similarCustomers
        },
        available_product_info: smartSuggestions?.length > 0 ? 
          'Use the suggested_products data above to provide accurate product information, specifications, pricing, and availability. Include shopping insights to help the customer make informed decisions.' :
          'No specific product matches found for this query. Focus on understanding customer needs and suggesting relevant product categories.'
      };
      
      // Generate AI response with product awareness
      const aiResponse = await this.promptService.generateResponse(
        messages,
        applicableGuidelines,
        enhancedContext
      );

      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      messages.push(assistantMessage);

      // Save or update conversation
      const appliedGuidelineIds = applicableGuidelines.map(g => g.id!);
      
      if (conversation) {
        conversation = await this.conversationService.addMessageToConversation(
          conversation.id!,
          assistantMessage,
          appliedGuidelineIds
        );
      } else {
        conversation = await this.conversationService.createConversation(
          messages,
          {
            ...enhancedContext,
            applied_guidelines: appliedGuidelineIds
          }
        );
      }

      return {
        response: aiResponse,
        conversationId: conversation.id!,
        appliedGuidelines: applicableGuidelines.map(g => g.name),
        context: enhancedContext,
        smartSuggestions,
        shoppingInsights
      };

    } catch (error) {
      console.error('Error processing message:', error);
      throw new Error('Failed to process message');
    }
  }

  private async generateSmartSuggestions(context: {
    userMessage?: string;
    conversationStage?: string;
    userIntent?: string;
    keywords?: string[];
    budgetRange?: string;
    shoppingContext?: {
      interested_products?: number[];
      viewed_products?: number[];
      cart_items?: number[];
      wishlist_items?: number[];
      search_history?: string[];
      purchase_history?: number[];
      preferred_brands?: string[];
      budget_range?: {
        min?: number;
        max?: number;
      };
    };
    isTopicChange?: boolean;
  }): Promise<ProductSuggestion[]> {
    try {
      return await this.productService.generateSmartSuggestions(context);
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return [];
    }
  }

  private detectTopicChange(
    messages: ChatMessage[], 
    newMessage: string, 
    newContext: { keywords: string[]; userIntent?: string }
  ): boolean {
    // If this is the first message, no topic change
    if (messages.length === 0) {
      return false;
    }

    // Get the last few user messages to determine current context
    const recentUserMessages = messages
      .filter(msg => msg.role === 'user')
      .slice(-3) // Look at last 3 user messages
      .map(msg => msg.content);

    if (recentUserMessages.length === 0) {
      return false;
    }

    // Extract keywords from recent messages
    const recentKeywords = new Set<string>();
    recentUserMessages.forEach(msg => {
      const context = this.promptService.extractContextFromMessage(msg);
      if (context.keywords && Array.isArray(context.keywords)) {
        context.keywords.forEach(keyword => recentKeywords.add(keyword));
      }
    });

    // Check for topic change based on keywords
    const newKeywords = new Set(newContext.keywords || []);
    
    // Product category keywords that indicate specific shopping topics
    const shoppingCategories = {
      electronics: ['phone', 'smartphone', 'iphone', 'android', 'mobile', 'laptop', 'computer', 'tablet', 'headphones', 'camera', 'tv', 'gaming'],
      fashion: ['clothing', 'fashion', 'shirt', 'dress', 'shoes', 'jeans', 'jacket', 'accessories', 'bag', 'watch', 'jewelry'],
      beauty: ['beauty', 'skincare', 'makeup', 'fragrance', 'perfume', 'cosmetics', 'shampoo', 'lotion', 'cream'],
      home: ['furniture', 'home', 'kitchen', 'bedroom', 'living', 'decor', 'appliance', 'mattress', 'sofa', 'table'],
      sports: ['sports', 'fitness', 'gym', 'exercise', 'running', 'yoga', 'outdoor', 'bike', 'athletic'],
      books: ['book', 'novel', 'textbook', 'ebook', 'reading', 'literature', 'magazine'],
      health: ['health', 'medicine', 'supplement', 'vitamin', 'medical', 'wellness', 'care'],
      toys: ['toy', 'game', 'puzzle', 'kids', 'children', 'baby', 'educational'],
      automotive: ['car', 'auto', 'vehicle', 'automotive', 'parts', 'accessories', 'tire'],
      food: ['food', 'snack', 'grocery', 'organic', 'beverage', 'cooking', 'kitchen']
    };

    // Determine current and new categories
    let currentCategory = '';
    let newCategory = '';

    for (const [category, keywords] of Object.entries(shoppingCategories)) {
      if (keywords.some(keyword => recentKeywords.has(keyword))) {
        currentCategory = category;
        break;
      }
    }

    for (const [category, keywords] of Object.entries(shoppingCategories)) {
      if (keywords.some(keyword => newKeywords.has(keyword))) {
        newCategory = category;
        break;
      }
    }

    // Topic change if we switch from one category to another
    if (currentCategory && newCategory && currentCategory !== newCategory) {
      console.log(`Topic change detected: ${currentCategory} -> ${newCategory}`);
      return true;
    }

    return false;
  }

  async getConversationHistory(conversationId: string) {
    return this.conversationService.getConversation(conversationId);
  }

  async searchProducts(query: string, limit?: number): Promise<{
    products: Product[];
    total: number;
    skip: number;
    limit: number;
  }> {
    return this.productService.searchProducts({ q: query, limit });
  }

  async getProductById(id: number): Promise<Product | null> {
    return this.productService.getProductById(id);
  }

  async getProductCategories(): Promise<string[]> {
    return this.productService.getCategories();
  }

  private analyzeShoppingIntent(message: string, context: any, suggestions: ProductSuggestion[]): {
    intent: string;
    budgetAnalysis: {
      inBudget: number;
      slightlyOver: number;
      overBudget: number;
    };
  } {
    const intent = this.determineShoppingIntent(message, context);
    
    // Analyze budget based on suggested products and context
    const estimatedSpend = suggestions.reduce((total, s) => total + s.product.price, 0);
    const budgetRange = context.budget_range;
    
    const budgetAnalysis = {
      inBudget: 0,
      slightlyOver: 0,
      overBudget: 0
    };
    
    if (budgetRange?.max) {
      const maxBudget = budgetRange.max;
      if (estimatedSpend <= maxBudget) {
        budgetAnalysis.inBudget = 1;
      } else if (estimatedSpend <= maxBudget * 1.2) {
        budgetAnalysis.slightlyOver = 1;
      } else {
        budgetAnalysis.overBudget = 1;
      }
    }
    
    return {
      intent,
      budgetAnalysis
    };
  }

  private determineShoppingIntent(message: string, _context: any): string {
    const lowerMessage = message.toLowerCase();
    
    // Purchase intent keywords
    if (lowerMessage.includes('buy') || lowerMessage.includes('purchase') || 
        lowerMessage.includes('order') || lowerMessage.includes('checkout')) {
      return 'buying';
    }
    
    // Comparison intent keywords
    if (lowerMessage.includes('compare') || lowerMessage.includes('vs') || 
        lowerMessage.includes('versus') || lowerMessage.includes('difference')) {
      return 'comparing';
    }
    
    // Support intent keywords
    if (lowerMessage.includes('help') || lowerMessage.includes('support') || 
        lowerMessage.includes('problem') || lowerMessage.includes('issue')) {
      return 'support';
    }
    
    // Default to browsing
    return 'browsing';
  }

  private calculatePurchaseReadiness(messages: ChatMessage[], suggestions: ProductSuggestion[]): number {
    let score = 0;
    
    // Analyze conversation progression
    const userMessages = messages.filter(m => m.role === 'user');
    
    // More messages = higher engagement
    score += Math.min(userMessages.length * 5, 30);
    
    // Check for purchase-related keywords
    const purchaseKeywords = ['buy', 'purchase', 'order', 'price', 'cost', 'shipping', 'delivery', 'warranty'];
    userMessages.forEach(msg => {
      purchaseKeywords.forEach(keyword => {
        if (msg.content.toLowerCase().includes(keyword)) {
          score += 5;
        }
      });
    });
    
    // Product specificity (detailed questions about specific products)
    if (suggestions.length > 0 && suggestions[0].confidence > 0.7) {
      score += 20;
    }
    
    // Question specificity
    const detailKeywords = ['specification', 'spec', 'review', 'rating', 'compare', 'feature'];
    userMessages.forEach(msg => {
      detailKeywords.forEach(keyword => {
        if (msg.content.toLowerCase().includes(keyword)) {
          score += 10;
        }
      });
    });
    
    return Math.min(score, 100);
  }

  // Shopping-specific methods
  async addToCart(productId: number, quantity: number = 1): Promise<{
    success: boolean;
    message: string;
    cartTotal?: number;
  }> {
    try {
      // This would typically integrate with a real cart service
      // For now, we'll return a success response
      return {
        success: true,
        message: `Added ${quantity} item(s) to cart`,
        cartTotal: quantity // Simplified for demo
      };
    } catch {
      return {
        success: false,
        message: 'Failed to add item to cart'
      };
    }
  }

  async compareProducts(productIds: number[]): Promise<{
    success: boolean;
    comparison?: {
      products: Product[];
      comparisonFactors: string[];
      recommendation?: {
        productId: number;
        reason: string;
        confidence: number;
      };
    };
    message?: string;
  }> {
    try {
      const products = await Promise.all(
        productIds.map(id => this.productService.getProductById(id))
      );
      
      const validProducts = products.filter(p => p !== null) as Product[];
      
      if (validProducts.length < 2) {
        return {
          success: false,
          message: 'At least 2 valid products are required for comparison'
        };
      }

      // Determine comparison factors
      const comparisonFactors = ['price', 'rating', 'brand', 'availability'];
      
      // Simple recommendation logic - highest rated product
      const recommendation = validProducts.reduce((best, current) => 
        current.rating > best.rating ? current : best
      );

      return {
        success: true,
        comparison: {
          products: validProducts,
          comparisonFactors,
          recommendation: {
            productId: recommendation.id,
            reason: `Highest rated product with ${recommendation.rating} stars`,
            confidence: 0.8
          }
        }
      };
    } catch {
      return {
        success: false,
        message: 'Failed to compare products'
      };
    }
  }

  async getShoppingRecommendations(context: {
    budget?: { min?: number; max?: number };
    category?: string;
    preferences?: string[];
    previousPurchases?: number[];
  }): Promise<ProductSuggestion[]> {
    try {
      const searchContext = {
        userMessage: `Looking for products in ${context.category || 'all categories'}`,
        conversationStage: 'consideration',
        userIntent: 'browsing',
        keywords: context.preferences || [],
        shoppingContext: {
          budget_range: context.budget,
          preferred_categories: context.category ? [context.category] : [],
          purchase_history: context.previousPurchases || []
        }
      };

      return await this.generateSmartSuggestions(searchContext);
    } catch (error) {
      console.error('Error getting shopping recommendations:', error);
      return [];
    }
  }

  private async generateShoppingInsights(context: {
    userMessage: string;
    suggestions: ProductSuggestion[];
    shoppingContext?: any;
    conversationStage?: string;
    purchaseReadiness: number;
  }): Promise<{
    recommendedActions: string[];
    priceAlerts: string[];
    stockAlerts: string[];
    similarCustomers: string[];
  }> {
    const insights = {
      recommendedActions: [] as string[],
      priceAlerts: [] as string[],
      stockAlerts: [] as string[],
      similarCustomers: [] as string[]
    };

    // Generate recommended actions based on purchase readiness
    if (context.purchaseReadiness > 70) {
      insights.recommendedActions.push('Customer is highly engaged - offer checkout assistance');
      insights.recommendedActions.push('Suggest complementary products');
      insights.recommendedActions.push('Mention limited-time offers or warranties');
    } else if (context.purchaseReadiness > 40) {
      insights.recommendedActions.push('Provide detailed product comparisons');
      insights.recommendedActions.push('Share customer reviews and ratings');
      insights.recommendedActions.push('Offer to answer specific questions');
    } else {
      insights.recommendedActions.push('Focus on understanding customer needs');
      insights.recommendedActions.push('Provide educational product information');
      insights.recommendedActions.push('Suggest exploring different categories');
    }

    // Generate price and stock alerts
    context.suggestions.forEach(suggestion => {
      if (suggestion.product.discountPercentage > 20) {
        insights.priceAlerts.push(`${suggestion.product.title} has ${suggestion.product.discountPercentage}% discount`);
      }
      
      if (suggestion.product.stock < 10) {
        insights.stockAlerts.push(`${suggestion.product.title} - only ${suggestion.product.stock} left in stock`);
      }
    });

    // Generate similar customer insights
    insights.similarCustomers.push('Customers who viewed this also bought accessories');
    insights.similarCustomers.push('85% of customers in this category make a purchase within 3 days');
    
    return insights;
  }
}
