from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum

class LLMProvider(str, Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"

class QueryType(str, Enum):
    """Types of queries for different processing strategies"""
    NEW_TOPIC = "new_topic"        # Use HyDE for comprehensive exploration
    FOLLOW_UP = "follow_up"        # Direct contextual response
    CLARIFICATION = "clarification" # Direct response with more detail
    RELATED_TOPIC = "related_topic" # Direct response but note topic shift

class ChatRequest(BaseModel):
    thread_id: Optional[str] = Field(None, description="Thread ID for conversation continuity")
    query: str = Field(..., description="User query", min_length=1)
    provider: Optional[LLMProvider] = Field(default=LLMProvider.OLLAMA, description="LLM provider to use")
    model: Optional[str] = Field(default=None, description="Specific model to use")
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0, description="Temperature for generation")
    max_tokens: Optional[int] = Field(default=1500, ge=100, le=4000, description="Maximum tokens to generate")

class ResponseToggleRequest(BaseModel):
    thread_id: str = Field(..., description="Thread ID")
    response_key: str = Field(..., description="Response key (query_A, query_B, or query_C)")
    preferred: bool = Field(default=True, description="Mark as preferred response")

class ConversationMessage(BaseModel):
    """Clean message representation without HyDE pollution"""
    message_id: str
    thread_id: str
    user_query: str
    ai_response: str
    timestamp: str
    query_type: QueryType
    context_used: int = 0
    metadata: Optional[Dict[str, Any]] = None

class HydeResponses(BaseModel):
    """HyDE response variations for new topics"""
    query_A: str = Field(..., description="Essence-focused response")
    query_B: str = Field(..., description="Systems-focused response") 
    query_C: str = Field(..., description="Application-focused response")

class DirectResponse(BaseModel):
    """Direct response for follow-up queries"""
    content: str = Field(..., description="The contextual response")
    context_messages_used: int = Field(default=0, description="Number of previous messages used for context")

class SubQuery(BaseModel):
    """Legacy support - will be deprecated"""
    sub_query: str
    sub_query_response: str
    time_created: str
    response_metadata: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    """Unified response format supporting both HyDE and direct responses"""
    thread_id: str
    query: str
    query_type: QueryType
    
    # For NEW_TOPIC queries (HyDE responses)
    hyde_responses: Optional[HydeResponses] = Field(None, description="HyDE response variations")
    
    # For FOLLOW_UP queries (Direct response)
    direct_response: Optional[DirectResponse] = Field(None, description="Direct contextual response")
    
    # Legacy support (backward compatibility)
    responses: Optional[Dict[str, str]] = Field(None, description="Legacy response format")
    sub_queries: Optional[List[SubQuery]] = Field(default_factory=list, description="Legacy sub-queries")
    
    # Metadata
    was_continuation: bool = Field(default=False, description="Whether this was a conversation continuation")
    processing_time_ms: float = Field(default=0.0, description="Processing time in milliseconds")
    classification_confidence: float = Field(default=0.0, description="Confidence in query classification")
    classification_reasoning: str = Field(default="", description="Reasoning for query classification")
    
    time_created: str
    time_updated: str
    metadata: Optional[Dict[str, Any]] = None
