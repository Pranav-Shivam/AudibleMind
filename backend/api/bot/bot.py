from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from datetime import datetime, timezone

from core.configuration import config
from core.logger import logger
from core.auth.middleware import require_auth

from .models import ChatRequest, ChatResponse, ResponseToggleRequest, LLMProvider
from .service import BotService

# Create router
router = APIRouter(prefix="/api/v1/bot", tags=["bot"])

# ============ DEPENDENCY INJECTION ============

def get_bot_service() -> BotService:
    """Dependency to get BotService instance"""
    return BotService()

def map_model_selection(model: Optional[str]) -> Optional[str]:
    """
    Map frontend model selections to actual backend models.
    
    This allows showing user-friendly model names in the frontend
    while using different models in the backend for optimal performance.
    """
    model_mapping = {
        "gpt-3.5-turbo": "gpt-4o",  # Show GPT-3.5-turbo but use GPT-4o
        # Add more mappings as needed
    }
    
    if model and model in model_mapping:
        mapped_model = model_mapping[model]
        logger.info(f"🔄 Model mapped: {model} → {mapped_model}")
        return mapped_model
    
    return model

# ============ API ENDPOINTS ============

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    user: Dict[str, Any] = Depends(require_auth),
    bot_service: BotService = Depends(get_bot_service)
):
    """
    Main chat endpoint that processes user queries with integrated HyDE expansion and context awareness.
    
    - Generates 3 question variations using HyDE (Hypothetical Document Embeddings) technique
    - Creates 3 distinct responses (A, B, C) using specified LLM provider
    - Provides intelligent context-aware conversation management using LangGraph
    - Supports thread continuity with semantic relevance scoring
    - Stores all interactions in CouchDB for persistence
    - Each response variant explores different aspects: essence, systems, and applications
    """
    try:
        # Apply model mapping before processing
        original_model = request.model
        mapped_model = map_model_selection(request.model)
        
        if mapped_model != original_model:
            # Create a new request with the mapped model
            request = ChatRequest(
                thread_id=request.thread_id,
                query=request.query,
                provider=request.provider,
                model=mapped_model,
                temperature=request.temperature,
                max_tokens=request.max_tokens
            )
        
        return await bot_service.process_chat_request(request, user["user_id"])
    except Exception as e:
        logger.error(f"❌ Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/threads/{thread_id}", response_model=ChatResponse)
async def get_thread_endpoint(
    thread_id: str,
    user: Dict[str, Any] = Depends(require_auth),
    bot_service: BotService = Depends(get_bot_service)
):
    """
    Retrieve a complete conversation thread by ID.
    
    Returns the full conversation history including all sub-queries and responses.
    """
    try:
        thread = await bot_service.get_thread(thread_id)
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Verify user ownership
        if thread.get("metadata", {}).get("user_id") != user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return ChatResponse(**thread)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Get thread error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/switch_response")
async def switch_response_endpoint(
    request: ResponseToggleRequest,
    user: Dict[str, Any] = Depends(require_auth),
    bot_service: BotService = Depends(get_bot_service)
):
    """
    Mark a specific response (A, B, or C) as preferred.
    
    This helps track user preferences and improve future responses.
    """
    try:
        return await bot_service.switch_response_preference(request)
    except Exception as e:
        logger.error(f"❌ Switch response error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/threads")
async def list_user_threads(
    user: Dict[str, Any] = Depends(require_auth),
    bot_service: BotService = Depends(get_bot_service),
    limit: int = 50,
    skip: int = 0
):
    """
    List all conversation threads for the authenticated user.
    
    Supports pagination with limit and skip parameters.
    """
    try:
        return await bot_service.list_user_threads(user["user_id"], limit, skip)
        
    except Exception as e:
        logger.error(f"❌ List threads error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/config")
async def get_bot_config(
    user: Dict[str, Any] = Depends(require_auth)
):
    """
    Get current bot configuration and available providers.
    """
    try:
        return {
            "default_provider": config.app.default_llm_provider,
            "available_providers": {
                "ollama": {
                    "available": True,
                    "default_model": config.ollama.model,
                    "models": ["phi3:3.8b", "llama3:8b-instruct-q4_K_M", "llama3-128k:latest", "deepseek-r1:7b"]
                },
                "openai": {
                    "available": bool(config.openai.api_key),
                    "default_model": config.openai.model,
                    "models": ["gpt-4o", "gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"]
                }
            },
            "features": {
                "hyde_expansion": True,
                "multi_response": True,
                "thread_persistence": True,
                "response_preferences": True,
                "context_aware_conversations": True,
                "relevance_scoring": True,
                "langgraph_workflow": True,
                "essence_systems_application_variants": True,
                "temperature_variation": True,
                "semantic_context_management": True
            }
        }
    except Exception as e:
        logger.error(f"❌ Get config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversation_stats")
async def get_conversation_stats(
    user: Dict[str, Any] = Depends(require_auth),
    bot_service: BotService = Depends(get_bot_service)
):
    """
    Get conversation management statistics and performance metrics.
    """
    try:
        return await bot_service.get_conversation_stats()
    except Exception as e:
        logger.error(f"❌ Get conversation stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint for the bot service"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "bot_api",
        "version": "1.0.0"
    }