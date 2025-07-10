#!/usr/bin/env ts-node

import dotenv from 'dotenv';
import { DataSyncService } from '../src/services/DataSyncService';
import { DataSyncConfig } from '../src/config/data-sync';

// Load environment variables
dotenv.config();

interface CLIOptions {
  mode?: 'full' | 'incremental' | 'categories_only';
  skipCategories?: boolean;
  skipProducts?: boolean;
  batchSize?: number;
  maxProducts?: number;
  verbose?: boolean;
  dryRun?: boolean;
  help?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--mode':
        options.mode = args[++i] as 'full' | 'incremental' | 'categories_only';
        break;
      case '--skip-categories':
        options.skipCategories = true;
        break;
      case '--skip-products':
        options.skipProducts = true;
        break;
      case '--batch-size':
        options.batchSize = parseInt(args[++i]);
        break;
      case '--max-products':
        options.maxProducts = parseInt(args[++i]);
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
Product Data Initialization Tool

Usage: npm run init:products [options]

Options:
  --mode <mode>           Sync mode: full, incremental, or categories_only (default: full)
  --skip-categories       Skip category synchronization
  --skip-products         Skip product synchronization
  --batch-size <size>     Number of records to process in each batch (default: 50)
  --max-products <count>  Maximum number of products to sync (for testing)
  --verbose, -v           Enable verbose logging
  --dry-run               Show what would be done without making changes
  --help, -h              Show this help message

Examples:
  npm run init:products                           # Full sync with default settings
  npm run init:products -- --mode categories_only # Sync only categories
  npm run init:products -- --batch-size 25       # Use smaller batch size
  npm run init:products -- --max-products 100    # Sync only first 100 products
  npm run init:products -- --verbose             # Enable detailed logging
  npm run init:products -- --dry-run             # Preview what would be synced

Environment Variables:
  SUPABASE_URL              Your Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY Your Supabase service role key
  NODE_ENV                  Environment (development, production, test)
`);
}

async function validateEnvironment(): Promise<void> {
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file or environment configuration.');
    process.exit(1);
  }
}

async function showSyncPreview(config: DataSyncConfig): Promise<void> {
  console.log('🔍 Sync Configuration Preview:');
  console.log(`   Mode: ${config.sync.mode}`);
  console.log(`   Categories: ${config.sync.enableCategorySync ? '✅' : '❌'}`);
  console.log(`   Products: ${config.sync.enableProductSync ? '✅' : '❌'}`);
  console.log(`   Batch Size: ${config.supabase.batchSize}`);
  console.log(`   Request Delay: ${config.dummyJson.limits.requestDelay}ms`);
  console.log(`   Max Retries: ${config.dummyJson.limits.maxRetries}`);
  console.log(`   Update Existing: ${config.sync.updateExistingProducts ? '✅' : '❌'}`);
  console.log(`   Cleanup Old Data: ${config.sync.cleanupOldData ? '✅' : '❌'}`);
  console.log('');
}

async function main(): Promise<void> {
  const options = parseArgs();
  
  try {
    // Show help if requested
    if (options.help) {
      showHelp();
      return;
    }

    console.log('🚀 Product Data Initialization Tool');
    console.log('===================================');

    // Validate environment
    await validateEnvironment();

    // Build configuration from CLI options
    const configOverrides: Partial<DataSyncConfig> = {
      sync: {
        mode: options.mode || 'full',
        enableCategorySync: !options.skipCategories,
        enableProductSync: !options.skipProducts,
        updateExistingProducts: true,
        preserveExistingData: false,
        enableRetries: true,
        cleanupOldData: false,
        maxDataAge: 30
      },
      supabase: {
        batchSize: options.batchSize || 50,
        tables: {
          products: 'products',
          categories: 'product_categories',
          syncLog: 'data_sync_log'
        },
        enableFullTextSearch: true,
        enableMaterializedViews: true
      }
    };

    // Limit products for testing
    if (options.maxProducts) {
      (configOverrides as any).dummyJson = {
        limits: {
          maxProductsPerRequest: Math.min(options.maxProducts, 100),
          maxCategoriesPerRequest: 50,
          requestDelay: 100,
          maxRetries: 3
        }
      };
    }

    // Enable verbose logging
    if (options.verbose) {
      console.log('📝 Verbose logging enabled');
    }

    // Create sync service
    const syncService = new DataSyncService(configOverrides);

    // Show preview
    if (options.dryRun || options.verbose) {
      await showSyncPreview(syncService['config']);
    }

    if (options.dryRun) {
      console.log('🔍 Dry run mode - no changes will be made');
      console.log('Use without --dry-run to perform actual synchronization');
      return;
    }

    // Get current statistics
    console.log('📊 Checking current data state...');
    const currentStats = await syncService.getSyncStatistics();
    if (currentStats) {
      console.log(`   Current products: ${currentStats.total_products || 0}`);
      console.log(`   Current categories: ${currentStats.total_categories || 0}`);
      console.log(`   Last sync: ${currentStats.last_sync || 'Never'}`);
    }

    // Get last sync info
    const lastSync = await syncService.getLastSyncInfo();
    if (lastSync) {
      console.log(`   Last sync status: ${lastSync.status}`);
      console.log(`   Last sync date: ${lastSync.started_at}`);
      if (lastSync.records_processed) {
        console.log(`   Records processed: ${lastSync.records_processed}`);
      }
    }

    console.log('');

    // Confirm before proceeding in production
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️  Running in PRODUCTION mode');
      console.log('This will modify your production database.');
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Perform synchronization
    console.log('🔄 Starting data synchronization...');
    const startTime = Date.now();
    
    const result = await syncService.syncData();
    
    const duration = Math.round((Date.now() - startTime) / 1000);

    // Show results
    console.log('');
    console.log('✅ Synchronization completed!');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Records processed: ${result.recordsProcessed}`);
    console.log(`   Records succeeded: ${result.recordsSucceeded}`);
    console.log(`   Records failed: ${result.recordsFailed}`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
      if (options.verbose) {
        console.log('   Error details:');
        result.errors.forEach(error => console.log(`     - ${error}`));
      }
    }

    // Show updated statistics
    console.log('');
    console.log('📊 Updated data state:');
    const updatedStats = await syncService.getSyncStatistics();
    if (updatedStats) {
      console.log(`   Total products: ${updatedStats.total_products || 0}`);
      console.log(`   Total categories: ${updatedStats.total_categories || 0}`);
      console.log(`   Average price: $${updatedStats.avg_price || 0}`);
      console.log(`   Average rating: ${updatedStats.avg_rating || 0}`);
      console.log(`   Total stock: ${updatedStats.total_stock || 0}`);
    }

    console.log('');
    console.log('🎉 Product data initialization complete!');
    console.log('Your application is now ready to serve products from the local database.');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      
      if (options.verbose && error.stack) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Synchronization interrupted by user');
  console.log('Some data may have been partially synchronized.');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Synchronization terminated');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}
