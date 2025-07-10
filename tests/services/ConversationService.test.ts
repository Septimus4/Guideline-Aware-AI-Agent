import { ConversationService } from '../../src/services/ConversationService';
import { ChatMessage, Conversation } from '../../src/types';

// Mock the database module
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  supabase: {
    from: jest.fn(() => mockQueryBuilder),
  },
}));

import { supabase } from '../../src/config/database';
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ConversationService', () => {
  let conversationService: ConversationService;

  beforeEach(() => {
    conversationService = new ConversationService();
    jest.clearAllMocks();
    // Reset the mock query builder
    Object.keys(mockQueryBuilder).forEach(key => {
      if (typeof mockQueryBuilder[key as keyof typeof mockQueryBuilder] === 'function') {
        (mockQueryBuilder[key as keyof typeof mockQueryBuilder] as jest.Mock).mockReturnThis();
      }
    });
  });

  describe('createConversation', () => {
    it('should create a conversation successfully', async () => {
      const mockMessages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      const mockContext = { user_intent: 'greeting' };

      const mockConversation: Conversation = {
        id: 'conv-123',
        messages: mockMessages,
        context: mockContext,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: mockConversation,
        error: null
      });

      const result = await conversationService.createConversation(mockMessages, mockContext);

      expect(result).toEqual(mockConversation);
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    });

    it('should throw error when creation fails', async () => {
      const mockMessages: ChatMessage[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z'
        }
      ];

      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(conversationService.createConversation(mockMessages))
        .rejects.toThrow('Failed to create conversation: Database error');
    });
  });

  describe('getConversation', () => {
    it('should retrieve a conversation successfully', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        messages: [],
        context: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: mockConversation,
        error: null
      });

      const result = await conversationService.getConversation('conv-123');

      expect(result).toEqual(mockConversation);
      expect(mockSupabase.from).toHaveBeenCalledWith('conversations');
    });

    it('should return null for non-existent conversation', async () => {
      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      });

      const result = await conversationService.getConversation('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'OTHER_ERROR' }
      });

      await expect(conversationService.getConversation('conv-123'))
        .rejects.toThrow('Failed to fetch conversation: Database error');
    });
  });

  describe('updateConversation', () => {
    it('should update conversation successfully', async () => {
      const mockUpdatedMessages = [
        { role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00Z' },
        { role: 'assistant' as const, content: 'Hi there!', timestamp: '2024-01-01T00:00:01Z' }
      ];

      const mockUpdatedConversation = {
        id: '123',
        messages: mockUpdatedMessages,
        context: { updated: true },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: new Date().toISOString()
      };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdatedConversation,
                error: null
              })
            })
          })
        })
      });

      const result = await conversationService.updateConversation('123', mockUpdatedMessages, { 
        user_intent: 'test_intent',
        conversation_stage: 'updated',
        applied_guidelines: ['guideline1']
      });

      expect(result).toEqual(mockUpdatedConversation);
    });

    it('should throw error when update fails', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Update failed' }
              })
            })
          })
        })
      });

      await expect(conversationService.updateConversation('123', [], {}))
        .rejects.toThrow('Failed to update conversation: Update failed');
    });
  });

  describe('addMessageToConversation', () => {
    it('should add message to existing conversation', async () => {
      const existingConversation = {
        id: '123',
        messages: [
          { role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00Z' }
        ],
        context: {},
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      };

      const newMessage = {
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: '2024-01-01T00:00:01Z'
      };

      const updatedConversation = {
        ...existingConversation,
        messages: [...existingConversation.messages, newMessage],
        context: { applied_guidelines: ['guideline1'] }
      };

      jest.spyOn(conversationService, 'getConversation').mockResolvedValue(existingConversation);
      jest.spyOn(conversationService, 'updateConversation').mockResolvedValue(updatedConversation);

      const result = await conversationService.addMessageToConversation('123', newMessage, ['guideline1']);

      expect(result).toEqual(updatedConversation);
      expect(conversationService.getConversation).toHaveBeenCalledWith('123');
    });

    it('should throw error when conversation not found', async () => {
      jest.spyOn(conversationService, 'getConversation').mockResolvedValue(null);

      const newMessage = {
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: '2024-01-01T00:00:01Z'
      };

      await expect(conversationService.addMessageToConversation('123', newMessage))
        .rejects.toThrow('Conversation not found');
    });
  });

  describe('determineConversationStage', () => {
    it('should return introduction for single user message', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello', timestamp: '2024-01-01T00:00:00Z' }
      ];

      const result = conversationService.determineConversationStage(messages);

      expect(result).toBe('introduction');
    });

    it('should return presentation for medium conversations', () => {
      const messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];
      // Add 5 user messages (should be presentation stage)
      for (let i = 0; i < 10; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: `2024-01-01T00:00:0${i}Z`
        });
      }

      const result = conversationService.determineConversationStage(messages);

      expect(result).toBe('presentation');
    });

    it('should return closing for very long conversations', () => {
      const messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }> = [];
      // Add 10 user messages (should be closing stage)
      for (let i = 0; i < 20; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: `2024-01-01T00:00:${i}Z`
        });
      }

      const result = conversationService.determineConversationStage(messages);

      expect(result).toBe('closing');
    });
  });
});
