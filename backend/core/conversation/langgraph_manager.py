"""
LangGraph-based Conversation Flow Manager
Implements intelligent conversation routing and state management.
"""

import asyncio
import time
from typing import Dict, List, Optional, Any, TypedDict, Annotated
from datetime import datetime, timezone

from langgraph.graph import StateGraph, END
from langgraph.graph.message import MessagesState
from langgraph.prebuilt import ToolNode
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder

from core.logger import logger
from core.configuration import config
from .context_manager import ConversationContextManager, RelevanceResult, ConversationContext


class ConversationState(TypedDict):
    """State schema for the conversation graph"""
    messages: Annotated[List[BaseMessage], "The conversation messages"]
    thread_id: Optional[str]
    user_query: str
    current_response: str
    relevance_result: Optional[RelevanceResult]
    conversation_context: List[ConversationContext]
    should_continue_thread: bool
    provider: str
    model: Optional[str]
    temperature: float
    max_tokens: int
    metadata: Dict[str, Any]


class LangGraphConversationManager:
    """
    Manages conversation flow using LangGraph for intelligent routing.
    
    The graph implements this flow:
    1. Analyze incoming query for relevance to existing conversation
    2. Route to continuation or new thread based on relevance score
    3. Generate context-aware response using appropriate history
    4. Update conversation state and context
    """
    
    def __init__(self, context_manager: ConversationContextManager):
        self.context_manager = context_manager
        self.graph = self._build_conversation_graph()
        logger.info("🌐 LangGraph Conversation Manager initialized")
    
    def _build_conversation_graph(self) -> StateGraph:
        """Build the conversation flow graph"""
        logger.debug("🔧 Building conversation graph")
        
        # Define the graph
        workflow = StateGraph(ConversationState)
        
        # Add nodes
        workflow.add_node("analyze_relevance", self._analyze_relevance_node)
        workflow.add_node("route_conversation", self._route_conversation_node)
        workflow.add_node("continue_thread", self._continue_thread_node)
        workflow.add_node("start_new_thread", self._start_new_thread_node)
        workflow.add_node("generate_response", self._generate_response_node)
        workflow.add_node("update_context", self._update_context_node)
        
        # Define the flow
        workflow.set_entry_point("analyze_relevance")
        
        # From analyze_relevance, always go to route_conversation
        workflow.add_edge("analyze_relevance", "route_conversation")
        
        # From route_conversation, conditionally route based on relevance
        workflow.add_conditional_edges(
            "route_conversation",
            self._should_continue_thread,
            {
                "continue": "continue_thread",
                "new": "start_new_thread"
            }
        )
        
        # Both continuation paths lead to response generation
        workflow.add_edge("continue_thread", "generate_response")
        workflow.add_edge("start_new_thread", "generate_response")
        
        # After generating response, update context
        workflow.add_edge("generate_response", "update_context")
        
        # End after updating context
        workflow.add_edge("update_context", END)
        
        return workflow.compile()
    
    async def _analyze_relevance_node(self, state: ConversationState) -> ConversationState:
        """Node to analyze query relevance against existing context"""
        logger.debug("🔍 Analyzing query relevance")
        
        start_time = time.time()
        
        try:
            # Analyze relevance
            relevance_result = self.context_manager.analyze_query_relevance(
                new_query=state["user_query"],
                thread_id=state.get("thread_id"),
                limit_contexts=5
            )
            
            # Get existing conversation context if thread exists
            conversation_context = []
            if state.get("thread_id"):
                conversation_context = self.context_manager.get_relevant_context_for_response(
                    thread_id=state["thread_id"],
                    limit=3
                )
            
            duration = (time.time() - start_time) * 1000
            
            logger.info("✅ Relevance analysis complete", extra={
                "relevance_score": relevance_result.score,
                "is_continuation": relevance_result.is_continuation,
                "context_count": len(conversation_context),
                "duration": round(duration, 2)
            })
            
            # Update state
            state["relevance_result"] = relevance_result
            state["conversation_context"] = conversation_context
            state["should_continue_thread"] = relevance_result.is_continuation and state.get("thread_id") is not None
            
            return state
            
        except Exception as e:
            logger.error(f"❌ Relevance analysis failed: {e}")
            # Safe fallback
            state["relevance_result"] = RelevanceResult(
                score=0.0,
                is_continuation=False,
                related_context=None,
                reasoning=f"Analysis failed: {str(e)}"
            )
            state["conversation_context"] = []
            state["should_continue_thread"] = False
            return state
    
    async def _route_conversation_node(self, state: ConversationState) -> ConversationState:
        """Node to determine conversation routing"""
        relevance_result = state.get("relevance_result")
        
        if relevance_result:
            logger.info(f"🔀 Routing decision: {'continue' if state['should_continue_thread'] else 'new'}", extra={
                "reasoning": relevance_result.reasoning,
                "score": relevance_result.score
            })
        
        return state
    
    def _should_continue_thread(self, state: ConversationState) -> str:
        """Conditional edge function to determine routing"""
        return "continue" if state.get("should_continue_thread", False) else "new"
    
    async def _continue_thread_node(self, state: ConversationState) -> ConversationState:
        """Node for continuing existing conversation thread"""
        logger.info(f"🔗 Continuing conversation thread: {state.get('thread_id')}")

        # Get conversation history from LangChain memory
        if state.get("thread_id"):
            # Get the memory instance for this thread
            memory = self.context_manager.get_memory_for_thread(state["thread_id"])

            # Get current conversation history
            conversation_history = memory.chat_memory.messages

            # Add the new user query
            state["messages"] = conversation_history + [HumanMessage(content=state["user_query"])]

            logger.info(f"📚 Loaded conversation history", extra={
                "thread_id": state["thread_id"],
                "total_messages": len(conversation_history),
                "memory_type": "langchain_buffer"
            })
        else:
            state["messages"] = [HumanMessage(content=state["user_query"])]

        return state
    
    async def _start_new_thread_node(self, state: ConversationState) -> ConversationState:
        """Node for starting new conversation thread"""
        logger.info("🆕 Starting new conversation thread")
        
        # Generate new thread ID if not provided
        if not state.get("thread_id"):
            state["thread_id"] = f"thread_{int(time.time())}_{hash(state['user_query']) % 10000}"
        
        # Start fresh with just the user query
        state["messages"] = [HumanMessage(content=state["user_query"])]
        
        return state
    
    async def _generate_response_node(self, state: ConversationState) -> ConversationState:
        """Node to generate AI response using the configured LLM"""
        logger.debug("💭 Generating AI response")
        
        start_time = time.time()
        
        try:
            # Import LLM connectors here to avoid circular imports
            from core.ollama_setup.connector import OllamaConnector
            from core.openai_setup.connector import OpenAIClient
            
            messages = state.get("messages", [])
            provider = state.get("provider", "ollama")
            model = state.get("model")
            temperature = state.get("temperature", 0.7)
            max_tokens = state.get("max_tokens", 1500)
            
            # Convert messages to prompt string for current LLM implementations
            prompt = self._messages_to_prompt(messages)
            
            # Normalize provider string
            provider_str = str(provider).lower()
            if provider_str in ['llmprovider.ollama', 'ollama']:
                provider_str = 'ollama'
            elif provider_str in ['llmprovider.openai', 'openai']:
                provider_str = 'openai'
            
            # Generate response based on provider
            if provider_str == "ollama":
                ollama_client = OllamaConnector()
                if model:
                    ollama_client.model_name = model
                response = ollama_client.make_ollama_call(prompt, temperature=temperature, max_tokens=max_tokens)
            elif provider_str == "openai":
                openai_client = OpenAIClient(api_key=config.openai.api_key)
                if model:
                    openai_client.model = model
                
                # Use chat completion for better context handling
                message_dicts = []
                for msg in messages:
                    if isinstance(msg, HumanMessage):
                        message_dicts.append({"role": "user", "content": msg.content})
                    elif isinstance(msg, AIMessage):
                        message_dicts.append({"role": "assistant", "content": msg.content})
                    elif isinstance(msg, SystemMessage):
                        message_dicts.append({"role": "system", "content": msg.content})
                
                response = openai_client.chat_completion(message_dicts, temperature=temperature, max_tokens=max_tokens)
            else:
                raise ValueError(f"Unsupported provider: {provider} (normalized: {provider_str})")
            
            duration = (time.time() - start_time) * 1000
            
            logger.success("✅ Response generated", extra={
                "provider": provider_str,
                "model": model,
                "response_length": len(response),
                "duration": round(duration, 2)
            })
            
            state["current_response"] = response
            
            # Add AI response to messages
            state["messages"].append(AIMessage(content=response))
            
            return state
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Response generation failed: {e}", extra={
                "duration": round(duration, 2),
                "provider": provider
            })
            
            # Fallback response
            error_response = f"I apologize, but I encountered an error while processing your request. Please try again."
            state["current_response"] = error_response
            state["messages"].append(AIMessage(content=error_response))
            
            return state
    
    async def _update_context_node(self, state: ConversationState) -> ConversationState:
        """Node to update conversation context with new interaction"""
        logger.debug("📝 Updating conversation context")

        try:
            thread_id = state.get("thread_id")
            user_query = state.get("user_query", "")
            response = state.get("current_response", "")

            if thread_id and user_query and response:
                # Add messages to LangChain memory (they will be automatically persisted)
                self.context_manager.add_message_to_memory(
                    thread_id, HumanMessage(content=user_query)
                )
                self.context_manager.add_message_to_memory(
                    thread_id, AIMessage(content=response)
                )

                logger.info("✅ Context updated with LangChain memory", extra={
                    "thread_id": thread_id,
                    "query_length": len(user_query),
                    "response_length": len(response),
                    "memory_type": "persistent_langchain"
                })

            return state

        except Exception as e:
            logger.error(f"❌ Failed to update context: {e}")
            return state
    
    def _messages_to_prompt(self, messages: List[BaseMessage]) -> str:
        """Convert LangChain messages to prompt string"""
        prompt_parts = []
        
        for message in messages:
            if isinstance(message, SystemMessage):
                prompt_parts.append(f"System: {message.content}")
            elif isinstance(message, HumanMessage):
                prompt_parts.append(f"Human: {message.content}")
            elif isinstance(message, AIMessage):
                prompt_parts.append(f"Assistant: {message.content}")
        
        return "\n\n".join(prompt_parts)
    
    def _build_context_summary(self, contexts: List[ConversationContext]) -> str:
        """Build a summary of conversation context for prompt inclusion"""
        if not contexts:
            return "No previous context."
        
        summaries = []
        for i, context in enumerate(contexts[-3:], 1):  # Last 3 contexts
            summary = f"{i}. Q: {context.query[:100]}{'...' if len(context.query) > 100 else ''}"
            summaries.append(summary)
        
        return " | ".join(summaries)
    
    async def process_conversation(self, 
                                 user_query: str,
                                 thread_id: Optional[str] = None,
                                 provider: str = "ollama",
                                 model: Optional[str] = None,
                                 temperature: float = 0.7,
                                 max_tokens: int = 1500,
                                 metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Process a conversation using the LangGraph workflow.
        
        Args:
            user_query: The user's query
            thread_id: Optional thread ID for continuation
            provider: LLM provider (ollama/openai)
            model: Specific model to use
            temperature: Generation temperature
            max_tokens: Maximum tokens to generate
            metadata: Additional metadata
            
        Returns:
            Dict containing response and conversation metadata
        """
        logger.info(f"🚀 Processing conversation", extra={
            "query_length": len(user_query),
            "thread_id": thread_id,
            "provider": provider
        })
        
        start_time = time.time()
        
        try:
            # Initialize state
            initial_state: ConversationState = {
                "messages": [],
                "thread_id": thread_id,
                "user_query": user_query,
                "current_response": "",
                "relevance_result": None,
                "conversation_context": [],
                "should_continue_thread": False,
                "provider": provider,
                "model": model,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "metadata": metadata or {}
            }
            
            # Run the graph
            result = await self.graph.ainvoke(initial_state)
            
            duration = (time.time() - start_time) * 1000
            
            logger.success("✅ Conversation processed", extra={
                "thread_id": result.get("thread_id"),
                "response_length": len(result.get("current_response", "")),
                "was_continuation": result.get("should_continue_thread", False),
                "duration": round(duration, 2)
            })
            
            return {
                "thread_id": result.get("thread_id"),
                "response": result.get("current_response", ""),
                "messages": result.get("messages", []),
                "relevance_result": result.get("relevance_result"),
                "was_continuation": result.get("should_continue_thread", False),
                "context_used": len(result.get("conversation_context", [])),
                "metadata": {
                    "provider": provider,
                    "model": model,
                    "temperature": temperature,
                    "max_tokens": max_tokens,
                    "duration_ms": round(duration, 2),
                    "reasoning": result.get("relevance_result", {}).reasoning if result.get("relevance_result") else "No relevance analysis"
                }
            }
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Conversation processing failed: {e}", extra={
                "duration": round(duration, 2)
            })
            
            raise Exception(f"Failed to process conversation: {str(e)}")


# Global instance
langgraph_conversation_manager = None

def get_conversation_manager() -> LangGraphConversationManager:
    """Get or create the global conversation manager instance"""
    global langgraph_conversation_manager
    if langgraph_conversation_manager is None:
        from .context_manager import conversation_context_manager
        langgraph_conversation_manager = LangGraphConversationManager(conversation_context_manager)
    return langgraph_conversation_manager
