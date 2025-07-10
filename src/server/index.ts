import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import guidelineRoutes from '../routes/guidelines';
import chatRoutes from '../routes/chat';

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/guidelines', guidelineRoutes);
app.use('/api/chat', chatRoutes);

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
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
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
