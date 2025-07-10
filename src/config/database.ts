import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database schema interfaces
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
          conditions: any;
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
          conditions?: any;
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
          conditions?: any;
          updated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          messages: any;
          context: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          messages: any;
          context?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          messages?: any;
          context?: any;
          updated_at?: string;
        };
      };
    };
  };
}
