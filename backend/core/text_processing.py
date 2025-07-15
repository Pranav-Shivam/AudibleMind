import re
import time
from typing import List
from core.logger import logger, LoggerUtils


class TextProcessing:
    def __init__(self):
        logger.debug("📝 TextProcessing initialized")
    
    def clean_text(self, text: str) -> str:
        """
        Simple text cleaning for LLM processing.
        
        Focuses on essential cleaning only:
        - Remove excessive whitespace
        - Remove page numbers and headers
        - Basic encoding fixes
        - Preserve all mathematical and technical content
        """
        start_time = time.time()
        
        if not text or not isinstance(text, str):
            logger.warning("⚠️ Empty or invalid text provided for cleaning")
            return ""
        
        original_length = len(text)
        logger.debug(f"🧹 Starting text cleaning", extra={
            "original_length": original_length,
            "text_preview": text[:100]
        })
        
        try:
            # Remove encoding issues
            text = text.replace('\ufeff', '')  # BOM
            text = text.replace('\u200b', '')  # Zero-width space
            text = text.replace('\u200c', '')  # Zero-width non-joiner
            text = text.replace('\u200d', '')  # Zero-width joiner
            
            # Remove page numbers (standalone)
            text = re.sub(r'\n\s*\d+\s*\n', '\n', text)
            text = re.sub(r'\n\s*Page\s+\d+\s*\n', '\n', text, flags=re.IGNORECASE)
            
            # Remove excessive whitespace (but preserve structure)
            text = re.sub(r' +', ' ', text)  # Multiple spaces to single
            text = re.sub(r'\n+', '\n', text)  # Multiple newlines to single
            
            # Remove leading/trailing whitespace from each line
            text = '\n'.join(line.strip() for line in text.split('\n'))
            
            # Remove empty lines at start/end
            text = text.strip()
            
            cleaned_length = len(text)
            duration = (time.time() - start_time) * 1000
            
            logger.success(f"✅ Text cleaning completed", extra={
                "original_length": original_length,
                "cleaned_length": cleaned_length,
                "reduction_percent": round((1 - cleaned_length/original_length) * 100, 2) if original_length > 0 else 0,
                "duration": round(duration, 2)
            })
            
            LoggerUtils.log_performance("text_cleaning", duration,
                                      original_length=original_length,
                                      cleaned_length=cleaned_length)
            
            return text
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Text cleaning failed: {e}", extra={
                "original_length": original_length,
                "duration": round(duration, 2)
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "text_cleaning",
                "original_length": original_length,
                "duration": duration
            })
            return text  # Return original text if cleaning fails
    
    def chunk_text(self, text: str, chunk_size: int = 2500, overlap: int = 200) -> List[str]:
        """Chunk text into smaller pieces with sentence-aware boundaries and overlap"""
        start_time = time.time()
        
        if not text:
            logger.warning("⚠️ Empty text provided for chunking")
            return []
            
        logger.debug(f"✂️ Starting text chunking", extra={
            "text_length": len(text),
            "chunk_size": chunk_size,
            "overlap": overlap
        })
        
        try:
            if len(text) <= chunk_size:
                logger.debug(f"📄 Text fits in single chunk", extra={"text_length": len(text)})
                return [text]
            
            chunks = []
            start = 0
            
            while start < len(text):
                end = start + chunk_size
                
                # If we're not at the end, try to break at a sentence
                if end < len(text):
                    # Look for sentence endings near the chunk boundary
                    sentence_end = text.rfind('.', start, end)
                    if sentence_end > start + chunk_size * 0.8:  # Only if it's not too early
                        end = sentence_end + 1
                
                chunk = text[start:end].strip()
                if chunk:
                    chunks.append(chunk)
                
                # Move start position with overlap
                start = end - overlap
                
                # Avoid infinite loop
                if start >= len(text):
                    break
            
            duration = (time.time() - start_time) * 1000
            
            logger.success(f"✅ Text chunking completed", extra={
                "text_length": len(text),
                "chunks_created": len(chunks),
                "chunk_size": chunk_size,
                "overlap": overlap,
                "duration": round(duration, 2),
                "avg_chunk_size": round(sum(len(chunk) for chunk in chunks) / len(chunks), 2) if chunks else 0
            })
            
            LoggerUtils.log_performance("text_chunking", duration,
                                      text_length=len(text),
                                      chunks_created=len(chunks),
                                      chunk_size=chunk_size)
            
            return chunks
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Text chunking failed: {e}", extra={
                "text_length": len(text),
                "chunk_size": chunk_size,
                "duration": round(duration, 2)
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "text_chunking",
                "text_length": len(text),
                "chunk_size": chunk_size,
                "duration": duration
            })
            return []