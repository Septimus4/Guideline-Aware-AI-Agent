// Test script to verify smart suggestions logic
import { ProductService } from './src/services/ProductService';

async function testSmartSuggestions() {
  const productService = new ProductService();
  
  console.log('Testing smart suggestions for iPhone with budget 350-600...');
  
  try {
    const suggestions = await productService.generateSmartSuggestions({
      userMessage: 'can you recommend an iPhone with budget 350 to 600',
      budgetRange: '350-600',
      keywords: ['iphone'],
      userIntent: 'product_inquiry'
    });
    
    console.log(`\nFound ${suggestions.length} suggestions:`);
    suggestions.forEach((suggestion, i) => {
      console.log(`\n${i + 1}. ${suggestion.product.title}`);
      console.log(`   Price: $${suggestion.product.price}`);
      console.log(`   Brand: ${suggestion.product.brand}`);
      console.log(`   Category: ${suggestion.product.category}`);
      console.log(`   Reason: ${suggestion.reason}`);
      console.log(`   Confidence: ${suggestion.confidence}`);
      console.log(`   Stock: ${suggestion.product.stock}`);
    });
    
  } catch (error) {
    console.error('Error testing smart suggestions:', error);
  }
}

testSmartSuggestions();
