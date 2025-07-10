-- Product-aware guidelines for the AI agent
INSERT INTO guidelines (
  name,
  description,
  content,
  priority,
  category,
  is_active,
  tags,
  conditions
) VALUES 
(
  'Smartphone Sales Guide',
  'Guidelines for selling smartphones based on customer needs',
  'When customers ask about smartphones, focus on their primary use case: photography, gaming, business, or basic use. Highlight battery life, camera quality, and price points. Always mention current deals and compare with competitors when relevant.',
  9,
  'product_sales',
  true,
  ARRAY['smartphone', 'mobile', 'phone', 'technology'],
  '{"user_intent": ["feature_inquiry", "comparison_request", "purchase_intent"], "context_keywords": ["phone", "smartphone", "mobile", "camera", "battery"]}'::jsonb
),
(
  'Laptop Recommendation Strategy',
  'Guidelines for laptop sales conversations',
  'For laptop inquiries, determine if customer needs: work/productivity, gaming, creative work, or student use. Emphasize performance specs (RAM, processor), portability, and value for money. Always ask about budget range and suggest 2-3 options.',
  8,
  'product_sales',
  true,
  ARRAY['laptop', 'computer', 'work', 'productivity'],
  '{"user_intent": ["feature_inquiry", "demo_request", "purchase_intent"], "context_keywords": ["laptop", "computer", "work", "productivity", "performance"]}'::jsonb
),
(
  'Beauty Product Consultation',
  'Guidelines for beauty and skincare product sales',
  'When discussing beauty products, ask about skin type, current routine, and specific concerns. Focus on ingredient benefits, brand reputation, and before/after results. Suggest starter sets for new customers and complementary products.',
  7,
  'product_sales',
  true,
  ARRAY['beauty', 'skincare', 'makeup', 'cosmetics'],
  '{"user_intent": ["feature_inquiry", "general_inquiry"], "context_keywords": ["beauty", "skincare", "makeup", "skin", "cosmetics"]}'::jsonb
),
(
  'Price Objection Handler',
  'Handle price concerns with value propositions',
  'When customers express price concerns, acknowledge their budget constraints and focus on value. Compare features with lower-priced alternatives, highlight long-term savings, warranty benefits, and payment plans. Use phrases like "investment in quality" and "cost per use".',
  9,
  'objection_handling',
  true,
  ARRAY['price', 'cost', 'budget', 'expensive'],
  '{"user_intent": ["pricing_inquiry", "objection_handling"], "context_keywords": ["price", "cost", "budget", "expensive", "cheap", "affordable"]}'::jsonb
),
(
  'Product Demo Scheduler',
  'Guidelines for demo and trial requests',
  'When customers want to try products, immediately offer available options: virtual demos, trial periods, or in-store visits. Emphasize no-commitment trials and satisfaction guarantees. Collect contact information and preferred times.',
  8,
  'engagement',
  true,
  ARRAY['demo', 'trial', 'test', 'try'],
  '{"user_intent": ["demo_request"], "context_keywords": ["demo", "trial", "test", "try", "see", "experience"]}'::jsonb
);
