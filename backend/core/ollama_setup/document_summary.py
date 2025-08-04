import ollama
import textwrap
import re
from typing import List, Optional
import time
from core.prompt.prompt import PromptManager
from core.ollama_setup.connector import OllamaConnector
from core.text_processing import TextProcessing
from core import configuration
from core.logger import logger, LoggerUtils

class DocumentSummarizer:
    def __init__(self, llm_client=None):
        logger.info("🤖 Initializing DocumentSummarizer")
        start_time = time.time()
        
        self.llm_client = llm_client
        if not self.llm_client:
            # Fallback to Ollama if no client provided
            self.model_name = configuration.config.ollama.model
            self.llm_client = OllamaConnector(self.model_name)
            
        self.prompt_manager = PromptManager()
        self.text_processing = TextProcessing()
        
        init_duration = (time.time() - start_time) * 1000
        logger.success(f"✅ DocumentSummarizer initialized successfully", extra={
            "llm_client_type": type(self.llm_client).__name__,
            "init_duration": round(init_duration, 2)
        })
    
    def summarize_chunk_group(self, chunks: List[str], user_prompt: str, group_index: int, total_groups: int) -> str:
        """Summarize a group of 4-8 chunks together."""
        start_time = time.time()
        combined_chunks = "\n\n---\n\n".join(chunks)
        
        logger.info(f"📊 Summarizing chunk group {group_index + 1}/{total_groups}", extra={
            "group_index": group_index + 1,
            "total_groups": total_groups,
            "chunks_count": len(chunks),
            "combined_length": len(combined_chunks)
        })
        
        system_prompt = self.prompt_manager.get_group_chunk_summary_prompt(combined_chunks)
        token_count = self.ollama_connector.count_tokens(system_prompt)
        
        logger.debug(f"📝 Prompt prepared for group {group_index + 1}", extra={
            "token_count": token_count,
            "prompt_length": len(system_prompt)
        })
        
        summary = self.llm_client.generate(system_prompt, temperature=0.3, max_tokens=1500) if hasattr(self.llm_client, 'generate') else self.llm_client.make_ollama_call(system_prompt, temperature=0.3, max_tokens=1500)
        
        duration = (time.time() - start_time) * 1000
        logger.success(f"✅ Group {group_index + 1} summarized", extra={
            "group_index": group_index + 1,
            "summary_length": len(summary),
            "duration": round(duration, 2),
            "token_count": token_count
        })
        
        return summary
    
    def summarize_chunk(self, chunk_content: str, user_prompt: str = "") -> str:
        """Summarize a single chunk of text on-demand"""
        start_time = time.time()
        
        logger.info(f"📝 Summarizing individual chunk", extra={
            "content_length": len(chunk_content),
            "user_prompt_length": len(user_prompt)
        })
        
        # Use the chunk summary prompt
        system_prompt = self.prompt_manager.get_chunk_summary_prompt(chunk_content)
        token_count = self.ollama_connector.count_tokens(system_prompt)
        
        logger.debug(f"📝 Chunk summary prompt prepared", extra={
            "token_count": token_count,
            "prompt_length": len(system_prompt)
        })
        
        summary = self.llm_client.generate(system_prompt, temperature=0.3, max_tokens=800) if hasattr(self.llm_client, 'generate') else self.llm_client.make_ollama_call(system_prompt, temperature=0.3, max_tokens=800)
        
        duration = (time.time() - start_time) * 1000
        logger.success(f"✅ Chunk summarized", extra={
            "summary_length": len(summary),
            "duration": round(duration, 2),
            "token_count": token_count
        })
        
        LoggerUtils.log_performance("chunk_summarization", duration,
                                  content_length=len(chunk_content),
                                  summary_length=len(summary),
                                  token_count=token_count)
        
        return summary
    
    def get_final_summary(self, intermediate_summaries: List[str], user_prompt: str) -> str:
        start_time = time.time()
        combined_summaries = "\n\n---\n\n".join(intermediate_summaries)
        
        logger.info(f"📋 Creating final summary from {len(intermediate_summaries)} intermediate summaries", extra={
            "intermediate_count": len(intermediate_summaries),
            "combined_length": len(combined_summaries)
        })
        
        system_prompt = self.prompt_manager.get_final_summary_prompt(combined_summaries)
        token_count = self.ollama_connector.count_tokens(system_prompt)
        
        logger.debug(f"📝 Final summary prompt prepared", extra={
            "token_count": token_count,
            "prompt_length": len(system_prompt)
        })
        
        final_summary = self.llm_client.generate(system_prompt, temperature=0.3, max_tokens=2000) if hasattr(self.llm_client, 'generate') else self.llm_client.make_ollama_call(system_prompt, temperature=0.3, max_tokens=2000)
        
        duration = (time.time() - start_time) * 1000
        logger.success(f"✅ Final summary created", extra={
            "final_summary_length": len(final_summary),
            "duration": round(duration, 2),
            "token_count": token_count
        })
        
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

        start_time = time.time()
        summary_id = f"summary_{int(start_time * 1000)}"
        
        logger.info(f"🚀 Starting document summarization", extra={
            "summary_id": summary_id,
            "text_length": len(text),
            "target_length": target_length,
            "chunk_size": chunk_size,
            "user_prompt_length": len(user_prompt)
        })
        
        # Clean the text
        clean_start = time.time()
        logger.info("📝 Cleaning text...")
        cleaned_text = self.text_processing.clean_text(text)
        clean_duration = (time.time() - clean_start) * 1000
        
        logger.success(f"✅ Text cleaned", extra={
            "summary_id": summary_id,
            "original_length": len(text),
            "cleaned_length": len(cleaned_text),
            "clean_duration": round(clean_duration, 2)
        })
        
        # Chunk the text
        chunk_start = time.time()
        logger.info("✂️ Chunking text...")
        chunks = self.text_processing.chunk_text(cleaned_text, chunk_size)
        chunk_duration = (time.time() - chunk_start) * 1000
        
        logger.success(f"✅ Text chunked", extra={
            "summary_id": summary_id,
            "chunks_created": len(chunks),
            "chunk_size": chunk_size,
            "chunk_duration": round(chunk_duration, 2)
        })
        
        # Group chunks and create intermediate summaries
        logger.info("🔄 Creating intermediate summaries...")
        intermediate_summaries = []
        
        chunks_per_group = self.count_possible_chunks(len(chunks))
        total_groups = (len(chunks) + chunks_per_group - 1) // chunks_per_group
        
        logger.info(f"📊 Processing {total_groups} groups with {chunks_per_group} chunks per group", extra={
            "summary_id": summary_id,
            "total_chunks": len(chunks),
            "chunks_per_group": chunks_per_group,
            "total_groups": total_groups
        })
        
        # Group chunks into groups of chunks_per_group
        for i in range(0, len(chunks), chunks_per_group):
            group_chunks = chunks[i:i + chunks_per_group]
            group_index = i // chunks_per_group
            
            group_summary = self.summarize_chunk_group(group_chunks, user_prompt, group_index, total_groups)
            intermediate_summaries.append(group_summary)
            
            # Brief pause to avoid overwhelming the model
            time.sleep(0.5)
        
        logger.success(f"✅ Created intermediate summaries", extra={
            "summary_id": summary_id,
            "intermediate_summaries": len(intermediate_summaries)
        })
        
        # Create final summary
        final_start = time.time()
        logger.info("📋 Combining intermediate summaries...")
        final_summary = self.get_final_summary(intermediate_summaries, user_prompt)
        final_duration = (time.time() - final_start) * 1000
        
        total_duration = (time.time() - start_time) * 1000
        
        logger.success(f"🎉 Document summarization completed!", extra={
            "summary_id": summary_id,
            "final_summary_length": len(final_summary),
            "final_duration": round(final_duration, 2),
            "total_duration": round(total_duration, 2),
            "chunks_processed": len(chunks),
            "groups_processed": len(intermediate_summaries)
        })
        
        LoggerUtils.log_performance("document_summarization", total_duration,
                                  text_length=len(text),
                                  chunks=len(chunks),
                                  groups=len(intermediate_summaries),
                                  summary_length=len(final_summary))
        
        return final_summary

    def get_bundle_summary(self, text: str, user_prompt: str = "") -> str:
        
        bundle_prompt = self.prompt_manager.get_bundle_summary_prompt(text)
        bundle_summary = self.ollama_connector.make_ollama_call(bundle_prompt, temperature=0.3, max_tokens=2000)
        return bundle_summary