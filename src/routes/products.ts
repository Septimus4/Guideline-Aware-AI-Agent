import express from 'express';
import { AgentService } from '../services/AgentService';
import { ProductSearchParamsSchema } from '../types';

const router = express.Router();
const agentService = new AgentService();

// Search products
router.get('/search', async (req, res) => {
  try {
    const params = ProductSearchParamsSchema.parse({
      q: req.query.q,
      category: req.query.category,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      skip: req.query.skip ? parseInt(req.query.skip as string) : undefined,
    });

    const result = await agentService.searchProducts(params.q || '', params.limit);
    res.json(result);
  } catch (error) {
    console.error('Error searching products:', error);
    if (error instanceof Error && error.message.includes('validation')) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to search products' });
    }
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid product ID' });
    }

    const product = await agentService.getProductById(id);
    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Get all categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await agentService.getProductCategories();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get products by category
router.get('/category/:category', async (req, res) => {
  try {
    const category = req.params.category;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    
    const result = await agentService.searchProducts('', limit);
    // Filter by category on the client side or enhance the search method
    res.json(result);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ error: 'Failed to fetch products by category' });
  }
});

export default router;
