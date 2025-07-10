import { PromptService } from '../../src/services/PromptService';
import { Guideline, ChatMessage } from '../../src/types';
import OpenAI from 'openai';

// Mock OpenAI
jest.mock('openai');
const MockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('PromptService', () => {
  let promptService: PromptService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  beforeEach(() => {
    // Set up environment variable
    process.env.OPENAI_API_KEY = 'test-api-key';

    // Create mock OpenAI instance
    mockOpenAI = {
      chat: {
        completions: {
          create: jest.fn()
        }
      }
    } as any;

    MockOpenAI.mockImplementation(() => mockOpenAI);

    promptService = new PromptService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  describe('constructor', () => {
    it('should throw error if OPENAI_API_KEY is not provided', () => {
      delete process.env.OPENAI_API_KEY;
      
      expect(() => new PromptService())
        .toThrow('OPENAI_API_KEY environment variable is required');
    });

    it('should initialize OpenAI client with API key', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      
      new PromptService();
      
      expect(MockOpenAI).toHaveBeenCalledWith({
        apiKey: 'test-key'
      });
    });
  });

  describe('constructSystemPrompt', () => {
    it('should return base prompt when no guidelines provided', () => {
      const result = promptService.constructSystemPrompt([]);
      
      expect(result).toContain('You are a sales-focused AI agent');
      expect(result).toContain('CORE BEHAVIOR:');
      expect(result).toContain('PRODUCT RECOMMENDATIONS:');
    });

    it('should include guidelines in the prompt', () => {
      const guidelines: Guideline[] = [
        {
          id: '1',
          name: 'Be Friendly',
          content: 'Always greet customers warmly',
          priority: 8,
          category: 'greeting',
          is_active: true,
          tags: ['greeting'],
          conditions: {},
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        }
      ];

      const result = promptService.constructSystemPrompt(guidelines);
      
      expect(result).toContain('Be Friendly');
      expect(result).toContain('Always greet customers warmly');
      expect(result).toContain('Priority: 8/10');
      expect(result).toContain('[GREETING]');
    });

    it('should include context when provided', () => {
      const context = {
        user_intent: 'greeting',
        conversation_stage: 'introduction'
      };

      const result = promptService.constructSystemPrompt([], context);
      
      expect(result).toContain('CURRENT CONTEXT:');
      expect(result).toContain('user_intent: greeting');
      expect(result).toContain('conversation_stage: introduction');
    });
  });

  describe('extractContextFromMessage', () => {
    it('should extract basic context from message', () => {
      const message = 'Hello, I need help with skincare products';
      
      const result = promptService.extractContextFromMessage(message);
      
      expect(result).toHaveProperty('keywords');
      expect(result.keywords).toContain('help');
      expect(result.keywords).toContain('skincare');
      // Note: 'products' is not in the predefined keyword list, so it won't be extracted
    });

    it('should identify user intent', () => {
      const greetingMessage = 'Hello there!';
      const helpMessage = 'I need assistance';
      const purchaseMessage = 'I want to buy this';
      
      const greetingResult = promptService.extractContextFromMessage(greetingMessage);
      const helpResult = promptService.extractContextFromMessage(helpMessage);
      const purchaseResult = promptService.extractContextFromMessage(purchaseMessage);
      
      expect(greetingResult.userIntent).toBe('greeting');
      expect(helpResult.userIntent).toBe('help_request');
      expect(purchaseResult.userIntent).toBe('purchase_intent');
    });

    it('should handle empty or invalid messages', () => {
      const result = promptService.extractContextFromMessage('');
      
      expect(result).toHaveProperty('keywords');
      expect(result.keywords).toEqual([]);
      expect(result.userIntent).toBe('unknown');
    });

    it('should handle pricing inquiries', () => {
      const message = 'How much does this cost?';
      const result = promptService.extractContextFromMessage(message);
      
      expect(result.userIntent).toBe('pricing_inquiry');
    });

    it('should handle demo requests', () => {
      const message = 'Can I get a demo?';
      const result = promptService.extractContextFromMessage(message);
      
      expect(result.userIntent).toBe('demo_request');
    });

    it('should handle feature inquiries', () => {
      const message = 'What features does this have?';
      const result = promptService.extractContextFromMessage(message);
      
      expect(result.userIntent).toBe('feature_inquiry');
    });

    it('should handle comparison requests', () => {
      const message = 'Compare this to the alternative products';
      const result = promptService.extractContextFromMessage(message);
      
      expect(result.userIntent).toBe('comparison_request');
    });

    it('should handle objections', () => {
      const message = 'I have concerns about this product';
      const result = promptService.extractContextFromMessage(message);
      
      expect(result.userIntent).toBe('objection_handling');
    });

    it('should extract product keywords', () => {
      const message = 'I need a new smartphone for cooking';
      const result = promptService.extractContextFromMessage(message);
      
      expect(result.keywords).toContain('smartphone');
      expect(result.keywords).toContain('cooking');
    });
  });

  describe('generateResponse', () => {
    it('should generate response using OpenAI', async () => {
      const mockMessages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      const mockGuidelines: Guideline[] = [];

      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'Hello! How can I help you today?'
            }
          }
        ]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockCompletion);

      const result = await promptService.generateResponse(mockMessages, mockGuidelines);

      expect(result).toBe('Hello! How can I help you today?');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: expect.stringContaining('You are a sales-focused AI agent')
          },
          {
            role: 'user',
            content: 'Hello'
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
    });

    it('should handle OpenAI API errors', async () => {
      const mockMessages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      (mockOpenAI.chat.completions.create as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      await expect(promptService.generateResponse(mockMessages, []))
        .rejects.toThrow('Failed to generate response');
    });

    it('should include context in system prompt when provided', async () => {
      const mockMessages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      const context = { user_intent: 'greeting' };

      const mockCompletion = {
        choices: [
          {
            message: {
              content: 'Response'
            }
          }
        ]
      };

      (mockOpenAI.chat.completions.create as jest.Mock).mockResolvedValue(mockCompletion);

      await promptService.generateResponse(mockMessages, [], context);

      const systemMessage = (mockOpenAI.chat.completions.create as jest.Mock).mock.calls[0][0].messages[0];
      expect(systemMessage.content).toContain('user_intent: greeting');
    });
  });
});
