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
  conversation_id: z.string().nullable().optional(),
  context: z.object({
    user_intent: z.string().optional(),
    conversation_stage: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    shopping_intent: z.enum(['browsing', 'comparing', 'buying', 'support']).optional(),
    budget_range: z.string().optional(),
    preferred_categories: z.array(z.string()).optional(),
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
  type: z.enum(['keyword', 'intent', 'stage', 'popular', 'related', 'contextual']),
});

// Enhanced chat request with shopping context
export const EnhancedChatRequestSchema = ChatRequestSchema.extend({
  shopping_context: z.object({
    interested_products: z.array(z.number()).optional(),
    viewed_products: z.array(z.number()).optional(),
    cart_items: z.array(z.number()).optional(),
    wishlist_items: z.array(z.number()).optional(),
    search_history: z.array(z.string()).optional(),
    purchase_history: z.array(z.number()).optional(),
    preferred_brands: z.array(z.string()).optional(),
    budget_range: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
  }).optional(),
});

// Shopping-specific schemas
export const ShoppingCartItemSchema = z.object({
  product_id: z.number(),
  quantity: z.number().min(1),
  added_at: z.string(),
});

export const WishlistItemSchema = z.object({
  product_id: z.number(),
  added_at: z.string(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});

export const ShoppingSessionSchema = z.object({
  session_id: z.string().uuid().optional(),
  user_id: z.string().optional(),
  cart_items: z.array(ShoppingCartItemSchema).default([]),
  wishlist_items: z.array(WishlistItemSchema).default([]),
  viewed_products: z.array(z.number()).default([]),
  search_history: z.array(z.string()).default([]),
  budget_preferences: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    preferred_range: z.string().optional(),
  }).optional(),
  shopping_preferences: z.object({
    preferred_categories: z.array(z.string()).default([]),
    preferred_brands: z.array(z.string()).default([]),
    price_sensitivity: z.enum(['low', 'medium', 'high']).default('medium'),
    quality_preference: z.enum(['budget', 'balanced', 'premium']).default('balanced'),
  }).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const PurchaseIntentSchema = z.object({
  products: z.array(z.number()),
  urgency: z.enum(['low', 'medium', 'high']),
  budget_constraint: z.boolean().default(false),
  decision_factors: z.array(z.enum(['price', 'quality', 'reviews', 'brand', 'features', 'availability'])),
  timeline: z.string().optional(),
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
export type ShoppingCartItem = z.infer<typeof ShoppingCartItemSchema>;
export type WishlistItem = z.infer<typeof WishlistItemSchema>;
export type ShoppingSession = z.infer<typeof ShoppingSessionSchema>;
export type PurchaseIntent = z.infer<typeof PurchaseIntentSchema>;

// Shopping Insights Types
export interface ShoppingInsights {
  recommendedActions: string[];
  priceAlerts: PriceAlert[];
  stockAlerts: StockAlert[];
  similarCustomers: string[];
  budgetAnalysis: BudgetAnalysis;
  purchaseReadiness: number;
}

export interface PriceAlert {
  productId: number;
  currentPrice: number;
  targetPrice: number;
  alertType: 'price_drop' | 'back_in_stock' | 'low_stock' | 'sale_ending';
  message: string;
}

export interface StockAlert {
  productId: number;
  currentStock: number;
  threshold: number;
  urgency: 'low' | 'medium' | 'high';
  message: string;
}

export interface BudgetAnalysis {
  totalBudget?: number;
  estimatedSpend: number;
  remainingBudget?: number;
  budgetStatus: 'under' | 'at' | 'over';
  recommendations: string[];
}

export interface ShoppingContext {
  currentBrowsingCategory?: string;
  priceRange?: { min: number; max: number };
  searchIntent: 'browse' | 'compare' | 'purchase' | 'research';
  urgency: 'low' | 'medium' | 'high';
  decisionStage: 'awareness' | 'consideration' | 'decision' | 'purchase';
}

export interface ProductComparison {
  products: Product[];
  comparisonFactors: string[];
  recommendation: {
    productId: number;
    reason: string;
    confidence: number;
  };
}

export interface ShoppingJourney {
  stage: 'discovery' | 'research' | 'comparison' | 'decision' | 'purchase';
  productsViewed: number[];
  searchQueries: string[];
  timeSpent: number;
  interactions: ShoppingInteraction[];
}

export interface ShoppingInteraction {
  type: 'view' | 'compare' | 'add_to_cart' | 'add_to_wishlist' | 'ask_question' | 'read_reviews';
  productId?: number;
  timestamp: string;
  details?: any;
}
