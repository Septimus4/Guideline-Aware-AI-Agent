import express from 'express';
import { GuidelineService } from '../services/GuidelineService';
import { CreateGuidelineSchema, UpdateGuidelineSchema } from '../types';

const router = express.Router();
const guidelineService = new GuidelineService();

// Get all guidelines
router.get('/', async (req, res) => {
  try {
    const { category, isActive, tags } = req.query;
    
    const filters: any = {};
    if (category) filters.category = category as string;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    if (tags) filters.tags = (tags as string).split(',');

    const guidelines = await guidelineService.getGuidelines(filters);
    res.json(guidelines);
  } catch (error) {
    console.error('Error fetching guidelines:', error);
    res.status(500).json({ error: 'Failed to fetch guidelines' });
  }
});

// Get guideline by ID
router.get('/:id', async (req, res) => {
  try {
    const guideline = await guidelineService.getGuidelineById(req.params.id);
    if (!guideline) {
      return res.status(404).json({ error: 'Guideline not found' });
    }
    res.json(guideline);
  } catch (error) {
    console.error('Error fetching guideline:', error);
    res.status(500).json({ error: 'Failed to fetch guideline' });
  }
});

// Create new guideline
router.post('/', async (req, res) => {
  try {
    const parsed = CreateGuidelineSchema.parse(req.body);
    const guideline = await guidelineService.createGuideline(parsed);
    res.status(201).json(guideline);
  } catch (error) {
    console.error('Error creating guideline:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to create guideline' });
    }
  }
});

// Update guideline
router.put('/:id', async (req, res) => {
  try {
    const parsed = UpdateGuidelineSchema.parse(req.body);
    const guideline = await guidelineService.updateGuideline(req.params.id, parsed);
    res.json(guideline);
  } catch (error) {
    console.error('Error updating guideline:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update guideline' });
    }
  }
});

// Delete guideline
router.delete('/:id', async (req, res) => {
  try {
    await guidelineService.deleteGuideline(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting guideline:', error);
    res.status(500).json({ error: 'Failed to delete guideline' });
  }
});

// Get applicable guidelines for context
router.post('/applicable', async (req, res) => {
  try {
    const { userIntent, conversationStage, keywords } = req.body;
    const context = { userIntent, conversationStage, keywords };
    
    const guidelines = await guidelineService.getApplicableGuidelines(context);
    res.json(guidelines);
  } catch (error) {
    console.error('Error fetching applicable guidelines:', error);
    res.status(500).json({ error: 'Failed to fetch applicable guidelines' });
  }
});

export default router;
