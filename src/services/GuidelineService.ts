import { supabase } from '../config/database';
import { Guideline, CreateGuideline, UpdateGuideline } from '../types';

export class GuidelineService {
  async createGuideline(guideline: CreateGuideline): Promise<Guideline> {
    const { data, error } = await supabase
      .from('guidelines')
      .insert([guideline])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create guideline: ${error.message}`);
    }

    return data;
  }

  async getGuidelines(filters?: {
    category?: string;
    isActive?: boolean;
    tags?: string[];
  }): Promise<Guideline[]> {
    let query = supabase.from('guidelines').select('*');

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags);
    }

    const { data, error } = await query.order('priority', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch guidelines: ${error.message}`);
    }

    return data || [];
  }

  async getGuidelineById(id: string): Promise<Guideline | null> {
    const { data, error } = await supabase
      .from('guidelines')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch guideline: ${error.message}`);
    }

    return data;
  }

  async updateGuideline(id: string, updates: UpdateGuideline): Promise<Guideline> {
    const { data, error } = await supabase
      .from('guidelines')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update guideline: ${error.message}`);
    }

    return data;
  }

  async deleteGuideline(id: string): Promise<void> {
    const { error } = await supabase
      .from('guidelines')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete guideline: ${error.message}`);
    }
  }

  async getApplicableGuidelines(context: {
    userIntent?: string;
    conversationStage?: string;
    keywords?: string[];
  }): Promise<Guideline[]> {
    const allGuidelines = await this.getGuidelines({ isActive: true });

    return allGuidelines.filter(guideline => {
      if (!guideline.conditions) return true;

      const { user_intent, conversation_stage, context_keywords } = guideline.conditions;

      // Check user intent match
      if (user_intent && user_intent.length > 0 && context.userIntent) {
        if (!user_intent.includes(context.userIntent)) return false;
      }

      // Check conversation stage match
      if (conversation_stage && conversation_stage.length > 0 && context.conversationStage) {
        if (!conversation_stage.includes(context.conversationStage)) return false;
      }

      // Check keyword match
      if (context_keywords && context_keywords.length > 0 && context.keywords) {
        const hasKeywordMatch = context_keywords.some(keyword =>
          context.keywords!.some(contextKeyword =>
            contextKeyword.toLowerCase().includes(keyword.toLowerCase())
          )
        );
        if (!hasKeywordMatch) return false;
      }

      return true;
    }).sort((a, b) => b.priority - a.priority);
  }
}
