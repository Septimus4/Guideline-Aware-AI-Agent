import { supabase } from '../config/database';
import { DataSyncConfig, getSyncConfig, validateSyncConfig } from '../config/data-sync';

// Types for DummyJSON API responses
interface DummyJSONProduct {
  id: number;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  rating: number;
  stock: number;
  brand?: string;
  category: string;
  thumbnail: string;
  images: string[];
  tags?: string[];
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  warrantyInformation?: string;
  shippingInformation?: string;
  availabilityStatus?: string;
  reviews?: Array<{
    rating: number;
    comment: string;
    date: string;
    reviewerName: string;
    reviewerEmail: string;
  }>;
  returnPolicy?: string;
  minimumOrderQuantity?: number;
  meta?: {
    createdAt: string;
    updatedAt: string;
    barcode: string;
    qrCode: string;
  };
}

interface DummyJSONResponse {
  products: DummyJSONProduct[];
  total: number;
  skip: number;
  limit: number;
}

interface DummyJSONCategory {
  slug: string;
  name: string;
}

interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errors: string[];
  syncLogId?: number;
}

export class DataSyncService {
  private config: DataSyncConfig;
  private currentSyncId?: number;

  constructor(configOverrides?: Partial<DataSyncConfig>) {
    this.config = getSyncConfig(configOverrides);
    
    // Validate configuration
    const configErrors = validateSyncConfig(this.config);
    if (configErrors.length > 0) {
      throw new Error(`Invalid sync configuration: ${configErrors.join(', ')}`);
    }
  }

  // Main synchronization method
  async syncData(): Promise<SyncResult> {
    console.log('Starting data synchronization...');
    
    const syncLogId = await this.createSyncLog();
    this.currentSyncId = syncLogId;

    try {
      let totalProcessed = 0;
      let totalSucceeded = 0;
      let totalFailed = 0;
      const errors: string[] = [];

      // Step 1: Sync categories if enabled
      if (this.config.sync.enableCategorySync) {
        console.log('Syncing categories...');
        const categoryResult = await this.syncCategories();
        totalProcessed += categoryResult.recordsProcessed;
        totalSucceeded += categoryResult.recordsSucceeded;
        totalFailed += categoryResult.recordsFailed;
        errors.push(...categoryResult.errors);
      }

      // Step 2: Sync products if enabled
      if (this.config.sync.enableProductSync && this.config.sync.mode !== 'categories_only') {
        console.log('Syncing products...');
        const productResult = await this.syncProducts();
        totalProcessed += productResult.recordsProcessed;
        totalSucceeded += productResult.recordsSucceeded;
        totalFailed += productResult.recordsFailed;
        errors.push(...productResult.errors);
      }

      // Step 3: Cleanup old data if enabled
      if (this.config.sync.cleanupOldData) {
        console.log('Cleaning up old data...');
        await this.cleanupOldData();
      }

      // Step 4: Refresh materialized views if enabled
      if (this.config.supabase.enableMaterializedViews) {
        console.log('Refreshing search views...');
        await this.refreshMaterializedViews();
      }

      const result: SyncResult = {
        success: totalFailed === 0,
        recordsProcessed: totalProcessed,
        recordsSucceeded: totalSucceeded,
        recordsFailed: totalFailed,
        errors,
        syncLogId
      };

      await this.completeSyncLog(syncLogId, 'completed', result);
      console.log(`Sync completed: ${totalSucceeded}/${totalProcessed} records succeeded`);
      
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Sync failed:', errorMessage);
      
      await this.completeSyncLog(syncLogId, 'failed', {
        success: false,
        recordsProcessed: 0,
        recordsSucceeded: 0,
        recordsFailed: 0,
        errors: [errorMessage],
        syncLogId
      });
      
      throw error;
    }
  }

  // Sync categories from DummyJSON
  private async syncCategories(): Promise<SyncResult> {
    const errors: string[] = [];
    let processed = 0;
    let succeeded = 0;

    try {
      const categoriesUrl = `${this.config.dummyJson.baseUrl}${this.config.dummyJson.endpoints.categories}`;
      const response = await fetch(categoriesUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.statusText}`);
      }

      const categories = await response.json() as DummyJSONCategory[];
      processed = categories.length;

      // Insert categories in batches
      const batchSize = this.config.supabase.batchSize;
      for (let i = 0; i < categories.length; i += batchSize) {
        const batch = categories.slice(i, i + batchSize);
        
        try {
          const { error } = await supabase
            .from(this.config.supabase.tables.categories)
            .upsert(
              batch.map(cat => ({
                slug: cat.slug,
                name: cat.name,
                updated_at: new Date().toISOString()
              })),
              { onConflict: 'slug' }
            );

          if (error) {
            console.error('Error inserting category batch:', error);
            errors.push(`Category batch error: ${error.message}`);
          } else {
            succeeded += batch.length;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error in category batch:', errorMessage);
          errors.push(`Category batch error: ${errorMessage}`);
        }

        // Add delay between requests
        if (this.config.dummyJson.limits.requestDelay > 0) {
          await this.delay(this.config.dummyJson.limits.requestDelay);
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Category sync error: ${errorMessage}`);
    }

    return {
      success: errors.length === 0,
      recordsProcessed: processed,
      recordsSucceeded: succeeded,
      recordsFailed: processed - succeeded,
      errors
    };
  }

  // Sync products from DummyJSON
  private async syncProducts(): Promise<SyncResult> {
    const errors: string[] = [];
    let processed = 0;
    let succeeded = 0;

    try {
      // First, get total count
      const initialUrl = `${this.config.dummyJson.baseUrl}${this.config.dummyJson.endpoints.products}?limit=1`;
      const initialResponse = await fetch(initialUrl);
      
      if (!initialResponse.ok) {
        throw new Error(`Failed to fetch products: ${initialResponse.statusText}`);
      }

      const initialData = await initialResponse.json() as DummyJSONResponse;
      const totalProducts = initialData.total;
      
      console.log(`Found ${totalProducts} products to sync`);

      // Fetch products in batches
      const limit = this.config.dummyJson.limits.maxProductsPerRequest;
      
      for (let skip = 0; skip < totalProducts; skip += limit) {
        try {
          const url = `${this.config.dummyJson.baseUrl}${this.config.dummyJson.endpoints.products}?limit=${limit}&skip=${skip}`;
          const response = await fetch(url);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch products batch: ${response.statusText}`);
          }

          const data = await response.json() as DummyJSONResponse;
          processed += data.products.length;

          // Transform and insert products
          const transformedProducts = data.products.map(this.transformProduct.bind(this));
          
          // Insert in smaller batches to avoid payload size limits
          const insertBatchSize = this.config.supabase.batchSize;
          for (let i = 0; i < transformedProducts.length; i += insertBatchSize) {
            const insertBatch = transformedProducts.slice(i, i + insertBatchSize);
            
            try {
              const { error } = await supabase
                .from(this.config.supabase.tables.products)
                .upsert(insertBatch, { onConflict: 'external_id' });

              if (error) {
                console.error('Error inserting product batch:', error);
                errors.push(`Product batch error: ${error.message}`);
              } else {
                succeeded += insertBatch.length;
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : 'Unknown error';
              console.error('Error in product insert batch:', errorMessage);
              errors.push(`Product insert error: ${errorMessage}`);
            }
          }

          console.log(`Processed ${skip + data.products.length}/${totalProducts} products`);

          // Add delay between requests
          if (this.config.dummyJson.limits.requestDelay > 0) {
            await this.delay(this.config.dummyJson.limits.requestDelay);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error in product batch:', errorMessage);
          errors.push(`Product batch error: ${errorMessage}`);
          
          // Continue with next batch unless too many failures
          if (errors.length > 10) {
            console.error('Too many errors, stopping sync');
            break;
          }
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`Product sync error: ${errorMessage}`);
    }

    return {
      success: errors.length === 0,
      recordsProcessed: processed,
      recordsSucceeded: succeeded,
      recordsFailed: processed - succeeded,
      errors
    };
  }

  // Transform DummyJSON product to our database schema
  private transformProduct(product: DummyJSONProduct): any {
    return {
      external_id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      discount_percentage: product.discountPercentage,
      rating: product.rating,
      stock: product.stock,
      brand: product.brand,
      category: product.category,
      thumbnail: product.thumbnail,
      images: product.images,
      tags: product.tags || [],
      dimensions: product.dimensions ? JSON.stringify(product.dimensions) : null,
      warranty_information: product.warrantyInformation,
      shipping_information: product.shippingInformation,
      availability_status: product.availabilityStatus,
      reviews: product.reviews ? JSON.stringify(product.reviews) : '[]',
      return_policy: product.returnPolicy,
      minimum_order_quantity: product.minimumOrderQuantity || 1,
      meta_data: product.meta ? JSON.stringify(product.meta) : null,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  // Create sync log entry
  private async createSyncLog(): Promise<number> {
    const { data, error } = await supabase
      .from(this.config.supabase.tables.syncLog)
      .insert({
        sync_type: this.config.sync.mode,
        source: 'dummyjson',
        status: 'started',
        sync_config: JSON.stringify(this.config),
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create sync log: ${error.message}`);
    }

    return data.id;
  }

  // Complete sync log entry
  private async completeSyncLog(id: number, status: 'completed' | 'failed', result: SyncResult): Promise<void> {
    const { error } = await supabase
      .from(this.config.supabase.tables.syncLog)
      .update({
        status,
        records_processed: result.recordsProcessed,
        records_succeeded: result.recordsSucceeded,
        records_failed: result.recordsFailed,
        error_details: result.errors.length > 0 ? JSON.stringify(result.errors) : null,
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Failed to update sync log:', error);
    }
  }

  // Clean up old data
  private async cleanupOldData(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.sync.maxDataAge);

    try {
      const { error } = await supabase
        .from(this.config.supabase.tables.products)
        .delete()
        .lt('last_sync_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old data:', error);
      } else {
        console.log('Old data cleanup completed');
      }
    } catch (error) {
      console.error('Error in cleanup:', error);
    }
  }

  // Refresh materialized views
  private async refreshMaterializedViews(): Promise<void> {
    try {
      // Try to call the refresh function
      const { error } = await supabase.rpc('refresh_product_search_view');
      
      if (error) {
        console.warn('Error calling refresh function, trying direct SQL:', error.message);
        
        // Fallback: try direct SQL command
        const { error: sqlError } = await supabase
          .from('products')
          .select('count', { count: 'exact', head: true });
          
        if (sqlError) {
          console.error('Database connection issue:', sqlError);
        } else {
          console.log('Materialized view refresh skipped - will be handled manually');
        }
      } else {
        console.log('Materialized views refreshed successfully');
      }
    } catch (error) {
      console.warn('Error refreshing materialized views (non-critical):', error);
      // Don't throw error - this is not critical for sync operation
    }
  }

  // Utility method for delays
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get sync statistics
  async getSyncStatistics(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_product_stats');
      
      if (error) {
        throw new Error(`Failed to get statistics: ${error.message}`);
      }

      return data[0];
    } catch (error) {
      console.error('Error getting sync statistics:', error);
      return null;
    }
  }

  // Get last sync information
  async getLastSyncInfo(): Promise<any> {
    try {
      const { data, error } = await supabase
        .from(this.config.supabase.tables.syncLog)
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        throw new Error(`Failed to get last sync info: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error getting last sync info:', error);
      return null;
    }
  }
}
