"""
Conversation Context Manager using LangChain and semantic similarity
for intelligent conversation thread management.
"""

import time
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
import numpy as np

from sentence_transformers import SentenceTransformer
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.memory import BaseMemory

from core.logger import logger
from core.configuration import config


@dataclass
class ConversationContext:
    """Represents conversation context for relevance scoring"""
    thread_id: str
    query: str
    response: str
    timestamp: str
    embedding: Optional[List[float]] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class RelevanceResult:
    """Result of relevance scoring between queries"""
    score: float
    is_continuation: bool
    related_context: Optional[ConversationContext] = None
    reasoning: str = ""


class ConversationContextManager:
    """
    Manages conversation context using semantic embeddings to determine
    if a new query is a continuation of previous conversation or a new thread.
    """
    
    def __init__(self, similarity_threshold: float = 0.6, continuation_threshold: float = 0.4):
        """
        Initialize the context manager.
        
        Args:
            similarity_threshold: Threshold for considering queries as related (0.6 = high similarity)
            continuation_threshold: Threshold for treating as continuation vs new thread (0.4 = moderate similarity)
        """
        logger.info("🧠 Initializing ConversationContextManager")
        
        self.similarity_threshold = similarity_threshold
        self.continuation_threshold = continuation_threshold
        
        # Initialize sentence transformer model for embeddings
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # In-memory context cache (in production, this would be in Redis/DB)
        self.context_cache: Dict[str, List[ConversationContext]] = {}
        
        logger.success("✅ ConversationContextManager initialized", extra={
            "similarity_threshold": similarity_threshold,
            "continuation_threshold": continuation_threshold,
            "embedder_model": "all-MiniLM-L6-v2"
        })
    
    def get_query_embedding(self, query: str) -> List[float]:
        """Generate embedding for a query"""
        try:
            embedding = self.embedder.encode(query, convert_to_tensor=False)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"❌ Failed to generate embedding: {e}")
            # Return zero vector as fallback
            return [0.0] * 384  # MiniLM model dimension
    
    def calculate_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Calculate cosine similarity between two embeddings"""
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)
            
            # Cosine similarity
            dot_product = np.dot(vec1, vec2)
            norms = np.linalg.norm(vec1) * np.linalg.norm(vec2)
            
            if norms == 0:
                return 0.0
                
            similarity = dot_product / norms
            return float(similarity)
            
        except Exception as e:
            logger.error(f"❌ Failed to calculate similarity: {e}")
            return 0.0
    
    def add_context(self, thread_id: str, query: str, response: str, metadata: Optional[Dict[str, Any]] = None) -> ConversationContext:
        """
        Add a new conversation context to the manager.
        
        Args:
            thread_id: Thread identifier
            query: User query
            response: AI response
            metadata: Additional metadata
            
        Returns:
            ConversationContext object
        """
        try:
            # Generate embedding for the query
            embedding = self.get_query_embedding(query)
            
            # Create context object
            context = ConversationContext(
                thread_id=thread_id,
                query=query,
                response=response,
                timestamp=datetime.now(timezone.utc).isoformat(),
                embedding=embedding,
                metadata=metadata or {}
            )
            
            # Add to cache
            if thread_id not in self.context_cache:
                self.context_cache[thread_id] = []
            
            self.context_cache[thread_id].append(context)
            
            logger.debug(f"📝 Added context to thread {thread_id}", extra={
                "query_length": len(query),
                "response_length": len(response),
                "context_count": len(self.context_cache[thread_id])
            })
            
            return context
            
        except Exception as e:
            logger.error(f"❌ Failed to add context: {e}")
            raise
    
    def get_thread_context(self, thread_id: str) -> List[ConversationContext]:
        """Get all context for a specific thread"""
        return self.context_cache.get(thread_id, [])
    
    def analyze_query_relevance(self, new_query: str, thread_id: Optional[str] = None, 
                              limit_contexts: int = 5) -> RelevanceResult:
        """
        Analyze relevance of a new query against existing conversation context.
        
        This implements the ChatGPT-like behavior:
        1. Check immediate previous response in thread
        2. Check parent responses or subqueries
        3. If no relevant context, start new independent query
        
        Args:
            new_query: The new user query
            thread_id: Thread to check for context (if any)
            limit_contexts: Maximum number of recent contexts to check
            
        Returns:
            RelevanceResult with scoring and continuation decision
        """
        logger.debug(f"🔍 Analyzing query relevance: {new_query[:100]}...")
        
        start_time = time.time()
        new_embedding = self.get_query_embedding(new_query)
        
        best_score = 0.0
        best_context = None
        reasoning = "No previous context found"
        
        try:
            # If thread_id provided, check that thread's context first
            if thread_id and thread_id in self.context_cache:
                thread_contexts = self.context_cache[thread_id][-limit_contexts:]  # Recent contexts
                
                for context in reversed(thread_contexts):  # Most recent first
                    if context.embedding:
                        score = self.calculate_similarity(new_embedding, context.embedding)
                        
                        if score > best_score:
                            best_score = score
                            best_context = context
                            reasoning = f"Found related context in same thread (score: {score:.3f})"
            
            # If no good match in current thread, check other recent threads
            if best_score < self.continuation_threshold:
                recent_threads = list(self.context_cache.keys())[-10:]  # Check last 10 threads
                
                for tid in recent_threads:
                    if tid == thread_id:  # Skip current thread (already checked)
                        continue
                        
                    thread_contexts = self.context_cache[tid][-3:]  # Check last 3 contexts per thread
                    
                    for context in reversed(thread_contexts):
                        if context.embedding:
                            score = self.calculate_similarity(new_embedding, context.embedding)
                            
                            if score > best_score:
                                best_score = score
                                best_context = context
                                reasoning = f"Found related context in thread {tid} (score: {score:.3f})"
            
            # Determine if this is a continuation
            is_continuation = best_score >= self.continuation_threshold
            
            if not is_continuation:
                reasoning = f"Starting new independent query (best score: {best_score:.3f} < threshold: {self.continuation_threshold})"
            
            duration = (time.time() - start_time) * 1000
            logger.info(f"🎯 Query relevance analysis complete", extra={
                "best_score": round(best_score, 3),
                "is_continuation": is_continuation,
                "thread_id": thread_id,
                "duration": round(duration, 2),
                "contexts_checked": len(self.context_cache.get(thread_id, [])) if thread_id else 0
            })
            
            return RelevanceResult(
                score=best_score,
                is_continuation=is_continuation,
                related_context=best_context,
                reasoning=reasoning
            )
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to analyze query relevance: {e}", extra={
                "duration": round(duration, 2)
            })
            
            # Return safe default
            return RelevanceResult(
                score=0.0,
                is_continuation=False,
                related_context=None,
                reasoning=f"Error during analysis: {str(e)}"
            )
    
    def get_relevant_context_for_response(self, thread_id: str, limit: int = 3) -> List[ConversationContext]:
        """
        Get the most relevant context for generating a response.
        Returns the most recent contexts that should be included in the prompt.
        """
        if thread_id not in self.context_cache:
            return []
        
        contexts = self.context_cache[thread_id]
        
        # Return the most recent contexts (this can be enhanced with similarity scoring)
        return contexts[-limit:] if contexts else []
    
    def build_conversation_history(self, thread_id: str) -> List[BaseMessage]:
        """
        Build LangChain message history for a thread.
        This is used for maintaining conversation context in LLM calls.
        """
        contexts = self.get_thread_context(thread_id)
        messages = []
        
        for context in contexts:
            messages.append(HumanMessage(content=context.query))
            messages.append(AIMessage(content=context.response))
        
        return messages
    
    def cleanup_old_contexts(self, max_age_hours: int = 24, max_contexts_per_thread: int = 50):
        """
        Clean up old contexts to prevent memory bloat.
        In production, this would be handled by database TTL or periodic cleanup jobs.
        """
        current_time = datetime.now(timezone.utc)
        cleaned_threads = 0
        cleaned_contexts = 0
        
        for thread_id, contexts in list(self.context_cache.items()):
            # Remove old contexts
            filtered_contexts = []
            for context in contexts:
                try:
                    context_time = datetime.fromisoformat(context.timestamp.replace('Z', '+00:00'))
                    age_hours = (current_time - context_time).total_seconds() / 3600
                    
                    if age_hours <= max_age_hours:
                        filtered_contexts.append(context)
                    else:
                        cleaned_contexts += 1
                except Exception:
                    # Keep context if we can't parse timestamp
                    filtered_contexts.append(context)
            
            # Limit contexts per thread
            if len(filtered_contexts) > max_contexts_per_thread:
                filtered_contexts = filtered_contexts[-max_contexts_per_thread:]
                cleaned_contexts += len(contexts) - max_contexts_per_thread
            
            # Update or remove thread
            if filtered_contexts:
                self.context_cache[thread_id] = filtered_contexts
            else:
                del self.context_cache[thread_id]
                cleaned_threads += 1
        
        if cleaned_contexts > 0 or cleaned_threads > 0:
            logger.info(f"🧹 Cleaned up contexts", extra={
                "cleaned_threads": cleaned_threads,
                "cleaned_contexts": cleaned_contexts,
                "remaining_threads": len(self.context_cache)
            })
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the context manager"""
        total_contexts = sum(len(contexts) for contexts in self.context_cache.values())
        
        return {
            "total_threads": len(self.context_cache),
            "total_contexts": total_contexts,
            "avg_contexts_per_thread": total_contexts / len(self.context_cache) if self.context_cache else 0,
            "similarity_threshold": self.similarity_threshold,
            "continuation_threshold": self.continuation_threshold
        }


# Global instance (in production, this would be dependency injected)
conversation_context_manager = ConversationContextManager()
