# AI Shopping Assistant Platform

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Septimus4/Guideline-Aware-AI-Shop-Assistant)

A sophisticated TypeScript-based AI shopping assistant that helps customers browse, choose, and purchase products online. The platform combines intelligent product recommendations with guideline-driven conversations to create personalized shopping experiences that drive customer satisfaction and sales conversions.

📚 **Documentation is hosted on [DeepWiki](https://deepwiki.com/Septimus4/Guideline-Aware-AI-Agent)**

## 🛍️ SHOPPING FEATURES

### 🎯 Smart Shopping Assistant
* **Personalized Product Recommendations**: AI suggests products based on customer needs, preferences, budget, and conversation context
* **Intelligent Conversation Flow**: Guides customers from discovery to purchase with contextual assistance
* **Shopping Stage Awareness**: Adapts responses based on where customers are in their buying journey (browsing, comparing, deciding, purchasing)
* **Purchase Readiness Detection**: Analyzes customer engagement to determine how close they are to buying

### 🛒 Product Integration
* **Live Product Catalog**: Integrated with DummyJSON API for real product information (100+ products)
* **Product Search & Discovery**: Advanced search across multiple categories with smart filtering
* **Categories**: Beauty, Electronics, Fashion, Home, Automotive, Sports, Books, and more
* **Detailed Product Information**: Specifications, reviews, pricing, discounts, availability, and shipping info
* **Stock Management**: Real-time inventory tracking with low-stock alerts

### 🧠 Context-Aware Assistance
* **Shopping Intent Detection**: Recognizes when customers are browsing, comparing, or ready to buy
* **Budget-Conscious Recommendations**: Suggests products within customer's price range with alternatives
* **Comparison Support**: Helps customers evaluate different options side-by-side with detailed analysis
* **Cross-selling & Upselling**: Intelligent suggestions for complementary products and upgrades

### 💰 Shopping Intelligence
* **Price Alerts**: Notifications for price drops and special offers
* **Deal Highlighting**: Automatic detection and promotion of discounts and sales
* **Budget Analysis**: Tracks spending against customer budget preferences
* **Purchase Insights**: Analytics on customer behavior and shopping patterns

## 🎯 What It Does

This AI Shopping Assistant provides:

* **🛍️ End-to-End Shopping Experience**: From product discovery to post-purchase support
* **📱 Multi-Category Expertise**: Deep knowledge about electronics, fashion, beauty, home goods, and more
* **💡 Smart Product Discovery**: Helps customers find products they didn't know they needed
* **💰 Budget-Friendly Options**: Suggests products within customer price ranges and highlights deals
* **🔄 Comparison Support**: Enables side-by-side product comparisons with detailed feature analysis
* **🛒 Purchase Guidance**: Walks customers through the entire buying process from discovery to checkout
* **📞 Post-Purchase Support**: Continues relationship with order tracking and customer care
* **🎁 Gift Recommendations**: Seasonal and occasion-based product suggestions

## 🏗️ Technical Architecture

### Core Shopping Components

1. **Shopping Guidelines System**
   * 15+ specialized guidelines for different product categories and shopping stages
   * Context-aware guideline selection based on customer intent and conversation flow
   * Dynamic conversation adaptation for browsing, comparison, and purchase phases
   * Priority-based guideline application with shopping-specific rules

2. **Product Intelligence Service**
   * Real-time product data from DummyJSON API
   * Smart product matching based on customer needs and preferences
   * Advanced filtering by price, category, brand, and features
   * Inventory tracking and availability management

3. **Shopping Context Engine**
   * Purchase readiness scoring based on customer engagement
   * Shopping intent classification (browsing, comparing, buying, support)
   * Budget analysis and price range optimization
   * Cross-selling and upselling opportunity identification
   * Inventory awareness and availability checking

3. **AI Shopping Agent**
   * OpenAI GPT-4 integration optimized for shopping conversations
   * Shopping stage detection and conversation state management
   * Purchase intent recognition and conversion optimization

3. **REST API Server**

   * Express.js with TypeScript for type safety
   * CRUD operations for guidelines management
   * Chat endpoint for agent interactions

4. **Web Interface**

   * Real-time chat interface with the AI agent
   * Live display of active guidelines and current context
   * Visual feedback for applied guidelines per message

### Technology Stack

* **Backend**: Node.js, Express.js, TypeScript
* **Database**: Supabase (PostgreSQL)
* **AI**: OpenAI GPT-4o-mini
* **Frontend**: Vanilla HTML/CSS/JS with Vite
* **Validation**: Zod for runtime type checking

### Database Schema

**Guidelines Table:**

```sql
- id (UUID, primary key)
- name (text, not null)
- description (text)
- content (text, not null)
- priority (integer, 1-10)
- category (text)
- is_active (boolean)
- tags (text array)
- conditions (jsonb)
- created_at/updated_at (timestamps)
```

**Conversations Table:**

```sql
- id (UUID, primary key)
- messages (jsonb)
- context (jsonb)
- created_at/updated_at (timestamps)
```

## 🚀 How to Deploy Locally

### Prerequisites

1. **Node.js** (v18+ recommended)
2. **Supabase account** and project
3. **OpenAI API key**

### Step 1: Clone and Install

```bash
git clone <repository-url>
cd Guideline-Aware-AI-Agent
npm install
```

### Step 2: Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your Supabase and OpenAI credentials.

### Step 3: Database Setup

```bash
npm run setup
```

### Step 4: Start the Application

```bash
npm run dev
```

For production:

```bash
npm run build
npm start
```

## 📋 Key Features Demonstrated

### 1. **Dynamic Guideline Selection**

* Based on user intent, stage, and keywords
* Prioritized to apply most relevant behavioral logic

### 2. **Context Awareness**

* Intent classification and keyword extraction
* Full conversation context tracking

### 3. **Intelligent Prompt Construction**

* Dynamic system prompts per message
* Includes relevant guidelines and categories

### 4. **Conversation Management**

* Tracks entire history and applied guidelines
* Context evolves with conversation progression

## 🔧 Architectural Decisions

* **TypeScript**: Type-safe, developer-friendly
* **Supabase**: Easy PostgreSQL backend with real-time capabilities
* **OpenAI**: GPT-4 model for coherent, context-sensitive responses
* **Modular Design**: Clear separation of concerns with service-layer architecture

## 🧪 Testing

See: [TESTING.md](https://github.com/Septimus4/Guideline-Aware-AI-Agent/blob/main/TESTING.md)

## 📖 API Reference

### Guidelines Endpoints

* `GET /api/guidelines`
* `GET /api/guidelines/:id`
* `POST /api/guidelines`
* `PUT /api/guidelines/:id`
* `DELETE /api/guidelines/:id`
* `POST /api/guidelines/applicable`

### Chat Endpoints

* `POST /api/chat/message`
* `GET /api/chat/conversation/:id`

### Products Endpoints ✨

* `GET /api/products/search`
* `GET /api/products/:id`
* `GET /api/products/categories/list`
* `GET /api/products/category/:category`

### Utility

* `GET /health`
* `GET /` – API docs

## 📋 API Documentation

The project includes comprehensive OpenAPI 3.0.3 specification documentation:

### Available Formats
- **YAML**: `openapi.yaml` - Human-readable format
- **JSON**: `openapi.json` - Machine-readable format

### API Endpoints

#### Chat & Conversations
- `POST /api/chat/message` - Process chat messages with AI responses
- `GET /api/chat/conversation/{id}` - Retrieve conversation history

#### Guidelines Management  
- `GET /api/guidelines` - List all guidelines (with filtering)
- `POST /api/guidelines` - Create new guideline
- `GET /api/guidelines/{id}` - Get specific guideline
- `PUT /api/guidelines/{id}` - Update guideline
- `DELETE /api/guidelines/{id}` - Delete guideline
- `POST /api/guidelines/applicable` - Get applicable guidelines for context

#### Product Search
- `GET /api/products/search` - Search products with query parameters
- `GET /api/products/{id}` - Get specific product details
- `GET /api/products/categories/list` - List all product categories
- `GET /api/products/category/{category}` - Get products by category

### Documentation Commands

```bash
# Generate JSON from YAML
npm run docs:openapi

# Serve interactive documentation (requires swagger-ui-serve)
npm run docs:serve

# Or use online tools
# Paste openapi.yaml content into: https://editor.swagger.io/
```

### Key Features
- Complete request/response schemas
- Error handling documentation
- Example requests and responses
- Authentication schemas (ready for implementation)
- Comprehensive data models for all entities

## 🤝 Contributing

This is an MVP prototype for demonstrating guideline-aware AI agents.

To contribute:

* Use PRs and follow GitHub issues
* Add proper error handling and request validation
* Follow CI/CD and testing practices defined in the repo
