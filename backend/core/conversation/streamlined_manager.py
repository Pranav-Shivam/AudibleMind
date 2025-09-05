"""
Streamlined Conversation Manager
Clean, efficient conversation processing without HyDE pollution
"""

import time
import uuid
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from core.logger import logger
from .query_classifier import query_classifier, QueryType, QueryClassificationResult
from .clean_memory_manager import clean_memory_manager
from .response_generator import response_generator


class StreamlinedConversationManager:
    """
    Clean conversation management system that:
    
    1. Classifies queries intelligently (new topic vs follow-up)
    2. Uses HyDE only for new topics
    3. Provides direct contextual responses for follow-ups
    4. Maintains clean conversation memory without pollution
    5. Ensures ChatGPT-like conversation continuity
    """
    
    def __init__(self):
        """Initialize the streamlined conversation manager"""
        logger.info("🚀 Initializing StreamlinedConversationManager")
        
        self.query_classifier = query_classifier
        self.memory_manager = clean_memory_manager
        self.response_generator = response_generator
        
        logger.success("✅ StreamlinedConversationManager initialized", extra={
            "components": ["query_classifier", "memory_manager", "response_generator"]
        })
    
    async def process_query(self,
                          query: str,
                          thread_id: Optional[str] = None,
                          user_id: str = "",
                          provider: str = "ollama",
                          model: Optional[str] = None,
                          temperature: float = 0.7,
                          max_tokens: int = 1500,
                          metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Main processing method for all queries.
        
        Args:
            query: User's query
            thread_id: Optional thread ID for continuation
            user_id: User identifier
            provider: LLM provider to use
            model: Specific model to use
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            metadata: Additional metadata
            
        Returns:
            Dict containing response and conversation metadata
        """
        logger.info(f"🎯 Processing query", extra={
            "query_length": len(query),
            "thread_id": thread_id,
            "user_id": user_id,
            "provider": provider
        })
        
        start_time = time.time()
        
        try:
            # Step 1: Get or create thread ID
            if not thread_id:
                thread_id = self._generate_thread_id()
                logger.info(f"🆕 Generated new thread ID: {thread_id}")
            
            # Step 2: Get conversation history for classification
            conversation_history = self.memory_manager.get_conversation_history(thread_id, limit=10)
            
            # Step 3: Classify the query
            logger.debug("🔍 Classifying query type")
            classification = self.query_classifier.classify_query(
                query=query,
                conversation_history=conversation_history,
                thread_id=thread_id if conversation_history else None
            )
            
            logger.info(f"📋 Query classified as: {classification.query_type}", extra={
                "confidence": round(classification.confidence, 3),
                "reasoning": classification.reasoning,
                "should_use_context": classification.should_use_context
            })
            
            # Step 4: Get relevant context for response generation
            context_messages = []
            if classification.should_use_context:
                context_messages = self.memory_manager.get_context_for_query(
                    thread_id, classification.query_type
                )
                logger.debug(f"📚 Retrieved {len(context_messages)} context messages")
            
            # Step 5: Generate response based on query type
            if classification.query_type == QueryType.NEW_TOPIC:
                # Use HyDE for new topics
                response_data = await self._handle_new_topic(
                    query, provider, model, temperature, max_tokens
                )
            else:
                # Use direct contextual response for follow-ups
                response_data = await self._handle_follow_up(
                    query, context_messages, provider, model, temperature, max_tokens
                )
            
            # Step 6: Determine which response to store in memory
            if classification.query_type == QueryType.NEW_TOPIC:
                # For HyDE responses, we'll store the first response (query_A) as the primary
                chosen_response = response_data["responses"]["query_A"]
            else:
                # For direct responses, store the single response
                chosen_response = response_data["response"]
            
            # Step 7: Update conversation memory cleanly
            message = self.memory_manager.add_interaction(
                thread_id=thread_id,
                user_query=query,
                ai_response=chosen_response,
                query_type=classification.query_type,
                context_used=len(context_messages),
                metadata={
                    "user_id": user_id,
                    "provider": provider,
                    "model": model,
                    "classification_confidence": classification.confidence,
                    "classification_reasoning": classification.reasoning,
                    **(metadata or {})
                }
            )
            
            # Step 8: Build final response
            total_duration = (time.time() - start_time) * 1000
            
            result = {
                "thread_id": thread_id,
                "query": query,
                "query_type": classification.query_type,
                "was_continuation": classification.should_use_context,
                "context_messages_used": len(context_messages),
                "classification_confidence": classification.confidence,
                "classification_reasoning": classification.reasoning,
                "processing_time_ms": round(total_duration, 2),
                "message_id": message.message_id,
                "timestamp": message.timestamp
            }
            
            # Add response data based on type
            if classification.query_type == QueryType.NEW_TOPIC:
                result.update({
                    "hyde_responses": response_data["responses"],
                    "hyde_metadata": response_data["metadata"]
                })
            else:
                result.update({
                    "direct_response": response_data["response"],
                    "response_metadata": response_data["metadata"]
                })
            
            logger.success("✅ Query processed successfully", extra={
                "thread_id": thread_id,
                "query_type": classification.query_type,
                "was_continuation": classification.should_use_context,
                "context_used": len(context_messages),
                "duration": round(total_duration, 2)
            })
            
            return result
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Query processing failed: {e}", extra={
                "duration": round(duration, 2),
                "thread_id": thread_id
            })
            
            # Return error response
            return {
                "thread_id": thread_id or self._generate_thread_id(),
                "query": query,
                "query_type": QueryType.NEW_TOPIC,
                "error": str(e),
                "was_continuation": False,
                "context_messages_used": 0,
                "classification_confidence": 0.0,
                "classification_reasoning": f"Processing failed: {str(e)}",
                "processing_time_ms": round(duration, 2),
                "direct_response": "I apologize, but I encountered an error processing your request. Please try again."
            }
    
    async def _handle_new_topic(self,
                              query: str,
                              provider: str,
                              model: Optional[str],
                              temperature: float,
                              max_tokens: int) -> Dict[str, Any]:
        """Handle new topic queries with HyDE responses"""
        logger.info("🆕 Handling new topic with HyDE responses")
        
        return await self.response_generator.generate_hyde_response(
            query=query,
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    async def _handle_follow_up(self,
                              query: str,
                              context_messages: List,
                              provider: str,
                              model: Optional[str],
                              temperature: float,
                              max_tokens: int) -> Dict[str, Any]:
        """Handle follow-up queries with direct contextual responses"""
        logger.info(f"🔗 Handling follow-up with {len(context_messages)} context messages")
        
        return await self.response_generator.generate_contextual_response(
            query=query,
            conversation_context=context_messages,
            provider=provider,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens
        )
    
    def _generate_thread_id(self) -> str:
        """Generate a unique thread ID"""
        return f"thread_{uuid.uuid4().hex[:12]}_{int(time.time())}"
    
    def get_thread_summary(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Get a summary of a conversation thread"""
        return self.memory_manager.get_thread_summary(thread_id)
    
    def thread_exists(self, thread_id: str) -> bool:
        """Check if a thread exists"""
        return self.memory_manager.thread_exists(thread_id)
    
    def get_conversation_history(self, thread_id: str, limit: int = 10) -> List:
        """Get conversation history for a thread"""
        return self.memory_manager.get_conversation_history(thread_id, limit)
    
    async def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive statistics"""
        try:
            memory_stats = self.memory_manager.get_stats()
            classifier_stats = self.query_classifier.get_stats()
            generator_stats = self.response_generator.get_stats()
            
            return {
                "manager_type": "streamlined_conversation_manager",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "memory_stats": memory_stats,
                "classifier_stats": classifier_stats,
                "generator_stats": generator_stats,
                "features": {
                    "intelligent_query_classification": True,
                    "clean_memory_management": True,
                    "hyde_for_new_topics": True,
                    "contextual_follow_ups": True,
                    "conversation_continuity": True,
                    "no_hyde_pollution": True
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
    
    async def cleanup_old_conversations(self, max_age_days: int = 30):
        """Clean up old conversations"""
        try:
            logger.info(f"🧹 Starting conversation cleanup (older than {max_age_days} days)")
            self.memory_manager.cleanup_old_threads(max_age_days)
            logger.success("✅ Conversation cleanup completed")
        except Exception as e:
            logger.error(f"❌ Conversation cleanup failed: {e}")


# Global instance
streamlined_conversation_manager = StreamlinedConversationManager()
