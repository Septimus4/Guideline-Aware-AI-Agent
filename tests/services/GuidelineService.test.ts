import { GuidelineService } from '../../src/services/GuidelineService';
import { CreateGuideline, Guideline } from '../../src/types';

// Mock the database module
const mockQueryBuilder = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn(),
  order: jest.fn(),
  contains: jest.fn().mockReturnThis(),
};

jest.mock('../../src/config/database', () => ({
  supabase: {
    from: jest.fn(() => mockQueryBuilder),
  },
}));

import { supabase } from '../../src/config/database';
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('GuidelineService', () => {
  let guidelineService: GuidelineService;

  beforeEach(() => {
    guidelineService = new GuidelineService();
    jest.clearAllMocks();
    
    // Reset all mocks to return this for chaining
    mockQueryBuilder.select.mockReturnThis();
    mockQueryBuilder.insert.mockReturnThis();
    mockQueryBuilder.update.mockReturnThis();
    mockQueryBuilder.delete.mockReturnThis();
    mockQueryBuilder.eq.mockReturnThis();
    mockQueryBuilder.contains.mockReturnThis();
    (mockSupabase.from as jest.Mock).mockReturnValue(mockQueryBuilder);
  });

  describe('createGuideline', () => {
    it('should create a guideline successfully', async () => {
      const mockGuideline: CreateGuideline = {
        name: 'Test Guideline',
        content: 'Test content',
        priority: 5,
        category: 'test',
        is_active: true,
        tags: ['test'],
        conditions: { context_keywords: ['test'] }
      };

      const mockResponse: Guideline = {
        id: '123',
        ...mockGuideline,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Setup the mock to return our test data
      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: mockResponse,
        error: null
      });

      const result = await guidelineService.createGuideline(mockGuideline);

      expect(result).toEqual(mockResponse);
      expect(mockSupabase.from).toHaveBeenCalledWith('guidelines');
    });

    it('should throw error when creation fails', async () => {
      const mockGuideline: CreateGuideline = {
        name: 'Test Guideline',
        content: 'Test content',
        priority: 5,
        category: 'test',
        is_active: true,
        tags: ['test'],
        conditions: { context_keywords: ['test'] }
      };

      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await expect(guidelineService.createGuideline(mockGuideline))
        .rejects.toThrow('Failed to create guideline: Database error');
    });
  });

  describe('getGuidelines', () => {
    it('should retrieve guidelines without filters', async () => {
      const mockGuidelines: Guideline[] = [
        {
          id: '1',
          name: 'Guideline 1',
          content: 'Content 1',
          priority: 5,
          category: 'test',
          is_active: true,
          tags: ['test'],
          conditions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      (mockQueryBuilder.order as jest.Mock).mockResolvedValue({
        data: mockGuidelines,
        error: null
      });

      const result = await guidelineService.getGuidelines();

      expect(result).toEqual(mockGuidelines);
      expect(mockSupabase.from).toHaveBeenCalledWith('guidelines');
    });
  });

  describe('getGuidelineById', () => {
    it('should retrieve a specific guideline', async () => {
      const mockGuideline: Guideline = {
        id: '123',
        name: 'Test Guideline',
        content: 'Test content',
        priority: 5,
        category: 'test',
        is_active: true,
        tags: ['test'],
        conditions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: mockGuideline,
        error: null
      });

      const result = await guidelineService.getGuidelineById('123');

      expect(result).toEqual(mockGuideline);
      expect(mockSupabase.from).toHaveBeenCalledWith('guidelines');
    });

    it('should return null for non-existent guideline', async () => {
      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // Not found error
      });

      const result = await guidelineService.getGuidelineById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for database errors', async () => {
      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Database connection error' }
      });

      await expect(guidelineService.getGuidelineById('123'))
        .rejects.toThrow('Failed to fetch guideline: Database connection error');
    });
  });

  describe('updateGuideline', () => {
    it('should update a guideline successfully', async () => {
      const mockUpdates = {
        name: 'Updated Guideline',
        content: 'Updated content',
        priority: 8
      };

      const mockUpdatedGuideline: Guideline = {
        id: '123',
        ...mockUpdates,
        category: 'test',
        is_active: true,
        tags: ['test'],
        conditions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: mockUpdatedGuideline,
        error: null
      });

      const result = await guidelineService.updateGuideline('123', mockUpdates);

      expect(result).toEqual(mockUpdatedGuideline);
      expect(mockSupabase.from).toHaveBeenCalledWith('guidelines');
      expect(mockQueryBuilder.update).toHaveBeenCalled();
    });

    it('should throw error when update fails', async () => {
      (mockQueryBuilder.single as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Update failed' }
      });

      await expect(guidelineService.updateGuideline('123', { name: 'Test' }))
        .rejects.toThrow('Failed to update guideline: Update failed');
    });
  });

  describe('deleteGuideline', () => {
    it('should delete a guideline successfully', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null
          })
        })
      });

      await expect(guidelineService.deleteGuideline('123')).resolves.not.toThrow();

      expect(mockSupabase.from).toHaveBeenCalledWith('guidelines');
    });

    it('should throw error when deletion fails', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Deletion failed' }
          })
        })
      });

      await expect(guidelineService.deleteGuideline('123'))
        .rejects.toThrow('Failed to delete guideline: Deletion failed');
    });
  });

  describe('getGuidelines with filters', () => {
    it('should filter by category', async () => {
      const mockGuidelines = [
        {
          id: '1',
          name: 'Guideline 1',
          content: 'Content 1',
          priority: 5,
          category: 'greeting',
          is_active: true,
          tags: ['test'],
          conditions: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      (mockQueryBuilder.order as jest.Mock).mockResolvedValue({
        data: mockGuidelines,
        error: null
      });

      await guidelineService.getGuidelines({ category: 'greeting' });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('category', 'greeting');
    });

    it('should filter by isActive', async () => {
      (mockQueryBuilder.order as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      await guidelineService.getGuidelines({ isActive: true });

      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('is_active', true);
    });

    it('should filter by tags', async () => {
      (mockQueryBuilder.order as jest.Mock).mockResolvedValue({
        data: [],
        error: null
      });

      await guidelineService.getGuidelines({ tags: ['greeting', 'formal'] });

      expect(mockQueryBuilder.contains).toHaveBeenCalledWith('tags', ['greeting', 'formal']);
    });

    it('should throw error when query fails', async () => {
      (mockQueryBuilder.order as jest.Mock).mockResolvedValue({
        data: null,
        error: { message: 'Query failed' }
      });

      await expect(guidelineService.getGuidelines())
        .rejects.toThrow('Failed to fetch guidelines: Query failed');
    });
  });

  describe('getApplicableGuidelines', () => {
    const mockGuidelines: Guideline[] = [
      {
        id: '1',
        name: 'Greeting Guideline',
        content: 'Always greet warmly',
        priority: 8,
        category: 'greeting',
        is_active: true,
        tags: ['greeting'],
        conditions: {
          user_intent: ['greeting'],
          conversation_stage: ['introduction'],
          context_keywords: ['hello', 'hi']
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '2',
        name: 'General Guideline',
        content: 'Be helpful',
        priority: 5,
        category: 'general',
        is_active: true,
        tags: ['general'],
        conditions: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: '3',
        name: 'Sales Guideline',
        content: 'Focus on closing',
        priority: 9,
        category: 'sales',
        is_active: true,
        tags: ['sales'],
        conditions: {
          conversation_stage: ['closing']
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    beforeEach(() => {
      // Mock getGuidelines to return our test data
      jest.spyOn(guidelineService, 'getGuidelines').mockResolvedValue(mockGuidelines);
    });

    it('should return guidelines matching user intent', async () => {
      const context = {
        userIntent: 'greeting',
        conversationStage: 'introduction',
        keywords: ['hello']
      };

      const result = await guidelineService.getApplicableGuidelines(context);

      expect(result).toHaveLength(2); // Greeting guideline + general guideline
      expect(result[0].priority).toBe(8); // Should be sorted by priority desc
      expect(result[1].priority).toBe(5);
    });

    it('should return guidelines matching conversation stage', async () => {
      const context = {
        conversationStage: 'closing'
      };

      const result = await guidelineService.getApplicableGuidelines(context);

      expect(result).toHaveLength(2); // Sales guideline + general guideline
      expect(result[0].priority).toBe(9); // Sales guideline should be first
    });

    it('should return guidelines matching keywords', async () => {
      const context = {
        keywords: ['hello', 'there']
      };

      const result = await guidelineService.getApplicableGuidelines(context);

      expect(result).toHaveLength(3); // All guidelines since general has no conditions, greeting matches keywords, sales has no keyword restrictions
      // Results should be sorted by priority (sales=9, greeting=8, general=5)
      expect(result[0].name).toBe('Sales Guideline');
      expect(result[1].name).toBe('Greeting Guideline');
      expect(result[2].name).toBe('General Guideline');
    });

    it('should return only general guideline when no context matches', async () => {
      const context = {
        userIntent: 'unknown',
        conversationStage: 'unknown',
        keywords: ['unknown']
      };

      const result = await guidelineService.getApplicableGuidelines(context);

      expect(result).toHaveLength(1); // Only general guideline
      expect(result[0].id).toBe('2');
    });

    it('should return all guidelines when no context provided', async () => {
      const result = await guidelineService.getApplicableGuidelines({});

      expect(result).toHaveLength(3); // All guidelines
      expect(result[0].priority).toBe(9); // Sorted by priority desc
    });
  });
});
