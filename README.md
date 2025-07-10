# Guideline-Aware AI Agent

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Septimus4/Guideline-Aware-AI-Agent)

A TypeScript-based AI agent that dynamically incorporates behavioral guidelines into its responses based on context and conversation state. The agent pulls guidelines from a Supabase database and constructs personalized system prompts to provide contextually appropriate sales interactions.

📚 **Documentation is hosted on [DeepWiki](https://deepwiki.com/Septimus4/Guideline-Aware-AI-Agent)**

## ✨ NEW FEATURES

### 🛍️ DummyJSON Products Integration

* **Live Product Data**: Integrated with DummyJSON API for real product information
* **Product Search**: Search across 100+ products in multiple categories
* **Categories**: Beauty, Electronics, Fashion, Home, and more

### 🎯 Smart Suggestions

* **Context-Aware Recommendations**: AI suggests relevant products based on conversation
* **Multi-Factor Analysis**: Considers user intent, keywords, conversation stage
* **Confidence Scoring**: Each suggestion includes relevance confidence (0-100%)
* **Interactive Product Cards**: Click to view detailed product information

## 🎯 What It Does

This MVP demonstrates a sales-focused AI agent that:

* **Dynamically applies behavioral guidelines** from a database based on conversation context
* **Adapts responses** according to user intent, conversation stage, and detected keywords
* **Suggests relevant products** using smart recommendation engine
* **Provides real-time product information** from DummyJSON API
* **Manages conversation state** and applies guidelines with priority-based selection
* **Provides a real-time chat interface** with visibility into applied guidelines, context, and product suggestions

## 🏗️ Technical Architecture

### Core Components

1. **Guideline Management System**

   * Database storage for behavioral guidelines with conditions and priorities
   * Context-aware guideline selection based on user intent, conversation stage, and keywords
   * Dynamic prompt construction using applicable guidelines

2. **AI Agent Service**

   * OpenAI GPT-4 integration with dynamic system prompts
   * Conversation state management and context extraction
   * Priority-based guideline application

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

## 🤝 Contributing

This is an MVP prototype for demonstrating guideline-aware AI agents.

To contribute:

* Use PRs and follow GitHub issues
* Add proper error handling and request validation
* Follow CI/CD and testing practices defined in the repo
