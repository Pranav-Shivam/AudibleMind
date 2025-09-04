S   # Conversation Management System

## Overview

This module implements intelligent conversation management using LangChain and LangGraph to provide ChatGPT-like conversation continuity. The system analyzes query relevance against previous context and determines whether to continue existing threads or start new ones.

## Key Features

### 🧠 Context-Aware Conversations
- **Semantic Similarity Scoring**: Uses sentence transformers to calculate relevance between queries
- **Intelligent Thread Routing**: Automatically determines whether to continue or start new conversations
- **Multi-Thread Support**: Manages multiple concurrent conversation threads

### 🔄 LangGraph Workflow
- **State-Based Processing**: Uses LangGraph for structured conversation flow
- **Conditional Routing**: Routes queries based on relevance scores
- **Fallback Mechanisms**: Graceful degradation to original processing

### 📊 Performance Optimization
- **In-Memory Context Cache**: Fast access to recent conversation context
- **Configurable Thresholds**: Adjustable similarity and continuation thresholds
- **Context Cleanup**: Automatic cleanup of old conversation data

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Bot Service Layer                        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────────────────┐ │
│ │  LangGraph Manager  │  │    Context Manager              │ │
│ │                     │  │                                 │ │
│ │ • State Management  │  │ • Semantic Embeddings          │ │
│ │ • Workflow Routing  │  │ • Relevance Scoring            │ │
│ │ • Response Gen      │  │ • Thread Management            │ │
│ └─────────────────────┘  └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    LLM Providers                           │
│            (Ollama, OpenAI, etc.)                          │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### ConversationContextManager
Manages conversation context and relevance scoring:
- **Embedding Generation**: Uses `sentence-transformers` for semantic embeddings
- **Similarity Calculation**: Cosine similarity between query embeddings
- **Context Storage**: Thread-based context management with metadata
- **Relevance Analysis**: Determines if queries are continuations or new topics

### LangGraphConversationManager
Orchestrates conversation flow using LangGraph:
- **Workflow Nodes**: Structured processing pipeline
- **Conditional Routing**: Smart routing based on relevance scores
- **State Management**: Maintains conversation state throughout processing
- **Provider Integration**: Works with multiple LLM providers

## Configuration

### Similarity Thresholds
```python
# Default thresholds (can be customized)
similarity_threshold = 0.7    # High similarity for related queries
continuation_threshold = 0.6  # Moderate similarity for continuations
```

### Workflow Behavior
The system mimics ChatGPT's conversation handling:

1. **Check Immediate Previous Response**: Look for context in the current thread
2. **Check Parent/Subquery Context**: Expand search if no immediate context
3. **Create New Independent Query**: Start fresh if no relevant context found

## Usage

### Basic Integration
```python
from core.conversation import get_conversation_manager

# Get conversation manager instance
conversation_manager = get_conversation_manager()

# Process conversation with context
result = await conversation_manager.process_conversation(
    user_query="What is machine learning?",
    thread_id=None,  # Will create new thread
    provider="ollama",
    model="llama3:8b-instruct-q4_K_M",
    temperature=0.7,
    max_tokens=1500
)

# Continue conversation
follow_up = await conversation_manager.process_conversation(
    user_query="Can you give me examples?",
    thread_id=result["thread_id"],  # Continue same thread
    provider="ollama"
)
```

### Advanced Features
```python
from core.conversation import conversation_context_manager

# Manual context analysis
relevance = conversation_context_manager.analyze_query_relevance(
    new_query="Tell me about neural networks",
    thread_id="existing_thread_id"
)

print(f"Relevance Score: {relevance.score}")
print(f"Is Continuation: {relevance.is_continuation}")
print(f"Reasoning: {relevance.reasoning}")

# Get conversation statistics
stats = conversation_context_manager.get_stats()
print(f"Active Threads: {stats['total_threads']}")
print(f"Total Contexts: {stats['total_contexts']}")
```

## API Endpoints

### New Conversation Statistics
```http
GET /api/v1/bot/conversation_stats
Authorization: Bearer <token>
```

Returns detailed statistics about conversation management performance.

### Enhanced Configuration
```http
GET /api/v1/bot/config
Authorization: Bearer <token>
```

Now includes conversation management features in the response.

## Performance Considerations

### Memory Management
- Context cache automatically cleans up old entries
- Configurable limits on contexts per thread
- Time-based cleanup (default: 24 hours)

### Scalability
- In-memory cache for fast access (suitable for single-instance deployments)
- For production: Consider Redis for distributed context storage
- Database persistence maintains conversation history

### Embedding Performance
- Uses lightweight `all-MiniLM-L6-v2` model (384 dimensions)
- Fast inference on CPU
- Cached embeddings reduce computation overhead

## Testing

Run the comprehensive test suite:
```bash
cd backend
python -m api.bot.test_conversation_management
```

Tests include:
- Context relevance scoring accuracy
- Conversation flow continuity
- Thread management isolation
- Performance benchmarks

## Migration from Original System

The new system is backward compatible:
- Existing API endpoints unchanged
- Original HyDE processing available as fallback
- Database schema remains compatible
- Gradual rollout possible via feature flags

## Future Enhancements

### Planned Features
- **Cross-Thread Context**: Find relevant context across different threads
- **User Preference Learning**: Adapt thresholds based on user behavior
- **Advanced Embedding Models**: Support for domain-specific embeddings
- **Conversation Summarization**: Long-term memory via summarization

### Integration Opportunities
- **RAG Enhancement**: Use conversation context for better document retrieval
- **Personalization**: User-specific conversation patterns
- **Analytics**: Conversation flow analysis and optimization

## Dependencies

The system requires these additional packages (already in requirements.txt):
```
langchain==0.1.0
langchain-community==0.0.13
langchain-core==0.1.10
langgraph==0.0.20
sentence-transformers==2.2.2
numpy>=1.21.0
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all LangChain packages are installed
2. **Embedding Model Download**: First run downloads sentence transformer model
3. **Memory Usage**: Monitor context cache size in high-traffic scenarios
4. **Thread Isolation**: Verify thread IDs are properly managed

### Debug Logging
Enable detailed logging for conversation flow:
```python
import logging
logging.getLogger("core.conversation").setLevel(logging.DEBUG)
```

### Performance Monitoring
Monitor key metrics:
- Relevance scoring duration
- Context cache hit rates
- Thread creation vs continuation ratios
- Average response generation time

## Contributing

When contributing to the conversation management system:
1. Maintain backward compatibility
2. Add comprehensive tests for new features
3. Update performance benchmarks
4. Document configuration changes
5. Consider scalability implications
