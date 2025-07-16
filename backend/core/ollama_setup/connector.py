import ollama
import re
from tqdm import tqdm
import time
import ast
import tiktoken
from core.logger import logger, LoggerUtils
from core import configuration
from typing import List

class OllamaConnector:
    def __init__(self, model_name: str = None):
        self.model_name = model_name or configuration.config.ollama.model
        
        logger.info(f"🦙 Initializing Ollama connector for model: {self.model_name}")
        start_time = time.time()
        
        try:
            self.client = ollama.Client()
            init_duration = (time.time() - start_time) * 1000
            
            logger.success(f"✅ Ollama connector initialized", extra={
                "model": self.model_name,
                "init_duration": round(init_duration, 2)
            })
        except Exception as e:
            init_duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to initialize Ollama connector: {e}", extra={
                "model": self.model_name,
                "init_duration": round(init_duration, 2)
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "ollama_connector_init",
                "model": self.model_name,
                "duration": init_duration
            })
            raise

    def make_ollama_call(self, system_prompt: str, temperature: float = None, max_tokens: int = None) -> str:
        start_time = time.time()
        
        # Use configuration defaults if not provided
        temperature = temperature or configuration.config.ollama.temperature
        max_tokens = max_tokens or configuration.config.ollama.max_tokens
        
        prompt_tokens = len(system_prompt.split())
        
        logger.debug(f"🚀 Making Ollama call", extra={
            "model": self.model_name,
            "prompt_length": len(system_prompt),
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
                    'top_p': configuration.config.ollama.top_p,
                    'max_tokens': max_tokens,
                    'num_ctx': configuration.config.ollama.num_ctx
                }
            )
            
            result = response['message']['content'].strip()
            duration = (time.time() - start_time) * 1000
            
            logger.success(f"✅ Ollama call completed", extra={
                "model": self.model_name,
                "duration": round(duration, 2),
                "response_length": len(result),
                "estimated_tokens": prompt_tokens
            })
            
            LoggerUtils.log_llm_operation("ollama", self.model_name, prompt_tokens, duration)
            
            return result
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Ollama call failed: {e}", extra={
                "model": self.model_name,
                "duration": round(duration, 2),
                "prompt_length": len(system_prompt),
                "error_type": type(e).__name__
            })
            
            LoggerUtils.log_error_with_context(e, {
                "component": "ollama_call",
                "model": self.model_name,
                "duration": duration,
                "prompt_length": len(system_prompt)
            })
            
            return f"Error generating summary: {str(e)}"

    def count_tokens(self, text: str) -> int:
        """Count tokens in text using tiktoken (approximation for Ollama models)"""
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            return len(encoding.encode(text))
        except Exception as e:
            logger.warning(f"⚠️ Token counting failed, using word approximation: {e}")
            return len(text.split()) * 1.3  # Rough approximation

    def chunk_text_by_tokens(self, text: str, max_tokens: int = 3000, overlap: int = 200) -> List[str]:
        """Split text into chunks based on token count"""
        try:
            encoding = tiktoken.get_encoding("cl100k_base")
            tokens = encoding.encode(text)
            
            chunks = []
            start = 0
            
            while start < len(tokens):
                end = min(start + max_tokens, len(tokens))
                chunk_tokens = tokens[start:end]
                chunk_text = encoding.decode(chunk_tokens)
                chunks.append(chunk_text)
                
                # Move start position with overlap
                start = end - overlap
                if start >= len(tokens):
                    break
                    
            logger.info(f"📝 Text chunked into {len(chunks)} chunks by tokens")
            return chunks
            
        except Exception as e:
            logger.error(f"❌ Token-based chunking failed: {e}")
            # Fallback to word-based chunking
            words = text.split()
            chunk_size = max_tokens // 1.3  # Rough word-to-token ratio
            chunks = []
            
            for i in range(0, len(words), int(chunk_size)):
                chunk = ' '.join(words[i:i + int(chunk_size)])
                chunks.append(chunk)
                
            return chunks 