"""
Query Classification System for Intelligent Conversation Routing
Determines whether a query should use HyDE (new topic) or direct response (follow-up)
"""

import re
import time
from enum import Enum
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timezone

from sentence_transformers import SentenceTransformer
import numpy as np

from core.logger import logger


class QueryType(str, Enum):
    """Types of queries for different processing strategies"""
    NEW_TOPIC = "new_topic"        # Use HyDE for comprehensive exploration
    FOLLOW_UP = "follow_up"        # Direct contextual response
    CLARIFICATION = "clarification" # Direct response with more detail
    RELATED_TOPIC = "related_topic" # Direct response but note topic shift


@dataclass
class ConversationMessage:
    """Clean message representation without HyDE pollution"""
    message_id: str
    thread_id: str
    user_query: str
    ai_response: str
    timestamp: str
    query_type: QueryType
    context_used: int = 0
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class QueryClassificationResult:
    """Result of query classification"""
    query_type: QueryType
    confidence: float
    reasoning: str
    should_use_context: bool
    context_weight: float  # How much to weight conversation history


class QueryClassifier:
    """
    Intelligent query classifier that determines processing strategy.
    
    Uses linguistic patterns and semantic similarity to distinguish between:
    - New topics that benefit from HyDE exploration
    - Follow-up questions that need contextual responses
    """
    
    def __init__(self, similarity_threshold: float = 0.25):
        """
        Initialize the query classifier.
        
        Args:
            similarity_threshold: Threshold for considering queries as related (0.25 = low threshold for better continuity)
        """
        logger.info("🔍 Initializing QueryClassifier")
        
        self.similarity_threshold = similarity_threshold
        
        # Initialize sentence transformer for semantic similarity
        try:
            self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
            logger.success("✅ Sentence transformer loaded successfully")
        except Exception as e:
            logger.error(f"❌ Failed to load sentence transformer: {e}")
            self.embedder = None
        
        # Define linguistic patterns for different query types
        self.follow_up_patterns = [
            # Direct follow-up indicators
            r'\b(can you|could you|would you|will you)\b',
            r'\b(tell me more|explain|elaborate|describe)\b',
            r'\b(give me|show me|provide|list)\b',
            r'\b(what about|how about|what if)\b',
            r'\b(also|additionally|furthermore|moreover)\b',
            
            # Pronoun references (indicating context dependency)
            r'\b(it|this|that|they|them|those|these)\b',
            r'\b(he|she|his|her|their)\b',
            
            # Question words that often indicate follow-ups
            r'^(why|how|when|where|who|which)\b',
            r'\b(examples?|instance|case|sample)\b',
            
            # Continuation phrases
            r'\b(and|but|however|although|though)\b',
            r'\b(next|then|after|before|during)\b'
        ]
        
        self.clarification_patterns = [
            r'\b(what do you mean|i don\'t understand|unclear|confusing)\b',
            r'\b(can you clarify|explain better|more detail|be more specific)\b',
            r'\b(i\'m confused|not sure|don\'t get it)\b',
            r'\b(rephrase|say that again|repeat)\b'
        ]
        
        self.new_topic_indicators = [
            r'\b(what is|what are|define|definition)\b',
            r'\b(tell me about|explain|describe)\b(?!.*\b(it|this|that)\b)',
            r'\b(how does|how do|how can|how to)\b(?!.*\b(it|this|that)\b)',
            r'\b(compare|difference between|versus|vs)\b',
            r'\b(pros and cons|advantages|disadvantages)\b'
        ]
        
        # Compile patterns for efficiency
        self.follow_up_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.follow_up_patterns]
        self.clarification_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.clarification_patterns]
        self.new_topic_regex = [re.compile(pattern, re.IGNORECASE) for pattern in self.new_topic_indicators]
        
        logger.success("✅ QueryClassifier initialized", extra={
            "similarity_threshold": similarity_threshold,
            "follow_up_patterns": len(self.follow_up_patterns),
            "clarification_patterns": len(self.clarification_patterns),
            "new_topic_patterns": len(self.new_topic_indicators)
        })
    
    def classify_query(self, 
                      query: str, 
                      conversation_history: Optional[List[ConversationMessage]] = None,
                      thread_id: Optional[str] = None) -> QueryClassificationResult:
        """
        Classify a query to determine the appropriate processing strategy.
        
        Args:
            query: The user's query
            conversation_history: Recent conversation messages for context
            thread_id: Thread ID if continuing a conversation
            
        Returns:
            QueryClassificationResult with processing recommendations
        """
        logger.debug(f"🔍 Classifying query: {query[:100]}...")
        
        start_time = time.time()
        
        try:
            # If no conversation history or thread, it's definitely a new topic
            if not conversation_history or not thread_id:
                return QueryClassificationResult(
                    query_type=QueryType.NEW_TOPIC,
                    confidence=1.0,
                    reasoning="No conversation history - starting new topic",
                    should_use_context=False,
                    context_weight=0.0
                )
            
            # Check for clarification patterns first (highest priority)
            clarification_score = self._check_patterns(query, self.clarification_regex)
            if clarification_score > 0.3:
                return QueryClassificationResult(
                    query_type=QueryType.CLARIFICATION,
                    confidence=clarification_score,
                    reasoning=f"Clarification request detected (score: {clarification_score:.3f})",
                    should_use_context=True,
                    context_weight=0.9
                )
            
            # Check for follow-up patterns
            follow_up_score = self._check_patterns(query, self.follow_up_regex)
            
            # Check semantic similarity with recent messages
            semantic_score = 0.0
            if conversation_history and self.embedder:
                semantic_score = self._calculate_semantic_similarity(query, conversation_history)
            
            # Check for new topic indicators
            new_topic_score = self._check_patterns(query, self.new_topic_regex)
            
            # Decision logic
            combined_follow_up_score = (follow_up_score * 0.6 + semantic_score * 0.4)
            
            logger.debug("🎯 Classification scores", extra={
                "follow_up_score": round(follow_up_score, 3),
                "semantic_score": round(semantic_score, 3),
                "new_topic_score": round(new_topic_score, 3),
                "combined_score": round(combined_follow_up_score, 3)
            })
            
            # Determine query type based on scores
            if combined_follow_up_score > self.similarity_threshold:
                if semantic_score > 0.4:
                    query_type = QueryType.FOLLOW_UP
                    reasoning = f"Follow-up detected (linguistic: {follow_up_score:.3f}, semantic: {semantic_score:.3f})"
                    context_weight = 0.8
                else:
                    query_type = QueryType.RELATED_TOPIC
                    reasoning = f"Related topic detected (linguistic patterns but lower semantic similarity)"
                    context_weight = 0.6
                
                confidence = min(combined_follow_up_score, 1.0)
                should_use_context = True
                
            elif new_topic_score > 0.4:
                query_type = QueryType.NEW_TOPIC
                confidence = new_topic_score
                reasoning = f"New topic detected (new topic indicators: {new_topic_score:.3f})"
                should_use_context = False
                context_weight = 0.0
                
            else:
                # Default to follow-up with low confidence if we have conversation history
                query_type = QueryType.FOLLOW_UP
                confidence = 0.3
                reasoning = f"Default to follow-up (ambiguous query with conversation history)"
                should_use_context = True
                context_weight = 0.5
            
            duration = (time.time() - start_time) * 1000
            
            logger.info("✅ Query classified", extra={
                "query_type": query_type,
                "confidence": round(confidence, 3),
                "should_use_context": should_use_context,
                "context_weight": round(context_weight, 3),
                "duration": round(duration, 2)
            })
            
            return QueryClassificationResult(
                query_type=query_type,
                confidence=confidence,
                reasoning=reasoning,
                should_use_context=should_use_context,
                context_weight=context_weight
            )
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Query classification failed: {e}", extra={
                "duration": round(duration, 2)
            })
            
            # Safe fallback
            return QueryClassificationResult(
                query_type=QueryType.NEW_TOPIC,
                confidence=0.1,
                reasoning=f"Classification error: {str(e)} - defaulting to new topic",
                should_use_context=False,
                context_weight=0.0
            )
    
    def _check_patterns(self, query: str, patterns: List[re.Pattern]) -> float:
        """Check how many linguistic patterns match the query"""
        matches = 0
        total_patterns = len(patterns)
        
        for pattern in patterns:
            if pattern.search(query):
                matches += 1
        
        return matches / total_patterns if total_patterns > 0 else 0.0
    
    def _calculate_semantic_similarity(self, query: str, conversation_history: List[ConversationMessage]) -> float:
        """Calculate semantic similarity with recent conversation"""
        if not self.embedder or not conversation_history:
            return 0.0
        
        try:
            # Get recent messages (last 3 exchanges)
            recent_messages = conversation_history[-6:]  # Last 3 user-AI pairs
            
            # Combine recent conversation context
            context_texts = []
            for msg in recent_messages:
                context_texts.extend([msg.user_query, msg.ai_response])
            
            if not context_texts:
                return 0.0
            
            # Calculate embeddings
            query_embedding = self.embedder.encode(query, convert_to_tensor=False)
            context_text = " ".join(context_texts)
            context_embedding = self.embedder.encode(context_text, convert_to_tensor=False)
            
            # Calculate cosine similarity
            similarity = np.dot(query_embedding, context_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(context_embedding)
            )
            
            return float(similarity)
            
        except Exception as e:
            logger.warning(f"Semantic similarity calculation failed: {e}")
            return 0.0
    
    def is_follow_up_query(self, query: str, conversation_history: Optional[List[ConversationMessage]] = None) -> bool:
        """Simple boolean check for follow-up queries (for backward compatibility)"""
        result = self.classify_query(query, conversation_history)
        return result.query_type in [QueryType.FOLLOW_UP, QueryType.CLARIFICATION, QueryType.RELATED_TOPIC]
    
    def get_stats(self) -> Dict[str, Any]:
        """Get classifier statistics"""
        return {
            "similarity_threshold": self.similarity_threshold,
            "embedder_available": self.embedder is not None,
            "pattern_counts": {
                "follow_up": len(self.follow_up_patterns),
                "clarification": len(self.clarification_patterns),
                "new_topic": len(self.new_topic_indicators)
            }
        }


# Global instance
query_classifier = QueryClassifier()
