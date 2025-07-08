import ollama
import textwrap
import re
from typing import List, Optional
import time
from core.prompt.prompt import PromptManager
from core.ollama_setup.connector import OllamaConnector
from core.text_processing import TextProcessing

class PDFSummarizer:
    def __init__(self, model_name: str = "llama3:8b-instruct-q4_K_M"):
        self.model_name = model_name
        self.ollama_connector = OllamaConnector(model_name)
        self.prompt_manager = PromptManager()
        self.text_processing = TextProcessing()
        # Test connection and model availability
        try:
            self.ollama_connector.client.list()
            print(f"✓ Connected to Ollama successfully")
            print(f"✓ Using model: {model_name}")
        except Exception as e:
            print(f"✗ Error connecting to Ollama: {e}")
            print("Make sure Ollama is running and the model is available")
            raise
    
    
    
    def summarize_chunk(self, chunk: str, user_prompt: str, chunk_index: int, total_chunks: int) -> str:
        system_prompt = f"""This is chunk {chunk_index + 1} of {total_chunks} from a larger document""" + self.prompt_manager.get_chunk_summary_prompt(chunk)
        
        summary = self.ollama_connector.make_ollama_call(system_prompt, temperature=0.3, max_tokens=1000)
        print(summary)
        return summary
    
    def create_final_summary(self, chunk_summaries: List[str], user_prompt: str, target_length: str = "2 pages") -> str:
        combined_summaries = "\n\n".join(chunk_summaries)
        final_summary_prompt = self.prompt_manager.get_final_summary_prompt(combined_summaries)
        
        summary = self.ollama_connector.make_ollama_call(final_summary_prompt, temperature=0.2, max_tokens=2000)
        print(summary)
        return summary
    
    def summarize_document(self, 
                          text: str, 
                          user_prompt: str, 
                          target_length: str = "2 pages",
                          chunk_size: int = 2500) -> str:

        print("🔄 Starting document summarization...")
        
        # Clean the text
        print("📝 Cleaning text...")
        cleaned_text = self.text_processing.clean_text(text)
        print(f"✓ Text cleaned. Length: {len(cleaned_text):,} characters")
        
        # Chunk the text
        print("✂️ Chunking text...")
        chunks = self.text_processing.chunk_text(cleaned_text, chunk_size)
        print(f"✓ Created {len(chunks)} chunks")
        
        # Summarize each chunk
        print("🔄 Summarizing chunks...")
        chunk_summaries = []
        
        for i, chunk in enumerate(chunks):
            print(f"  Processing chunk {i+1}/{len(chunks)}...")
            summary = self.summarize_chunk(chunk, user_prompt, i, len(chunks))
            chunk_summaries.append(summary)
            time.sleep(0.5)  # Brief pause to avoid overwhelming the model
        
        print("✓ All chunks summarized")
        
        # Create final summary
        print("📋 Creating final summary...")
        final_summary = self.create_final_summary(chunk_summaries, user_prompt, target_length)
        print("✅ Summary complete!")
        
        return final_summary
