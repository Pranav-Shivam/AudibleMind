import requests
import time
from core.logger import logger, LoggerUtils
from core.configuration import config
from typing import List, Dict

class OpenAIClient():
    def __init__(self, api_key: str, model: str = None):
        self.api_key = api_key
        self.model = model or config.openai.model
        self.base_url = "https://api.openai.com/v1"
        self.provider = "openai"
        
        logger.info(f"🤖 Initializing OpenAI client with model: {self.model}")

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