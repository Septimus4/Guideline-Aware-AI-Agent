import { ProductService } from '../../src/services/ProductService';
import { Product, ProductSearchParams } from '../../src/types';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('searchProducts', () => {
    it('should search products successfully', async () => {
      const mockResponse = {
        products: [
          {
            id: 1,
            title: 'Test Product',
            price: 19.99,
            category: 'test',
            description: 'Test description'
          }
        ],
        total: 1,
        skip: 0,
        limit: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const params: ProductSearchParams = { q: 'test', limit: 10 };
      const result = await productService.searchProducts(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dummyjson.com/products/search?q=test&limit=10'
      );
    });

    it('should search by category', async () => {
      const mockResponse = {
        products: [],
        total: 0,
        skip: 0,
        limit: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockResponse)
      } as any);

      const params: ProductSearchParams = { category: 'beauty' };
      const result = await productService.searchProducts(params);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://dummyjson.com/products/category/beauty?'
      );
    });

    it('should handle fetch errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      } as any);

      const params: ProductSearchParams = { q: 'test' };

      await expect(productService.searchProducts(params))
        .rejects.toThrow('Failed to search products');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const params: ProductSearchParams = { q: 'test' };

      await expect(productService.searchProducts(params))
        .rejects.toThrow('Failed to search products');
    });
  });

  describe('getProductById', () => {
    it('should get product by id successfully', async () => {
      const mockProduct: Product = {
        id: 1,
        title: 'Test Product',
        price: 19.99,
        category: 'test',
        description: 'Test description',
        brand: 'Test Brand',
        stock: 10,
        rating: 4.5,
        discountPercentage: 10,
        thumbnail: 'test-thumbnail.jpg',
        images: ['test-image.jpg']
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockProduct)
      } as any);

      const result = await productService.getProductById(1);

      expect(result).toEqual(mockProduct);
      expect(mockFetch).toHaveBeenCalledWith('https://dummyjson.com/products/1');
    });

    it('should handle product not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      } as any);

      await expect(productService.getProductById(999))
        .rejects.toThrow('Failed to fetch product');
    });
  });

  describe('getCategories', () => {
    it('should get categories successfully', async () => {
      const mockCategoriesResponse = [
        { slug: 'beauty', name: 'Beauty' },
        { slug: 'electronics', name: 'Electronics' },
        { slug: 'clothing', name: 'Clothing' }
      ];
      const mockCategories = ['beauty', 'electronics', 'clothing'];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockCategoriesResponse)
      } as any);

      const result = await productService.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockFetch).toHaveBeenCalledWith('https://dummyjson.com/products/categories');
    });

    it('should handle categories fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      } as any);

      await expect(productService.getCategories())
        .rejects.toThrow('Failed to fetch categories');
    });
  });

  describe('generateSmartSuggestions', () => {
    it('should generate keyword-based suggestions', async () => {
      const mockSearchResponse = {
        products: [
          {
            id: 1,
            title: 'Moisturizer',
            price: 15.99,
            category: 'beauty',
            description: 'Great moisturizer for skin care'
          }
        ],
        total: 1,
        skip: 0,
        limit: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResponse)
      } as any);

      const context = {
        userMessage: 'I need skincare help',
        keywords: ['skincare', 'moisturizer']
      };

      const result = await productService.generateSmartSuggestions(context);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        product: expect.objectContaining({
          id: 1,
          title: 'Moisturizer'
        }),
        type: 'keyword',
        confidence: expect.any(Number)
      });
    });

    it('should generate stage-based suggestions', async () => {
      const mockSearchResponse = {
        products: [
          {
            id: 2,
            title: 'Starter Kit',
            price: 25.99,
            category: 'beauty'
          }
        ],
        total: 1,
        skip: 0,
        limit: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResponse)
      } as any);

      const context = {
        conversationStage: 'introduction'
      };

      const result = await productService.generateSmartSuggestions(context);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: 'stage',
        confidence: expect.any(Number)
      });
    });

    it('should handle empty results', async () => {
      const mockSearchResponse = {
        products: [],
        total: 0,
        skip: 0,
        limit: 30
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResponse)
      } as any);

      const context = {
        keywords: ['nonexistent']
      };

      const result = await productService.generateSmartSuggestions(context);

      expect(result).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const context = {
        keywords: ['test']
      };

      const result = await productService.generateSmartSuggestions(context);

      expect(result).toEqual([]);
    });
  });

  describe('generateSmartSuggestions with different scenarios', () => {
    it('should generate suggestions with combined context', async () => {
      const mockSearchResponse = {
        products: [
          {
            id: 1,
            title: 'Comprehensive Product',
            description: 'Great for all needs',
            price: 29.99,
            category: 'general',
            discountPercentage: 20,
            rating: 4.7,
            stock: 150,
            thumbnail: 'comprehensive.jpg',
            images: ['comp1.jpg']
          }
        ],
        total: 1,
        skip: 0,
        limit: 30
      };

      // Mock multiple fetch calls for different suggestion types
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResponse)
      } as any);

      const context = {
        userMessage: 'I need something for work',
        keywords: ['work', 'professional'],
        userIntent: 'feature_inquiry',
        conversationStage: 'discovery'
      };

      const result = await productService.generateSmartSuggestions(context);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toMatchObject({
        product: expect.objectContaining({
          id: 1,
          title: 'Comprehensive Product'
        }),
        type: expect.any(String),
        confidence: expect.any(Number)
      });
    });

    it('should return popular products when no context matches', async () => {
      const mockSearchResponse = {
        products: [
          {
            id: 2,
            title: 'Popular Default',
            description: 'Popular choice',
            price: 19.99,
            category: 'popular',
            discountPercentage: 5,
            rating: 4.9,
            stock: 300,
            thumbnail: 'popular.jpg',
            images: ['pop1.jpg']
          }
        ],
        total: 1,
        skip: 0,
        limit: 30
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockSearchResponse)
      } as any);

      const context = {}; // Empty context

      const result = await productService.generateSmartSuggestions(context);

      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully and return empty array', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const context = {
        keywords: ['test'],
        userIntent: 'unknown_intent'
      };

      const result = await productService.generateSmartSuggestions(context);

      expect(result).toEqual([]);
    });
  });
});
