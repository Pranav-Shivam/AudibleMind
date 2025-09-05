"""
Response Generator for Different Query Types
Handles HyDE responses for new topics and direct responses for follow-ups
"""

import time
import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone

from core.logger import logger
from core.configuration import config
from core.ollama_setup.connector import OllamaConnector
from core.openai_setup.connector import OpenAIClient
from .query_classifier import QueryType, ConversationMessage


class ResponseGenerator:
    """
    Handles different response generation strategies based on query type.
    
    - NEW_TOPIC: Uses HyDE to generate 3 comprehensive response variations
    - FOLLOW_UP/CLARIFICATION/RELATED_TOPIC: Uses direct contextual response
    """
    
    def __init__(self):
        """Initialize the response generator"""
        logger.info("🎨 Initializing ResponseGenerator")
        
        # Initialize LLM connectors
        self.ollama_client = OllamaConnector()
        self.openai_client = OpenAIClient(api_key=config.openai.api_key) if config.openai.api_key else None
        
        # HyDE prompt template for new topics
        self.hyde_prompt = """Given the following query:
{query}

Generate three distinct and insightful questions that will produce comprehensive responses using these approaches:

Essence Question (A):
Create a question that explores the fundamental concepts, core principles, and theoretical foundations underlying the original query. This should reveal the "why" and deeper meaning.

Systems Question (B):
Formulate a question that examines relationships, interconnections, dependencies, and how different components work together within the domain of the original query. This should reveal the "how" and structural aspects.

Application Question (C):
Develop a question focused on practical implementation, real-world examples, use cases, challenges, and actionable insights directly related to the original query. This should reveal the "what" and practical applications.

Each question should:
- Be directly related to the original query
- Explore a different dimension of understanding
- Be answerable in detail
- Provide unique value and perspective

Format your response as exactly three numbered questions:
1. [Essence Question]
2. [Systems Question]  
3. [Application Question]"""

        # Context-aware prompt template for follow-ups
        self.contextual_prompt = """You are an expert AI assistant engaged in an ongoing conversation. 

Previous conversation context:
{context}

Current user query: {query}

Based on the conversation context above, provide a comprehensive, contextual response that:
- Directly addresses the user's current query
- References relevant information from the previous conversation
- Maintains conversation continuity and flow
- Provides helpful, detailed information

Response:"""

        logger.success("✅ ResponseGenerator initialized", extra={
            "ollama_available": True,
            "openai_available": bool(self.openai_client)
        })
    
    async def generate_hyde_response(self, 
                                   query: str,
                                   provider: str = "ollama",
                                   model: Optional[str] = None,
                                   temperature: float = 0.7,
                                   max_tokens: int = 1500) -> Dict[str, Any]:
        """
        Generate HyDE responses for new topics.
        
        Args:
            query: User's original query
            provider: LLM provider to use
            model: Specific model to use
            temperature: Generation temperature
            max_tokens: Maximum tokens per response
            
        Returns:
            Dict containing HyDE responses and metadata
        """
        logger.info(f"🔍 Generating HyDE responses for new topic: {query[:100]}...")
        
        start_time = time.time()
        
        try:
            # Step 1: Generate HyDE question variations
            hyde_questions = await self._generate_hyde_questions(query, provider, model, temperature)
            
            # Step 2: Generate responses for each HyDE question in parallel
            response_tasks = []
            question_keys = ["query_A", "query_B", "query_C"]
            
            for i, (key, question) in enumerate(zip(question_keys, hyde_questions)):
                # Vary temperature slightly for each response
                response_temp = temperature + (i * 0.1)
                task = self._generate_single_response(
                    question, provider, model, response_temp, max_tokens, key
                )
                response_tasks.append(task)
            
            # Execute all response generation tasks in parallel
            logger.info(f"🚀 Generating {len(response_tasks)} HyDE responses in parallel")
            parallel_start = time.time()
            response_results = await asyncio.gather(*response_tasks, return_exceptions=True)
            parallel_duration = (time.time() - parallel_start) * 1000
            
            # Process results
            responses = {}
            response_metadata = {}
            
            for i, result in enumerate(response_results):
                key = question_keys[i]
                if isinstance(result, Exception):
                    logger.error(f"❌ Failed to generate response {key}: {result}")
                    responses[key] = f"I apologize, but I encountered an error generating this response variation. Please try again."
                    response_metadata[key] = {"error": str(result)}
                else:
                    responses[key] = result["response"]
                    response_metadata[key] = result["metadata"]
            
            total_duration = (time.time() - start_time) * 1000
            
            logger.success("✅ HyDE responses generated", extra={
                "total_duration": round(total_duration, 2),
                "parallel_duration": round(parallel_duration, 2),
                "responses_generated": len(responses),
                "parallel_efficiency": round((parallel_duration / total_duration) * 100, 1)
            })
            
            return {
                "responses": responses,
                "metadata": {
                    "response_type": "hyde",
                    "questions_generated": hyde_questions,
                    "response_metadata": response_metadata,
                    "total_duration_ms": round(total_duration, 2),
                    "parallel_duration_ms": round(parallel_duration, 2)
                }
            }
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ HyDE response generation failed: {e}", extra={
                "duration": round(duration, 2)
            })
            
            # Return fallback responses
            fallback_response = f"I apologize, but I encountered an error while processing your query about: {query}. Please try again."
            return {
                "responses": {
                    "query_A": fallback_response,
                    "query_B": fallback_response,
                    "query_C": fallback_response
                },
                "metadata": {
                    "response_type": "hyde_fallback",
                    "error": str(e),
                    "duration_ms": round(duration, 2)
                }
            }
    
    async def generate_contextual_response(self,
                                         query: str,
                                         conversation_context: List[ConversationMessage],
                                         provider: str = "ollama",
                                         model: Optional[str] = None,
                                         temperature: float = 0.7,
                                         max_tokens: int = 1500) -> Dict[str, Any]:
        """
        Generate a direct contextual response for follow-up queries.
        
        Args:
            query: User's current query
            conversation_context: Previous conversation messages for context
            provider: LLM provider to use
            model: Specific model to use
            temperature: Generation temperature
            max_tokens: Maximum tokens for response
            
        Returns:
            Dict containing direct response and metadata
        """
        logger.info(f"💭 Generating contextual response for follow-up: {query[:100]}...")
        
        start_time = time.time()
        
        try:
            # Build context from conversation history
            context_text = self._build_context_text(conversation_context)
            
            # Create contextual prompt
            prompt = self.contextual_prompt.format(
                context=context_text,
                query=query
            )
            
            # Generate response
            result = await self._generate_single_response(
                prompt, provider, model, temperature, max_tokens, "contextual"
            )
            
            duration = (time.time() - start_time) * 1000
            
            logger.success("✅ Contextual response generated", extra={
                "duration": round(duration, 2),
                "context_messages_used": len(conversation_context),
                "response_length": len(result["response"])
            })
            
            return {
                "response": result["response"],
                "metadata": {
                    "response_type": "contextual",
                    "context_messages_used": len(conversation_context),
                    "context_text_length": len(context_text),
                    "duration_ms": round(duration, 2),
                    **result["metadata"]
                }
            }
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Contextual response generation failed: {e}", extra={
                "duration": round(duration, 2)
            })
            
            # Return fallback response
            return {
                "response": f"I apologize, but I encountered an error while processing your follow-up question. Please try rephrasing your query.",
                "metadata": {
                    "response_type": "contextual_fallback",
                    "error": str(e),
                    "duration_ms": round(duration, 2)
                }
            }
    
    async def _generate_hyde_questions(self, 
                                     query: str, 
                                     provider: str, 
                                     model: Optional[str],
                                     temperature: float) -> List[str]:
        """Generate HyDE question variations"""
        logger.debug("🔍 Generating HyDE question variations")
        
        try:
            hyde_prompt = self.hyde_prompt.format(query=query)
            
            # Generate HyDE questions
            result = await self._generate_single_response(
                hyde_prompt, provider, model, temperature + 0.1, 800, "hyde_questions"
            )
            
            # Parse the response to extract questions
            questions = self._parse_hyde_questions(result["response"])
            
            logger.success(f"✅ Generated {len(questions)} HyDE questions")
            return questions
            
        except Exception as e:
            logger.error(f"❌ Failed to generate HyDE questions: {e}")
            # Return fallback questions
            return [
                f"What are the fundamental concepts and principles behind: {query}?",
                f"How do the different components and systems related to '{query}' work together?",
                f"What are the practical applications and real-world implementations of: {query}?"
            ]
    
    def _parse_hyde_questions(self, hyde_response: str) -> List[str]:
        """Parse HyDE response to extract the three questions"""
        try:
            lines = [line.strip() for line in hyde_response.split('\n') if line.strip()]
            questions = []
            
            for line in lines:
                # Look for numbered lines (1., 2., 3.)
                if any(line.startswith(f"{i}.") for i in range(1, 4)):
                    # Remove the number prefix and clean up
                    question = line.split('.', 1)[1].strip()
                    if question:
                        questions.append(question)
                elif len(questions) < 3 and len(line) > 20:  # Fallback for non-numbered responses
                    questions.append(line)
            
            # Ensure we have exactly 3 questions
            while len(questions) < 3:
                questions.append(f"Please provide more details about this topic (variation {len(questions) + 1}).")
            
            return questions[:3]  # Take only first 3
            
        except Exception as e:
            logger.error(f"Error parsing HyDE questions: {e}")
            return [
                "Please provide a comprehensive explanation of this topic.",
                "What are the key relationships and dependencies involved?",
                "How can this be applied in real-world scenarios?"
            ]
    
    async def _generate_single_response(self,
                                      prompt: str,
                                      provider: str,
                                      model: Optional[str],
                                      temperature: float,
                                      max_tokens: int,
                                      response_key: str) -> Dict[str, Any]:
        """Generate a single response using the specified provider"""
        logger.debug(f"💭 Generating response for {response_key}")
        
        start_time = time.time()
        
        try:
            # Normalize provider string
            provider_str = str(provider).lower()
            if provider_str in ['llmprovider.ollama', 'ollama']:
                provider_str = 'ollama'
            elif provider_str in ['llmprovider.openai', 'openai']:
                provider_str = 'openai'
            
            # Generate response based on provider
            if provider_str == "ollama":
                if model:
                    self.ollama_client.model_name = model
                response = self.ollama_client.make_ollama_call(
                    prompt, temperature=temperature, max_tokens=max_tokens
                )
                
                metadata = {
                    "provider": "ollama",
                    "model": model or config.ollama.model,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
                
            elif provider_str == "openai":
                if not self.openai_client:
                    raise ValueError("OpenAI client not configured")
                
                # Update the client's model if a specific model was requested
                if model:
                    self.openai_client.model = model
                
                response = self.openai_client.generate(
                    prompt, temperature=temperature, max_tokens=max_tokens
                )
                
                metadata = {
                    "provider": "openai",
                    "model": model or config.openai.model,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
                
            else:
                raise ValueError(f"Unsupported provider: {provider_str}")
            
            duration = (time.time() - start_time) * 1000
            metadata.update({
                "duration_ms": round(duration, 2),
                "response_length": len(response),
                "response_key": response_key
            })
            
            logger.success(f"✅ Response generated for {response_key}", extra={
                "provider": provider_str,
                "duration": round(duration, 2),
                "response_length": len(response)
            })
            
            return {
                "response": response,
                "metadata": metadata
            }
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Response generation failed for {response_key}: {e}", extra={
                "duration": round(duration, 2),
                "provider": provider_str
            })
            
            return {
                "response": f"I apologize, but I encountered an error while generating this response. Please try again.",
                "metadata": {
                    "provider": provider_str,
                    "error": str(e),
                    "duration_ms": round(duration, 2),
                    "response_key": response_key
                }
            }
    
    def _build_context_text(self, conversation_context: List[ConversationMessage]) -> str:
        """Build context text from conversation messages"""
        if not conversation_context:
            return "No previous conversation context."
        
        context_parts = []
        for i, message in enumerate(conversation_context, 1):
            context_parts.append(f"Exchange {i}:")
            context_parts.append(f"User: {message.user_query}")
            context_parts.append(f"Assistant: {message.ai_response}")
            context_parts.append("")  # Empty line for readability
        
        return "\n".join(context_parts)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get response generator statistics"""
        return {
            "ollama_available": True,
            "openai_available": bool(self.openai_client),
            "supported_providers": ["ollama", "openai"] if self.openai_client else ["ollama"],
            "response_types": ["hyde", "contextual"]
        }


# Global instance
response_generator = ResponseGenerator()
