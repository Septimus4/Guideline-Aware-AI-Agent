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
      
      // 1. Special handling for specific phone model requests
      if (context.userMessage) {
        const phoneSpecificSuggestions = await this.getPhoneSpecificSuggestions(context.userMessage);
        suggestions.push(...phoneSpecificSuggestions);
      }
      
      // 2. Enhanced keyword-based suggestions
      if (context.keywords && context.keywords.length > 0) {
        const keywordSuggestions = await this.getProductsByKeywords(context.keywords);
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
      
      // Remove duplicates and limit results
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
      return uniqueSuggestions.slice(0, 5);
      
    } catch (error) {
      console.error('Error generating smart suggestions:', error);
      return [];
    }
  }

  private async getPhoneSpecificSuggestions(userMessage: string): Promise<ProductSuggestion[]> {
    const lowerMessage = userMessage.toLowerCase();
    const suggestions: ProductSuggestion[] = [];
    
    // Check for specific phone model mentions
    if (lowerMessage.includes('iphone') || lowerMessage.includes('apple')) {
      try {
        // First try to search for actual iPhone products
        const iphoneResults = await this.searchProducts({ q: 'iphone', limit: 3 });
        for (const product of iphoneResults.products) {
          suggestions.push({
            product,
            reason: 'iPhone model as requested',
            confidence: 0.9,
            type: 'keyword'
          });
        }
        
        // If no iPhone results, try broader smartphone search
        if (suggestions.length === 0) {
          const phoneResults = await this.searchProducts({ q: 'smartphone', limit: 3 });
          for (const product of phoneResults.products) {
            suggestions.push({
              product,
              reason: 'Smartphone alternative to iPhone',
              confidence: 0.7,
              type: 'keyword'
            });
          }
        }
      } catch (error) {
        console.warn('Failed to search for iPhone products:', error);
      }
    }
    
    // Check for budget-related keywords
    if (lowerMessage.includes('budget') || lowerMessage.includes('cheap') || lowerMessage.includes('affordable')) {
      try {
        const results = await this.searchProducts({ q: 'phone', limit: 10 });
        // Sort by price and get cheapest phones
        const budgetPhones = results.products
          .filter(p => p.price < 200) // Under $200 for budget
          .sort((a, b) => a.price - b.price)
          .slice(0, 3);
          
        for (const product of budgetPhones) {
          suggestions.push({
            product,
            reason: 'Budget-friendly phone option',
            confidence: 0.8,
            type: 'keyword'
          });
        }
      } catch (error) {
        console.warn('Failed to search for budget phones:', error);
      }
    }
    
    return suggestions;
  }

  private async getProductsByKeywords(keywords: string[]): Promise<ProductSuggestion[]> {
    const suggestions: ProductSuggestion[] = [];
    
    // Enhanced keyword to search term mapping
    const keywordSearchMap: Record<string, string[]> = {
      'phone': ['phone', 'smartphone'],
      'smartphone': ['phone', 'smartphone'], 
      'iphone': ['iphone', 'apple'],
      'android': ['android', 'samsung'],
      'mobile': ['phone', 'smartphone'],
      'cell': ['phone'],
      'cellular': ['phone'],
      'iphone_5': ['iphone'],
      'iphone_6': ['iphone'],
      'replacement': ['phone', 'smartphone'],
      'laptop': ['laptop'],
      'computer': ['laptop', 'computer'],
      'tablet': ['tablet'],
      'beauty': ['beauty', 'skincare'],
      'fragrance': ['fragrance', 'perfume'],
      'price': ['phone'], // Default to phone for pricing queries
      'budget': ['phone'], // Default to phone for budget queries
      'cheap': ['phone'], // Default to phone for cheap queries
      'affordable': ['phone'] // Default to phone for affordable queries
    };
    
    for (const keyword of keywords.slice(0, 3)) { // Limit to 3 keywords
      try {
        const searchTerms = keywordSearchMap[keyword] || [keyword];
        
        for (const searchTerm of searchTerms) {
          const result = await this.searchProducts({ q: searchTerm, limit: 2 });
          for (const product of result.products) {
            suggestions.push({
              product,
              reason: `Matches your interest in "${keyword}"`,
              confidence: 0.8,
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
    const intentCategoryMap: Record<string, { categories: string[], searchTerms?: string[] }> = {
      'product_recommendation': { 
        categories: ['smartphones'], 
        searchTerms: ['phone', 'smartphone', 'iphone'] 
      },
      'product_comparison': { 
        categories: ['smartphones'], 
        searchTerms: ['phone', 'smartphone'] 
      },
      'product_inquiry': { 
        categories: ['smartphones'], 
        searchTerms: ['phone', 'smartphone'] 
      },
      'pricing_inquiry': { 
        categories: ['smartphones'], 
        searchTerms: ['phone', 'smartphone'] 
      },
      'demo_request': { 
        categories: ['smartphones', 'laptops'], 
        searchTerms: ['phone', 'laptop'] 
      },
      'feature_inquiry': { 
        categories: ['smartphones', 'laptops'], 
        searchTerms: ['phone', 'laptop'] 
      },
      'comparison_request': { 
        categories: ['smartphones'], 
        searchTerms: ['phone', 'smartphone'] 
      },
      'purchase_intent': { 
        categories: ['smartphones'], 
        searchTerms: ['phone', 'smartphone'] 
      },
      'general_inquiry': { 
        categories: ['smartphones'], 
        searchTerms: ['phone'] 
      }
    };

    const intentInfo = intentCategoryMap[intent];
    if (!intentInfo) {
      // Fallback to phone search for unknown intents
      const result = await this.searchProducts({ q: 'phone', limit: 2 });
      return result.products.map(product => ({
        product,
        reason: `Recommended for your inquiry`,
        confidence: 0.5,
        type: 'intent'
      }));
    }

    const suggestions: ProductSuggestion[] = [];

    // Use search terms first (more accurate)
    if (intentInfo.searchTerms) {
      for (const searchTerm of intentInfo.searchTerms.slice(0, 2)) {
        try {
          const result = await this.searchProducts({ q: searchTerm, limit: 2 });
          for (const product of result.products) {
            suggestions.push({
              product,
              reason: `Recommended for ${intent.replace('_', ' ')}`,
              confidence: 0.8,
              type: 'intent'
            });
          }
        } catch (error) {
          console.warn(`Failed to search for term: ${searchTerm}`, error);
        }
      }
    }

    // Fallback to category search if no results from search terms
    if (suggestions.length === 0) {
      for (const category of intentInfo.categories.slice(0, 2)) {
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
    }

    return suggestions;
  }

  private async getProductsByStage(stage: string): Promise<ProductSuggestion[]> {
    const stageProductMap: Record<string, { searchTerms: string[], reason: string }> = {
      'introduction': {
        searchTerms: ['phone', 'smartphone'],
        reason: 'Perfect for getting started'
      },
      'discovery': {
        searchTerms: ['phone', 'smartphone'],
        reason: 'Popular choices for new customers'
      },
      'presentation': {
        searchTerms: ['phone', 'iphone'],
        reason: 'Featured products with great reviews'
      },
      'objection_handling': {
        searchTerms: ['phone', 'budget'],
        reason: 'Great value for money'
      },
      'closing': {
        searchTerms: ['phone', 'smartphone'],
        reason: 'Best sellers - limited time offer'
      }
    };

    const stageInfo = stageProductMap[stage];
    if (!stageInfo) return [];

    const suggestions: ProductSuggestion[] = [];
    
    for (const searchTerm of stageInfo.searchTerms.slice(0, 2)) {
      try {
        const result = await this.searchProducts({ q: searchTerm, limit: 2 });
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