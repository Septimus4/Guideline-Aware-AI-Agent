// Product Data Synchronization Configuration
export interface DataSyncConfig {
  dummyJson: {
    baseUrl: string;
    endpoints: {
      products: string;
      categories: string;
      productById: string;
      productsByCategory: string;
      searchProducts: string;
    };
    limits: {
      maxProductsPerRequest: number;
      maxCategoriesPerRequest: number;
      requestDelay: number; // ms
      maxRetries: number;
    };
  };
  
  supabase: {
    tables: {
      products: string;
      categories: string;
      syncLog: string;
    };
    batchSize: number;
    enableFullTextSearch: boolean;
    enableMaterializedViews: boolean;
  };
  
  sync: {
    mode: 'full' | 'incremental' | 'categories_only';
    enableCategorySync: boolean;
    enableProductSync: boolean;
    preserveExistingData: boolean;
    updateExistingProducts: boolean;
    enableRetries: boolean;
    cleanupOldData: boolean;
    maxDataAge: number; // days
  };
  
  features: {
    enableSearchOptimization: boolean;
    enableCaching: boolean;
    enableAnalytics: boolean;
    enableDataValidation: boolean;
  };
}

export const defaultSyncConfig: DataSyncConfig = {
  dummyJson: {
    baseUrl: 'https://dummyjson.com',
    endpoints: {
      products: '/products',
      categories: '/products/categories',
      productById: '/products/{id}',
      productsByCategory: '/products/category/{category}',
      searchProducts: '/products/search'
    },
    limits: {
      maxProductsPerRequest: 100,
      maxCategoriesPerRequest: 50,
      requestDelay: 100, // 100ms between requests
      maxRetries: 3
    }
  },
  
  supabase: {
    tables: {
      products: 'products',
      categories: 'product_categories', 
      syncLog: 'data_sync_log'
    },
    batchSize: 50,
    enableFullTextSearch: true,
    enableMaterializedViews: true
  },
  
  sync: {
    mode: 'full',
    enableCategorySync: true,
    enableProductSync: true,
    preserveExistingData: false,
    updateExistingProducts: true,
    enableRetries: true,
    cleanupOldData: false,
    maxDataAge: 30 // 30 days
  },
  
  features: {
    enableSearchOptimization: true,
    enableCaching: false,
    enableAnalytics: true,
    enableDataValidation: true
  }
};

// Environment-specific configurations
export const getEnvironmentConfig = (): Partial<DataSyncConfig> => {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return {
        dummyJson: {
          ...defaultSyncConfig.dummyJson,
          limits: {
            ...defaultSyncConfig.dummyJson.limits,
            requestDelay: 200, // Slower in production to be respectful
            maxRetries: 5
          }
        },
        sync: {
          ...defaultSyncConfig.sync,
          preserveExistingData: true,
          enableRetries: true
        }
      };
      
    case 'test':
      return {
        dummyJson: {
          ...defaultSyncConfig.dummyJson,
          limits: {
            ...defaultSyncConfig.dummyJson.limits,
            maxProductsPerRequest: 10, // Smaller batches for testing
            requestDelay: 50
          }
        },
        supabase: {
          ...defaultSyncConfig.supabase,
          batchSize: 10
        },
        sync: {
          ...defaultSyncConfig.sync,
          mode: 'categories_only' as const // Only sync categories in tests
        }
      };
      
    case 'development':
    default:
      return defaultSyncConfig;
  }
};

// Merge default config with environment-specific overrides
export const getSyncConfig = (overrides?: Partial<DataSyncConfig>): DataSyncConfig => {
  const envConfig = getEnvironmentConfig();
  return {
    ...defaultSyncConfig,
    ...envConfig,
    ...overrides,
    dummyJson: {
      ...defaultSyncConfig.dummyJson,
      ...envConfig.dummyJson,
      ...overrides?.dummyJson,
      endpoints: {
        ...defaultSyncConfig.dummyJson.endpoints,
        ...envConfig.dummyJson?.endpoints,
        ...overrides?.dummyJson?.endpoints
      },
      limits: {
        ...defaultSyncConfig.dummyJson.limits,
        ...envConfig.dummyJson?.limits,
        ...overrides?.dummyJson?.limits
      }
    },
    supabase: {
      ...defaultSyncConfig.supabase,
      ...envConfig.supabase,
      ...overrides?.supabase,
      tables: {
        ...defaultSyncConfig.supabase.tables,
        ...envConfig.supabase?.tables,
        ...overrides?.supabase?.tables
      }
    },
    sync: {
      ...defaultSyncConfig.sync,
      ...envConfig.sync,
      ...overrides?.sync
    },
    features: {
      ...defaultSyncConfig.features,
      ...envConfig.features,
      ...overrides?.features
    }
  };
};

// Validation function for sync config
export const validateSyncConfig = (config: DataSyncConfig): string[] => {
  const errors: string[] = [];
  
  if (!config.dummyJson.baseUrl) {
    errors.push('DummyJSON base URL is required');
  }
  
  if (config.dummyJson.limits.maxProductsPerRequest <= 0) {
    errors.push('Max products per request must be greater than 0');
  }
  
  if (config.supabase.batchSize <= 0) {
    errors.push('Supabase batch size must be greater than 0');
  }
  
  if (config.sync.maxDataAge <= 0) {
    errors.push('Max data age must be greater than 0');
  }
  
  return errors;
};

// Configuration for keyword and intent mappings
export interface ProductMappingConfig {
  keywords: Record<string, {
    searchTerms: string[];
    categories?: string[];
    priority: number;
  }>;
  
  intents: Record<string, {
    categories: string[];
    searchTerms?: string[];
    priority: 'category' | 'search';
    confidence: number;
  }>;
  
  stages: Record<string, {
    strategy: 'popular' | 'featured' | 'discounted' | 'top_rated' | 'mixed';
    reason: string;
    confidence: number;
    limit: number;
  }>;
}

export const defaultMappingConfig: ProductMappingConfig = {
  keywords: {
    'phone': { searchTerms: ['phone', 'smartphone'], categories: ['smartphones'], priority: 1 },
    'laptop': { searchTerms: ['laptop', 'computer'], categories: ['laptops'], priority: 1 },
    'glasses': { searchTerms: ['glasses', 'sunglasses'], categories: ['sunglasses'], priority: 1 },
    'beauty': { searchTerms: ['beauty', 'skincare'], categories: ['beauty'], priority: 2 },
    'watch': { searchTerms: ['watch'], categories: ['mens-watches', 'womens-watches'], priority: 1 }
  },
  
  intents: {
    'phone_recommendation': {
      categories: ['smartphones'],
      searchTerms: ['phone', 'smartphone'],
      priority: 'category',
      confidence: 0.9
    },
    'laptop_recommendation': {
      categories: ['laptops'],
      searchTerms: ['laptop', 'computer'],
      priority: 'category',
      confidence: 0.9
    },
    'general_product_inquiry': {
      categories: [],
      searchTerms: [],
      priority: 'search',
      confidence: 0.5
    }
  },
  
  stages: {
    'introduction': {
      strategy: 'popular',
      reason: 'Perfect for getting started',
      confidence: 0.6,
      limit: 3
    },
    'presentation': {
      strategy: 'top_rated',
      reason: 'Featured products with great reviews',
      confidence: 0.7,
      limit: 4
    },
    'closing': {
      strategy: 'discounted',
      reason: 'Best sellers - limited time offer',
      confidence: 0.8,
      limit: 4
    }
  }
};
