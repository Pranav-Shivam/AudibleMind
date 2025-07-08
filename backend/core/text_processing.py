import re
from typing import List


class TextProcessing:
    def __init__(self):
        pass
    
    def clean_text(self, text: str) -> str:
        """
        Simple text cleaning for LLM processing.
        
        Focuses on essential cleaning only:
        - Remove excessive whitespace
        - Remove page numbers and headers
        - Basic encoding fixes
        - Preserve all mathematical and technical content
        """
        if not text or not isinstance(text, str):
            return ""
        
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
        
        return text
    
    def chunk_text(self, text: str, chunk_size: int = 2500, overlap: int = 200) -> List[str]:
        if len(text) <= chunk_size:
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
        
        return chunks