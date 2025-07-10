import { AgentService } from '../../src/services/AgentService';
import { GuidelineService } from '../../src/services/GuidelineService';
import { ConversationService } from '../../src/services/ConversationService';
import { PromptService } from '../../src/services/PromptService';
import { ProductService } from '../../src/services/ProductService';

// Mock all dependencies
jest.mock('../../src/services/GuidelineService');
jest.mock('../../src/services/ConversationService');
jest.mock('../../src/services/PromptService');
jest.mock('../../src/services/ProductService');

describe('AgentService', () => {
  let agentService: AgentService;
  let mockGuidelineService: jest.Mocked<GuidelineService>;
  let mockConversationService: jest.Mocked<ConversationService>;
  let mockPromptService: jest.Mocked<PromptService>;
  let mockProductService: jest.Mocked<ProductService>;

  beforeEach(() => {
    agentService = new AgentService();
    
    // Get the mock instances
    mockGuidelineService = (agentService as any).guidelineService;
    mockConversationService = (agentService as any).conversationService;
    mockPromptService = (agentService as any).promptService;
    mockProductService = (agentService as any).productService;

    jest.clearAllMocks();
  });

  describe('processMessage', () => {
    it('should process a message and return agent response', async () => {
      const mockRequest = {
        message: 'Hello, I need help',
        context: {
          user_intent: 'greeting',
          conversation_stage: 'introduction',
          keywords: ['help']
        }
      };

      const mockGuidelines = [
        {
          id: '1',
          name: 'Greeting Protocol',
          content: 'Always greet users warmly',
          priority: 8,
          category: 'greeting',
          is_active: true,
          tags: ['greeting'],
          conditions: { user_intent: ['greeting'] },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const mockConversation = {
        id: 'conv-123',
        messages: [],
        context: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const mockResponse = 'Hello! How can I help you today?';

      const mockSmartSuggestions = [
        {
          product: {
            id: 1,
            title: 'Test Product',
            price: 19.99,
            category: 'test'
          },
          reason: 'Test reason',
          confidence: 0.8,
          type: 'keyword' as const
        }
      ];

      // Setup mocks
      mockPromptService.extractContextFromMessage = jest.fn().mockReturnValue({
        user_intent: 'greeting',
        keywords: ['help']
      });
      mockConversationService.determineConversationStage = jest.fn().mockReturnValue('introduction');
      mockGuidelineService.getApplicableGuidelines = jest.fn().mockResolvedValue(mockGuidelines);
      mockProductService.generateSmartSuggestions = jest.fn().mockResolvedValue(mockSmartSuggestions);
      mockPromptService.generateResponse = jest.fn().mockResolvedValue(mockResponse);
      mockConversationService.createConversation = jest.fn().mockResolvedValue(mockConversation);

      const result = await agentService.processMessage(mockRequest);

      expect(result).toEqual({
        response: mockResponse,
        conversationId: 'conv-123',
        appliedGuidelines: ['Greeting Protocol'],
        context: {
          user_intent: 'greeting',
          conversation_stage: 'introduction',
          keywords: ['help'],
          suggested_products: [{
            name: 'Test Product',
            price: 19.99,
            reason: 'Test reason'
          }]
        },
        smartSuggestions: mockSmartSuggestions
      });

      expect(mockPromptService.extractContextFromMessage).toHaveBeenCalledWith('Hello, I need help');
      expect(mockGuidelineService.getApplicableGuidelines).toHaveBeenCalled();
      expect(mockProductService.generateSmartSuggestions).toHaveBeenCalled();
      expect(mockPromptService.generateResponse).toHaveBeenCalled();
    });

    it('should handle existing conversation', async () => {
      const mockRequest = {
        message: 'Follow up message',
        conversation_id: 'existing-conv-123'
      };

      const existingConversation = {
        id: 'existing-conv-123',
        messages: [
          { role: 'user' as const, content: 'Previous message', timestamp: '2024-01-01T00:00:00Z' }
        ],
        context: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockPromptService.extractContextFromMessage = jest.fn().mockReturnValue({});
      mockConversationService.getConversation = jest.fn().mockResolvedValue(existingConversation);
      mockConversationService.determineConversationStage = jest.fn().mockReturnValue('discovery');
      mockGuidelineService.getApplicableGuidelines = jest.fn().mockResolvedValue([]);
      mockProductService.generateSmartSuggestions = jest.fn().mockResolvedValue([]);
      mockPromptService.generateResponse = jest.fn().mockResolvedValue('Response');
      mockConversationService.addMessageToConversation = jest.fn().mockResolvedValue(existingConversation);

      const result = await agentService.processMessage(mockRequest);

      expect(mockConversationService.getConversation).toHaveBeenCalledWith('existing-conv-123');
      expect(result.conversationId).toBe('existing-conv-123');
    });

    it('should handle errors gracefully', async () => {
      const mockRequest = {
        message: 'Test message'
      };

      mockPromptService.extractContextFromMessage = jest.fn().mockImplementation(() => {
        throw new Error('Context extraction failed');
      });

      await expect(agentService.processMessage(mockRequest))
        .rejects.toThrow('Failed to process message');
    });

    it('should handle errors in context extraction', async () => {
      const mockChatRequest = {
        message: 'Hello',
        conversationId: '123',
        context: {}
      };

      mockPromptService.extractContextFromMessage.mockImplementation(() => {
        throw new Error('Context extraction failed');
      });

      await expect(agentService.processMessage(mockChatRequest))
        .rejects.toThrow('Failed to process message');
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history', async () => {
      const mockConversation = {
        id: '123',
        messages: [
          { role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00Z' }
        ],
        context: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockConversationService.getConversation.mockResolvedValue(mockConversation);

      const result = await agentService.getConversationHistory('123');

      expect(result).toEqual(mockConversation);
      expect(mockConversationService.getConversation).toHaveBeenCalledWith('123');
    });
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const mockSearchResult = {
        products: [
          {
            id: 1,
            title: 'Test Product',
            description: 'A test product',
            price: 10.99,
            category: 'test',
            discountPercentage: 10,
            rating: 4.5,
            stock: 100,
            thumbnail: 'test.jpg',
            images: ['test1.jpg']
          }
        ],
        total: 1,
        skip: 0,
        limit: 30
      };

      mockProductService.searchProducts.mockResolvedValue(mockSearchResult);

      const result = await agentService.searchProducts('test', 10);

      expect(result).toEqual(mockSearchResult);
      expect(mockProductService.searchProducts).toHaveBeenCalledWith({ q: 'test', limit: 10 });
    });
  });

  describe('getProductById', () => {
    it('should retrieve product by ID', async () => {
      const mockProduct = {
        id: 1,
        title: 'Test Product',
        description: 'A test product',
        price: 10.99,
        category: 'test',
        discountPercentage: 10,
        rating: 4.5,
        stock: 100,
        thumbnail: 'test.jpg',
        images: ['test1.jpg']
      };

      mockProductService.getProductById.mockResolvedValue(mockProduct);

      const result = await agentService.getProductById(1);

      expect(result).toEqual(mockProduct);
      expect(mockProductService.getProductById).toHaveBeenCalledWith(1);
    });
  });

  describe('getProductCategories', () => {
    it('should retrieve product categories', async () => {
      const mockCategories = ['beauty', 'electronics', 'clothing'];

      mockProductService.getCategories.mockResolvedValue(mockCategories);

      const result = await agentService.getProductCategories();

      expect(result).toEqual(mockCategories);
      expect(mockProductService.getCategories).toHaveBeenCalled();
    });
  });
});
