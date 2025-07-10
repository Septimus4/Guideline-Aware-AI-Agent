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
      applied_guidelines?: string[];
    };
    smartSuggestions?: ProductSuggestion[];
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

      if (request.conversation_id) {
        conversation = await this.conversationService.getConversation(request.conversation_id);
        if (conversation) {
          messages = conversation.messages;
        }
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
        productContext: 'product_context' in request ? request.product_context : undefined
      });

      // Enhance context with product information for AI response
      const enhancedContext = {
        ...fullContext,
        suggested_products: smartSuggestions?.slice(0, 3).map(s => ({
          id: s.product.id,
          name: s.product.title,
          price: `$${s.product.price}`,
          description: s.product.description,
          rating: s.product.rating,
          category: s.product.category,
          brand: s.product.brand,
          stock: s.product.stock,
          reason: s.reason,
          confidence: s.confidence
        })),
        available_product_info: smartSuggestions?.length > 0 ? 
          'Use the suggested_products data above to provide accurate product information, specifications, and pricing.' :
          'No specific product matches found for this query.'
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
        smartSuggestions
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
    productContext?: {
      interested_products?: number[];
      viewed_products?: number[];
      search_history?: string[];
    };
  }): Promise<ProductSuggestion[]> {
    try {
      return await this.productService.generateSmartSuggestions(context);
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return [];
    }
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
}
