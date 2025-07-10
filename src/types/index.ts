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

// Product schemas (DummyJSON API)
export const ProductSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  discountPercentage: z.number(),
  rating: z.number(),
  stock: z.number(),
  brand: z.string().optional(),
  category: z.string(),
  thumbnail: z.string(),
  images: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    depth: z.number(),
  }).optional(),
  warrantyInformation: z.string().optional(),
  shippingInformation: z.string().optional(),
  availabilityStatus: z.string().optional(),
  reviews: z.array(z.object({
    rating: z.number(),
    comment: z.string(),
    date: z.string(),
    reviewerName: z.string(),
    reviewerEmail: z.string(),
  })).optional(),
  returnPolicy: z.string().optional(),
  minimumOrderQuantity: z.number().optional(),
  meta: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    barcode: z.string(),
    qrCode: z.string(),
  }).optional(),
});

export const ProductSearchParamsSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().optional(),
  skip: z.number().optional(),
});

export const ProductSuggestionSchema = z.object({
  product: ProductSchema,
  reason: z.string(),
  confidence: z.number().min(0).max(1),
  type: z.enum(['keyword', 'intent', 'stage', 'popular', 'related']),
});

// Enhanced chat request with product context
export const EnhancedChatRequestSchema = ChatRequestSchema.extend({
  product_context: z.object({
    interested_products: z.array(z.number()).optional(),
    viewed_products: z.array(z.number()).optional(),
    search_history: z.array(z.string()).optional(),
  }).optional(),
});

// Type exports
export type Guideline = z.infer<typeof GuidelineSchema>;
export type CreateGuideline = z.infer<typeof CreateGuidelineSchema>;
export type UpdateGuideline = z.infer<typeof UpdateGuidelineSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductSearchParams = z.infer<typeof ProductSearchParamsSchema>;
export type ProductSuggestion = z.infer<typeof ProductSuggestionSchema>;
export type EnhancedChatRequest = z.infer<typeof EnhancedChatRequestSchema>;
