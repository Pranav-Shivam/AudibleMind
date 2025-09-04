# Bot API Module 🤖

A comprehensive backend module for AI-powered chat with HyDE (Hypothetical Document Embeddings) query expansion, multi-provider LLM support, and persistent conversation threading.

## 🌟 Features

### ✅ **Multi-Provider LLM Support**
- **Default**: Ollama (Local models like LLaMA, DeepSeek)
- **Alternative**: OpenAI (GPT-4, GPT-3.5-turbo)
- Easy configuration switching via environment variables
- Fallback mechanisms for provider availability

### ✅ **HyDE Query Expansion**
- Automatically generates 3 question variations from user queries:
  - **Essence Question**: Explores underlying principles
  - **Systems Question**: Examines relationships and dependencies  
  - **Application Question**: Focuses on real-world implementations
- Improves response quality through diverse perspectives

### ✅ **Multi-Response Generation (A/B/C)**
- Each query generates 3 distinct responses
- Users can compare and select preferred responses
- Response preference tracking for continuous improvement
- Confidence scoring and metadata collection

### ✅ **Thread Persistence & Continuity**
- CouchDB-based conversation storage
- Thread-based chat continuity for follow-up questions
- Complete conversation history with timestamps
- User-specific thread isolation and security

### ✅ **Performance & Monitoring**
- Comprehensive logging with performance metrics
- Error handling with context preservation
- Request/response tracking for analytics
- Health check endpoints

## 🏗️ Architecture

```
api/bot/
├── bot.py          # FastAPI router with endpoints
├── service.py      # Core business logic & LLM orchestration
├── models.py       # Pydantic models for request/response
├── __init__.py     # Module exports
└── README.md       # This documentation
```

## 📡 API Endpoints

### 🚀 **POST** `/api/v1/bot/chat`
Main chat endpoint with HyDE expansion.

**Request:**
```json
{
  "thread_id": "thread_abc123_1641234567", // Optional for new conversations
  "query": "How does machine learning work?",
  "provider": "ollama",                    // "ollama" | "openai"
  "model": "llama3:8b-instruct-q4_K_M",   // Optional, uses defaults
  "temperature": 0.7,                      // 0.0-2.0
  "max_tokens": 1500                       // 100-4000
}
```

**Response:**
```json
{
  "thread_id": "thread_abc123_1641234567",
  "query": "How does machine learning work?",
  "responses": {
    "query_A": "Machine learning is a subset of artificial intelligence...",
    "query_B": "At its core, machine learning involves algorithms...",
    "query_C": "Machine learning works by training models on data..."
  },
  "sub_queries": [
    {
      "sub_query": "How does machine learning work?",
      "sub_query_response": "Machine learning is a subset...",
      "time_created": "2024-01-01T12:00:00Z",
      "response_metadata": {...}
    }
  ],
  "time_created": "2024-01-01T12:00:00Z",
  "time_updated": "2024-01-01T12:00:00Z",
  "metadata": {
    "user_id": "user_123",
    "provider": "ollama",
    "total_interactions": 1
  }
}
```

### 📖 **GET** `/api/v1/bot/threads/{thread_id}`
Retrieve complete conversation thread.

**Response:**
```json
{
  // Same structure as chat response
  // Contains full conversation history
}
```

### ⭐ **POST** `/api/v1/bot/switch_response`
Mark preferred response for learning.

**Request:**
```json
{
  "thread_id": "thread_abc123_1641234567",
  "response_key": "query_A",        // "query_A" | "query_B" | "query_C"
  "preferred": true
}
```

**Response:**
```json
{
  "success": true,
  "thread_id": "thread_abc123_1641234567",
  "response_key": "query_A",
  "preferred": true
}
```

### 📋 **GET** `/api/v1/bot/threads`
List user's conversation threads with pagination.

**Query Parameters:**
- `limit`: Number of threads (default: 50)
- `skip`: Offset for pagination (default: 0)

**Response:**
```json
{
  "threads": [
    {
      "thread_id": "thread_abc123_1641234567",
      "query": "How does machine learning work?",
      "time_created": "2024-01-01T12:00:00Z",
      "time_updated": "2024-01-01T12:30:00Z",
      "interaction_count": 3,
      "last_interaction": {...}
    }
  ],
  "total": 25,
  "limit": 50,
  "skip": 0,
  "has_more": false
}
```

### ⚙️ **GET** `/api/v1/bot/config`
Get available providers and configuration.

**Response:**
```json
{
  "default_provider": "ollama",
  "available_providers": {
    "ollama": {
      "available": true,
      "default_model": "llama3:8b-instruct-q4_K_M",
      "models": ["llama3:8b-instruct-q4_K_M", "llama3-128k:latest", "deepseek-r1:7b"]
    },
    "openai": {
      "available": true,
      "default_model": "gpt-4",
      "models": ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
    }
  },
  "features": {
    "hyde_expansion": true,
    "multi_response": true,
    "thread_persistence": true,
    "response_preferences": true
  }
}
```

### 🏥 **GET** `/api/v1/bot/health`
Service health check.

## 🔧 Configuration

### Environment Variables

```bash
# LLM Provider Selection
DEFAULT_LLM_PROVIDER=ollama          # "ollama" | "openai"

# Ollama Configuration
OLLAMA_HOST=localhost
OLLAMA_PORT=11434
OLLAMA_MODEL=llama3:8b-instruct-q4_K_M

# OpenAI Configuration (Optional)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Database Configuration
COUCH_HOST=localhost
COUCH_PORT=5984
COUCH_USERNAME=root
COUCH_PASSWORD=root
```

### Provider Switching

The system automatically detects available providers:

1. **Ollama**: Always available if service is running
2. **OpenAI**: Available if `OPENAI_API_KEY` is configured

Users can specify provider per request or use system defaults.

## 🗄️ Database Schema

### CouchDB Collection: `aud_threads`

```json
{
  "_id": "thread_abc123_1641234567",
  "_rev": "1-abc123...",
  "thread_id": "thread_abc123_1641234567",
  "query": "Original user query",
  "responses": {
    "query_A": "First generated response",
    "query_B": "Second generated response", 
    "query_C": "Third generated response"
  },
  "sub_queries": [
    {
      "sub_query": "Follow-up question 1",
      "sub_query_response": "Response to follow-up",
      "time_created": "2024-01-01T12:05:00Z",
      "response_metadata": {
        "provider": "ollama",
        "model": "llama3:8b-instruct-q4_K_M",
        "duration_ms": 1234.56,
        "temperature": 0.7
      }
    }
  ],
  "time_created": "2024-01-01T12:00:00Z",
  "time_updated": "2024-01-01T12:05:00Z",
  "metadata": {
    "user_id": "user_123",
    "provider": "ollama",
    "model": "llama3:8b-instruct-q4_K_M",
    "total_interactions": 2,
    "preferences": {
      "query_A": true,
      "query_B": false,
      "query_C": false
    }
  }
}
```

## 🚀 Usage Examples

### Frontend Integration

```javascript
// Start new conversation
const response = await fetch('/api/v1/bot/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({
    query: "Explain quantum computing",
    provider: "ollama",
    temperature: 0.8
  })
});

const data = await response.json();
console.log('Thread ID:', data.thread_id);
console.log('Responses:', data.responses);

// Continue conversation
const followUp = await fetch('/api/v1/bot/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({
    thread_id: data.thread_id,
    query: "How is it different from classical computing?",
    provider: "openai"  // Switch providers mid-conversation
  })
});

// Mark preferred response
await fetch('/api/v1/bot/switch_response', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + userToken
  },
  body: JSON.stringify({
    thread_id: data.thread_id,
    response_key: "query_B",
    preferred: true
  })
});
```

### cURL Examples

```bash
# Start conversation
curl -X POST "http://localhost:8000/api/v1/bot/chat" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "query": "What is artificial intelligence?",
    "provider": "ollama",
    "temperature": 0.7
  }'

# Get thread history
curl -X GET "http://localhost:8000/api/v1/bot/threads/thread_abc123_1641234567" \
  -H "Authorization: Bearer $TOKEN"

# List user threads
curl -X GET "http://localhost:8000/api/v1/bot/threads?limit=10&skip=0" \
  -H "Authorization: Bearer $TOKEN"

# Check configuration
curl -X GET "http://localhost:8000/api/v1/bot/config" \
  -H "Authorization: Bearer $TOKEN"
```

## 🔒 Security Features

- **Authentication Required**: All endpoints require valid JWT tokens
- **User Isolation**: Threads are isolated per user ID
- **Access Control**: Users can only access their own threads
- **Input Validation**: Comprehensive request validation with Pydantic
- **Error Handling**: Secure error messages without sensitive data exposure

## 📊 Monitoring & Analytics

### Logging

The system provides comprehensive logging:

```python
# Request tracking
logger.info("🚀 Processing chat request", extra={
    "thread_id": "thread_abc123",
    "query_length": 42,
    "provider": "ollama",
    "user_id": "user_123"
})

# Performance monitoring
logger.success("✅ Chat request processed", extra={
    "thread_id": "thread_abc123", 
    "duration": 2341.56,
    "questions_generated": 3,
    "responses_generated": 3
})

# Error tracking
logger.error("❌ Failed to process chat request", extra={
    "thread_id": "thread_abc123",
    "error": str(e),
    "duration": 1234.56
})
```

### Metrics Collected

- Request/response times
- Provider usage statistics
- User interaction patterns
- Response preference trends
- Error rates and patterns
- Model performance comparisons

## 🛠️ Development

### Adding New Providers

1. Create connector in `core/{provider}_setup/connector.py`
2. Add provider enum to `models.py`
3. Update service logic in `service.py`
4. Add configuration in `configuration.py`

### Extending HyDE Prompts

Modify the `HYDE_PROMPT` template in `service.py`:

```python
HYDE_PROMPT = """Given the following query:
{query}

Generate three distinct questions using these approaches:
1. [Your custom approach]
2. [Another approach]
3. [Third approach]
"""
```

### Custom Response Processing

Override the `generate_response` method in `BotService`:

```python
async def generate_response(self, question: str, provider: LLMProvider, **kwargs):
    # Custom processing logic
    response = await super().generate_response(question, provider, **kwargs)
    # Post-processing
    return response
```

## 🚀 Future Enhancements

### Planned Features

- [ ] **LangChain Integration**: Advanced prompt chaining and memory
- [ ] **Graph-based Retrieval**: LlamaIndex GraphRAG for complex reasoning
- [ ] **RAG Integration**: Document-based context injection
- [ ] **Voice Input/Output**: Audio conversation support
- [ ] **Multi-modal Support**: Image and document inputs
- [ ] **Response Caching**: Intelligent response reuse
- [ ] **A/B Testing**: Automated response quality testing
- [ ] **Custom Instructions**: User-specific prompt templates

### Extension Points

- **Custom LLM Providers**: Add any LLM API
- **Response Filters**: Content moderation and safety
- **Analytics Dashboard**: Usage statistics and insights
- **Webhook Integration**: External system notifications
- **Batch Processing**: Bulk query processing

## 📋 Dependencies

### Required
- `fastapi` - Web framework
- `pydantic` - Data validation
- `couchdb` - Database client
- `ollama` - Local LLM client
- `openai` - OpenAI API client
- `uvicorn` - ASGI server

### Optional
- `langchain` - Advanced prompt management
- `llamaindex` - Graph-based retrieval
- `redis` - Response caching
- `celery` - Background task processing

## 🐛 Troubleshooting

### Common Issues

**Connection Errors:**
```bash
# Check Ollama service
curl http://localhost:11434/api/tags

# Check CouchDB
curl http://localhost:5984/

# Check OpenAI API key
echo $OPENAI_API_KEY
```

**Database Issues:**
```python
# Manual database creation
from core.db.couch_conn import CouchDBConnection
conn = CouchDBConnection()
db = conn.create_db("aud_threads")
```

**Provider Switching:**
```python
# Check available providers
GET /api/v1/bot/config

# Force provider in request
{
  "query": "test",
  "provider": "openai"  # Override default
}
```

---

**📞 Support**: For issues or feature requests, check the logs or contact the development team.

**🔗 Related**: See `frontend/src/components/bot/` for UI integration examples.
