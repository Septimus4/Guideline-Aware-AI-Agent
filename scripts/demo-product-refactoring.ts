#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { ProductService } from '../src/services/ProductService';
import { DataSyncService } from '../src/services/DataSyncService';

// Load environment variables
dotenv.config();

async function demonstrateNewFeatures() {
  console.log('🚀 Product Service Refactoring Demo');
  console.log('====================================\n');

  try {
    // 1. Initialize ProductService with custom configuration
    console.log('1. Initializing ProductService with custom configuration...');
    const productService = new ProductService({
      keywords: {
        'demo': { searchTerms: ['phone', 'laptop'], categories: ['smartphones'], priority: 1 }
      },
      intents: {
        'demo_recommendation': {
          categories: ['smartphones', 'laptops'],
          searchTerms: ['phone', 'laptop'],
          priority: 'category',
          confidence: 0.9
        }
      },
      stages: {
        'demo_stage': {
          strategy: 'popular',
          reason: 'Demo products',
          confidence: 0.8,
          limit: 3
        }
      }
    });

    // 2. Check current data status
    console.log('2. Checking current data status...');
    const status = await productService.getDataSyncStatus();
    console.log(`   Products in database: ${status.productCount}`);
    console.log(`   Categories in database: ${status.categoryCount}`);
    console.log(`   Last sync: ${status.lastSync || 'Never'}\n`);

    if (status.productCount === 0) {
      console.log('⚠️  No products found in database.');
      console.log('   Run "npm run init:products" to sync data from DummyJSON\n');
      
      // Demonstrate data sync service
      console.log('3. Demonstrating DataSyncService (dry run)...');
      const syncService = new DataSyncService({
        sync: { 
          mode: 'categories_only',
          enableCategorySync: true,
          enableProductSync: false,
          preserveExistingData: false,
          updateExistingProducts: true,
          enableRetries: true,
          cleanupOldData: false,
          maxDataAge: 30
        }
      });
      
      console.log('   Sync service initialized with categories-only mode');
      console.log('   In a real scenario, this would sync categories from DummyJSON\n');
    } else {
      // 3. Demonstrate enhanced search capabilities
      console.log('3. Demonstrating enhanced search capabilities...');
      
      // Get available categories
      const categories = await productService.getAvailableCategories();
      console.log(`   Available categories: ${categories.slice(0, 5).join(', ')}${categories.length > 5 ? '...' : ''}`);
      
      // Basic search
      const searchResult = await productService.searchProducts({ q: 'phone', limit: 3 });
      console.log(`   Basic search for "phone": ${searchResult.products.length} results`);
      
      // Advanced search
      const advancedResult = await productService.searchProductsAdvanced({
        query: 'phone',
        minPrice: 100,
        maxPrice: 1000,
        sortBy: 'rating',
        limit: 3
      });
      console.log(`   Advanced search with price filter: ${advancedResult.products.length} results`);
      
      // 4. Demonstrate smart suggestions
      console.log('\n4. Demonstrating smart product suggestions...');
      const suggestions = await productService.generateSmartSuggestions({
        userMessage: 'I need a good phone',
        conversationStage: 'demo_stage',
        userIntent: 'demo_recommendation',
        keywords: ['demo']
      });
      console.log(`   Generated ${suggestions.length} smart suggestions`);
      
      suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion.product.title} - ${suggestion.reason} (confidence: ${suggestion.confidence})`);
      });
    }

    // 5. Demonstrate configuration management
    console.log('\n5. Demonstrating dynamic configuration updates...');
    const currentConfig = productService.getCurrentConfigurations();
    console.log(`   Current keyword mappings: ${Object.keys(currentConfig.keywords).length}`);
    console.log(`   Current intent mappings: ${Object.keys(currentConfig.intents).length}`);
    console.log(`   Current stage mappings: ${Object.keys(currentConfig.stages).length}`);
    
    // Add new mapping
    productService.addKeywordMapping('example', {
      searchTerms: ['example', 'test'],
      categories: ['smartphones'],
      priority: 1
    });
    
    const updatedConfig = productService.getCurrentConfigurations();
    console.log(`   After adding 'example' mapping: ${Object.keys(updatedConfig.keywords).length} keyword mappings`);

    console.log('\n✅ Demo completed successfully!');
    console.log('\nTo get started with real data:');
    console.log('1. Run: npm run init:products');
    console.log('2. Check the PRODUCT_DATA_MANAGEMENT.md file for detailed documentation');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    
    if (error instanceof Error && error.message.includes('Missing Supabase')) {
      console.error('\n💡 Make sure you have set up your environment variables:');
      console.error('   SUPABASE_URL=your_supabase_project_url');
      console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
    }
  }
}

// Run the demo
if (require.main === module) {
  demonstrateNewFeatures();
}
