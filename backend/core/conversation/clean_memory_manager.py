"""
Clean Memory Manager for Conversation Context
Manages conversation memory without HyDE pollution for better context continuity
"""

import time
import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from dataclasses import asdict

from core.logger import logger
from core.configuration import config
from core.db.couch_conn import CouchDBConnection
from .query_classifier import ConversationMessage, QueryType


class CleanMemoryManager:
    """
    Manages conversation memory without HyDE pollution.
    
    Key principles:
    - Store only actual user queries and AI responses
    - No artificial HyDE questions in conversation history
    - Clean context retrieval for follow-up queries
    - Efficient memory management with automatic cleanup
    """
    
    def __init__(self):
        """Initialize the clean memory manager"""
        logger.info("🧠 Initializing CleanMemoryManager")
        
        # Initialize CouchDB connection
        self.couch_client = CouchDBConnection()
        self.threads_db = self.couch_client.get_db(config.database.threads_db_name)
        
        # In-memory cache for recent conversations (performance optimization)
        self.memory_cache: Dict[str, List[ConversationMessage]] = {}
        self.cache_max_size = 100  # Maximum threads to keep in cache
        self.cache_max_age_minutes = 30  # Cache expiry time
        
        logger.success("✅ CleanMemoryManager initialized", extra={
            "database": config.database.threads_db_name,
            "cache_enabled": True,
            "cache_max_size": self.cache_max_size
        })
    
    def add_interaction(self, 
                       thread_id: str, 
                       user_query: str, 
                       ai_response: str,
                       query_type: QueryType,
                       context_used: int = 0,
                       metadata: Optional[Dict[str, Any]] = None) -> ConversationMessage:
        """
        Add a clean user-AI interaction to memory.
        
        Args:
            thread_id: Thread identifier
            user_query: Actual user query (not HyDE variations)
            ai_response: AI response (chosen response, not all variations)
            query_type: Type of query for context
            context_used: Number of previous messages used for context
            metadata: Additional metadata
            
        Returns:
            ConversationMessage object
        """
        logger.debug(f"💾 Adding interaction to thread {thread_id}")
        
        try:
            # Create clean message
            message = ConversationMessage(
                message_id=f"msg_{uuid.uuid4().hex[:12]}",
                thread_id=thread_id,
                user_query=user_query,
                ai_response=ai_response,
                timestamp=datetime.now(timezone.utc).isoformat(),
                query_type=query_type,
                context_used=context_used,
                metadata=metadata or {}
            )
            
            # Add to cache
            if thread_id not in self.memory_cache:
                self.memory_cache[thread_id] = []
            
            self.memory_cache[thread_id].append(message)
            
            # Persist to database
            self._persist_message(message)
            
            # Cleanup cache if needed
            self._cleanup_cache()
            
            logger.success(f"✅ Interaction added to thread {thread_id}", extra={
                "message_id": message.message_id,
                "query_type": query_type,
                "context_used": context_used,
                "cache_size": len(self.memory_cache.get(thread_id, []))
            })
            
            return message
            
        except Exception as e:
            logger.error(f"❌ Failed to add interaction: {e}")
            raise
    
    def get_conversation_history(self, 
                                thread_id: str, 
                                limit: int = 10,
                                include_metadata: bool = False) -> List[ConversationMessage]:
        """
        Get clean conversation history for a thread.
        
        Args:
            thread_id: Thread identifier
            limit: Maximum number of messages to return
            include_metadata: Whether to include metadata in response
            
        Returns:
            List of ConversationMessage objects (most recent first)
        """
        logger.debug(f"📖 Retrieving conversation history for thread {thread_id}")
        
        try:
            # Check cache first
            if thread_id in self.memory_cache:
                cached_messages = self.memory_cache[thread_id]
                if cached_messages:
                    logger.debug(f"📋 Using cached history for thread {thread_id}")
                    return cached_messages[-limit:] if limit > 0 else cached_messages
            
            # Load from database
            messages = self._load_messages_from_db(thread_id, limit)
            
            # Update cache
            if messages:
                self.memory_cache[thread_id] = messages
            
            logger.info(f"📚 Retrieved conversation history", extra={
                "thread_id": thread_id,
                "message_count": len(messages),
                "source": "database"
            })
            
            return messages
            
        except Exception as e:
            logger.error(f"❌ Failed to retrieve conversation history: {e}")
            return []
    
    def get_context_for_query(self, 
                             thread_id: str, 
                             query_type: QueryType,
                             max_context_messages: int = 6) -> List[ConversationMessage]:
        """
        Get relevant context messages for a query based on its type.
        
        Args:
            thread_id: Thread identifier
            query_type: Type of query to determine context needs
            max_context_messages: Maximum context messages to return
            
        Returns:
            List of relevant ConversationMessage objects
        """
        logger.debug(f"🔍 Getting context for {query_type} query in thread {thread_id}")
        
        try:
            # Get conversation history
            all_messages = self.get_conversation_history(thread_id, limit=20)
            
            if not all_messages:
                return []
            
            # Determine context size based on query type
            if query_type == QueryType.NEW_TOPIC:
                # New topics don't need much context
                context_messages = []
            elif query_type == QueryType.CLARIFICATION:
                # Clarifications need recent context
                context_messages = all_messages[-2:]  # Last exchange
            elif query_type == QueryType.FOLLOW_UP:
                # Follow-ups need moderate context
                context_messages = all_messages[-max_context_messages:]
            elif query_type == QueryType.RELATED_TOPIC:
                # Related topics need some context but not too much
                context_messages = all_messages[-4:]  # Last 2 exchanges
            else:
                # Default to moderate context
                context_messages = all_messages[-max_context_messages:]
            
            logger.info(f"📋 Context retrieved for {query_type}", extra={
                "thread_id": thread_id,
                "context_messages": len(context_messages),
                "total_available": len(all_messages)
            })
            
            return context_messages
            
        except Exception as e:
            logger.error(f"❌ Failed to get context for query: {e}")
            return []
    
    def thread_exists(self, thread_id: str) -> bool:
        """Check if a thread exists"""
        try:
            # Check cache first
            if thread_id in self.memory_cache:
                return len(self.memory_cache[thread_id]) > 0
            
            # Check database
            try:
                doc = self.threads_db.get(thread_id)
                return doc is not None and doc.get("messages", [])
            except Exception:
                return False
                
        except Exception as e:
            logger.warning(f"Error checking thread existence: {e}")
            return False
    
    def get_thread_summary(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Get a summary of a conversation thread"""
        try:
            messages = self.get_conversation_history(thread_id, limit=1)
            if not messages:
                return None
            
            first_message = messages[0]
            last_message = messages[-1]
            
            return {
                "thread_id": thread_id,
                "first_query": first_message.user_query,
                "last_query": last_message.user_query,
                "message_count": len(messages),
                "created_at": first_message.timestamp,
                "updated_at": last_message.timestamp,
                "query_types": list(set(msg.query_type for msg in messages))
            }
            
        except Exception as e:
            logger.error(f"Failed to get thread summary: {e}")
            return None
    
    def _persist_message(self, message: ConversationMessage):
        """Persist a message to CouchDB"""
        try:
            # Get or create thread document
            try:
                doc = self.threads_db.get(message.thread_id)
                if not doc:
                    doc = None
            except Exception:
                doc = None
            
            if not doc:
                # Create new thread document
                doc = {
                    "_id": message.thread_id,
                    "thread_id": message.thread_id,
                    "created_at": message.timestamp,
                    "messages": [],
                    "metadata": {
                        "architecture": "streamlined_clean"
                    }
                }
            
            # Add message to document
            if "messages" not in doc or doc["messages"] is None:
                doc["messages"] = []
            
            doc["messages"].append({
                "message_id": message.message_id,
                "user_query": message.user_query,
                "ai_response": message.ai_response,
                "timestamp": message.timestamp,
                "query_type": message.query_type,
                "context_used": message.context_used,
                "metadata": message.metadata
            })
            
            # Update document metadata
            doc["updated_at"] = message.timestamp
            doc["message_count"] = len(doc["messages"])
            
            # Extract and store user_id from message metadata for authorization
            if message.metadata and "user_id" in message.metadata:
                if "metadata" not in doc:
                    doc["metadata"] = {}
                doc["metadata"]["user_id"] = message.metadata["user_id"]
            
            # Save to database
            self.threads_db.save(doc)
            
        except Exception as e:
            logger.error(f"Failed to persist message: {e}")
            raise
    
    def _load_messages_from_db(self, thread_id: str, limit: int = 10) -> List[ConversationMessage]:
        """Load messages from CouchDB"""
        try:
            doc = self.threads_db.get(thread_id)
            if not doc or "messages" not in doc:
                return []
            
            messages = []
            raw_messages = doc["messages"]
            
            # Apply limit (get most recent messages)
            if limit > 0:
                raw_messages = raw_messages[-limit:]
            
            for msg_data in raw_messages:
                message = ConversationMessage(
                    message_id=msg_data.get("message_id", ""),
                    thread_id=thread_id,
                    user_query=msg_data.get("user_query", ""),
                    ai_response=msg_data.get("ai_response", ""),
                    timestamp=msg_data.get("timestamp", ""),
                    query_type=QueryType(msg_data.get("query_type", QueryType.NEW_TOPIC)),
                    context_used=msg_data.get("context_used", 0),
                    metadata=msg_data.get("metadata", {})
                )
                messages.append(message)
            
            return messages
            
        except Exception as e:
            logger.warning(f"Failed to load messages from database: {e}")
            return []
    
    def _cleanup_cache(self):
        """Clean up memory cache to prevent memory leaks"""
        try:
            if len(self.memory_cache) > self.cache_max_size:
                # Remove oldest entries (simple LRU-like cleanup)
                thread_ids = list(self.memory_cache.keys())
                threads_to_remove = thread_ids[:-self.cache_max_size]
                
                for thread_id in threads_to_remove:
                    del self.memory_cache[thread_id]
                
                logger.debug(f"🧹 Cache cleanup: removed {len(threads_to_remove)} threads")
                
        except Exception as e:
            logger.warning(f"Cache cleanup failed: {e}")
    
    def cleanup_old_threads(self, max_age_days: int = 30):
        """Clean up old conversation threads"""
        try:
            logger.info(f"🧹 Starting cleanup of threads older than {max_age_days} days")
            
            current_time = datetime.now(timezone.utc)
            cutoff_time = current_time.timestamp() - (max_age_days * 24 * 60 * 60)
            
            # Get all threads
            all_docs = self.threads_db.view('_all_docs', include_docs=True)
            
            deleted_count = 0
            for row in all_docs:
                doc = row.doc
                if doc.get("created_at"):
                    try:
                        created_time = datetime.fromisoformat(doc["created_at"].replace('Z', '+00:00'))
                        if created_time.timestamp() < cutoff_time:
                            self.threads_db.delete(doc)
                            deleted_count += 1
                    except Exception:
                        continue  # Skip if timestamp parsing fails
            
            logger.success(f"✅ Cleanup completed: deleted {deleted_count} old threads")
            
        except Exception as e:
            logger.error(f"❌ Thread cleanup failed: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get memory manager statistics"""
        try:
            # Count total threads and messages
            all_docs = self.threads_db.view('_all_docs', include_docs=True)
            
            total_threads = 0
            total_messages = 0
            
            for row in all_docs:
                doc = row.doc
                if doc.get("messages"):
                    total_threads += 1
                    total_messages += len(doc["messages"])
            
            return {
                "total_threads": total_threads,
                "total_messages": total_messages,
                "avg_messages_per_thread": total_messages / total_threads if total_threads > 0 else 0,
                "cached_threads": len(self.memory_cache),
                "cache_max_size": self.cache_max_size,
                "memory_type": "clean_conversation_memory"
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats: {e}")
            return {"error": str(e)}


# Global instance
clean_memory_manager = CleanMemoryManager()
