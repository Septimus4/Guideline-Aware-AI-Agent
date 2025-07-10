import { Product, ProductSearchParams, ProductSuggestion } from '../types';

interface DummyJSONResponse {
  products: Product[];
  total: number;
  skip: number;
  limit: number;
}

export class ProductService {
  private readonly baseURL = 'https://dummyjson.com';

  async searchProducts(params: ProductSearchParams): Promise<DummyJSONResponse> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.q) searchParams.append('q', params.q);
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.skip) searchParams.append('skip', params.skip.toString());
      if (params.category) {
        // Use category filtering
        const url = `${this.baseURL}/products/category/${encodeURIComponent(params.category)}?${searchParams.toString()}`;
        const response = await fetch(url);
        return await response.json() as DummyJSONResponse;
      }

      const url = params.q 
        ? `${this.baseURL}/products/search?${searchParams.toString()}`
        : `${this.baseURL}/products?${searchParams.toString()}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.statusText}`);
      }
      
      return await response.json() as DummyJSONResponse;
    } catch (error) {
      console.error('Error searching products:', error);
      throw new Error('Failed to search products');
    }
  }

  async getProductById(id: number): Promise<Product> {
    try {
      const response = await fetch(`${this.baseURL}/products/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }
      
      return await response.json() as Product;
    } catch (error) {
      console.error('Error fetching product:', error);
      throw new Error('Failed to fetch product');
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/products/categories`);
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }
      
      const categories = await response.json() as Array<{slug: string, name: string}>;
      return categories.map(cat => cat.slug);
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw new Error('Failed to fetch categories');
    }
  }

  async generateSmartSuggestions(context: {
    userMessage?: string;
    conversationStage?: string;
    userIntent?: string;
    keywords?: string[];
    previousProducts?: number[];
  }): Promise<ProductSuggestion[]> {
    try {
      const suggestions: ProductSuggestion[] = [];
      
      // 1. Keyword-based suggestions
      if (context.keywords && context.keywords.length > 0) {
        const keywordSuggestions = await this.getProductsByKeywords(context.keywords);
        suggestions.push(...keywordSuggestions);
      }
      
      // 2. Intent-based suggestions
      if (context.userIntent) {
        const intentSuggestions = await this.getProductsByIntent(context.userIntent);
        suggestions.push(...intentSuggestions);
      }
      
      // 3. Stage-based suggestions
      if (context.conversationStage) {
        const stageSuggestions = await this.getProductsByStage(context.conversationStage);
        suggestions.push(...stageSuggestions);
      }
      
      // 4. Fallback: Popular products
      if (suggestions.length === 0) {
        const popularSuggestions = await this.getPopularProducts();
        suggestions.push(...popularSuggestions);
      }
      
      // Remove duplicates and limit results
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
      return uniqueSuggestions.slice(0, 5);
      
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return [];
    }
  }

  private async getProductsByKeywords(keywords: string[]): Promise<ProductSuggestion[]> {
    const suggestions: ProductSuggestion[] = [];
    
    for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords
      try {
        const result = await this.searchProducts({ q: keyword, limit: 3 });
        for (const product of result.products) {
          suggestions.push({
            product,
            reason: `Matches your interest in "${keyword}"`,
            confidence: 0.8,
            type: 'keyword'
          });
        }
      } catch (error) {
        console.warn(`Failed to search for keyword: ${keyword}`, error);
      }
    }
    
    return suggestions;
  }

  private async getProductsByIntent(intent: string): Promise<ProductSuggestion[]> {
    const intentCategoryMap: Record<string, string[]> = {
      'pricing_inquiry': ['smartphones', 'laptops'],
      'demo_request': ['laptops', 'smartphones', 'tablets'],
      'feature_inquiry': ['smartphones', 'laptops', 'tablets'],
      'comparison_request': ['smartphones', 'laptops'],
      'purchase_intent': ['smartphones', 'laptops', 'home-decoration'],
      'general_inquiry': ['smartphones', 'beauty', 'fragrances']
    };

    const categories = intentCategoryMap[intent] || ['smartphones'];
    const suggestions: ProductSuggestion[] = [];

    for (const category of categories.slice(0, 2)) {
      try {
        const result = await this.searchProducts({ category, limit: 2 });
        for (const product of result.products) {
          suggestions.push({
            product,
            reason: `Recommended for ${intent.replace('_', ' ')}`,
            confidence: 0.7,
            type: 'intent'
          });
        }
      } catch (error) {
        console.warn(`Failed to get products for intent: ${intent}`, error);
      }
    }

    return suggestions;
  }

  private async getProductsByStage(stage: string): Promise<ProductSuggestion[]> {
    const stageProductMap: Record<string, { categories: string[], reason: string }> = {
      'introduction': {
        categories: ['beauty', 'fragrances'],
        reason: 'Perfect for getting started'
      },
      'discovery': {
        categories: ['smartphones', 'laptops'],
        reason: 'Popular choices for new customers'
      },
      'presentation': {
        categories: ['laptops', 'tablets'],
        reason: 'Featured products with great reviews'
      },
      'objection_handling': {
        categories: ['smartphones', 'home-decoration'],
        reason: 'Great value for money'
      },
      'closing': {
        categories: ['laptops', 'smartphones'],
        reason: 'Best sellers - limited time offer'
      }
    };

    const stageInfo = stageProductMap[stage];
    if (!stageInfo) return [];

    const suggestions: ProductSuggestion[] = [];
    
    for (const category of stageInfo.categories.slice(0, 2)) {
      try {
        const result = await this.searchProducts({ category, limit: 2 });
        for (const product of result.products) {
          suggestions.push({
            product,
            reason: stageInfo.reason,
            confidence: 0.6,
            type: 'stage'
          });
        }
      } catch (error) {
        console.warn(`Failed to get products for stage: ${stage}`, error);
      }
    }

    return suggestions;
  }

  private async getPopularProducts(): Promise<ProductSuggestion[]> {
    try {
      const result = await this.searchProducts({ limit: 4 });
      return result.products.map(product => ({
        product,
        reason: 'Popular choice',
        confidence: 0.5,
        type: 'popular'
      }));
    } catch (error) {
      console.error('Failed to get popular products:', error);
      return [];
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

  async getRelatedProducts(productId: number, limit: number = 4): Promise<Product[]> {
    try {
      const product = await this.getProductById(productId);
      const result = await this.searchProducts({ 
        category: product.category, 
        limit: limit + 1 
      });
      
      // Filter out the original product
      return result.products
        .filter(p => p.id !== productId)
        .slice(0, limit);
    } catch (error) {
      console.error('Error getting related products:', error);
      return [];
    }
  }
}
