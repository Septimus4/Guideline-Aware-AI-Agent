import express from 'express';
import { AgentService } from '../services/AgentService';
import { ChatRequestSchema } from '../types';

const router = express.Router();
const agentService = new AgentService();

// Process chat message
router.post('/message', async (req, res) => {
  try {
    const parsed = ChatRequestSchema.parse(req.body);
    const result = await agentService.processMessage(parsed);
    res.json(result);
  } catch (error) {
    console.error('Error processing chat message:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to process message' });
    }
  }
});

// Get conversation history
router.get('/conversation/:id', async (req, res) => {
  try {
    const conversation = await agentService.getConversationHistory(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

export default router;
