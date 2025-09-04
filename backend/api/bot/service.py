import time
import uuid
import asyncio
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from core.configuration import config
from core.logger import logger, LoggerUtils
from core.db.couch_conn import CouchDBConnection
from core.ollama_setup.connector import OllamaConnector
from core.openai_setup.connector import OpenAIClient
from core.conversation import get_conversation_manager, conversation_context_manager

from .models import LLMProvider, ChatRequest, ChatResponse, SubQuery, ResponseToggleRequest

# ============ PROMPT TEMPLATES ============

HYDE_PROMPT = """Given the following query:
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

RESPONSE_PROMPT = """You are an expert AI assistant. Answer the following question comprehensively and accurately:

{question}

Provide a detailed, informative response that addresses all aspects of the question. Be clear, concise, and helpful."""

# ============ BOT SERVICE CLASS ============

class BotService:
    def __init__(self):
        logger.info("🤖 Initializing BotService")
        
        start_time = time.time()
        self.couch_client = CouchDBConnection()
        self.threads_db = self.couch_client.get_db(config.database.threads_db_name)
        
        # Initialize LLM connectors
        self.ollama_client = OllamaConnector()
        self.openai_client = OpenAIClient(api_key=config.openai.api_key) if config.openai.api_key else None
        
        # Initialize conversation management
        self.conversation_manager = get_conversation_manager()
        
        init_duration = (time.time() - start_time) * 1000
        logger.success(f"✅ BotService initialized", extra={
            "init_duration": round(init_duration, 2),
            "threads_db": config.database.threads_db_name,
            "ollama_available": True,
            "openai_available": bool(self.openai_client),
            "conversation_manager": True
        })

    def generate_thread_id(self) -> str:
        """Generate a unique thread ID"""
        return f"thread_{uuid.uuid4().hex[:12]}_{int(time.time())}"

    def get_current_timestamp(self) -> str:
        """Get current ISO timestamp"""
        return datetime.now(timezone.utc).isoformat()

    def parse_hyde_questions(self, hyde_response: str) -> List[str]:
        """Parse the HyDE response to extract the three questions"""
        try:
            lines = [line.strip() for line in hyde_response.split('\n') if line.strip()]
            questions = []
            
            for line in lines:
                # Look for numbered lines (1., 2., 3.) or similar patterns
                if any(line.startswith(f"{i}.") for i in range(1, 4)):
                    # Remove the number prefix and clean up
                    question = line.split('.', 1)[1].strip()
                    if question:
                        questions.append(question)
                elif len(questions) < 3 and len(line) > 20:  # Fallback for non-numbered responses
                    questions.append(line)
            
            # Ensure we have exactly 3 questions
            if len(questions) < 3:
                # Pad with the original or variations
                while len(questions) < 3:
                    questions.append(f"Variation {len(questions) + 1}: Please provide more details about this topic.")
            elif len(questions) > 3:
                questions = questions[:3]
                
            return questions
            
        except Exception as e:
            logger.error(f"Error parsing HyDE questions: {e}")
            return [
                "Please provide a comprehensive explanation of this topic.",
                "What are the key relationships and dependencies involved?",
                "How can this be applied in real-world scenarios?"
            ]

    async def generate_hyde_questions(self, query: str, provider: LLMProvider, model: Optional[str] = None) -> List[str]:
        """Generate 3 HyDE-style question variations"""
        logger.debug(f"🔍 Generating HyDE questions for: {query[:100]}...")
        
        start_time = time.time()
        hyde_prompt = HYDE_PROMPT.format(query=query)
        
        try:
            if provider == LLMProvider.OLLAMA:
                model_name = model or config.ollama.model
                self.ollama_client.model_name = model_name
                response = self.ollama_client.make_ollama_call(hyde_prompt, temperature=0.8)
            else:  # OpenAI
                if not self.openai_client:
                    raise ValueError("OpenAI client not configured")
                model_name = model or "gpt-4"
                response = self.openai_client.generate(hyde_prompt, temperature=0.8)
            
            questions = self.parse_hyde_questions(response)
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"✅ Generated HyDE questions", extra={
                "duration": round(duration, 2),
                "provider": provider,
                "model": model_name,
                "questions_count": len(questions)
            })
            
            return questions
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to generate HyDE questions: {e}", extra={
                "duration": round(duration, 2),
                "provider": provider
            })
            
            # Return fallback questions
            return [
                f"What are the fundamental concepts behind: {query}?",
                f"How do the different components of '{query}' work together?", 
                f"What are practical applications and implementations of: {query}?"
            ]

    async def generate_response(self, question: str, provider: LLMProvider, model: Optional[str] = None, 
                              temperature: float = 0.7, max_tokens: int = 1500) -> Dict[str, Any]:
        """Generate a response to a question using the specified provider"""
        logger.debug(f"💭 Generating response for: {question[:100]}...")
        
        start_time = time.time()
        response_prompt = RESPONSE_PROMPT.format(question=question)
        
        try:
            if provider == LLMProvider.OLLAMA:
                model_name = model or config.ollama.model
                self.ollama_client.model_name = model_name
                response = self.ollama_client.make_ollama_call(response_prompt, temperature=temperature, max_tokens=max_tokens)
                
                metadata = {
                    "provider": "ollama",
                    "model": model_name,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            else:  # OpenAI
                if not self.openai_client:
                    raise ValueError("OpenAI client not configured")
                model_name = model or "gpt-4"
                response = self.openai_client.generate(
                    response_prompt, temperature=temperature, max_tokens=max_tokens
                )
                
                metadata = {
                    "provider": "openai", 
                    "model": model_name,
                    "temperature": temperature,
                    "max_tokens": max_tokens
                }
            
            duration = (time.time() - start_time) * 1000
            metadata.update({
                "duration_ms": round(duration, 2),
                "response_length": len(response),
                "question_length": len(question)
            })
            
            logger.success(f"✅ Generated response", extra={
                "duration": round(duration, 2),
                "provider": provider,
                "model": model_name,
                "response_length": len(response)
            })
            
            return {
                "response": response,
                "metadata": metadata
            }
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to generate response: {e}", extra={
                "duration": round(duration, 2),
                "provider": provider
            })
            
            return {
                "response": f"I apologize, but I encountered an error while processing your question: {question}. Please try again.",
                "metadata": {
                    "provider": str(provider),
                    "error": str(e),
                    "duration_ms": round(duration, 2)
                }
            }

    async def process_chat_request_with_context(self, request: ChatRequest, user_id: str) -> ChatResponse:
        """
        Process a chat request using the new LangGraph conversation management.
        This method provides intelligent context-aware conversation handling with HyDE prompting.
        """
        logger.info(f"🧠 Processing chat request with context and HyDE", extra={
            "thread_id": request.thread_id,
            "query_length": len(request.query),
            "provider": request.provider,
            "user_id": user_id
        })
        
        start_time = time.time()
        
        try:
            # Step 1: Generate HyDE question variations first
            hyde_questions = await self.generate_hyde_questions(
                request.query, 
                request.provider, 
                request.model
            )
            
            # Step 2: Process each HyDE question through conversation management in parallel
            question_keys = ["query_A", "query_B", "query_C"]
            
            # Get base thread_id for all variants
            base_thread_id = request.thread_id
            
            # Create parallel tasks for all HyDE questions
            async def process_hyde_question(i: int, question: str, key: str):
                logger.debug(f"🎯 Processing HyDE question {key}: {question[:50]}...")
                
                result = await self.conversation_manager.process_conversation(
                    user_query=question,
                    thread_id=base_thread_id,  # Same thread for context consistency
                    provider=str(request.provider),
                    model=request.model,
                    temperature=request.temperature + (i * 0.1),  # Slight temperature variation for diversity
                    max_tokens=request.max_tokens,
                    metadata={
                        "user_id": user_id,
                        "request_timestamp": self.get_current_timestamp(),
                        "hyde_variant": key,
                        "original_query": request.query,
                        "variant_focus": ["essence", "systems", "application"][i]
                    }
                )
                
                return {
                    "key": key,
                    "result": result,
                    "index": i
                }
            
            # Execute all questions in parallel
            tasks = [
                process_hyde_question(i, question, question_keys[i]) 
                for i, question in enumerate(hyde_questions)
            ]
            
            logger.info(f"🚀 Processing {len(tasks)} HyDE questions in parallel")
            parallel_start = time.time()
            parallel_results = await asyncio.gather(*tasks)
            parallel_duration = (time.time() - parallel_start) * 1000
            logger.success(f"✅ Parallel HyDE processing completed", extra={
                "parallel_duration": round(parallel_duration, 2),
                "questions_processed": len(tasks)
            })
            
            # Process results
            responses = {}
            response_metadata = {}
            thread_id = None
            
            for task_result in parallel_results:
                key = task_result["key"]
                result = task_result["result"]
                i = task_result["index"]
                
                responses[key] = result["response"]
                response_metadata[key] = result.get("metadata", {})
                
                # Use thread_id from first response (index 0)
                if i == 0:
                    thread_id = result["thread_id"]
            
            # Create the response in the expected format for compatibility
            # responses now contains different HyDE-generated responses
            
            # Create sub_query entry using the primary response (query_A)
            sub_query = SubQuery(
                sub_query=request.query,
                sub_query_response=responses.get("query_A", ""),
                time_created=self.get_current_timestamp(),
                response_metadata=response_metadata
            )
            
            # Load existing thread or create new one for database persistence
            existing_thread = await self.get_thread(thread_id)
            
            if existing_thread:
                # Update existing thread
                existing_thread["sub_queries"].append(sub_query.dict())
                existing_thread["time_updated"] = self.get_current_timestamp()
                existing_thread["responses"] = responses
                
                # Add conversation context info
                existing_thread["metadata"] = existing_thread.get("metadata", {})
                existing_thread["metadata"].update({
                    "was_continuation": True,  # Multiple HyDE variants processed
                    "context_used": len(hyde_questions),
                    "hyde_questions_generated": len(hyde_questions),
                    "processing_method": "context_aware_hyde"
                })
                
                await self.save_thread(existing_thread)
                chat_response = ChatResponse(**existing_thread)
            else:
                # Create new thread
                new_thread = {
                    "thread_id": thread_id,
                    "query": request.query,
                    "responses": responses,
                    "sub_queries": [sub_query.dict()],
                    "time_created": self.get_current_timestamp(),
                    "time_updated": self.get_current_timestamp(),
                    "metadata": {
                        "user_id": user_id,
                        "provider": str(request.provider),
                        "model": request.model,
                        "total_interactions": 1,
                        "was_continuation": False,
                        "context_used": len(hyde_questions),
                        "hyde_questions_generated": len(hyde_questions),
                        "processing_method": "context_aware_hyde"
                    }
                }
                
                await self.save_thread(new_thread)
                chat_response = ChatResponse(**new_thread)
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"✅ Context-aware HyDE chat request processed (with parallel processing)", extra={
                "thread_id": thread_id,
                "total_duration": round(duration, 2),
                "parallel_duration": round(parallel_duration, 2),
                "hyde_questions_generated": len(hyde_questions),
                "responses_generated": len(responses),
                "parallel_efficiency": round((parallel_duration / duration) * 100, 1),
                "user_id": user_id
            })
            
            return chat_response
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to process context-aware chat request: {e}", extra={
                "duration": round(duration, 2),
                "user_id": user_id
            })
            
            # Fallback to original method
            logger.info("🔄 Falling back to original chat processing")
            return await self.process_chat_request_original(request, user_id)

    async def process_chat_request(self, request: ChatRequest, user_id: str) -> ChatResponse:
        """
        Process a chat request. Uses context-aware processing by default,
        falls back to original HyDE method if needed.
        """
        # Use the new context-aware processing
        return await self.process_chat_request_with_context(request, user_id)

    async def process_chat_request_original(self, request: ChatRequest, user_id: str) -> ChatResponse:
        """Process a complete chat request with HyDE expansion"""
        logger.info(f"🚀 Processing chat request (original)", extra={
            "thread_id": request.thread_id,
            "query_length": len(request.query),
            "provider": request.provider,
            "user_id": user_id
        })
        
        start_time = time.time()
        
        # Generate or use existing thread ID
        thread_id = request.thread_id or self.generate_thread_id()
        current_time = self.get_current_timestamp()
        
        try:
            # Step 1: Generate HyDE question variations
            questions = await self.generate_hyde_questions(
                request.query, 
                request.provider, 
                request.model
            )
            
            # Step 2: Generate responses for each question in parallel
            question_keys = ["query_A", "query_B", "query_C"]
            
            # Create parallel tasks for all questions
            async def generate_question_response(i: int, question: str, key: str):
                logger.debug(f"🎯 Generating response for {key}: {question[:50]}...")
                
                result = await self.generate_response(
                    question,
                    request.provider,
                    request.model,
                    request.temperature,
                    request.max_tokens
                )
                
                return {
                    "key": key,
                    "response": result["response"],
                    "metadata": result["metadata"]
                }
            
            # Execute all questions in parallel
            tasks = [
                generate_question_response(i, question, question_keys[i]) 
                for i, question in enumerate(questions)
            ]
            
            logger.info(f"🚀 Processing {len(tasks)} questions in parallel (original method)")
            parallel_start = time.time()
            parallel_results = await asyncio.gather(*tasks)
            parallel_duration = (time.time() - parallel_start) * 1000
            logger.success(f"✅ Parallel processing completed (original method)", extra={
                "parallel_duration": round(parallel_duration, 2),
                "questions_processed": len(tasks)
            })
            
            # Process results
            responses = {}
            response_metadata = {}
            
            for task_result in parallel_results:
                key = task_result["key"]
                responses[key] = task_result["response"]
                response_metadata[key] = task_result["metadata"]
            
            # Step 3: Create sub_query entry for this interaction
            sub_query = SubQuery(
                sub_query=request.query,
                sub_query_response=responses["query_A"],  # Default to first response
                time_created=current_time,
                response_metadata=response_metadata
            )
            
            # Step 4: Load existing thread or create new one
            existing_thread = await self.get_thread(thread_id)
            
            if existing_thread:
                # Update existing thread
                existing_thread["sub_queries"].append(sub_query.dict())
                existing_thread["time_updated"] = current_time
                existing_thread["responses"] = responses  # Update with latest responses
                
                # Save updated thread
                await self.save_thread(existing_thread)
                
                chat_response = ChatResponse(**existing_thread)
            else:
                # Create new thread
                new_thread = {
                    "thread_id": thread_id,
                    "query": request.query,
                    "responses": responses,
                    "sub_queries": [sub_query.dict()],
                    "time_created": current_time,
                    "time_updated": current_time,
                    "metadata": {
                        "user_id": user_id,
                        "provider": str(request.provider),
                        "model": request.model,
                        "total_interactions": 1
                    }
                }
                
                # Save new thread
                await self.save_thread(new_thread)
                
                chat_response = ChatResponse(**new_thread)
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"✅ Chat request processed (with parallel processing)", extra={
                "thread_id": thread_id,
                "total_duration": round(duration, 2),
                "parallel_duration": round(parallel_duration, 2),
                "questions_generated": len(questions),
                "responses_generated": len(responses),
                "parallel_efficiency": round((parallel_duration / duration) * 100, 1),
                "user_id": user_id
            })
            
            return chat_response
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to process chat request: {e}", extra={
                "thread_id": thread_id,
                "duration": round(duration, 2),
                "user_id": user_id
            })
            
            LoggerUtils.log_error_with_context(e, {
                "component": "bot_service",
                "operation": "process_chat_request",
                "thread_id": thread_id,
                "user_id": user_id,
                "duration": duration
            })
            
            raise Exception(f"Failed to process chat request: {str(e)}")

    async def get_thread(self, thread_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve a thread from CouchDB"""
        try:
            doc = self.threads_db[thread_id]
            logger.debug(f"📖 Retrieved thread: {thread_id}")
            return doc
        except Exception:
            logger.debug(f"🔍 Thread not found: {thread_id}")
            return None

    async def save_thread(self, thread_data: Dict[str, Any]) -> str:
        """Save a thread to CouchDB"""
        try:
            thread_id = thread_data["thread_id"]
            
            # Add/update CouchDB metadata
            if "_id" not in thread_data:
                thread_data["_id"] = thread_id
                
            # Save to database
            doc_id, doc_rev = self.threads_db.save(thread_data)
            
            logger.success(f"💾 Saved thread: {thread_id}")
            return doc_id
            
        except Exception as e:
            logger.error(f"❌ Failed to save thread: {e}")
            raise

    async def switch_response_preference(self, request: ResponseToggleRequest) -> Dict[str, Any]:
        """Mark a response as preferred in a thread"""
        try:
            thread = await self.get_thread(request.thread_id)
            if not thread:
                raise Exception("Thread not found")
            
            # Update metadata to track preferred responses
            if "preferences" not in thread["metadata"]:
                thread["metadata"]["preferences"] = {}
            
            thread["metadata"]["preferences"][request.response_key] = request.preferred
            thread["time_updated"] = self.get_current_timestamp()
            
            # Save updated thread
            await self.save_thread(thread)
            
            logger.info(f"⭐ Response preference updated", extra={
                "thread_id": request.thread_id,
                "response_key": request.response_key,
                "preferred": request.preferred
            })
            
            return {
                "success": True,
                "thread_id": request.thread_id,
                "response_key": request.response_key,
                "preferred": request.preferred
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to update response preference: {e}")
            raise Exception(f"Failed to update preference: {str(e)}")

    async def get_conversation_stats(self) -> Dict[str, Any]:
        """Get conversation management statistics"""
        try:
            stats = conversation_context_manager.get_stats()
            
            # Add additional stats from the conversation manager
            stats.update({
                "service": "bot_conversation_manager",
                "timestamp": self.get_current_timestamp(),
                "features": {
                    "context_aware_responses": True,
                    "relevance_scoring": True,
                    "thread_continuation": True,
                    "langgraph_workflow": True
                }
            })
            
            logger.info("📊 Conversation stats retrieved", extra=stats)
            return stats
            
        except Exception as e:
            logger.error(f"❌ Failed to get conversation stats: {e}")
            return {
                "error": str(e),
                "timestamp": self.get_current_timestamp()
            }

    async def list_user_threads(self, user_id: str, limit: int = 50, skip: int = 0) -> Dict[str, Any]:
        """List all conversation threads for a user"""
        try:
            # Query CouchDB for user's threads
            all_docs = self.threads_db.view('_all_docs', include_docs=True)
            
            user_threads = []
            for row in all_docs:
                doc = row.doc
                if doc.get("metadata", {}).get("user_id") == user_id:
                    # Return summary info for listing
                    thread_summary = {
                        "thread_id": doc["thread_id"],
                        "query": doc["query"],
                        "time_created": doc["time_created"],
                        "time_updated": doc["time_updated"],
                        "interaction_count": len(doc.get("sub_queries", [])),
                        "last_interaction": doc.get("sub_queries", [])[-1] if doc.get("sub_queries") else None
                    }
                    user_threads.append(thread_summary)
            
            # Sort by time_updated (most recent first)
            user_threads.sort(key=lambda x: x["time_updated"], reverse=True)
            
            # Apply pagination
            paginated_threads = user_threads[skip:skip + limit]
            
            return {
                "threads": paginated_threads,
                "total": len(user_threads),
                "limit": limit,
                "skip": skip,
                "has_more": skip + limit < len(user_threads)
            }
            
        except Exception as e:
            logger.error(f"❌ List threads error: {e}")
            raise Exception(f"Failed to list threads: {str(e)}")
