"""
Enhanced Conversation Context Manager using LangChain Memory and LangGraph
for intelligent conversation thread management with persistence.
"""

import time
import asyncio
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timezone
from dataclasses import dataclass, asdict
import numpy as np

from sentence_transformers import SentenceTransformer
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.chat_history import BaseChatMessageHistory
from langchain.memory import ConversationBufferWindowMemory, ConversationSummaryBufferMemory
from langchain_core.memory import BaseMemory

from core.logger import logger
from core.configuration import config
from core.db.couch_conn import CouchDBConnection


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


class PersistentChatMessageHistory(BaseChatMessageHistory):
    """Persistent chat message history using CouchDB"""

    def __init__(self, thread_id: str, couch_client: CouchDBConnection):
        super().__init__()
        self.thread_id = thread_id
        self.couch_client = couch_client
        self.threads_db = couch_client.get_db(config.database.threads_db_name)
        self._messages: List[BaseMessage] = []
        self._load_messages()

    def _load_messages(self):
        """Load messages from CouchDB"""
        try:
            doc = self.threads_db.get(self.thread_id)
            if doc and doc.get("conversation_memory"):
                # Load messages from stored memory
                memory_data = doc["conversation_memory"]
                for msg_data in memory_data.get("messages", []):
                    if msg_data["type"] == "human":
                        self._messages.append(HumanMessage(content=msg_data["content"]))
                    elif msg_data["type"] == "ai":
                        self._messages.append(AIMessage(content=msg_data["content"]))
                    elif msg_data["type"] == "system":
                        self._messages.append(SystemMessage(content=msg_data["content"]))
        except Exception as e:
            logger.warning(f"Failed to load messages for thread {self.thread_id}: {e}")

    def _save_messages(self):
        """Save messages to CouchDB"""
        try:
            # Convert messages to serializable format
            messages_data = []
            for msg in self._messages:
                if isinstance(msg, HumanMessage):
                    msg_type = "human"
                elif isinstance(msg, AIMessage):
                    msg_type = "ai"
                elif isinstance(msg, SystemMessage):
                    msg_type = "system"
                else:
                    continue
                messages_data.append({
                    "type": msg_type,
                    "content": msg.content,
                    "timestamp": datetime.now(timezone.utc).isoformat()
                })

            # Get existing thread or create new one
            doc = self.threads_db.get(self.thread_id)
            if doc:
                doc["conversation_memory"] = {
                    "messages": messages_data,
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                    "message_count": len(messages_data)
                }
                doc["time_updated"] = datetime.now(timezone.utc).isoformat()
                self.threads_db.save(doc)
            else:
                # Create new thread document
                new_doc = {
                    "_id": self.thread_id,
                    "thread_id": self.thread_id,
                    "conversation_memory": {
                        "messages": messages_data,
                        "last_updated": datetime.now(timezone.utc).isoformat(),
                        "message_count": len(messages_data)
                    },
                    "time_created": datetime.now(timezone.utc).isoformat(),
                    "time_updated": datetime.now(timezone.utc).isoformat(),
                    "metadata": {
                        "conversation_type": "persistent_memory"
                    }
                }
                self.threads_db.save(new_doc)

        except Exception as e:
            logger.error(f"Failed to save messages for thread {self.thread_id}: {e}")

    def add_message(self, message: BaseMessage) -> None:
        """Add a message to the history"""
        self._messages.append(message)
        self._save_messages()

    def clear(self) -> None:
        """Clear the message history"""
        self._messages = []
        self._save_messages()

    @property
    def messages(self) -> List[BaseMessage]:
        """Get all messages"""
        return self._messages

    @messages.setter
    def messages(self, messages: List[BaseMessage]) -> None:
        """Set all messages"""
        self._messages = messages
        self._save_messages()


class ConversationContextManager:
    """
    Enhanced conversation context manager using LangChain Memory with CouchDB persistence
    and intelligent conversation thread management.
    """

    def __init__(self, similarity_threshold: float = 0.6, continuation_threshold: float = 4.0):
        """
        Initialize the context manager with LangChain memory.

        Args:
            similarity_threshold: Threshold for considering queries as related (0.6 = high similarity)
            continuation_threshold: Threshold for treating as continuation vs new thread (4.0 = moderate similarity)
        """
        logger.info("🧠 Initializing Enhanced ConversationContextManager")

        self.similarity_threshold = similarity_threshold
        self.continuation_threshold = continuation_threshold

        # Initialize sentence transformer model for embeddings
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')

        # Initialize CouchDB connection
        self.couch_client = CouchDBConnection()
        self.threads_db = self.couch_client.get_db(config.database.threads_db_name)

        # LangChain memory instances for each thread
        self.memory_instances: Dict[str, ConversationBufferWindowMemory] = {}

        logger.success("✅ Enhanced ConversationContextManager initialized", extra={
            "similarity_threshold": similarity_threshold,
            "continuation_threshold": continuation_threshold,
            "embedder_model": "all-MiniLM-L6-v2",
            "persistence_enabled": True
        })
    
    def get_memory_for_thread(self, thread_id: str) -> ConversationBufferWindowMemory:
        """Get or create LangChain memory instance for a thread"""
        if thread_id not in self.memory_instances:
            # Create persistent chat message history
            chat_history = PersistentChatMessageHistory(thread_id, self.couch_client)

            # Create conversation buffer memory with persistence
            self.memory_instances[thread_id] = ConversationBufferWindowMemory(
                memory_key="chat_history",
                return_messages=True,
                k=10,  # Keep last 10 message pairs (20 messages total)
                chat_memory=chat_history
            )

            logger.info(f"🧠 Created memory instance for thread {thread_id}")

        return self.memory_instances[thread_id]

    def add_message_to_memory(self, thread_id: str, message: BaseMessage):
        """Add a message to the conversation memory"""
        try:
            memory = self.get_memory_for_thread(thread_id)
            memory.chat_memory.add_message(message)
            logger.debug(f"📝 Added message to memory for thread {thread_id}")
        except Exception as e:
            logger.error(f"❌ Failed to add message to memory: {e}")

    def get_conversation_history(self, thread_id: str) -> List[BaseMessage]:
        """Get conversation history from LangChain memory"""
        try:
            memory = self.get_memory_for_thread(thread_id)
            return memory.chat_memory.messages
        except Exception as e:
            logger.error(f"❌ Failed to get conversation history: {e}")
            return []

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
        Add a new conversation context to the manager using LangChain memory.
        This method is kept for backward compatibility.

        Args:
            thread_id: Thread identifier
            query: User query
            response: AI response
            metadata: Additional metadata

        Returns:
            ConversationContext object
        """
        try:
            # Add messages to LangChain memory (this handles persistence automatically)
            self.add_message_to_memory(thread_id, HumanMessage(content=query))
            self.add_message_to_memory(thread_id, AIMessage(content=response))

            # Create context object for return (for compatibility)
            context = ConversationContext(
                thread_id=thread_id,
                query=query,
                response=response,
                timestamp=datetime.now(timezone.utc).isoformat(),
                embedding=None,  # Not used in new system
                metadata={"from_langchain_memory": True, **(metadata or {})}
            )

            logger.debug(f"📝 Added context to LangChain memory for thread {thread_id}", extra={
                "query_length": len(query),
                "response_length": len(response),
                "memory_type": "langchain_persistent"
            })

            return context

        except Exception as e:
            logger.error(f"❌ Failed to add context: {e}")
            raise
    
    def get_thread_context(self, thread_id: str) -> List[ConversationContext]:
        """Get all context for a specific thread from LangChain memory"""
        try:
            memory = self.get_memory_for_thread(thread_id)
            messages = memory.chat_memory.messages

            # Convert messages back to ConversationContext format for compatibility
            contexts = []
            for i, msg in enumerate(messages):
                contexts.append(ConversationContext(
                    thread_id=thread_id,
                    query=msg.content if hasattr(msg, 'content') else str(msg),
                    response="",  # Not applicable in new format
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    embedding=None,
                    metadata={"message_index": i, "from_langchain_memory": True}
                ))
            return contexts
        except Exception:
            return []
    
    def analyze_query_relevance(self, new_query: str, thread_id: Optional[str] = None,
                              limit_contexts: int = 5) -> RelevanceResult:
        """
        Analyze relevance of a new query against existing conversation context using LangChain memory.

        This implements the ChatGPT-like behavior:
        1. Check conversation history in the current thread
        2. Use semantic similarity to determine if this is a continuation
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
        best_score = 0.0
        reasoning = "No previous context found"

        try:
            # If thread_id provided, check that thread's conversation history
            if thread_id:
                try:
                    memory = self.get_memory_for_thread(thread_id)
                    conversation_history = memory.chat_memory.messages

                    if conversation_history:
                        # Get the last few exchanges (limit_contexts pairs)
                        recent_messages = conversation_history[-(limit_contexts * 2):]

                        # Build context from recent conversation
                        context_texts = []
                        for msg in recent_messages:
                            if hasattr(msg, 'content'):
                                context_texts.append(msg.content)

                        if context_texts:
                            combined_context = " ".join(context_texts)

                            # Enhanced relevance scoring: combine word overlap with semantic similarity
                            query_words = set(new_query.lower().split())
                            context_words = set(combined_context.lower().split())

                            # Word overlap score (0-1)
                            word_overlap_score = 0.0
                            if context_words and query_words:
                                overlap = len(query_words.intersection(context_words))
                                word_overlap_score = min(overlap / len(query_words), 1.0)

                            # Semantic similarity using embeddings (0-1)
                            try:
                                query_embedding = self.get_query_embedding(new_query)
                                context_embedding = self.get_query_embedding(combined_context)
                                semantic_score = self.calculate_similarity(query_embedding, context_embedding)
                            except Exception:
                                semantic_score = 0.0

                            # Combined score: 70% semantic + 30% word overlap, scaled to 0-10
                            combined_score = (semantic_score * 0.7 + word_overlap_score * 0.3) * 10
                            best_score = combined_score

                            if best_score >= self.continuation_threshold:
                                reasoning = f"Found related context (semantic: {semantic_score:.3f}, word: {word_overlap_score:.3f}, combined: {best_score:.3f})"
                            else:
                                reasoning = f"Low relevance to conversation history (semantic: {semantic_score:.3f}, word: {word_overlap_score:.3f}, combined: {best_score:.3f})"

                except Exception as e:
                    logger.warning(f"Failed to analyze thread {thread_id}: {e}")

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
                "method": "langchain_memory"
            })

            return RelevanceResult(
                score=best_score,
                is_continuation=is_continuation,
                related_context=None,  # Not used in new system
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
        Get the most relevant context for generating a response from LangChain memory.
        Returns the most recent contexts that should be included in the prompt.
        """
        try:
            memory = self.get_memory_for_thread(thread_id)
            messages = memory.chat_memory.messages

            # Convert recent messages to ConversationContext format
            contexts = []
            recent_messages = messages[-(limit * 2):]  # Get last limit pairs

            for i, msg in enumerate(recent_messages):
                if isinstance(msg, HumanMessage):
                    contexts.append(ConversationContext(
                        thread_id=thread_id,
                        query=msg.content,
                        response="",  # Will be filled by next AI message
                        timestamp=datetime.now(timezone.utc).isoformat(),
                        embedding=None,
                        metadata={"message_index": i, "message_type": "human", "from_langchain_memory": True}
                    ))
                elif isinstance(msg, AIMessage):
                    # If there's a previous context (human message), update its response
                    if contexts and contexts[-1].response == "":
                        contexts[-1].response = msg.content
                    else:
                        # Standalone AI message
                        contexts.append(ConversationContext(
                            thread_id=thread_id,
                            query="",  # No corresponding human query
                            response=msg.content,
                            timestamp=datetime.now(timezone.utc).isoformat(),
                            embedding=None,
                            metadata={"message_index": i, "message_type": "ai", "from_langchain_memory": True}
                        ))

            return contexts[-limit:] if contexts else []

        except Exception:
            return []
    
    def build_conversation_history(self, thread_id: str) -> List[BaseMessage]:
        """
        Build LangChain message history for a thread using persistent memory.
        This is used for maintaining conversation context in LLM calls.
        """
        return self.get_conversation_history(thread_id)
    
    def cleanup_old_contexts(self, max_age_hours: int = 24, max_messages_per_thread: int = 50):
        """
        Clean up old conversation memories to prevent database bloat.
        In production, this would be handled by database TTL or periodic cleanup jobs.
        """
        try:
            current_time = datetime.now(timezone.utc)
            cleaned_threads = 0
            cleaned_messages = 0

            # Get all threads from database
            all_docs = self.threads_db.view('_all_docs', include_docs=True)

            for row in all_docs:
                doc = row.doc
                thread_id = doc.get("thread_id")

                if doc.get("conversation_memory"):
                    memory_data = doc["conversation_memory"]
                    messages = memory_data.get("messages", [])

                    # Check if thread is too old
                    last_updated = memory_data.get("last_updated")
                    if last_updated:
                        try:
                            last_update_time = datetime.fromisoformat(last_updated.replace('Z', '+00:00'))
                            age_hours = (current_time - last_update_time).total_seconds() / 3600

                            if age_hours > max_age_hours:
                                # Remove old thread
                                self.threads_db.delete(doc)
                                cleaned_threads += 1
                                continue
                        except Exception:
                            pass  # Keep if we can't parse timestamp

                    # Limit messages per thread
                    if len(messages) > max_messages_per_thread:
                        # Keep only the most recent messages
                        messages = messages[-(max_messages_per_thread):]
                        cleaned_messages += len(memory_data["messages"]) - max_messages_per_thread

                        # Update the document
                        doc["conversation_memory"]["messages"] = messages
                        doc["conversation_memory"]["last_updated"] = current_time.isoformat()
                        self.threads_db.save(doc)

            if cleaned_messages > 0 or cleaned_threads > 0:
                logger.info(f"🧹 Cleaned up conversation memories", extra={
                    "cleaned_threads": cleaned_threads,
                    "cleaned_messages": cleaned_messages,
                    "remaining_threads": len(self.memory_instances)
                })

        except Exception as e:
            logger.error(f"❌ Failed to cleanup old contexts: {e}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics about the context manager"""
        total_threads = len(self.memory_instances)
        total_messages = 0

        for memory in self.memory_instances.values():
            try:
                total_messages += len(memory.chat_memory.messages)
            except Exception:
                pass

        return {
            "total_threads": total_threads,
            "total_messages": total_messages,
            "avg_messages_per_thread": total_messages / total_threads if total_threads > 0 else 0,
            "similarity_threshold": self.similarity_threshold,
            "continuation_threshold": self.continuation_threshold,
            "memory_type": "langchain_persistent"
        }


# Global instance (in production, this would be dependency injected)
conversation_context_manager = ConversationContextManager()
