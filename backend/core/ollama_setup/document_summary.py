import ollama
import textwrap
import re
from typing import List, Optional
import time
from core.prompt.prompt import PromptManager
from core.ollama_setup.connector import OllamaConnector
from core.text_processing import TextProcessing
from core import configuration

class DocumentSummarizer:
    def __init__(self):
        self.model_name = configuration.OLLAMA_MODEL
        self.ollama_connector = OllamaConnector(self.model_name)
        self.prompt_manager = PromptManager()
        self.text_processing = TextProcessing()
        # Test connection and model availability
        try:
            self.ollama_connector.client.list()
            print(f"✓ Connected to Ollama successfully")
            print(f"✓ Using model: {self.model_name}")
        except Exception as e:
            print(f"✗ Error connecting to Ollama: {e}")
            print("Make sure Ollama is running and the model is available")
            raise
    
    def summarize_chunk_group(self, chunks: List[str], user_prompt: str, group_index: int, total_groups: int) -> str:
        """Summarize a group of 4-8 chunks together."""
        combined_chunks = "\n\n---\n\n".join(chunks)
        
        system_prompt = self.prompt_manager.get_group_chunk_summary_prompt(combined_chunks)

        summary = self.ollama_connector.make_ollama_call(system_prompt, temperature=0.3, max_tokens=1500)
        print(f"✓ Group {group_index + 1} summarized")
        return summary
    
    def get_final_summary(self, intermediate_summaries: List[str], user_prompt: str) -> str:
        combined_summaries = "\n\n---\n\n".join(intermediate_summaries)
        system_prompt = self.prompt_manager.get_final_summary_prompt(combined_summaries)
        final_summary = self.ollama_connector.make_ollama_call(system_prompt, temperature=0.2, max_tokens=2500)
        return final_summary
    
    def count_possible_chunks(self, total_chunks: int) -> int:
        """
        Find the optimal chunk group size (3-5) that minimizes remainder.
        Returns the chunk group size that best divides total_chunks.
        """
        if total_chunks <= 0:
            return 0
        
        # Check divisibility in order of preference: 5, 4, 3
        # This prioritizes larger group sizes when multiple options exist
        for chunk_group in [5, 4, 3]:
            if total_chunks % chunk_group == 0:
                return chunk_group
        
        # If no perfect division, find the size with minimum remainder
        best_group = 3
        min_remainder = total_chunks % 3
        
        for chunk_group in [4, 5]:
            remainder = total_chunks % chunk_group
            if remainder < min_remainder:
                min_remainder = remainder
                best_group = chunk_group
        
        return best_group
    
    def summarize_document(self, 
                          text: str, 
                          user_prompt: str, 
                          target_length: str = "2 pages",
                          chunk_size: int = 2500,
                          chunks_per_group: int = 6) -> str:

        print("🔄 Starting document summarization...")
        
        # Clean the text
        print("📝 Cleaning text...")
        cleaned_text = self.text_processing.clean_text(text)
        print(f"✓ Text cleaned. Length: {len(cleaned_text):,} characters")
        
        # Chunk the text
        print("✂️ Chunking text...")
        chunks = self.text_processing.chunk_text(cleaned_text, chunk_size)
        print(f"✓ Created {len(chunks)} chunks")
        
        # Group chunks and create intermediate summaries
        print("🔄 Creating intermediate summaries...")
        intermediate_summaries = []
        
        chunks_per_group = self.count_possible_chunks(len(chunks))
        
        # Group chunks into groups of chunks_per_group
        for i in range(0, len(chunks), chunks_per_group):
            group_chunks = chunks[i:i + chunks_per_group]
            group_index = i // chunks_per_group
            total_groups = (len(chunks) + chunks_per_group - 1) // chunks_per_group
            
            print(f"  Processing group {group_index + 1}/{total_groups} ({len(group_chunks)} chunks)...")
            group_summary = self.summarize_chunk_group(group_chunks, user_prompt, group_index, total_groups)
            print(group_summary)
            intermediate_summaries.append(group_summary)
            time.sleep(0.5)  # Brief pause to avoid overwhelming the model
        
        print(f"✓ Created {len(intermediate_summaries)} intermediate summaries")
        
        # Simply append all intermediate summaries together
        print("📋 Combining intermediate summaries...")
        final_summary = self.get_final_summary(intermediate_summaries, user_prompt)
        print(final_summary)    
        print("✅ Summary complete!")
        
        return final_summary
