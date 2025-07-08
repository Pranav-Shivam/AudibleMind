import ollama
import re
from tqdm import tqdm
import time
import ast

class OllamaConnector:
    def __init__(self, model_name: str = "deepseek-r1:7b"):
        self.model_name = model_name
        self.client = ollama.Client()

    def make_ollama_call(self, system_prompt: str, temperature: float = 0.3, max_tokens: int = 1000) -> str:
        try:
            response = self.client.chat(
                model=self.model_name, 
                messages=[{'role': 'system', 'content': system_prompt}],
                options={
                    'temperature': temperature,
                    'top_p': 0.9,
                    'max_tokens': max_tokens,
                }
            )
            return response['message']['content'].strip()
        except Exception as e:
            print(f"Error in Ollama call: {e}")
            return f"[Error: {e}]"