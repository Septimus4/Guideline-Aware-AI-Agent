import { Product, ProductSearchParams, ProductSuggestion } from '../types';
import { supabase } from '../config/database';
import { defaultMappingConfig, ProductMappingConfig } from '../config/data-sync';

interface SupabaseProduct {
  id: number;
  external_id: number;
  title: string;
  description: string | null;
  price: number;
  discount_percentage: number;
  rating: number;
  stock: number;
  brand: string | null;
  category: string;
  thumbnail: string | null;
  images: string[];
  tags: string[];
  dimensions: any | null;
  warranty_information: string | null;
  shipping_information: string | null;
  availability_status: string | null;
  reviews: any | null;
  return_policy: string | null;
  minimum_order_quantity: number;
  meta_data: any | null;
  created_at: string;
  updated_at: string;
  last_sync_at: string;
}

interface DummyJSONResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export class ProductService {
  private mappingConfig: ProductMappingConfig;
  
  constructor(mappingConfig?: Partial<ProductMappingConfig>) {
    this.mappingConfig = {
      ...defaultMappingConfig,
      ...mappingConfig
    };
  }

  // Configuration methods for dynamic mapping updates
  public updateMappingConfig(config: Partial<ProductMappingConfig>): void {
    this.mappingConfig = {
      ...this.mappingConfig,
      ...config,
      keywords: { ...this.mappingConfig.keywords, ...config.keywords },
      intents: { ...this.mappingConfig.intents, ...config.intents },
      stages: { ...this.mappingConfig.stages, ...config.stages }
    };
  }

  public addKeywordMapping(keyword: string, config: { searchTerms: string[], categories?: string[], priority: number }): void {
    this.mappingConfig.keywords[keyword.toLowerCase()] = config;
  }

  public addIntentMapping(intent: string, config: { categories: string[], searchTerms?: string[], priority: 'category' | 'search', confidence: number }): void {
    this.mappingConfig.intents[intent] = config;
  }

  public addStageConfiguration(stage: string, config: { strategy: 'popular' | 'featured' | 'discounted' | 'top_rated' | 'mixed', reason: string, confidence: number, limit: number }): void {
    this.mappingConfig.stages[stage] = config;
  }

  // Get current configurations
  public getCurrentConfigurations(): ProductMappingConfig {
    return { ...this.mappingConfig };
  }

  // Get available categories from database
  public async getAvailableCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('slug')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        return [];
      }

      return data.map(cat => cat.slug);
    } catch (error) {
      console.error('Error fetching available categories:', error);
      return [];
    }
  }

  // Transform Supabase product to our Product type
  private transformSupabaseProduct(product: SupabaseProduct): Product {
    return {
      id: product.external_id, // Use external_id as the API id
      title: product.title,
      description: product.description || '',
      price: product.price,
      discountPercentage: product.discount_percentage,
      rating: product.rating,
      stock: product.stock,
      brand: product.brand || undefined,
      category: product.category,
      thumbnail: product.thumbnail || '',
      images: product.images,
      tags: product.tags,
      dimensions: product.dimensions ? JSON.parse(JSON.stringify(product.dimensions)) : undefined,
      warrantyInformation: product.warranty_information || undefined,
      shippingInformation: product.shipping_information || undefined,
      availabilityStatus: product.availability_status || undefined,
      reviews: product.reviews ? JSON.parse(JSON.stringify(product.reviews)) : undefined,
      returnPolicy: product.return_policy || undefined,
      minimumOrderQuantity: product.minimum_order_quantity,
      meta: product.meta_data ? JSON.parse(JSON.stringify(product.meta_data)) : undefined,
    };
  }

  async searchProducts(params: ProductSearchParams): Promise<DummyJSONResponse> {
    try {
      let query = supabase
        .from('products')
        .select('*');

      // Apply filters
      if (params.category) {
        query = query.eq('category', params.category);
      }

      // Apply search if query provided
      if (params.q) {
        // Use full-text search on title, description, brand, and tags
        const searchTerm = params.q.trim();
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
      }

      // Apply pagination
      const limit = params.limit || 20;
      const skip = params.skip || 0;
      
      query = query
        .range(skip, skip + limit - 1)
        .order('rating', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
      }

      const products = (data || []).map(this.transformSupabaseProduct.bind(this));

      return {
        products,
        total: count || 0,
        skip,
        limit
      };
    } catch (error) {
      console.error('Error searching products:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch products:')) {
        throw error;
      }
      throw new Error('Failed to search products');
    }
  }

  async getProductById(id: number): Promise<Product> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('external_id', id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch product: ${error.message}`);
      }

      if (!data) {
        throw new Error('Product not found');
      }

      return this.transformSupabaseProduct(data);
    } catch (error) {
      console.error('Error fetching product:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch product:')) {
        throw error;
      }
      throw new Error('Failed to fetch product');
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .select('slug')
        .order('name');

      if (error) {
        throw new Error(`Failed to fetch categories: ${error.message}`);
      }

      return (data || []).map(cat => cat.slug);
    } catch (error) {
      console.error('Error fetching categories:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch categories:')) {
        throw error;
      }
      throw new Error('Failed to fetch categories');
    }
  }

  async generateSmartSuggestions(context: {
    userMessage?: string;
    conversationStage?: string;
    userIntent?: string;
    keywords?: string[];
    budgetRange?: string;
    previousProducts?: number[];
    isTopicChange?: boolean;
  }): Promise<ProductSuggestion[]> {
    try {
      const suggestions: ProductSuggestion[] = [];
      
      // If topic change detected, prioritize keywords over previous context
      if (context.isTopicChange && context.keywords && context.keywords.length > 0) {
        console.log('Topic change detected, prioritizing new keywords:', context.keywords);
        
        // Also check for contextual suggestions with the new message
        if (context.userMessage) {
          const contextualSuggestions = await this.getContextualSuggestions(context.userMessage, context.budgetRange);
          suggestions.push(...contextualSuggestions);
        }
        
        const keywordSuggestions = await this.getProductsByKeywords(context.keywords, context.budgetRange);
        suggestions.push(...keywordSuggestions);
        
        // Add intent-based suggestions if we have user intent
        if (context.userIntent) {
          const intentSuggestions = await this.getProductsByIntent(context.userIntent);
          suggestions.push(...intentSuggestions);
        }
        
        // Don't add stage-based or fallback suggestions for topic changes
        // to avoid contaminating with irrelevant products
      } else {
        // Normal flow when no topic change
        
        // 1. Message-based contextual suggestions
        if (context.userMessage) {
          const contextualSuggestions = await this.getContextualSuggestions(context.userMessage, context.budgetRange);
          suggestions.push(...contextualSuggestions);
        }
        
        // 2. Enhanced keyword-based suggestions
        if (context.keywords && context.keywords.length > 0) {
          const keywordSuggestions = await this.getProductsByKeywords(context.keywords, context.budgetRange);
          suggestions.push(...keywordSuggestions);
        }
        
        // 3. Intent-based suggestions
        if (context.userIntent) {
          const intentSuggestions = await this.getProductsByIntent(context.userIntent);
          suggestions.push(...intentSuggestions);
        }
        
        // 4. Stage-based suggestions
        if (context.conversationStage) {
          const stageSuggestions = await this.getProductsByStage(context.conversationStage);
          suggestions.push(...stageSuggestions);
        }
        
        // 5. Fallback: Popular products
        if (suggestions.length === 0) {
          const popularSuggestions = await this.getPopularProducts();
          suggestions.push(...popularSuggestions);
        }
      }
      
      // Remove duplicates and limit results
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
      return uniqueSuggestions.slice(0, 5);
      
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return [];
    }
  }

  private async getContextualSuggestions(userMessage: string, budgetRange?: string): Promise<ProductSuggestion[]> {
    const lowerMessage = userMessage.toLowerCase();
    const suggestions: ProductSuggestion[] = [];
    
    // Extract budget constraints from budgetRange
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    
    if (budgetRange) {
      if (budgetRange.includes('-') && budgetRange !== 'budget-friendly' && budgetRange !== 'premium') {
        const [min, max] = budgetRange.split('-').map(p => parseFloat(p.trim()));
        if (!isNaN(min) && !isNaN(max)) {
          minPrice = min;
          maxPrice = max;
        }
      } else if (budgetRange === 'budget-friendly') {
        maxPrice = 300;
      } else if (budgetRange === 'premium') {
        minPrice = 800;
      } else if (budgetRange === 'under-100') {
        maxPrice = 100;
      } else if (budgetRange === '100-300') {
        minPrice = 100;
        maxPrice = 300;
      } else if (budgetRange === '300-500') {
        minPrice = 300;
        maxPrice = 500;
      } else if (budgetRange === '500-1000') {
        minPrice = 500;
        maxPrice = 1000;
      } else if (budgetRange === '1000-2000') {
        minPrice = 1000;
        maxPrice = 2000;
      }
    }
    
    // Define brand and product type patterns with their associated search terms
    const productPatterns = [
      // Electronics patterns - more specific searches
      { 
        patterns: ['iphone', 'apple phone'], 
        searchTerms: ['iphone'], // Only search for actual iPhones
        brandFilter: 'Apple',
        categoryFilter: 'smartphones',
        reason: 'iPhone model as requested',
        confidence: 0.9
      },
      { 
        patterns: ['android', 'samsung'], 
        searchTerms: ['android', 'samsung'],
        reason: 'Android device as requested',
        confidence: 0.9
      },
      { 
        patterns: ['google pixel'], 
        searchTerms: ['pixel'],
        brandFilter: 'Google',
        reason: 'Google Pixel as requested',
        confidence: 0.9
      },
      { 
        patterns: ['laptop', 'computer', 'macbook'], 
        searchTerms: ['laptop'],
        categoryFilter: 'laptops',
        reason: 'Computer device as requested',
        confidence: 0.9
      },
      { 
        patterns: ['tablet', 'ipad'], 
        searchTerms: ['tablet', 'ipad'],
        reason: 'Tablet device as requested',
        confidence: 0.9
      },
      // Feature patterns
      { 
        patterns: ['camera', 'photo', 'photography'], 
        searchTerms: ['camera', 'smartphone'],
        reason: 'Great for photography',
        confidence: 0.8
      },
      { 
        patterns: ['gaming', 'games', 'performance'], 
        searchTerms: ['gaming', 'laptop'],
        reason: 'Excellent for gaming',
        confidence: 0.8
      }
    ];
    
    // Check for matching patterns
    for (const pattern of productPatterns) {
      const matchesPattern = pattern.patterns.some(p => lowerMessage.includes(p));
      
      if (matchesPattern) {
        for (const searchTerm of pattern.searchTerms.slice(0, 2)) {
          try {
            // Build search params
            const searchParams: any = { q: searchTerm, limit: 10 };
            if (pattern.categoryFilter) {
              searchParams.category = pattern.categoryFilter;
            }
            
            const results = await this.searchProducts(searchParams);
            let filteredProducts = results.products;
            
            // Apply brand filter if specified
            if (pattern.brandFilter) {
              filteredProducts = filteredProducts.filter(p => 
                p.brand?.toLowerCase() === pattern.brandFilter!.toLowerCase()
              );
            }
            
            // Apply price filtering based on budget
            if (minPrice !== undefined) {
              filteredProducts = filteredProducts.filter(p => p.price >= minPrice!);
            }
            if (maxPrice !== undefined) {
              filteredProducts = filteredProducts.filter(p => p.price <= maxPrice!);
            }
            
            // If no products found within budget, find closest alternatives
            if (filteredProducts.length === 0 && pattern.brandFilter) {
              console.log(`No ${pattern.brandFilter} products found in budget, looking for closest alternatives...`);
              
              // Get all products from the search and find closest to budget
              const allProducts = results.products.filter(p => 
                p.brand?.toLowerCase() === pattern.brandFilter!.toLowerCase() && p.stock > 0
              );
              
              if (allProducts.length > 0) {
                // Sort by distance from budget range
                const sortedByPrice = allProducts.sort((a, b) => {
                  if (maxPrice !== undefined && minPrice !== undefined) {
                    // Find closest to the budget range
                    const midPoint = (minPrice + maxPrice) / 2;
                    const aDiff = Math.abs(a.price - midPoint);
                    const bDiff = Math.abs(b.price - midPoint);
                    return aDiff - bDiff;
                  } else if (maxPrice !== undefined) {
                    const aDiff = Math.abs(a.price - maxPrice);
                    const bDiff = Math.abs(b.price - maxPrice);
                    return aDiff - bDiff;
                  }
                  return a.price - b.price;
                });
                
                // Take the closest 1-2 options
                filteredProducts = sortedByPrice.slice(0, 2);
              }
            }
            
            // Sort by rating and price appropriateness
            filteredProducts = filteredProducts
              .sort((a, b) => {
                // Prioritize in-stock products
                if (a.stock > 0 && b.stock === 0) return -1;
                if (a.stock === 0 && b.stock > 0) return 1;
                
                // Then by rating
                if (Math.abs(a.rating - b.rating) > 0.2) {
                  return b.rating - a.rating;
                }
                
                // Finally by price (prefer products closer to middle of budget range)
                if (minPrice !== undefined && maxPrice !== undefined) {
                  const midPoint = (minPrice + maxPrice) / 2;
                  const aDiff = Math.abs(a.price - midPoint);
                  const bDiff = Math.abs(b.price - midPoint);
                  return aDiff - bDiff;
                }
                
                return a.price - b.price;
              });
            
            for (const product of filteredProducts.slice(0, 3)) {
              let reason = pattern.reason;
              
              // Handle budget-specific messaging
              if (minPrice !== undefined || maxPrice !== undefined) {
                if (product.price < (minPrice || 0)) {
                  reason += ` (closest option below budget)`;
                } else if (product.price > (maxPrice || Infinity)) {
                  reason += ` (closest option above budget)`;
                } else {
                  reason += ` within your budget`;
                }
              }
              
              suggestions.push({
                product,
                reason,
                confidence: pattern.confidence,
                type: 'contextual'
              });
            }
            
            // If this is an iPhone search and we have budget constraints,
            // also suggest alternative smartphones in the budget range
            if (searchTerm === 'iphone' && minPrice !== undefined && maxPrice !== undefined) {
              console.log('Adding alternative smartphone suggestions for iPhone search...');
              
              try {
                const alternatives = await this.searchProducts({ category: 'smartphones', limit: 10 });
                const budgetAlternatives = alternatives.products
                  .filter(p => p.price >= minPrice! && p.price <= maxPrice! && p.stock > 0)
                  .sort((a, b) => b.rating - a.rating)
                  .slice(0, 3);
                
                for (const alt of budgetAlternatives) {
                  suggestions.push({
                    product: alt,
                    reason: `Alternative smartphone within your budget`,
                    confidence: 0.7,
                    type: 'contextual'
                  });
                }
              } catch (error) {
                console.warn('Failed to get alternative smartphones:', error);
              }
            }
          } catch (error) {
            console.warn(`Failed to search for contextual term: ${searchTerm}`, error);
          }
        }
        break; // Only match the first pattern to avoid duplication
      }
    }
    
    return suggestions;
  }

  private async getProductsByKeywords(keywords: string[], budgetRange?: string): Promise<ProductSuggestion[]> {
    const suggestions: ProductSuggestion[] = [];
    
    // Extract budget constraints from budgetRange
    let minPrice: number | undefined;
    let maxPrice: number | undefined;
    
    if (budgetRange) {
      if (budgetRange.includes('-') && budgetRange !== 'budget-friendly' && budgetRange !== 'premium') {
        const [min, max] = budgetRange.split('-').map(p => parseFloat(p.trim()));
        if (!isNaN(min) && !isNaN(max)) {
          minPrice = min;
          maxPrice = max;
        }
      } else if (budgetRange === 'budget-friendly') {
        maxPrice = 300;
      } else if (budgetRange === 'premium') {
        minPrice = 800;
      } else if (budgetRange === 'under-100') {
        maxPrice = 100;
      } else if (budgetRange === '100-300') {
        minPrice = 100;
        maxPrice = 300;
      } else if (budgetRange === '300-500') {
        minPrice = 300;
        maxPrice = 500;
      } else if (budgetRange === '500-1000') {
        minPrice = 500;
        maxPrice = 1000;
      } else if (budgetRange === '1000-2000') {
        minPrice = 1000;
        maxPrice = 2000;
      }
    }
    
    for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords for performance
      try {
        const lowerKeyword = keyword.toLowerCase();
        
        // Check mapping configuration
        const keywordConfig = this.mappingConfig.keywords[lowerKeyword];
        
        if (keywordConfig) {
          // Try category search first if available
          if (keywordConfig.categories && keywordConfig.categories.length > 0) {
            for (const category of keywordConfig.categories.slice(0, 1)) { // Use first category
              const result = await this.searchProducts({ category, limit: 10 });
              let filteredProducts = result.products;
              
              // Apply budget filtering
              if (minPrice !== undefined) {
                filteredProducts = filteredProducts.filter(p => p.price >= minPrice!);
              }
              if (maxPrice !== undefined) {
                filteredProducts = filteredProducts.filter(p => p.price <= maxPrice!);
              }
              
              // Sort by rating and relevance
              filteredProducts = filteredProducts
                .filter(p => p.stock > 0) // Only in-stock products
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 2);
              
              for (const product of filteredProducts) {
                let reason = `Matches your interest in "${keyword}"`;
                if (minPrice !== undefined || maxPrice !== undefined) {
                  reason += ` within your budget`;
                }
                
                suggestions.push({
                  product,
                  reason,
                  confidence: 0.85,
                  type: 'keyword'
                });
              }
            }
          }
          
          // Fallback to search terms if no category results or no categories
          if ((suggestions.length === 0 || !keywordConfig.categories) && keywordConfig.searchTerms.length > 0) {
            for (const searchTerm of keywordConfig.searchTerms.slice(0, 2)) {
              const result = await this.searchProducts({ q: searchTerm, limit: 10 });
              let filteredProducts = result.products;
              
              // Apply budget filtering
              if (minPrice !== undefined) {
                filteredProducts = filteredProducts.filter(p => p.price >= minPrice!);
              }
              if (maxPrice !== undefined) {
                filteredProducts = filteredProducts.filter(p => p.price <= maxPrice!);
              }
              
              // Sort by rating and relevance
              filteredProducts = filteredProducts
                .filter(p => p.stock > 0) // Only in-stock products
                .sort((a, b) => b.rating - a.rating)
                .slice(0, 2);
              
              for (const product of filteredProducts) {
                let reason = `Related to "${keyword}"`;
                if (minPrice !== undefined || maxPrice !== undefined) {
                  reason += ` within your budget`;
                }
                
                suggestions.push({
                  product,
                  reason,
                  confidence: 0.8,
                  type: 'keyword'
                });
              }
            }
          }
        } else {
          // For unknown keywords, try direct search
          const result = await this.searchProducts({ q: keyword, limit: 10 });
          let filteredProducts = result.products;
          
          // Apply budget filtering
          if (minPrice !== undefined) {
            filteredProducts = filteredProducts.filter(p => p.price >= minPrice!);
          }
          if (maxPrice !== undefined) {
            filteredProducts = filteredProducts.filter(p => p.price <= maxPrice!);
          }
          
          // Sort by rating and relevance
          filteredProducts = filteredProducts
            .filter(p => p.stock > 0) // Only in-stock products
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 2);
          
          for (const product of filteredProducts) {
            let reason = `Matches "${keyword}"`;
            if (minPrice !== undefined || maxPrice !== undefined) {
              reason += ` within your budget`;
            }
            
            suggestions.push({
              product,
              reason,
              confidence: 0.7,
              type: 'keyword'
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to search for keyword: ${keyword}`, error);
      }
    }
    
    return suggestions;
  }

  private async getProductsByIntent(intent: string): Promise<ProductSuggestion[]> {
    const intentInfo = this.mappingConfig.intents[intent];
    if (!intentInfo) {
      // For unknown intents, don't default to anything specific
      return [];
    }

    const suggestions: ProductSuggestion[] = [];

    // Use priority to determine approach
    if (intentInfo.priority === 'category' && intentInfo.categories.length > 0) {
      // Try category search first
      for (const category of intentInfo.categories.slice(0, 2)) {
        try {
          const result = await this.searchProducts({ category, limit: 2 });
          for (const product of result.products) {
            suggestions.push({
              product,
              reason: `Recommended for ${intent.replace(/_/g, ' ')}`,
              confidence: intentInfo.confidence,
              type: 'intent'
            });
          }
        } catch (error) {
          console.warn(`Failed to get products for category: ${category}`, error);
        }
      }
      
      // Fallback to search terms if no category results
      if (suggestions.length === 0 && intentInfo.searchTerms && intentInfo.searchTerms.length > 0) {
        for (const searchTerm of intentInfo.searchTerms.slice(0, 2)) {
          try {
            const result = await this.searchProducts({ q: searchTerm, limit: 2 });
            for (const product of result.products) {
              suggestions.push({
                product,
                reason: `Related to ${intent.replace(/_/g, ' ')}`,
                confidence: intentInfo.confidence * 0.8, // Slightly lower confidence for fallback
                type: 'intent'
              });
            }
          } catch (error) {
            console.warn(`Failed to search for term: ${searchTerm}`, error);
          }
        }
      }
    } else if (intentInfo.searchTerms && intentInfo.searchTerms.length > 0) {
      // Use search terms for general intents
      for (const searchTerm of intentInfo.searchTerms.slice(0, 2)) {
        try {
          const result = await this.searchProducts({ q: searchTerm, limit: 2 });
          for (const product of result.products) {
            suggestions.push({
              product,
              reason: `Recommended for ${intent.replace(/_/g, ' ')}`,
              confidence: intentInfo.confidence,
              type: 'intent'
            });
          }
        } catch (error) {
          console.warn(`Failed to search for term: ${searchTerm}`, error);
        }
      }
    }

    return suggestions;
  }

  private async getProductsByStage(stage: string): Promise<ProductSuggestion[]> {
    const stageConfig = this.mappingConfig.stages[stage];
    if (!stageConfig) {
      return [];
    }

    const suggestions: ProductSuggestion[] = [];
    
    try {
      switch (stageConfig.strategy) {
        case 'popular': {
          const popularProducts = await this.getPopularProducts();
          suggestions.push(...popularProducts.slice(0, stageConfig.limit));
          break;
        }
          
        case 'top_rated': {
          const topRatedProducts = await this.getTopRatedProducts(undefined, stageConfig.limit);
          for (const product of topRatedProducts) {
            suggestions.push({
              product,
              reason: stageConfig.reason,
              confidence: stageConfig.confidence,
              type: 'stage'
            });
          }
          break;
        }
          
        case 'discounted': {
          const discountedProducts = await this.getDiscountedProducts(10, stageConfig.limit);
          for (const product of discountedProducts) {
            suggestions.push({
              product,
              reason: stageConfig.reason,
              confidence: stageConfig.confidence,
              type: 'stage'
            });
          }
          break;
        }
          
        case 'featured': {
          // For featured, get a mix of top-rated and popular
          const featuredProducts = await this.getTopRatedProducts(undefined, Math.ceil(stageConfig.limit / 2));
          const additionalProducts = await this.getPopularProducts();
          
          for (const product of featuredProducts) {
            suggestions.push({
              product,
              reason: stageConfig.reason,
              confidence: stageConfig.confidence,
              type: 'stage'
            });
          }
          
          // Add popular products if we need more
          const remainingSlots = stageConfig.limit - featuredProducts.length;
          for (const popularSuggestion of additionalProducts.slice(0, remainingSlots)) {
            suggestions.push({
              ...popularSuggestion,
              reason: stageConfig.reason,
              confidence: stageConfig.confidence,
              type: 'stage'
            });
          }
          break;
        }
          
        case 'mixed': {
          // Mix of different types
          const mixLimit = Math.ceil(stageConfig.limit / 3);
          
          // Get some popular products
          const somePop = await this.getPopularProducts();
          suggestions.push(...somePop.slice(0, mixLimit).map(s => ({
            ...s,
            reason: stageConfig.reason,
            confidence: stageConfig.confidence,
            type: 'stage' as const
          })));
          
          // Get some top-rated products
          const someTop = await this.getTopRatedProducts(undefined, mixLimit);
          for (const product of someTop) {
            suggestions.push({
              product,
              reason: stageConfig.reason,
              confidence: stageConfig.confidence,
              type: 'stage'
            });
          }
          
          // Get some discounted products
          const someDisc = await this.getDiscountedProducts(5, mixLimit);
          for (const product of someDisc) {
            suggestions.push({
              product,
              reason: stageConfig.reason,
              confidence: stageConfig.confidence,
              type: 'stage'
            });
          }
          break;
        }
      }
      
      // Update reason and confidence for all suggestions
      suggestions.forEach(suggestion => {
        suggestion.reason = stageConfig.reason;
        suggestion.confidence = stageConfig.confidence;
      });
      
    } catch (error) {
      console.warn(`Failed to get products for stage: ${stage}`, error);
    }

    return suggestions.slice(0, stageConfig.limit);
  }

  private async getPopularProducts(): Promise<ProductSuggestion[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('rating', { ascending: false })
        .limit(4);

      if (error) {
        console.error('Error fetching popular products:', error);
        return [];
      }

      return (data || []).map(product => ({
        product: this.transformSupabaseProduct(product),
        reason: 'Popular choice',
        confidence: 0.5,
        type: 'popular'
      }));
    } catch (error) {
      console.error('Failed to get popular products:', error);
      return [];
    }
  }

  async getRelatedProducts(productId: number, limit: number = 4): Promise<Product[]> {
    try {
      // Get the original product to find its category
      const { data: originalProduct, error: originalError } = await supabase
        .from('products')
        .select('category')
        .eq('external_id', productId)
        .single();

      if (originalError || !originalProduct) {
        console.error('Error fetching original product:', originalError);
        return [];
      }

      // Get related products from the same category
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', originalProduct.category)
        .neq('external_id', productId)
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching related products:', error);
        return [];
      }

      return (data || []).map(this.transformSupabaseProduct.bind(this));
    } catch (error) {
      console.error('Error getting related products:', error);
      return [];
    }
  }

  // Shopping-specific methods
  async getProductsByPriceRange(minPrice: number, maxPrice: number, category?: string): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*')
        .gte('price', minPrice)
        .lte('price', maxPrice);

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query
        .order('rating', { ascending: false })
        .limit(30);

      if (error) {
        console.error('Error getting products by price range:', error);
        return [];
      }

      return (data || []).map(this.transformSupabaseProduct.bind(this));
    } catch (error) {
      console.error('Error getting products by price range:', error);
      return [];
    }
  }

  async getTopRatedProducts(category?: string, limit: number = 10): Promise<Product[]> {
    try {
      let query = supabase
        .from('products')
        .select('*');

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query
        .order('rating', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting top rated products:', error);
        return [];
      }

      return (data || []).map(this.transformSupabaseProduct.bind(this));
    } catch (error) {
      console.error('Error getting top rated products:', error);
      return [];
    }
  }

  async getDiscountedProducts(minDiscount: number = 10, limit: number = 10): Promise<Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .gte('discount_percentage', minDiscount)
        .order('discount_percentage', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error getting discounted products:', error);
        return [];
      }

      return (data || []).map(this.transformSupabaseProduct.bind(this));
    } catch (error) {
      console.error('Error getting discounted products:', error);
      return [];
    }
  }

  async searchProductsAdvanced(criteria: {
    query?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    sortBy?: 'price' | 'rating' | 'discount' | 'popularity';
    limit?: number;
  }): Promise<DummyJSONResponse> {
    try {
      let query = supabase
        .from('products')
        .select('*', { count: 'exact' });

      // Apply filters
      if (criteria.category) {
        query = query.eq('category', criteria.category);
      }

      if (criteria.query) {
        const searchTerm = criteria.query.trim();
        query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
      }

      if (criteria.minPrice !== undefined) {
        query = query.gte('price', criteria.minPrice);
      }
      
      if (criteria.maxPrice !== undefined) {
        query = query.lte('price', criteria.maxPrice);
      }
      
      if (criteria.minRating !== undefined) {
        query = query.gte('rating', criteria.minRating);
      }

      // Apply sorting
      if (criteria.sortBy) {
        switch (criteria.sortBy) {
          case 'price':
            query = query.order('price', { ascending: true });
            break;
          case 'rating':
            query = query.order('rating', { ascending: false });
            break;
          case 'discount':
            query = query.order('discount_percentage', { ascending: false });
            break;
          case 'popularity':
            // Sort by combination of rating and number of reviews if available
            query = query.order('rating', { ascending: false });
            break;
        }
      } else {
        // Default sort by rating
        query = query.order('rating', { ascending: false });
      }

      // Apply limit
      const limit = criteria.limit || 20;
      query = query.limit(limit);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to perform advanced product search: ${error.message}`);
      }

      const products = (data || []).map(this.transformSupabaseProduct.bind(this));

      return {
        products,
        total: count || 0,
        skip: 0,
        limit: products.length
      };
    } catch (error) {
      console.error('Error in advanced product search:', error);
      throw new Error('Failed to perform advanced product search');
    }
  }

  // Wishlist simulation using Supabase (in a real app, you'd have user authentication)
  async addToWishlist(userId: string, productId: number): Promise<boolean> {
    try {
      // Check if product exists
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('external_id')
        .eq('external_id', productId)
        .single();

      if (productError || !product) {
        console.error('Product not found:', productId);
        return false;
      }

      // Note: This is a simplified implementation
      // In a real app, you'd have a proper wishlist table and user authentication
      console.log(`Would add product ${productId} to wishlist for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      return false;
    }
  }

  async getWishlist(userId: string): Promise<Product[]> {
    try {
      // Note: This is a simplified implementation
      // In a real app, you'd query the wishlist table and join with products
      console.log(`Would get wishlist for user ${userId}`);
      return [];
    } catch (error) {
      console.error('Error getting wishlist:', error);
      return [];
    }
  }

  // Additional utility methods for database health and stats
  async getProductCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting product count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting product count:', error);
      return 0;
    }
  }

  async getCategoryCount(): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('product_categories')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error getting category count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting category count:', error);
      return 0;
    }
  }

  async getDataSyncStatus(): Promise<{ lastSync: string | null; productCount: number; categoryCount: number }> {
    try {
      const [productCount, categoryCount] = await Promise.all([
        this.getProductCount(),
        this.getCategoryCount()
      ]);

      // Get last sync from sync log
      const { data: lastSyncData } = await supabase
        .from('data_sync_log')
        .select('completed_at')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      return {
        lastSync: lastSyncData?.completed_at || null,
        productCount,
        categoryCount
      };
    } catch (error) {
      console.error('Error getting data sync status:', error);
      return {
        lastSync: null,
        productCount: 0,
        categoryCount: 0
      };
    }
  }

  private deduplicateSuggestions(suggestions: ProductSuggestion[]): ProductSuggestion[] {
    const seen = new Set<number>();
    const unique: ProductSuggestion[] = [];
    
    // Sort by confidence first
    suggestions.sort((a, b) => b.confidence - a.confidence);
    
    for (const suggestion of suggestions) {
      if (!seen.has(suggestion.product.id)) {
        seen.add(suggestion.product.id);
        unique.push(suggestion);
      }
    }
    
    return unique;
  }
}