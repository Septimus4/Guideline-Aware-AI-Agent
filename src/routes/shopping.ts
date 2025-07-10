import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AgentService } from '../services/AgentService';

const router = Router();
const agentService = new AgentService();

// Shopping cart operations
export const addToCartSchema = z.object({
  productId: z.number(),
  quantity: z.number().min(1).default(1)
});

export async function addToCart(req: Request, res: Response) {
  try {
    const { productId, quantity } = addToCartSchema.parse(req.body);
    const result = await agentService.addToCart(productId, quantity);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    console.error('Error adding to cart:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to cart'
    });
  }
}

// Product comparison
export const compareProductsSchema = z.object({
  productIds: z.array(z.number()).min(2).max(5)
});

export async function compareProducts(req: Request, res: Response) {
  try {
    const { productIds } = compareProductsSchema.parse(req.body);
    const result = await agentService.compareProducts(productIds);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data - please provide 2-5 product IDs',
        errors: error.errors
      });
    }
    
    console.error('Error comparing products:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to compare products'
    });
  }
}

// Shopping recommendations
export const getRecommendationsSchema = z.object({
  budget: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional(),
  category: z.string().optional(),
  preferences: z.array(z.string()).optional(),
  previousPurchases: z.array(z.number()).optional()
});

export async function getShoppingRecommendations(req: Request, res: Response) {
  try {
    const context = getRecommendationsSchema.parse(req.body);
    const recommendations = await agentService.getShoppingRecommendations(context);
    res.json({
      success: true,
      recommendations
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations'
    });
  }
}

// Advanced product search
export const advancedSearchSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  minRating: z.number().min(0).max(5).optional(),
  sortBy: z.enum(['price', 'rating', 'discount', 'popularity']).optional(),
  limit: z.number().min(1).max(50).optional()
});

export async function advancedProductSearch(req: Request, res: Response) {
  try {
    const criteria = advancedSearchSchema.parse(req.query);
    const result = await agentService.searchProducts('', criteria.limit);
    
    // For now, delegate to the product service's advanced search
    // In a real implementation, you'd call the advanced search method
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters',
        errors: error.errors
      });
    }
    
    console.error('Error in advanced search:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform advanced search'
    });
  }
}

// Get deals and discounts
export async function getDeals(req: Request, res: Response) {
  try {
    // Parse query parameters (keeping for future use)
    // const minDiscount = parseInt(req.query.minDiscount as string) || 10;
    // const limit = parseInt(req.query.limit as string) || 10;
    
    // This would typically call a specialized method
    // For now, we'll return a placeholder response
    res.json({
      success: true,
      deals: [],
      message: 'Deals feature coming soon!'
    });
  } catch (error) {
    console.error('Error getting deals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get deals'
    });
  }
}

// Wishlist operations
export const wishlistSchema = z.object({
  userId: z.string(),
  productId: z.number()
});

export async function addToWishlist(req: Request, res: Response) {
  try {
    const { userId, productId } = wishlistSchema.parse(req.body);
    
    // In a real app, you'd get userId from authentication
    // For demo purposes, we'll use the provided userId
    res.json({
      success: true,
      message: 'Added to wishlist',
      wishlistItem: { userId, productId }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      });
    }
    
    console.error('Error adding to wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
}

export async function getWishlist(req: Request, res: Response) {
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // In a real app, you'd validate the user has access to this wishlist
    res.json({
      success: true,
      wishlist: [],
      message: 'Wishlist feature coming soon!'
    });
  } catch (error) {
    console.error('Error getting wishlist:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist'
    });
  }
}

// Define routes
router.post('/cart', addToCart);
router.post('/compare', compareProducts);
router.post('/recommendations', getShoppingRecommendations);
router.post('/search', advancedProductSearch);
router.get('/deals', getDeals);
router.post('/wishlist', addToWishlist);
router.get('/wishlist/:userId', getWishlist);

export default router;
