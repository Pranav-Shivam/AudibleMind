from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from enum import Enum

class LLMProvider(str, Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"

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

class SubQuery(BaseModel):
    sub_query: str
    sub_query_response: str
    time_created: str
    response_metadata: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    thread_id: str
    query: str
    responses: Dict[str, str]  # {"query_A": "response_A", "query_B": "response_B", "query_C": "response_C"}
    sub_queries: List[SubQuery]
    time_created: str
    time_updated: str
    metadata: Optional[Dict[str, Any]] = None
