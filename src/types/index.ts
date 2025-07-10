import { z } from 'zod';

// Guideline schemas
export const GuidelineSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  content: z.string().min(1, 'Content is required'),
  priority: z.number().int().min(1).max(10).default(5),
  category: z.string().default('general'),
  is_active: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  conditions: z.object({
    user_intent: z.array(z.string()).optional(),
    conversation_stage: z.array(z.string()).optional(),
    context_keywords: z.array(z.string()).optional(),
  }).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const CreateGuidelineSchema = GuidelineSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export const UpdateGuidelineSchema = GuidelineSchema.partial().omit({
  id: true,
  created_at: true,
  updated_at: true,
});

// Chat schemas
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().optional(),
});

export const ChatRequestSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  conversation_id: z.string().optional(),
  context: z.object({
    user_intent: z.string().optional(),
    conversation_stage: z.string().optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});

export const ConversationSchema = z.object({
  id: z.string().uuid().optional(),
  messages: z.array(ChatMessageSchema),
  context: z.object({
    user_intent: z.string().optional(),
    conversation_stage: z.string().optional(),
    applied_guidelines: z.array(z.string()).optional(),
  }).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// Type exports
export type Guideline = z.infer<typeof GuidelineSchema>;
export type CreateGuideline = z.infer<typeof CreateGuidelineSchema>;
export type UpdateGuideline = z.infer<typeof UpdateGuidelineSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
