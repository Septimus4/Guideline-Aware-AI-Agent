import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import guidelineRoutes from '../routes/guidelines';
import chatRoutes from '../routes/chat';
import productRoutes from '../routes/products';
import shoppingRoutes from '../routes/shopping';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
  preflightContinue: false,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));

// JSON parsing error handler - must come after express.json()
app.use((error: Error & { status?: number }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: 'Invalid JSON format' });
  }
  next(error);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Explicit OPTIONS handler for all API routes
app.options('/api/*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.sendStatus(200);
});

// API routes
app.use('/api/guidelines', guidelineRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/products', productRoutes);
app.use('/api/shopping', shoppingRoutes);

// Root endpoint with API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'Guideline-Aware AI Agent API',
    version: '1.0.0',
    description: 'API for managing behavioral guidelines and AI agent interactions',
    endpoints: {
      guidelines: {
        'GET /api/guidelines': 'Get all guidelines (with optional filters)',
        'GET /api/guidelines/:id': 'Get guideline by ID',
        'POST /api/guidelines': 'Create new guideline',
        'PUT /api/guidelines/:id': 'Update guideline',
        'DELETE /api/guidelines/:id': 'Delete guideline',
        'POST /api/guidelines/applicable': 'Get applicable guidelines for context'
      },
      chat: {
        'POST /api/chat/message': 'Send message to AI agent',
        'GET /api/chat/conversation/:id': 'Get conversation history'
      },
      products: {
        'GET /api/products/search': 'Search products (query: q, limit, skip, category)',
        'GET /api/products/:id': 'Get product by ID',
        'GET /api/products/categories/list': 'Get all product categories',
        'GET /api/products/category/:category': 'Get products by category'
      },
      shopping: {
        'GET /api/shopping/cart': 'Get shopping cart contents',
        'POST /api/shopping/cart': 'Add item to shopping cart',
        'PUT /api/shopping/cart/:itemId': 'Update shopping cart item quantity',
        'DELETE /api/shopping/cart/:itemId': 'Remove item from shopping cart',
        'POST /api/shopping/checkout': 'Checkout and create order'
      },
      utility: {
        'GET /health': 'Health check endpoint'
      }
    },
    examples: {
      createGuideline: {
        name: 'Handle pricing objections',
        description: 'Guidelines for responding to price-related concerns',
        content: 'When a prospect mentions price concerns, acknowledge their budget constraints, then pivot to value proposition. Ask about their current solution costs and highlight ROI.',
        priority: 8,
        category: 'objection_handling',
        tags: ['pricing', 'objections'],
        conditions: {
          user_intent: ['pricing_inquiry', 'objection_handling'],
          context_keywords: ['price', 'cost', 'expensive', 'budget']
        }
      },
      chatMessage: {
        message: 'This seems too expensive for our budget',
        context: {
          user_intent: 'pricing_inquiry',
          conversation_stage: 'objection_handling',
          keywords: ['expensive', 'budget']
        }
      }
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`🚀 Guideline-Aware AI Agent API running on ${HOST}:${PORT}`);
  console.log(`📖 API documentation available at http://${HOST}:${PORT}/`);
  console.log(`🏥 Health check available at http://${HOST}:${PORT}/health`);
  console.log(`🌐 Remote access available at http://<your-ip>:${PORT}/`);
});

export default app;
