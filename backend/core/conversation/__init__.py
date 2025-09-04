"""
Conversation Management Module

This module provides intelligent conversation management using LangChain and LangGraph
for context-aware chat interactions that mimic ChatGPT's conversation flow.
"""

from .context_manager import ConversationContextManager, conversation_context_manager, RelevanceResult, ConversationContext
from .langgraph_manager import LangGraphConversationManager, get_conversation_manager

__all__ = [
    'ConversationContextManager',
    'conversation_context_manager', 
    'LangGraphConversationManager',
    'get_conversation_manager',
    'RelevanceResult',
    'ConversationContext'
]
