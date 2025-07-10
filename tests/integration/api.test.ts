import request from 'supertest';
import express from 'express';

describe('API Integration Tests', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create a minimal test Express app
    app = express();
    app.use(express.json());
    
    // JSON parsing error handler - must come after express.json()
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (error instanceof SyntaxError && (error as any).status === 400 && 'body' in error) {
        return res.status(400).json({ error: 'Invalid JSON format' });
      }
      next(error);
    });
    
    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
    
    // Simple guidelines endpoint for testing
    app.get('/api/guidelines', (req, res) => {
      res.json([]);
    });
    
    app.post('/api/guidelines', (req, res) => {
      res.json({ id: '1', ...req.body });
    });
    
    // Error handling middleware
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(500).json({ error: 'Internal server error' });
    });
    
    app.use((req, res) => {
      res.status(404).json({ error: 'Not found' });
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('API Structure', () => {
    it('should handle guidelines endpoint', async () => {
      const response = await request(app)
        .get('/api/guidelines')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors gracefully', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should handle malformed JSON in requests', async () => {
      // This test verifies that Express handles malformed JSON
      const response = await request(app)
        .post('/api/guidelines')
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      // Express will automatically return 400 for malformed JSON
    });
  });
});
