import { AgentService } from '../../src/services/AgentService';
import { GuidelineService } from '../../src/services/GuidelineService';
import { ConversationService } from '../../src/services/ConversationService';
import { PromptService } from '../../src/services/PromptService';

// Mock all dependencies
jest.mock('../../src/services/GuidelineService');
jest.mock('../../src/services/ConversationService');
jest.mock('../../src/services/PromptService');

describe('AgentService', () => {
  let agentService: AgentService;
  let mockGuidelineService: jest.Mocked<GuidelineService>;
  let mockConversationService: jest.Mocked<ConversationService>;
  let mockPromptService: jest.Mocked<PromptService>;

  beforeEach(() => {
    agentService = new AgentService();
    
    // Get the mock instances
    mockGuidelineService = (agentService as any).guidelineService;
    mockConversationService = (agentService as any).conversationService;
    mockPromptService = (agentService as any).promptService;

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

      // Setup mocks
      mockPromptService.extractContextFromMessage = jest.fn().mockReturnValue({
        user_intent: 'greeting',
        keywords: ['help']
      });
      mockConversationService.determineConversationStage = jest.fn().mockReturnValue('introduction');
      mockGuidelineService.getApplicableGuidelines = jest.fn().mockResolvedValue(mockGuidelines);
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
          keywords: ['help']
        }
      });

      expect(mockPromptService.extractContextFromMessage).toHaveBeenCalledWith('Hello, I need help');
      expect(mockGuidelineService.getApplicableGuidelines).toHaveBeenCalled();
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
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation history', async () => {
      const conversationId = 'conv-123';
      const mockConversation = {
        id: conversationId,
        messages: [],
        context: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      mockConversationService.getConversation = jest.fn().mockResolvedValue(mockConversation);

      const result = await agentService.getConversationHistory(conversationId);

      expect(result).toEqual(mockConversation);
      expect(mockConversationService.getConversation).toHaveBeenCalledWith(conversationId);
    });
  });
});
