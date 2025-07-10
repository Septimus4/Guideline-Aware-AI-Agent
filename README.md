# Guideline-Aware AI Agent

A TypeScript-based AI agent that dynamically incorporates behavioral guidelines into its responses based on context and conversation state. The agent pulls guidelines from a Supabase database and constructs personalized system prompts to provide contextually appropriate sales interactions.

## ✨ NEW FEATURES

### 🛍️ DummyJSON Products Integration
- **Live Product Data**: Integrated with DummyJSON API for real product information
- **Product Search**: Search across 100+ products in multiple categories
- **Categories**: Beauty, Electronics, Fashion, Home, and more

### 🎯 Smart Suggestions
- **Context-Aware Recommendations**: AI suggests relevant products based on conversation
- **Multi-Factor Analysis**: Considers user intent, keywords, conversation stage
- **Confidence Scoring**: Each suggestion includes relevance confidence (0-100%)
- **Interactive Product Cards**: Click to view detailed product information

## 🎯 What It Does

This MVP demonstrates a sales-focused AI agent that:

- **Dynamically applies behavioral guidelines** from a database based on conversation context
- **Adapts responses** according to user intent, conversation stage, and detected keywords
- **Suggests relevant products** using smart recommendation engine
- **Provides real-time product information** from DummyJSON API
- **Manages conversation state** and applies guidelines with priority-based selection
- **Provides a real-time chat interface** with visibility into applied guidelines, context, and product suggestions

## 🏗️ Technical Architecture

### Core Components

1. **Guideline Management System**
   - Database storage for behavioral guidelines with conditions and priorities
   - Context-aware guideline selection based on user intent, conversation stage, and keywords
   - Dynamic prompt construction using applicable guidelines

2. **AI Agent Service**
   - OpenAI GPT-4 integration with dynamic system prompts
   - Conversation state management and context extraction
   - Priority-based guideline application

3. **REST API Server**
   - Express.js with TypeScript for type safety
   - CRUD operations for guidelines management
   - Chat endpoint for agent interactions

4. **Web Interface**
   - Real-time chat interface with the AI agent
   - Live display of active guidelines and current context
   - Visual feedback for applied guidelines per message

### Technology Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4o-mini
- **Frontend**: Vanilla HTML/CSS/JS with Vite
- **Validation**: Zod for runtime type checking

### Database Schema

**Guidelines Table:**
```sql
- id (UUID, primary key)
- name (text, not null)
- description (text)
- content (text, not null) -- The actual guideline instruction
- priority (integer, 1-10) -- Higher priority guidelines take precedence
- category (text) -- e.g., 'objection_handling', 'demo_qualification'
- is_active (boolean)
- tags (text array) -- For categorization and filtering
- conditions (jsonb) -- Context conditions for when to apply this guideline
- created_at/updated_at (timestamps)
```

**Conversations Table:**
```sql
- id (UUID, primary key)
- messages (jsonb) -- Array of chat messages
- context (jsonb) -- Conversation context and applied guidelines
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

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Fill in your credentials in `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=sk-your-openai-api-key
PORT=3001
```

**Getting Supabase Credentials:**
1. Go to [supabase.com](https://supabase.com) and create a project
2. In your project dashboard, go to Settings → API
3. Copy the Project URL and anon public key
4. For the service role key, copy it from the same API settings page

**Getting OpenAI API Key:**
1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account and navigate to API Keys
3. Create a new secret key

### Step 3: Database Setup

Run the database setup script to create tables and insert sample guidelines:

```bash
npm run setup
```

This will:
- Create the necessary database tables
- Insert 5 sample guidelines covering common sales scenarios
- Verify the database connection

### Step 4: Start the Application

For development with hot reload:
```bash
npm run dev
```

This starts both the API server (port 3001) and the web client (port 3000).

For production build:
```bash
npm run build
npm start
```

### Step 5: Test the Application

1. **Open the web interface**: http://localhost:3000
2. **Check the API documentation**: http://localhost:3001
3. **Verify health**: http://localhost:3001/health

## 🧪 Testing the Agent

### Sample Conversations

Try these messages to see different guidelines in action:

1. **Pricing Objection**: "This seems too expensive for our budget"
   - Should trigger the "Handle Pricing Objections" guideline
   - Response will focus on value proposition and ROI

2. **Demo Request**: "Can I see a demo of your product?"
   - Triggers "Demo Request Protocol" guideline
   - Agent will qualify before scheduling

3. **Feature Comparison**: "How does this compare to [competitor]?"
   - Applies "Feature Comparison Strategy" guideline
   - Focuses on business outcomes over features

4. **Security Concerns**: "What about data security and compliance?"
   - Triggers "Security Concerns Response" guideline
   - Highlights certifications and enterprise security

### API Testing

You can also test the API directly:

**Create a guideline:**
```bash
curl -X POST http://localhost:3001/api/guidelines \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Follow-up Strategy",
    "content": "Always schedule a specific follow-up time before ending the conversation.",
    "priority": 7,
    "category": "closing",
    "tags": ["follow-up", "closing"]
  }'
```

**Send a chat message:**
```bash
curl -X POST http://localhost:3001/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I need to think about it",
    "context": {
      "user_intent": "objection_handling",
      "keywords": ["think", "consider"]
    }
  }'
```

## 🧪 Testing the New Features

### Test Smart Suggestions

```bash
# 1. Start the servers
npm run dev

# 2. Visit http://localhost:3000 for the web interface

# 3. Try these example messages:
- "I need a smartphone for photography"
- "Looking for beauty products" 
- "Compare laptops for work"
- "What are your most affordable products?"

# 4. Watch for Smart Suggestions panel on the left showing:
- Product recommendations
- Confidence scores (0-100%)
- Reasons for suggestions
- Interactive product cards
```

### Test Product API Directly

```bash
# Search for products
curl "http://localhost:3001/api/products/search?q=smartphone&limit=3"

# Get specific product
curl "http://localhost:3001/api/products/1"

# Get all categories
curl "http://localhost:3001/api/products/categories/list"

# Test chat with suggestions
curl -X POST "http://localhost:3001/api/chat/message" \
  -H "Content-Type: application/json" \
  -d '{"message": "I need a smartphone for photography"}'
```

## 📋 Key Features Demonstrated

### 1. **Dynamic Guideline Selection**
- Guidelines are selected based on conversation context
- Multiple conditions can trigger guideline application
- Priority system ensures most important guidelines take precedence

### 2. **Context Awareness**
- User intent classification (pricing, demo request, etc.)
- Conversation stage tracking (introduction → discovery → closing)
- Keyword extraction for content-based guideline matching

### 3. **Intelligent Prompt Construction**
- System prompts are built dynamically for each message
- Guidelines are formatted with priorities and categories
- Context information is included for better responses

### 4. **Conversation Management**
- Full conversation history is maintained
- Applied guidelines are tracked per conversation
- Context evolves as the conversation progresses

## 🔧 Architectural Decisions

### Why This Stack?

1. **TypeScript**: Provides type safety and better developer experience
2. **Supabase**: Managed PostgreSQL with real-time features and easy setup
3. **Express.js**: Minimal, flexible web framework for rapid prototyping
4. **OpenAI GPT-4**: Reliable, high-quality AI responses with good instruction following
5. **Vanilla Frontend**: Keeps the demo simple and focused on the core functionality

### Design Patterns

1. **Service Layer Architecture**: Clear separation between data access, business logic, and presentation
2. **Context-Driven Guidelines**: Guidelines are applied based on conversation state rather than rigid rules
3. **Priority-Based Selection**: Multiple guidelines can apply, but higher priority ones take precedence
4. **Stateful Conversations**: Full conversation context is maintained for better continuity

### Scalability Considerations

- **Database**: PostgreSQL JSON fields provide flexibility for evolving guideline conditions
- **Caching**: Guidelines could be cached in Redis for high-traffic scenarios
- **Rate Limiting**: OpenAI API calls should be rate-limited in production
- **Authentication**: JWT-based auth could be added for multi-tenant use

## 🎯 Future Enhancements

1. **Advanced NLP**: Better intent classification and entity extraction
2. **A/B Testing**: Test different guideline sets for effectiveness
3. **Analytics Dashboard**: Track guideline performance and conversation outcomes
4. **Integration APIs**: Connect with CRM systems and sales tools
5. **Voice Interface**: Add speech-to-text for voice-based interactions
6. **Multi-language Support**: Localized guidelines for international sales teams

## 📖 API Reference

### Guidelines Endpoints

- `GET /api/guidelines` - List all guidelines with optional filters
- `GET /api/guidelines/:id` - Get specific guideline
- `POST /api/guidelines` - Create new guideline
- `PUT /api/guidelines/:id` - Update guideline
- `DELETE /api/guidelines/:id` - Delete guideline
- `POST /api/guidelines/applicable` - Get guidelines for specific context

### Chat Endpoints

- `POST /api/chat/message` - Send message to agent (now returns smartSuggestions)
- `GET /api/chat/conversation/:id` - Get conversation history

### Products Endpoints ✨ NEW

- `GET /api/products/search` - Search products (query: q, limit, skip, category)
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/categories/list` - Get all product categories
- `GET /api/products/category/:category` - Get products by category

### Utility Endpoints

- `GET /health` - Health check
- `GET /` - API documentation

## 🤝 Contributing

This is a prototype focused on demonstrating core concepts. For production use, consider:

- Adding comprehensive error handling
- Implementing authentication and authorization
- Adding rate limiting and request validation
- Setting up monitoring and logging
- Creating automated tests ✅
- Adding proper CI/CD pipeline ✅e

### 🧪 Testing

The project includes a comprehensive testing suite with unit tests, integration tests, and automated CI/CD.

#### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (no watch mode)
npm run test:ci

# Run linting
npm run lint

# Fix linting issues automatically
npm run lint:fix
```

#### Test Structure

- **Unit Tests**: Located in `tests/services/` and `tests/routes/`
  - Test individual service methods and API endpoints
  - Use mocking to isolate components
  - Fast execution and comprehensive coverage

- **Integration Tests**: Located in `tests/integration/`
  - Test complete API workflows
  - Verify service interactions
  - Can be run against real or test databases

#### Testing Stack

- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertion library for API testing
- **TypeScript**: Full TypeScript support in tests
- **Coverage**: Istanbul code coverage reporting

### 🚀 CI/CD Pipeline

The project includes GitHub Actions workflows for automated testing, building, and deployment.

#### Workflows

1. **CI/CD Pipeline** (`.github/workflows/ci-cd.yml`)
   - Runs on every push to `main` and `develop` branches
   - Executes tests across multiple Node.js versions (18.x, 20.x)
   - Performs security audits
   - Builds the application
   - Deploys to staging (develop branch) and production (main branch)

2. **Integration Tests** (`.github/workflows/integration-tests.yml`)
   - Runs daily integration tests
   - Uses real PostgreSQL database for testing
   - Creates GitHub issues if tests fail

#### Pipeline Stages

1. **Test & Lint**
   - Install dependencies
   - Run ESLint for code quality
   - Execute Jest test suite
   - Upload coverage reports

2. **Build & Validate**
   - Build TypeScript application
   - Validate build artifacts
   - Test production build

3. **Security Audit**
   - Run npm audit for vulnerabilities
   - Check dependencies with audit-ci

4. **Deploy**
   - Deploy to staging environment (develop branch)
   - Deploy to production environment (main branch)
   - Create GitHub releases for production deployments

#### Setting Up CI/CD

1. **Required Secrets** (GitHub Repository Settings → Secrets):
   ```
   OPENAI_API_KEY=your_openai_api_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Environment Configuration**:
   - Staging and production environments are configured in GitHub
   - Add deployment scripts for your preferred platform (Vercel, Railway, etc.)

3. **Branch Protection**:
   - Set up branch protection rules for `main`
   - Require status checks to pass before merging
   - Require pull request reviews

#### Deployment Platforms

The CI/CD pipeline is designed to work with various deployment platforms:

- **Vercel**: Frontend and serverless functions
- **Railway**: Full-stack application deployment
- **Heroku**: Traditional PaaS deployment
- **AWS/Google Cloud**: Container or serverless deployment

To customize for your platform, update the deployment steps in `.github/workflows/ci-cd.yml`.

---

**Built with ❤️ as an MVP demonstration of guideline-aware AI agents**
