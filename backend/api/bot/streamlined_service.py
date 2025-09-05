"""
Streamlined Bot Service
Clean implementation using the new conversation management architecture
"""

import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from core.configuration import config
from core.logger import logger
from core.conversation.streamlined_manager import streamlined_conversation_manager
from .models import (
    ChatRequest, ChatResponse, QueryType, HydeResponses, DirectResponse, 
    ConversationMessage, SubQuery, ResponseToggleRequest
)


class StreamlinedBotService:
    """
    Clean bot service implementation using the new streamlined architecture.
    
    Key improvements:
    - No HyDE pollution in conversation memory
    - Intelligent query classification
    - Direct responses for follow-ups
    - Clean conversation continuity
    """
    
    def __init__(self):
        logger.info("🤖 Initializing StreamlinedBotService")
        
        start_time = time.time()
        self.conversation_manager = streamlined_conversation_manager
        
        init_duration = (time.time() - start_time) * 1000
        logger.success("✅ StreamlinedBotService initialized", extra={
            "init_duration": round(init_duration, 2),
            "architecture": "streamlined_clean"
        })
    
    async def process_chat_request(self, request: ChatRequest, user_id: str) -> ChatResponse:
        """
        Process a chat request using the streamlined architecture.
        
        - Automatically classifies queries (new topic vs follow-up)
        - Uses HyDE only for new topics
        - Provides direct contextual responses for follow-ups
        - Maintains clean conversation memory
        """
        logger.info(f"🚀 Processing chat request (streamlined)", extra={
            "thread_id": request.thread_id,
            "query_length": len(request.query),
            "provider": request.provider,
            "user_id": user_id
        })
        
        start_time = time.time()
        
        try:
            # Process query through streamlined manager
            result = await self.conversation_manager.process_query(
                query=request.query,
                thread_id=request.thread_id,
                user_id=user_id,
                provider=str(request.provider),
                model=request.model,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                metadata={
                    "request_timestamp": datetime.now(timezone.utc).isoformat(),
                    "api_version": "streamlined_v1"
                }
            )
            
            # Handle errors
            if "error" in result:
                logger.error(f"❌ Processing error: {result['error']}")
                # Return error response in expected format
                return self._create_error_response(request, result)
            
            # Build response based on query type
            response = self._build_chat_response(request, result)
            
            duration = (time.time() - start_time) * 1000
            logger.success("✅ Chat request processed (streamlined)", extra={
                "thread_id": result["thread_id"],
                "query_type": result["query_type"],
                "was_continuation": result["was_continuation"],
                "context_used": result["context_messages_used"],
                "duration": round(duration, 2)
            })
            
            return response
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to process chat request: {e}", extra={
                "duration": round(duration, 2),
                "user_id": user_id
            })
            
            # Return error response
            return self._create_fallback_response(request, str(e))
    
    def _build_chat_response(self, request: ChatRequest, result: Dict[str, Any]) -> ChatResponse:
        """Build ChatResponse from processing result"""
        
        query_type = QueryType(result["query_type"])
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Base response data
        response_data = {
            "thread_id": result["thread_id"],
            "query": request.query,
            "query_type": query_type,
            "was_continuation": result["was_continuation"],
            "processing_time_ms": result["processing_time_ms"],
            "classification_confidence": result["classification_confidence"],
            "classification_reasoning": result["classification_reasoning"],
            "time_created": current_time,
            "time_updated": current_time,
            "metadata": {
                "provider": str(request.provider),
                "model": request.model,
                "temperature": request.temperature,
                "max_tokens": request.max_tokens,
                "context_messages_used": result["context_messages_used"],
                "architecture": "streamlined_clean"
            }
        }
        
        if query_type == QueryType.NEW_TOPIC:
            # HyDE responses for new topics
            hyde_responses_dict = result["hyde_responses"]
            response_data.update({
                "hyde_responses": HydeResponses(
                    query_A=hyde_responses_dict["query_A"],
                    query_B=hyde_responses_dict["query_B"],
                    query_C=hyde_responses_dict["query_C"]
                ),
                # Legacy support for backward compatibility
                "responses": hyde_responses_dict,
                "sub_queries": [SubQuery(
                    sub_query=request.query,
                    sub_query_response=hyde_responses_dict["query_A"],
                    time_created=current_time,
                    response_metadata=result.get("hyde_metadata", {})
                )]
            })
        else:
            # Direct response for follow-ups
            direct_response_content = result["direct_response"]
            response_data.update({
                "direct_response": DirectResponse(
                    content=direct_response_content,
                    context_messages_used=result["context_messages_used"]
                ),
                # Legacy support - create single response format
                "responses": {
                    "query_A": direct_response_content,
                    "query_B": direct_response_content,
                    "query_C": direct_response_content
                },
                "sub_queries": [SubQuery(
                    sub_query=request.query,
                    sub_query_response=direct_response_content,
                    time_created=current_time,
                    response_metadata=result.get("response_metadata", {})
                )]
            })
        
        return ChatResponse(**response_data)
    
    def _create_error_response(self, request: ChatRequest, result: Dict[str, Any]) -> ChatResponse:
        """Create error response in expected format"""
        current_time = datetime.now(timezone.utc).isoformat()
        error_message = f"I apologize, but I encountered an error: {result.get('error', 'Unknown error')}"
        
        return ChatResponse(
            thread_id=result.get("thread_id", f"error_{int(time.time())}"),
            query=request.query,
            query_type=QueryType.NEW_TOPIC,
            direct_response=DirectResponse(
                content=error_message,
                context_messages_used=0
            ),
            responses={
                "query_A": error_message,
                "query_B": error_message,
                "query_C": error_message
            },
            sub_queries=[SubQuery(
                sub_query=request.query,
                sub_query_response=error_message,
                time_created=current_time,
                response_metadata={"error": True}
            )],
            was_continuation=False,
            processing_time_ms=result.get("processing_time_ms", 0.0),
            classification_confidence=0.0,
            classification_reasoning=f"Error: {result.get('error', 'Unknown error')}",
            time_created=current_time,
            time_updated=current_time,
            metadata={"error": True, "architecture": "streamlined_clean"}
        )
    
    def _create_fallback_response(self, request: ChatRequest, error: str) -> ChatResponse:
        """Create fallback response for unexpected errors"""
        current_time = datetime.now(timezone.utc).isoformat()
        error_message = "I apologize, but I'm experiencing technical difficulties. Please try again."
        
        return ChatResponse(
            thread_id=f"fallback_{int(time.time())}",
            query=request.query,
            query_type=QueryType.NEW_TOPIC,
            direct_response=DirectResponse(
                content=error_message,
                context_messages_used=0
            ),
            responses={
                "query_A": error_message,
                "query_B": error_message,
                "query_C": error_message
            },
            sub_queries=[SubQuery(
                sub_query=request.query,
                sub_query_response=error_message,
                time_created=current_time,
                response_metadata={"fallback": True, "original_error": error}
            )],
            was_continuation=False,
            processing_time_ms=0.0,
            classification_confidence=0.0,
            classification_reasoning=f"Fallback due to error: {error}",
            time_created=current_time,
            time_updated=current_time,
            metadata={"fallback": True, "architecture": "streamlined_clean"}
        )
    
    async def get_thread(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Get thread information"""
        try:
            if not self.conversation_manager.thread_exists(thread_id):
                return None
            
            summary = self.conversation_manager.get_thread_summary(thread_id)
            history = self.conversation_manager.get_conversation_history(thread_id)
            
            if not summary or not history:
                return None
            
            # Get the most common query type from history (or first one if empty)
            query_types = summary.get("query_types", [])
            primary_query_type = query_types[0] if query_types else QueryType.NEW_TOPIC
            
            # Convert to ChatResponse format for proper validation
            return {
                "thread_id": thread_id,
                "query": summary["first_query"],
                "query_type": primary_query_type,  # Required field for ChatResponse
                "time_created": summary["created_at"],
                "time_updated": summary["updated_at"],
                # Legacy support fields
                "sub_queries": [
                    {
                        "sub_query": msg.user_query,
                        "sub_query_response": msg.ai_response,
                        "time_created": msg.timestamp,
                        "response_metadata": msg.metadata
                    }
                    for msg in history
                ],
                "metadata": {
                    "message_count": summary["message_count"],
                    "query_types": summary["query_types"],
                    "architecture": "streamlined_clean",
                    "user_id": self._get_thread_user_id(thread_id)
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to get thread: {e}")
            return None
    
    def _get_thread_user_id(self, thread_id: str) -> Optional[str]:
        """Extract user_id from thread messages or metadata"""
        try:
            # Get conversation history to find user_id in message metadata
            history = self.conversation_manager.get_conversation_history(thread_id, limit=1)
            if history and history[0].metadata and "user_id" in history[0].metadata:
                return history[0].metadata["user_id"]
            
            # Fallback: check if thread document has user_id in metadata
            if hasattr(self.conversation_manager, 'memory_manager'):
                try:
                    doc = self.conversation_manager.memory_manager.threads_db.get(thread_id)
                    if doc and "metadata" in doc and "user_id" in doc["metadata"]:
                        return doc["metadata"]["user_id"]
                except Exception:
                    pass
            
            return None
        except Exception as e:
            logger.warning(f"Failed to get thread user_id: {e}")
            return None
    
    async def switch_response_preference(self, request: ResponseToggleRequest) -> Dict[str, Any]:
        """Handle response preference switching (legacy support)"""
        try:
            logger.info(f"⭐ Response preference update", extra={
                "thread_id": request.thread_id,
                "response_key": request.response_key,
                "preferred": request.preferred
            })
            
            # For the streamlined architecture, we just log the preference
            # In a full implementation, this could update user preference models
            
            return {
                "success": True,
                "thread_id": request.thread_id,
                "response_key": request.response_key,
                "preferred": request.preferred,
                "message": "Preference noted for future improvements"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to update response preference: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def list_user_threads(self, user_id: str, limit: int = 50, skip: int = 0) -> Dict[str, Any]:
        """List user threads (basic implementation)"""
        try:
            # This would need to be implemented based on how user_id is stored in metadata
            # For now, return empty list as this requires database querying by user_id
            
            logger.info(f"📋 Listing threads for user {user_id}")
            
            return {
                "threads": [],
                "total": 0,
                "limit": limit,
                "skip": skip,
                "has_more": False,
                "message": "Thread listing by user_id not yet implemented in streamlined architecture"
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to list user threads: {e}")
            return {
                "threads": [],
                "total": 0,
                "error": str(e)
            }
    
    async def get_conversation_stats(self) -> Dict[str, Any]:
        """Get conversation statistics"""
        try:
            return await self.conversation_manager.get_stats()
        except Exception as e:
            logger.error(f"❌ Failed to get conversation stats: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }


# Global instance
streamlined_bot_service = StreamlinedBotService()
