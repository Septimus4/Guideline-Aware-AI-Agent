import { ProductService } from '../../src/services/ProductService';
import { supabase } from '../../src/config/database';
import { Product, ProductSearchParams } from '../../src/types';

// Mock Supabase
jest.mock('../../src/config/database');
const mockSupabase = supabase as jest.Mocked<typeof supabase>;

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
    jest.clearAllMocks();
  });

  describe('constructor and configuration', () => {
    it('should initialize with default mapping config', () => {
      const service = new ProductService();
      const config = service.getCurrentConfigurations();
      expect(config).toBeDefined();
      expect(config.keywords).toBeDefined();
      expect(config.intents).toBeDefined();
      expect(config.stages).toBeDefined();
    });

    it('should accept custom mapping config', () => {
      const customConfig = {
        keywords: { testKeyword: { searchTerms: ['test'], priority: 1 } }
      };
      const service = new ProductService(customConfig);
      const config = service.getCurrentConfigurations();
      expect(config.keywords.testKeyword).toBeDefined();
    });

    it('should update mapping config', () => {
      const updateConfig = {
        keywords: { newKeyword: { searchTerms: ['new'], priority: 2 } }
      };
      productService.updateMappingConfig(updateConfig);
      const config = productService.getCurrentConfigurations();
      expect(config.keywords.newKeyword).toBeDefined();
    });

    it('should add keyword mapping', () => {
      productService.addKeywordMapping('electronics', {
        searchTerms: ['phone', 'laptop'],
        categories: ['electronics'],
        priority: 1
      });
      const config = productService.getCurrentConfigurations();
      expect(config.keywords.electronics).toBeDefined();
      expect(config.keywords.electronics.searchTerms).toContain('phone');
    });

    it('should add intent mapping', () => {
      productService.addIntentMapping('shopping', {
        categories: ['electronics'],
        priority: 'category',
        confidence: 0.8
      });
      const config = productService.getCurrentConfigurations();
      expect(config.intents.shopping).toBeDefined();
    });

    it('should add stage configuration', () => {
      productService.addStageConfiguration('browsing', {
        strategy: 'popular',
        reason: 'User is browsing',
        confidence: 0.7,
        limit: 10
      });
      const config = productService.getCurrentConfigurations();
      expect(config.stages.browsing).toBeDefined();
    });
  });

  describe('getAvailableCategories', () => {
    it('should fetch available categories successfully', async () => {
      const mockData = [
        { slug: 'electronics' },
        { slug: 'clothing' },
        { slug: 'books' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockData,
            error: null
          })
        })
      } as any);

      const categories = await productService.getAvailableCategories();
      expect(categories).toEqual(['electronics', 'clothing', 'books']);
      expect(mockSupabase.from).toHaveBeenCalledWith('product_categories');
    });

    it('should handle database error and return empty array', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      } as any);

      const categories = await productService.getAvailableCategories();
      expect(categories).toEqual([]);
    });

    it('should handle exception and return empty array', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection error');
      });

      const categories = await productService.getAvailableCategories();
      expect(categories).toEqual([]);
    });
  });

  describe('searchProducts', () => {
    const mockSupabaseProduct = {
      id: 1,
      external_id: 123,
      title: 'Test Product',
      description: 'Test description',
      price: 99.99,
      discount_percentage: 10,
      rating: 4.5,
      stock: 50,
      brand: 'TestBrand',
      category: 'electronics',
      thumbnail: 'test.jpg',
      images: ['test1.jpg', 'test2.jpg'],
      tags: ['tag1', 'tag2'],
      dimensions: { width: 10, height: 20 },
      warranty_information: '1 year',
      shipping_information: 'Free shipping',
      availability_status: 'In Stock',
      reviews: [{ rating: 5, comment: 'Great!' }],
      return_policy: '30 days',
      minimum_order_quantity: 1,
      meta_data: { featured: true },
      created_at: '2023-01-01',
      updated_at: '2023-01-02',
      last_sync_at: '2023-01-03'
    };

    it('should search products successfully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockSupabaseProduct],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const params: ProductSearchParams = {
        q: 'test',
        category: 'electronics',
        limit: 10,
        skip: 0
      };

      const result = await productService.searchProducts(params);

      expect(result.products).toHaveLength(1);
      expect(result.products[0].id).toBe(123);
      expect(result.products[0].title).toBe('Test Product');
      expect(result.total).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.skip).toBe(0);
    });

    it('should search products without filters', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [mockSupabaseProduct],
          error: null,
          count: 1
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const result = await productService.searchProducts({});

      expect(result.products).toHaveLength(1);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith('*');
    });

    it('should handle database error', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(productService.searchProducts({})).rejects.toThrow('Failed to fetch products: Database error');
    });

    it('should handle exception', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection error');
      });

      await expect(productService.searchProducts({})).rejects.toThrow('Failed to search products');
    });
  });

  describe('getProductById', () => {
    const mockSupabaseProduct = {
      id: 1,
      external_id: 123,
      title: 'Test Product',
      description: 'Test description',
      price: 99.99,
      discount_percentage: 10,
      rating: 4.5,
      stock: 50,
      brand: 'TestBrand',
      category: 'electronics',
      thumbnail: 'test.jpg',
      images: ['test1.jpg', 'test2.jpg'],
      tags: ['tag1', 'tag2'],
      dimensions: null,
      warranty_information: null,
      shipping_information: null,
      availability_status: null,
      reviews: null,
      return_policy: null,
      minimum_order_quantity: 1,
      meta_data: null,
      created_at: '2023-01-01',
      updated_at: '2023-01-02',
      last_sync_at: '2023-01-03'
    };

    it('should get product by id successfully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSupabaseProduct,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const product = await productService.getProductById(123);

      expect(product.id).toBe(123);
      expect(product.title).toBe('Test Product');
      expect(mockQueryBuilder.eq).toHaveBeenCalledWith('external_id', 123);
    });

    it('should handle product not found', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(productService.getProductById(999)).rejects.toThrow('Failed to fetch product');
    });

    it('should handle database error', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(productService.getProductById(123)).rejects.toThrow('Failed to fetch product: Database error');
    });

    it('should handle exception', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection error');
      });

      await expect(productService.getProductById(123)).rejects.toThrow('Failed to fetch product');
    });
  });

  describe('getCategories', () => {
    it('should get categories successfully', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [
            { slug: 'electronics' },
            { slug: 'clothing' },
            { slug: 'books' }
          ],
          error: null
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      const categories = await productService.getCategories();

      expect(categories).toEqual(['electronics', 'clothing', 'books']);
      expect(mockSupabase.from).toHaveBeenCalledWith('product_categories');
    });

    it('should handle database error', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      mockSupabase.from.mockReturnValue(mockQueryBuilder as any);

      await expect(productService.getCategories()).rejects.toThrow('Failed to fetch categories: Database error');
    });

    it('should handle exception', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection error');
      });

      await expect(productService.getCategories()).rejects.toThrow('Failed to fetch categories');
    });
  });

  describe('transformSupabaseProduct', () => {
    it('should transform product with all fields', () => {
      const supabaseProduct = {
        id: 1,
        external_id: 123,
        title: 'Test Product',
        description: 'Test description',
        price: 99.99,
        discount_percentage: 10,
        rating: 4.5,
        stock: 50,
        brand: 'TestBrand',
        category: 'electronics',
        thumbnail: 'test.jpg',
        images: ['test1.jpg'],
        tags: ['tag1'],
        dimensions: { width: 10 },
        warranty_information: '1 year',
        shipping_information: 'Free shipping',
        availability_status: 'In Stock',
        reviews: [{ rating: 5 }],
        return_policy: '30 days',
        minimum_order_quantity: 1,
        meta_data: { featured: true },
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
        last_sync_at: '2023-01-03'
      };

      // Access the private method via reflection for testing
      const transformed = (productService as any).transformSupabaseProduct(supabaseProduct);

      expect(transformed.id).toBe(123);
      expect(transformed.title).toBe('Test Product');
      expect(transformed.brand).toBe('TestBrand');
      expect(transformed.dimensions).toEqual({ width: 10 });
    });

    it('should handle null/undefined fields', () => {
      const supabaseProduct = {
        id: 1,
        external_id: 123,
        title: 'Test Product',
        description: null,
        price: 99.99,
        discount_percentage: 10,
        rating: 4.5,
        stock: 50,
        brand: null,
        category: 'electronics',
        thumbnail: null,
        images: [],
        tags: [],
        dimensions: null,
        warranty_information: null,
        shipping_information: null,
        availability_status: null,
        reviews: null,
        return_policy: null,
        minimum_order_quantity: 1,
        meta_data: null,
        created_at: '2023-01-01',
        updated_at: '2023-01-02',
        last_sync_at: '2023-01-03'
      };

      const transformed = (productService as any).transformSupabaseProduct(supabaseProduct);

      expect(transformed.description).toBe('');
      expect(transformed.brand).toBeUndefined();
      expect(transformed.thumbnail).toBe('');
      expect(transformed.dimensions).toBeUndefined();
      expect(transformed.warrantyInformation).toBeUndefined();
    });
  });
});
