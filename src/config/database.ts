import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// In test environment, provide default values to prevent errors
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

if (!supabaseUrl || !supabaseKey) {
  if (isTestEnv) {
    console.warn('Using mock Supabase credentials in test environment');
  } else {
    throw new Error('Missing Supabase environment variables');
  }
}

export const supabase = createClient(
  supabaseUrl || 'https://test.supabase.co', 
  supabaseKey || 'test_key', 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database schema interfaces
// Define proper types for guideline conditions
interface GuidelineConditions {
  user_intent?: string[];
  conversation_stage?: string[];
  context_keywords?: string[];
}

// Define proper types for conversation data
interface ConversationMessages {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

interface ConversationContext {
  user_intent?: string;
  conversation_stage?: string;
  applied_guidelines?: string[];
}

export interface Database {
  public: {
    Tables: {
      guidelines: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          content: string;
          priority: number;
          category: string;
          is_active: boolean;
          tags: string[];
          conditions: GuidelineConditions | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          content: string;
          priority?: number;
          category?: string;
          is_active?: boolean;
          tags?: string[];
          conditions?: GuidelineConditions | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          content?: string;
          priority?: number;
          category?: string;
          is_active?: boolean;
          tags?: string[];
          conditions?: GuidelineConditions | null;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          messages: ConversationMessages[];
          context: ConversationContext | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          messages: ConversationMessages[];
          context?: ConversationContext | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          messages?: ConversationMessages[];
          context?: ConversationContext | null;
          updated_at?: string;
        };
      };
      products: {
        Row: {
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
        };
        Insert: {
          id?: number;
          external_id: number;
          title: string;
          description?: string | null;
          price: number;
          discount_percentage?: number;
          rating?: number;
          stock?: number;
          brand?: string | null;
          category: string;
          thumbnail?: string | null;
          images?: string[];
          tags?: string[];
          dimensions?: any | null;
          warranty_information?: string | null;
          shipping_information?: string | null;
          availability_status?: string | null;
          reviews?: any | null;
          return_policy?: string | null;
          minimum_order_quantity?: number;
          meta_data?: any | null;
          created_at?: string;
          updated_at?: string;
          last_sync_at?: string;
        };
        Update: {
          id?: number;
          external_id?: number;
          title?: string;
          description?: string | null;
          price?: number;
          discount_percentage?: number;
          rating?: number;
          stock?: number;
          brand?: string | null;
          category?: string;
          thumbnail?: string | null;
          images?: string[];
          tags?: string[];
          dimensions?: any | null;
          warranty_information?: string | null;
          shipping_information?: string | null;
          availability_status?: string | null;
          reviews?: any | null;
          return_policy?: string | null;
          minimum_order_quantity?: number;
          meta_data?: any | null;
          updated_at?: string;
          last_sync_at?: string;
        };
      };
      product_categories: {
        Row: {
          id: number;
          slug: string;
          name: string;
          description: string | null;
          parent_category_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          slug: string;
          name: string;
          description?: string | null;
          parent_category_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          slug?: string;
          name?: string;
          description?: string | null;
          parent_category_id?: number | null;
          updated_at?: string;
        };
      };
      data_sync_log: {
        Row: {
          id: number;
          sync_type: string;
          source: string;
          status: string;
          records_processed: number;
          records_succeeded: number;
          records_failed: number;
          error_details: any | null;
          started_at: string;
          completed_at: string | null;
          sync_config: any | null;
        };
        Insert: {
          id?: number;
          sync_type: string;
          source?: string;
          status: string;
          records_processed?: number;
          records_succeeded?: number;
          records_failed?: number;
          error_details?: any | null;
          started_at?: string;
          completed_at?: string | null;
          sync_config?: any | null;
        };
        Update: {
          id?: number;
          sync_type?: string;
          source?: string;
          status?: string;
          records_processed?: number;
          records_succeeded?: number;
          records_failed?: number;
          error_details?: any | null;
          started_at?: string;
          completed_at?: string | null;
          sync_config?: any | null;
        };
      };
    };
  };
}
