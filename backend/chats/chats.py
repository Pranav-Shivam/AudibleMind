import json
import requests
import time
from typing import List, Dict, Union, Optional
from enum import Enum
from abc import ABC, abstractmethod
from datetime import datetime
from core import configuration
from core.logger import logger, LoggerUtils
from core.utils.bundle_service import BundleService
config = configuration.config

class Role(Enum):
    PRANAV = "Pranav"
    SHIVAM = "Shivam"
    PREM = "Prem"

class ConversationTurn:
    def __init__(self, speaker: Role, text: str, complexity_level: str = None, timestamp: str = None):
        self.speaker = speaker
        self.text = text
        self.complexity_level = complexity_level
        self.timestamp = timestamp or datetime.now().isoformat()

    def __str__(self):
        return f"{self.speaker.value}: {self.text}"

    def to_dict(self) -> Dict:
        return {
            "speaker": self.speaker.value,
            "text": self.text,
            "complexity_level": self.complexity_level,
            "timestamp": self.timestamp
        }

class LLMClient(ABC):
    @abstractmethod
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 500) -> str:
        pass

    @abstractmethod
    def chat_completion(self, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 500) -> str:
        pass

    @abstractmethod
    def test_connection(self) -> bool:
        """Test if the LLM client can connect to the service"""
        pass

class OpenAIClient(LLMClient):
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://api.openai.com/v1"
        
        logger.info(f"🤖 Initializing OpenAI client with model: {model}")

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 500) -> str:
        messages = [{"role": "user", "content": prompt}]
        return self.chat_completion(messages, temperature, max_tokens)

    def chat_completion(self, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 500) -> str:
        start_time = time.time()
        prompt_tokens = sum(len(msg.get("content", "").split()) for msg in messages)
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        logger.info(f"🚀 Sending OpenAI request", extra={
            "model": self.model,
            "message_count": len(messages),
            "estimated_tokens": prompt_tokens,
            "temperature": temperature,
            "max_tokens": max_tokens
        })
        
        try:
            response = requests.post(f"{self.base_url}/chat/completions", headers=headers, json=data, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            response_content = result["choices"][0]["message"]["content"]
            
            duration = (time.time() - start_time) * 1000
            usage = result.get("usage", {})
            
            LoggerUtils.log_llm_operation(
                provider="openai",
                model=self.model,
                tokens=usage.get("total_tokens", prompt_tokens),
                duration=duration,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            logger.success(f"✅ OpenAI request completed successfully", extra={
                "duration": round(duration, 2),
                "total_tokens": usage.get("total_tokens", 0),
                "response_length": len(response_content)
            })
            
            return response_content
            
        except requests.exceptions.RequestException as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ OpenAI API request failed: {str(e)}", extra={
                "duration": round(duration, 2),
                "model": self.model,
                "error_type": type(e).__name__
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "openai_client",
                "model": self.model,
                "duration": duration,
                "estimated_tokens": prompt_tokens
            })
            raise Exception(f"OpenAI API request failed: {str(e)}")

    def test_connection(self) -> bool:
        """Test OpenAI API connection"""
        start_time = time.time()
        try:
            logger.info("🔍 Testing OpenAI API connection")
            response = requests.get(f"{self.base_url}/models", headers={"Authorization": f"Bearer {self.api_key}"}, timeout=10)
            duration = (time.time() - start_time) * 1000
            
            is_connected = response.status_code == 200
            if is_connected:
                logger.success(f"✅ OpenAI connection test successful", extra={"duration": round(duration, 2)})
            else:
                logger.error(f"❌ OpenAI connection test failed - Status: {response.status_code}", extra={"duration": round(duration, 2)})
            
            return is_connected
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ OpenAI connection test failed: {e}", extra={"duration": round(duration, 2)})
            LoggerUtils.log_error_with_context(e, {"component": "openai_connection_test", "duration": duration})
            return False

class OllamaConnector:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or config.ollama.model
        logger.info(f"🦙 Initializing Ollama connector with model: {self.model_name}")
        
        try:
            import ollama
            self.client = ollama.Client()
            logger.success("✅ Ollama client initialized successfully")
        except ImportError as e:
            logger.error("❌ Ollama library not found. Please install it with: pip install ollama")
            LoggerUtils.log_error_with_context(e, {"component": "ollama_import"})
            raise ImportError("Ollama library not found. Please install it with: pip install ollama")

    def make_ollama_call(self, system_prompt: str, temperature: float = None, max_tokens: int = None) -> str:
        start_time = time.time()
        # Use configuration defaults if not provided
        temperature = temperature or config.ollama.temperature
        max_tokens = max_tokens or config.ollama.max_tokens
        
        prompt_tokens = len(system_prompt.split())
        
        logger.info(f"🚀 Making Ollama call", extra={
            "model": self.model_name,
            "estimated_tokens": prompt_tokens,
            "temperature": temperature,
            "max_tokens": max_tokens
        })
        
        try:
            response = self.client.chat(
                model=self.model_name, 
                messages=[{'role': 'system', 'content': system_prompt}],
                options={
                    'temperature': temperature,
                    'top_p': config.ollama.top_p,
                    'max_tokens': max_tokens,
                }
            )
            
            result = response['message']['content'].strip()
            duration = (time.time() - start_time) * 1000
            
            LoggerUtils.log_llm_operation(
                provider="ollama",
                model=self.model_name,
                tokens=prompt_tokens,  # Ollama doesn't provide token counts
                duration=duration,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            logger.success(f"✅ Ollama call completed successfully", extra={
                "duration": round(duration, 2),
                "response_length": len(result)
            })
            
            return result
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Error in Ollama call: {e}", extra={
                "duration": round(duration, 2),
                "model": self.model_name,
                "error_type": type(e).__name__
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "ollama_call",
                "model": self.model_name,
                "duration": duration,
                "estimated_tokens": prompt_tokens
            })
            return f"[Error: {e}]"

    def test_connection(self) -> bool:
        """Test Ollama connection"""
        start_time = time.time()
        try:
            logger.info("🔍 Testing Ollama connection")
            models = self.client.list()
            duration = (time.time() - start_time) * 1000
            
            available_models = [model['name'] for model in models['models']]
            is_available = any(model['name'] == self.model_name for model in models['models'])
            
            if is_available:
                logger.success(f"✅ Ollama connection test successful - Model {self.model_name} available", 
                              extra={"duration": round(duration, 2), "available_models": len(available_models)})
            else:
                logger.error(f"❌ Model {self.model_name} not found in Ollama", 
                           extra={"duration": round(duration, 2), "available_models": available_models})
            
            return is_available
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Ollama connection test failed: {e}", extra={"duration": round(duration, 2)})
            LoggerUtils.log_error_with_context(e, {"component": "ollama_connection_test", "duration": duration})
            return False

class LocalLLMClient(LLMClient):
    def __init__(self, model_name: str = None):
        logger.info(f"🔧 Initializing Local LLM client with model: {model_name}")
        self.ollama_connector = OllamaConnector(model_name)

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 500) -> str:
        logger.debug(f"🎯 Local LLM generate call", extra={"prompt_length": len(prompt)})
        return self.ollama_connector.make_ollama_call(prompt, temperature, max_tokens)

    def chat_completion(self, messages: List[Dict], temperature: float = 0.7, max_tokens: int = 500) -> str:
        # Convert messages to a single prompt for Ollama
        prompt = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        logger.debug(f"🎯 Local LLM chat completion", extra={
            "message_count": len(messages),
            "total_prompt_length": len(prompt)
        })
        return self.generate(prompt, temperature, max_tokens)

    def test_connection(self) -> bool:
        """Test local LLM connection"""
        logger.info("🔍 Testing Local LLM connection")
        result = self.ollama_connector.test_connection()
        return result

class DialogueManager:
    def __init__(self, max_history_tokens: int = 1000):
        self.history_buffer: List[str] = []
        self.current_context: str = ""
        self.max_history_tokens = max_history_tokens

    def update_context(self, new_utterance: str):
        self.history_buffer.append(new_utterance)
        # Keep only the last 5 utterances to maintain context
        self.current_context = " ".join(self.history_buffer[-5:])

    def get_current_context(self) -> str:
        return self.current_context

    def clear_history(self):
        """Clear conversation history"""
        self.history_buffer = []
        self.current_context = ""

class ContentProcessor:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def generate_layered_explanation(self, technical_paragraph: str, pranav_persona_desc: str) -> str:
        prompt = self._get_pranav_initial_explanation_prompt(technical_paragraph, pranav_persona_desc)
        return self.llm_client.generate(prompt)

    def _get_pranav_initial_explanation_prompt(self, paragraph: str, pranav_description: str) -> str:
        return f"""You are Pranav, an expert and PhD scholar explaining complex technical concepts.
Your goal is to provide a comprehensive yet layered explanation of the following paragraph.
Start with a high-level analogy, then explain the core concept in simple terms, and finally delve into key technical details.
Ensure your explanation covers all essential information from the paragraph, anticipating basic and advanced questions.

Technical Paragraph: \"\"\"{paragraph}\"\"\"

Your explanation (Pranav):
"""

class Persona(ABC):
    def __init__(self, name: str, description: str, target_audience: str):
        self.name = name
        self.description = description
        self.target_audience = target_audience

    @abstractmethod
    def generate_question(self, llm_client: LLMClient, current_context: str, conversation_history: List[ConversationTurn]) -> str:
        pass

    def update_description(self, new_description: str):
        """Update the persona description"""
        self.description = new_description

class PranavPersona(Persona):
    def __init__(self):
        super().__init__("Pranav", "The expert and explainer (e.g., OpenAI researcher, PhD scholar). Provides layered, detailed, and analogy-rich explanations.", "all")

    def generate_tailored_answer(self, llm_client: LLMClient, question: str, context: str, history: List[ConversationTurn], target_audience: str) -> str:
        prompt = self._get_pranav_tailored_answer_prompt(
            persona_description=self.description,
            question=question,
            context=context,
            conversation_history=[f"{t.speaker.value}: {t.text}" for t in history],
            target_audience=target_audience
        )
        return llm_client.generate(prompt)

    def generate_question(self, llm_client: LLMClient, current_context: str, conversation_history: List[ConversationTurn]) -> str:
        return ""

    def _get_pranav_tailored_answer_prompt(self, persona_description: str, question: str, context: str, conversation_history: List[str], target_audience: str) -> str:
        history_str = "\n".join(conversation_history[-5:]) if conversation_history else "No prior conversation."
        audience_instruction = ""
        if target_audience == "10-year-old beginner":
            audience_instruction = "Use simple language, relatable analogies, and avoid jargon. Break down complex ideas into easy-to-understand parts."
        elif target_audience == "advanced learner/aspiring PhD":
            audience_instruction = "Provide a technically accurate and detailed explanation. You can use specific terminology and compare it to related concepts where appropriate."

        return f"""You are Pranav, an expert and PhD scholar, explaining technical concepts.
Your persona is: {persona_description}
The current question is from a learner whose profile is: "{target_audience}".
{audience_instruction}

Question from learner: \"\"\"{question}\"\"\"
Current explanation context: \"\"\"{context}\"\"\"
Conversation so far:
{history_str}

Your tailored answer (Pranav):
"""

class ShivamPersona(Persona):
    def __init__(self, custom_description: str = None):
        default_description = "A 10-year-old learner or a complete beginner. Curious, often confused, and needs foundational clarity. Questions focus on basic understanding, 'why' and 'how' in simple terms."
        super().__init__("Shivam", custom_description or default_description, "10-year-old beginner")

    def generate_question(self, llm_client: LLMClient, current_context: str, conversation_history: List[ConversationTurn]) -> str:
        prompt = self._get_shivam_question_prompt(
            persona_description=self.description,
            current_context=current_context,
            conversation_history=[f"{t.speaker.value}: {t.text}" for t in conversation_history]
        )
        return llm_client.generate(prompt)

    def _get_shivam_question_prompt(self, persona_description: str, current_context: str, conversation_history: List[str]) -> str:
        history_str = "\n".join(conversation_history[-5:]) if conversation_history else "No prior conversation."
        return f"""You are Shivam, a curious learner. Your goal is to ask a basic, foundational question about the concept being explained.
Your persona description: {persona_description}
Focus on clarifying something you don't understand, asking 'why' or 'how' in simple terms, or relating it to something you know.
Avoid complex jargon. Ask only ONE question.

Here's the current explanation context: \"\"\"{current_context}\"\"\"
Conversation so far:
{history_str}

Your question (Shivam):
"""

class PremPersona(Persona):
    def __init__(self, custom_description: str = None):
        default_description = "An aspiring PhD or advanced learner with a technical background. Questions focus on deeper understanding, model internals, edge cases, comparative insights, and theoretical underpinnings."
        super().__init__("Prem", custom_description or default_description, "advanced learner/aspiring PhD")

    def generate_question(self, llm_client: LLMClient, current_context: str, conversation_history: List[ConversationTurn]) -> str:
        prompt = self._get_prem_question_prompt(
            persona_description=self.description,
            current_context=current_context,
            conversation_history=[f"{t.speaker.value}: {t.text}" for t in conversation_history]
        )
        return llm_client.generate(prompt)

    def _get_prem_question_prompt(self, persona_description: str, current_context: str, conversation_history: List[str]) -> str:
        history_str = "\n".join(conversation_history[-5:]) if conversation_history else "No prior conversation."
        return f"""You are Prem, an advanced learner with a technical background. Your goal is to ask a deep, insightful question about the concept.
Your persona description: {persona_description}
Focus on model internals, edge cases, comparative insights with other models/techniques, theoretical implications, or complex 'how' and 'why' aspects.
Assume a good foundational understanding from Pranav's explanation. Ask only ONE question.

Here's the current explanation context: \"\"\"{current_context}\"\"\"
Conversation so far:
{history_str}

Your question (Prem):
"""

class EducationConversationSystem:
    def __init__(self, llm_client: LLMClient, max_turns_per_learner: int = 3, 
                 include_shivam: bool = True, include_prem: bool = True,
                 shivam_description: str = None, prem_description: str = None):
        
        logger.info(f"🎓 Initializing EducationConversationSystem", extra={
            "max_turns_per_learner": max_turns_per_learner,
            "include_shivam": include_shivam,
            "include_prem": include_prem,
            "llm_client_type": type(llm_client).__name__
        })
        
        self.llm_client = llm_client
        self.content_processor = ContentProcessor(llm_client)
        self.dialogue_manager = DialogueManager(config.processing.max_history_tokens)
        self.pranav = PranavPersona()
        self.shivam = ShivamPersona(shivam_description) if include_shivam else None
        self.prem = PremPersona(prem_description) if include_prem else None
        self.max_turns_per_learner = max_turns_per_learner
        self.conversation_history: List[ConversationTurn] = []
        self.include_shivam = include_shivam
        self.include_prem = include_prem
        
        # Log persona setup
        personas = ["Pranav"]
        if self.shivam:
            personas.append("Shivam")
        if self.prem:
            personas.append("Prem")
        
        logger.info(f"👥 Active personas: {', '.join(personas)}", extra={"personas": personas})

    def generate_conversation(self, technical_paragraph: str, 
                            shivam_questions: List[str] = None, 
                            prem_questions: List[str] = None,
                            num_questions_per_learner: int = None,
                            direct_mode: bool = False,
                            bundle_id: str = None,
                            bundle_index: int = None,
                            bundle_text: str = None) -> List[ConversationTurn]:
        """Generate a complete educational conversation with user-provided or auto-generated questions"""
        start_time = time.time()
        
        logger.info(f"🚀 Starting conversation generation", extra={
            "paragraph_length": len(technical_paragraph),
            "direct_mode": direct_mode,
            "shivam_questions_provided": len(shivam_questions) if shivam_questions else 0,
            "prem_questions_provided": len(prem_questions) if prem_questions else 0,
            "num_questions_per_learner": num_questions_per_learner or self.max_turns_per_learner
        })
        
        self.conversation_history = []
        self.dialogue_manager.clear_history()
        
        # Use provided number of questions or default to max_turns_per_learner
        num_questions = num_questions_per_learner or self.max_turns_per_learner
        
        try:
            # Initial explanation from Pranav
            logger.info("📝 Generating initial explanation from Pranav")
            explanation_start = time.time()
            
            pranav_initial_explanation = self.content_processor.generate_layered_explanation(
                technical_paragraph, self.pranav.description
            )
            
            explanation_duration = (time.time() - explanation_start) * 1000
            logger.success(f"✅ Initial explanation generated", extra={
                "duration": round(explanation_duration, 2),
                "explanation_length": len(pranav_initial_explanation)
            })
            
            self.add_turn(Role.PRANAV, pranav_initial_explanation)
            self.dialogue_manager.update_context(pranav_initial_explanation)

            # If in direct mode, enhance with bundle context if available
            if direct_mode:
                logger.info("🎯 Direct mode: Enhancing with bundle context")
                
                # Add bundle context if available
                if bundle_id:
                    try:
                        # Initialize bundle service
                        bundle_service = BundleService()
                        
                        # Get bundle summary
                        logger.info(f"📦 Retrieving bundle summary for bundle_id: {bundle_id}")
                        bundle_summary = bundle_service.get_bundle_summary_by_bundle_id(bundle_id)
                        
                        
                        if bundle_summary:
                            # Add bundle context to conversation history
                            bundle_context = f"📚 Bundle Context (Bundle {bundle_index or 'Unknown'}): {bundle_summary}"
                            self.add_turn(Role.PRANAV, bundle_context)
                            self.dialogue_manager.update_context(bundle_context)
                            
                            logger.info(f"✅ Bundle context added to conversation", extra={
                                "bundle_id": bundle_id,
                                "bundle_text": bundle_text,
                                "bundle_summary": bundle_summary,
                                "bundle_index": bundle_index,
                                "summary_length": len(bundle_summary)
                            })
                        else:
                            logger.warning(f"⚠️ No bundle summary found for bundle_id: {bundle_id}")
                            
                    except Exception as e:
                        logger.error(f"❌ Error retrieving bundle context: {str(e)}", extra={
                            "bundle_id": bundle_id,
                            "error": str(e)
                        })
                        # Continue without bundle context if there's an error
                
                total_duration = (time.time() - start_time) * 1000
                logger.success(f"🎉 Direct mode conversation completed", extra={
                    "total_turns": len(self.conversation_history),
                    "total_duration": round(total_duration, 2),
                    "bundle_context_included": bundle_id is not None
                })
                return self.conversation_history

            # Process questions for each learner
            for i in range(num_questions):
                turn_start = time.time()
                logger.info(f"🔄 Generating conversation turn {i+1}/{num_questions}")
                
                # Handle Shivam's questions and answers (if included)
                if self.include_shivam and self.shivam:
                    logger.debug(f"💭 Processing Shivam (beginner) interaction")
                    
                    # Use user-provided question or generate one
                    if shivam_questions and i < len(shivam_questions):
                        shivam_question = shivam_questions[i].strip()
                        logger.info(f"📋 Using user-provided Shivam question: {shivam_question[:50]}...")
                    else:
                        # Generate concise one-liner question based on persona
                        question_start = time.time()
                        shivam_question = self._generate_pranav_led_question_for_shivam(
                            technical_paragraph, self.dialogue_manager.get_current_context()
                        )
                        question_duration = (time.time() - question_start) * 1000
                        logger.info(f"🤔 Generated Pranav-led question for Shivam", extra={
                            "question_preview": shivam_question[:50],
                            "duration": round(question_duration, 2)
                        })
                    
                    self.add_turn(Role.SHIVAM, shivam_question)

                    # Generate Pranav's answer to Shivam
                    answer_start = time.time()
                    pranav_answer_shivam = self.pranav.generate_tailored_answer(
                        self.llm_client, shivam_question, self.dialogue_manager.get_current_context(),
                        self.conversation_history, self.shivam.target_audience
                    )
                    answer_duration = (time.time() - answer_start) * 1000
                    logger.debug(f"💡 Pranav answered Shivam", extra={
                        "answer_length": len(pranav_answer_shivam),
                        "duration": round(answer_duration, 2)
                    })
                    
                    self.add_turn(Role.PRANAV, pranav_answer_shivam)
                    self.dialogue_manager.update_context(pranav_answer_shivam)

                # Handle Prem's questions and answers (if included)
                if self.include_prem and self.prem:
                    logger.debug(f"🧠 Processing Prem (advanced) interaction")
                    
                    # Use user-provided question or generate one
                    if prem_questions and i < len(prem_questions):
                        prem_question = prem_questions[i].strip()
                        logger.info(f"📋 Using user-provided Prem question: {prem_question[:50]}...")
                    else:
                        # Generate concise one-liner question based on persona
                        question_start = time.time()
                        prem_question = self._generate_pranav_led_question_for_prem(
                            technical_paragraph, self.dialogue_manager.get_current_context()
                        )
                        question_duration = (time.time() - question_start) * 1000
                        logger.info(f"🎯 Generated Pranav-led question for Prem", extra={
                            "question_preview": prem_question[:50],
                            "duration": round(question_duration, 2)
                        })
                    
                    self.add_turn(Role.PREM, prem_question)

                    # Generate Pranav's answer to Prem
                    answer_start = time.time()
                    pranav_answer_prem = self.pranav.generate_tailored_answer(
                        self.llm_client, prem_question, self.dialogue_manager.get_current_context(),
                        self.conversation_history, self.prem.target_audience
                    )
                    answer_duration = (time.time() - answer_start) * 1000
                    logger.debug(f"🔬 Pranav answered Prem", extra={
                        "answer_length": len(pranav_answer_prem),
                        "duration": round(answer_duration, 2)
                    })
                    
                    self.add_turn(Role.PRANAV, pranav_answer_prem)
                    self.dialogue_manager.update_context(pranav_answer_prem)
                
                turn_duration = (time.time() - turn_start) * 1000
                logger.info(f"✅ Completed turn {i+1}/{num_questions}", extra={
                    "turn_duration": round(turn_duration, 2),
                    "total_turns_so_far": len(self.conversation_history)
                })

            total_duration = (time.time() - start_time) * 1000
            logger.success(f"🎉 Conversation generation completed successfully", extra={
                "total_turns": len(self.conversation_history),
                "total_duration": round(total_duration, 2),
                "turns_per_second": round(len(self.conversation_history) / (total_duration / 1000), 2)
            })
            
            LoggerUtils.log_performance("conversation_generation", total_duration,
                                      turns_generated=len(self.conversation_history),
                                      num_questions=num_questions,
                                      include_shivam=self.include_shivam,
                                      include_prem=self.include_prem)
            
            return self.conversation_history
            
        except Exception as e:
            total_duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Error during conversation generation: {str(e)}", extra={
                "duration": round(total_duration, 2),
                "turns_completed": len(self.conversation_history)
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "conversation_generation",
                "duration": total_duration,
                "turns_completed": len(self.conversation_history),
                "paragraph_length": len(technical_paragraph)
            })
            raise

    def _generate_pranav_led_question_for_shivam(self, technical_paragraph: str, current_context: str) -> str:
        """Generate a concise one-liner question that Pranav would ask to guide Shivam's learning"""
        prompt = f"""You are Pranav, an expert teacher. You need to generate ONE concise, simple question that would help a beginner (Shivam) understand the concept better.

The question should:
- Be simple and foundational
- Help clarify basic concepts
- Be appropriate for a 10-year-old or complete beginner
- Be only ONE short question (not multiple questions)
- Focus on 'why' or 'how' in simple terms

Original topic: "{technical_paragraph}"
Current explanation context: "{current_context}"

Generate a simple question that Shivam (beginner) might ask:
"""
        return self.llm_client.generate(prompt, temperature=0.7, max_tokens=100).strip()

    def _generate_pranav_led_question_for_prem(self, technical_paragraph: str, current_context: str) -> str:
        """Generate a concise one-liner question that Pranav would ask to guide Prem's advanced learning"""
        prompt = f"""You are Pranav, an expert teacher. You need to generate ONE concise, technical question that would help an advanced learner (Prem) dive deeper into the concept.

The question should:
- Be technically sophisticated
- Focus on deeper understanding, model internals, or edge cases
- Be appropriate for an aspiring PhD or advanced learner
- Be only ONE short question (not multiple questions)
- Explore theoretical implications or comparative insights

Original topic: "{technical_paragraph}"
Current explanation context: "{current_context}"

Generate an advanced question that Prem (advanced learner) might ask:
"""
        return self.llm_client.generate(prompt, temperature=0.7, max_tokens=100).strip()

    def add_turn(self, speaker: Role, text: str):
        """Add a conversation turn with timestamp"""
        turn = ConversationTurn(speaker, text)
        self.conversation_history.append(turn)
        logger.debug(f"➕ Added turn: {speaker.value}", extra={
            "speaker": speaker.value,
            "text_length": len(text),
            "total_turns": len(self.conversation_history)
        })

    def update_persona_descriptions(self, shivam_description: str = None, prem_description: str = None):
        """Update persona descriptions"""
        updates = []
        if shivam_description and self.shivam:
            self.shivam.update_description(shivam_description)
            updates.append("Shivam")
        if prem_description and self.prem:
            self.prem.update_description(prem_description)
            updates.append("Prem")
        
        if updates:
            logger.info(f"🔄 Updated persona descriptions: {', '.join(updates)}", extra={"updated_personas": updates})

    def save_conversation(self, filename: str):
        """Save conversation to JSON file"""
        start_time = time.time()
        try:
            conversation_data = [turn.to_dict() for turn in self.conversation_history]
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(conversation_data, f, indent=2, ensure_ascii=False)
            
            duration = (time.time() - start_time) * 1000
            file_size = len(json.dumps(conversation_data))
            
            logger.success(f"💾 Conversation saved successfully", extra={
                "filename": filename,
                "turns": len(self.conversation_history),
                "file_size_bytes": file_size,
                "duration": round(duration, 2)
            })
            
            LoggerUtils.log_file_operation("save", filename, file_size, duration)
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to save conversation: {str(e)}", extra={
                "filename": filename,
                "duration": round(duration, 2)
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "conversation_save",
                "filename": filename,
                "duration": duration
            })
            raise

    def load_conversation(self, filename: str):
        """Load conversation from JSON file"""
        start_time = time.time()
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                conversation_data = json.load(f)
            
            self.conversation_history = []
            for turn_data in conversation_data:
                speaker = Role(turn_data["speaker"])
                turn = ConversationTurn(
                    speaker, 
                    turn_data["text"], 
                    turn_data.get("complexity_level"),
                    turn_data.get("timestamp")
                )
                self.conversation_history.append(turn)
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"📁 Conversation loaded successfully", extra={
                "filename": filename,
                "turns": len(self.conversation_history),
                "duration": round(duration, 2)
            })
            
            LoggerUtils.log_file_operation("load", filename, duration=duration)
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to load conversation: {str(e)}", extra={
                "filename": filename,
                "duration": round(duration, 2)
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "conversation_load",
                "filename": filename,
                "duration": duration
            })
            raise

    def get_conversation_summary(self) -> Dict:
        """Get a summary of the conversation"""
        if not self.conversation_history:
            return {"message": "No conversation available"}
        
        return {
            "total_turns": len(self.conversation_history),
            "speakers": list(set(turn.speaker.value for turn in self.conversation_history)),
            "first_turn": self.conversation_history[0].to_dict() if self.conversation_history else None,
            "last_turn": self.conversation_history[-1].to_dict() if self.conversation_history else None
        }

# This module can be imported by FastAPI or used standalone