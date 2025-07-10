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
    // Reset the mock query builder
    Object.keys(mockQueryBuilder).forEach(key => {
      if (typeof mockQueryBuilder[key as keyof typeof mockQueryBuilder] === 'function') {
        (mockQueryBuilder[key as keyof typeof mockQueryBuilder] as jest.Mock).mockReturnThis();
      }
    });
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
  });
});
