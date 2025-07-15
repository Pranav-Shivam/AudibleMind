import ollama
import re
from tqdm import tqdm
import time
import ast
import tiktoken
from core.logger import logger, LoggerUtils

class OllamaConnector:
    def __init__(self, model_name: str = None):
        from core import configuration
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

    def make_ollama_call(self, system_prompt: str, temperature: float = 0.3, max_tokens: int = 1000) -> str:
        start_time = time.time()
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
            return f"[Error: {e}]"
    
    def count_tokens(self, text: str, model: str = "gpt-3.5-turbo") -> int:

        try:
            enc = tiktoken.encoding_for_model(model)
        except KeyError:
            # Fallback to a base tokenizer if model not supported
            enc = tiktoken.get_encoding("cl100k_base")
        tokens = enc.encode(text)
        return len(tokens)
    