# Product Data Management

This document describes the new product data management system that has been refactored to use Supabase as the primary data store instead of directly calling the DummyJSON API.

## Overview

The system has been restructured to:
1. **Store product data locally** in Supabase for better performance and control
2. **Sync data from DummyJSON** on-demand through configurable scripts
3. **Provide flexible configuration** for keyword, intent, and stage mappings
4. **Enable advanced search and filtering** capabilities

## Architecture Changes

### Before (Direct API Calls)
```
User Request → ProductService → DummyJSON API → Response
```

### After (Database-First Approach)
```
User Request → ProductService → Supabase → Response
Data Sync: DummyJSON API → DataSyncService → Supabase
```

## Database Schema

### Tables Created
- **`products`** - Stores product data from DummyJSON
- **`product_categories`** - Stores category information
- **`data_sync_log`** - Tracks synchronization operations

### Setup Database
```bash
# Run the SQL setup script in your Supabase SQL Editor
cat database-products-setup.sql
```

## Configuration System

### Data Sync Configuration
Located in `src/config/data-sync.ts`:

```typescript
const config = getSyncConfig({
  sync: {
    mode: 'full', // 'full' | 'incremental' | 'categories_only'
    enableCategorySync: true,
    enableProductSync: true,
    updateExistingProducts: true
  },
  dummyJson: {
    limits: {
      maxProductsPerRequest: 100,
      requestDelay: 100, // ms between requests
      maxRetries: 3
    }
  }
});
```

### Product Mapping Configuration
Configure how keywords, intents, and conversation stages map to products:

```typescript
const mappingConfig = {
  keywords: {
    'phone': { 
      searchTerms: ['phone', 'smartphone'], 
      categories: ['smartphones'],
      priority: 1 
    }
  },
  intents: {
    'phone_recommendation': {
      categories: ['smartphones'],
      priority: 'category',
      confidence: 0.9
    }
  },
  stages: {
    'presentation': {
      strategy: 'top_rated',
      reason: 'Featured products with great reviews',
      confidence: 0.7,
      limit: 4
    }
  }
};
```

## Data Initialization

### Initial Setup
```bash
# 1. Set up the database schema
# Run database-products-setup.sql in Supabase SQL Editor

# 2. Initialize product data
npm run init:products

# 3. Check available options
npm run init:products -- --help
```

### Command Options
```bash
# Full sync (default)
npm run init:products

# Sync only categories
npm run init:products -- --mode categories_only

# Use smaller batch sizes
npm run init:products -- --batch-size 25

# Limit number of products (for testing)
npm run init:products -- --max-products 100

# Verbose logging
npm run init:products -- --verbose

# Dry run (preview without changes)
npm run init:products -- --dry-run
```

## ProductService API Changes

### Initialization
```typescript
import { ProductService } from './services/ProductService';
import { defaultMappingConfig } from './config/data-sync';

// With default configuration
const productService = new ProductService();

// With custom configuration
const productService = new ProductService({
  keywords: {
    'laptop': { searchTerms: ['laptop', 'computer'], categories: ['laptops'], priority: 1 }
  }
});
```

### New Methods
```typescript
// Get data sync status
const status = await productService.getDataSyncStatus();
console.log(status); // { lastSync, productCount, categoryCount }

// Get statistics
const count = await productService.getProductCount();
const categories = await productService.getCategoryCount();

// Update mapping configuration at runtime
productService.updateMappingConfig({
  keywords: {
    'gaming': { searchTerms: ['gaming', 'game'], categories: ['laptops'], priority: 1 }
  }
});
```

### Enhanced Search
```typescript
// Advanced search with filters
const results = await productService.searchProductsAdvanced({
  query: 'smartphone',
  category: 'smartphones',
  minPrice: 100,
  maxPrice: 500,
  minRating: 4.0,
  sortBy: 'rating',
  limit: 20
});
```

## Environment Configuration

### Required Environment Variables
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NODE_ENV=development|production|test
```

### Environment-Specific Configurations
- **Development**: Default settings with faster sync
- **Production**: Conservative settings with retry logic
- **Test**: Limited data sync for testing

## Performance Optimizations

### Database Features
- **Full-text search** using PostgreSQL's built-in capabilities
- **Materialized views** for optimized product search
- **Indexes** on commonly queried fields (price, rating, category, etc.)
- **Batch processing** for efficient data operations

### Search Optimizations
```sql
-- Example of the search optimization
SELECT * FROM products 
WHERE title ILIKE '%phone%' 
   OR description ILIKE '%phone%' 
   OR brand ILIKE '%phone%'
   OR tags @> ARRAY['phone']
ORDER BY rating DESC;
```

## Monitoring and Maintenance

### Sync Monitoring
```typescript
import { DataSyncService } from './services/DataSyncService';

const syncService = new DataSyncService();

// Get sync statistics
const stats = await syncService.getSyncStatistics();
const lastSync = await syncService.getLastSyncInfo();

// Perform sync with monitoring
const result = await syncService.syncData();
console.log(`Synced ${result.recordsSucceeded}/${result.recordsProcessed} records`);
```

### Health Checks
- Monitor sync log table for failed operations
- Check product count vs expected count
- Verify last sync timestamp
- Monitor database performance

## Migration Guide

### From Old ProductService
1. **Database Setup**: Run the SQL setup script
2. **Data Initialization**: Run `npm run init:products`
3. **Configuration**: Update any hardcoded mappings to use the new config system
4. **Testing**: Verify all functionality works with local data

### Backward Compatibility
- All existing ProductService methods remain functional
- Same return types and interfaces
- Enhanced performance and reliability

## Troubleshooting

### Common Issues

**Sync Fails with Connection Error**
```bash
# Check environment variables
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Test connection
npm run init:products -- --dry-run
```

**Products Not Found After Sync**
```bash
# Check sync status
npm run init:products -- --verbose

# Verify database setup
# Check Supabase SQL Editor for table creation
```

**Slow Search Performance**
```sql
-- Check if indexes exist
SELECT indexname FROM pg_indexes WHERE tablename = 'products';

-- Refresh materialized view
REFRESH MATERIALIZED VIEW product_search_view;
```

### Logging
- Enable verbose logging with `--verbose` flag
- Check sync log table for detailed error information
- Monitor application logs for service-level errors

## Future Enhancements

- **Real-time sync** using webhooks or scheduled jobs
- **User-specific wishlists** with proper authentication
- **Advanced analytics** and recommendation algorithms
- **Multi-source data** integration beyond DummyJSON
- **Caching layer** using Redis for frequently accessed data
