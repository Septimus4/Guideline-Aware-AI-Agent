import { supabase } from '../config/database';
import { Conversation, ChatMessage } from '../types';

export class ConversationService {
  async createConversation(
    messages: ChatMessage[],
    context?: {
      user_intent?: string;
      conversation_stage?: string;
      applied_guidelines?: string[];
    }
  ): Promise<Conversation> {
    const conversation = {
      messages,
      context: context || {},
    };

    const { data, error } = await supabase
      .from('conversations')
      .insert([conversation])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return data;
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch conversation: ${error.message}`);
    }

    return data;
  }

  async updateConversation(
    id: string,
    messages: ChatMessage[],
    context?: {
      user_intent?: string;
      conversation_stage?: string;
      applied_guidelines?: string[];
    }
  ): Promise<Conversation> {
    const updates = {
      messages,
      context: context || {},
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation: ${error.message}`);
    }

    return data;
  }

  async addMessageToConversation(
    conversationId: string,
    message: ChatMessage,
    appliedGuidelines?: string[]
  ): Promise<Conversation> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const updatedMessages = [...conversation.messages, message];
    const updatedContext = {
      ...conversation.context,
      applied_guidelines: appliedGuidelines || conversation.context?.applied_guidelines || []
    };

    return this.updateConversation(conversationId, updatedMessages, updatedContext);
  }

  determineConversationStage(messages: ChatMessage[]): string {
    const messageCount = messages.filter(m => m.role === 'user').length;

    if (messageCount <= 1) return 'introduction';
    if (messageCount <= 2) return 'discovery';
    if (messageCount <= 4) return 'recommendation';
    if (messageCount <= 6) return 'presentation';
    if (messageCount <= 8) return 'objection_handling';
    return 'closing';
  }
}
