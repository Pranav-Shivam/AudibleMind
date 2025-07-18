import re
import os
import json
import uuid
import nltk
import tiktoken
from typing import List, Dict, Tuple, Optional
from langdetect import detect
from pathlib import Path
from core.logger import logger

nltk.download("punkt")

# Try to import spaCy for better NLP processing
try:
    import spacy
    SPACY_AVAILABLE = True
    # Load English model for better sentence/paragraph detection
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        logger.warning("⚠️ spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
        SPACY_AVAILABLE = False
except ImportError:
    logger.warning("⚠️ spaCy not available. Using NLTK fallback for sentence detection.")
    SPACY_AVAILABLE = False

class PDFChunker:
    def __init__(self, max_tokens_per_chunk=500, overlap_tokens=20, default_language="en"):
        self.max_tokens_per_chunk = max_tokens_per_chunk
        self.overlap_tokens = overlap_tokens  # Reduced from 50 to 20
        self.default_language = default_language
        
        logger.info(f"🔧 PDFChunker initialized", extra={
            "max_tokens_per_chunk": max_tokens_per_chunk,
            "overlap_tokens": overlap_tokens,
            "default_language": default_language,
            "spacy_available": SPACY_AVAILABLE
        })

    def clean_text(self, text: str) -> str:
        """Clean and normalize text before processing"""
        logger.info(f"🧹 Starting text cleaning", extra={
            "original_length": len(text)
        })
        
        # Remove repeated page markers
        text = re.sub(r'Page \d+:\s*', '', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove excessive newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Clean up bullet points and formatting
        text = re.sub(r'●\s*', '• ', text)
        text = re.sub(r'▪\s*', '  - ', text)
        
        logger.success(f"✅ Text cleaning completed", extra={
            "cleaned_length": len(text),
            "reduction_percent": round((1 - len(text) / len(text)) * 100, 2) if text else 0
        })
        
        return text.strip()

    def detect_sentences(self, text: str) -> List[str]:
        """Detect sentence boundaries using spaCy or NLTK fallback"""
        if SPACY_AVAILABLE:
            # Use spaCy for better sentence detection
            doc = nlp(text)
            sentences = [sent.text.strip() for sent in doc.sents if sent.text.strip()]
        else:
            # Fallback to NLTK
            sentences = nltk.sent_tokenize(text)
        
        logger.debug(f"📝 Detected {len(sentences)} sentences", extra={
            "text_length": len(text),
            "method": "spacy" if SPACY_AVAILABLE else "nltk"
        })
        
        return sentences

    def detect_paragraphs(self, text: str) -> List[str]:
        """Detect paragraph boundaries with improved logic"""
        logger.info(f"📄 Starting paragraph detection", extra={
            "text_length": len(text)
        })
        
        # First, try to split by double newlines (most common paragraph separator)
        paragraphs = [p.strip() for p in re.split(r'\n{2,}', text.strip()) if p.strip()]
        
        # If we have very few paragraphs, try alternative methods
        if len(paragraphs) <= 2:
            logger.info(f"🔍 Few paragraphs detected, trying alternative methods")
            
            # Method 1: Split by bullet points and numbered lists
            bullet_split = re.split(r'(?=^[•\-\*]\s|^\d+\.\s)', text, flags=re.MULTILINE)
            if len(bullet_split) > len(paragraphs):
                paragraphs = [p.strip() for p in bullet_split if p.strip()]
                logger.info(f"📋 Split by bullet points: {len(paragraphs)} paragraphs")
            
            # Method 2: Use sentence groups if still too few
            if len(paragraphs) <= 2:
                sentences = self.detect_sentences(text)
                sentence_groups = self._group_sentences_into_paragraphs(sentences)
                
                if len(sentence_groups) > len(paragraphs):
                    paragraphs = sentence_groups
                    logger.info(f"📋 Split by sentence groups: {len(paragraphs)} paragraphs")
        
        # Filter out very short paragraphs (likely noise)
        paragraphs = [p for p in paragraphs if len(p.strip()) > 30]
        
        logger.success(f"✅ Paragraph detection completed", extra={
            "paragraphs_count": len(paragraphs),
            "average_paragraph_length": sum(len(p) for p in paragraphs) // len(paragraphs) if paragraphs else 0
        })
        
        return paragraphs

    def _group_sentences_into_paragraphs(self, sentences: List[str]) -> List[str]:
        """Group sentences into paragraphs based on semantic coherence and length"""
        if not sentences:
            return []
        
        paragraphs = []
        current_paragraph = []
        current_length = 0
        max_paragraph_length = 800  # ~800 chars per paragraph
        
        for sentence in sentences:
            sentence_length = len(sentence)
            
            # Start new paragraph if current one would be too long
            if current_length + sentence_length > max_paragraph_length and current_paragraph:
                paragraphs.append(' '.join(current_paragraph))
                current_paragraph = [sentence]
                current_length = sentence_length
            else:
                current_paragraph.append(sentence)
                current_length += sentence_length
        
        # Add the last paragraph
        if current_paragraph:
            paragraphs.append(' '.join(current_paragraph))
        
        return paragraphs

    def estimate_tokens(self, text: str) -> int:
        try:
            enc = tiktoken.get_encoding("cl100k_base")
            token_count = len(enc.encode(text))
            logger.debug(f"🎯 Token estimation successful", extra={
                "text_length": len(text),
                "token_count": token_count,
                "method": "tiktoken"
            })
            return token_count
        except Exception as e:
            fallback_count = len(text.split())
            logger.warning(f"⚠️ Token estimation failed, using fallback", extra={
                "error": str(e),
                "fallback_count": fallback_count,
                "method": "word_count"
            })
            return fallback_count

    def generate_id(self) -> str:
        chunk_id = str(uuid.uuid4())
        logger.debug(f"🆔 Generated chunk ID", extra={"chunk_id": chunk_id})
        return chunk_id

    def detect_language(self, text: str) -> str:
        try:
            detected_lang = detect(text)
            logger.debug(f"🌍 Language detected", extra={
                "detected_language": detected_lang,
                "text_sample": text[:100] + "..." if len(text) > 100 else text
            })
            return detected_lang
        except Exception as e:
            logger.warning(f"⚠️ Language detection failed, using default", extra={
                "error": str(e),
                "default_language": self.default_language
            })
            return self.default_language

    def create_semantic_chunks(self, text: str, section_title: str, parent_id: str, level: int) -> List[Dict]:
        """Create semantic chunks with proper boundary detection and minimal overlap"""
        logger.info(f"🧠 Starting semantic chunking", extra={
            "section_title": section_title,
            "text_length": len(text),
            "max_tokens": self.max_tokens_per_chunk,
            "overlap_tokens": self.overlap_tokens
        })
        
        # Detect paragraphs first
        paragraphs = self.detect_paragraphs(text)
        
        if not paragraphs:
            logger.warning(f"⚠️ No paragraphs detected for section: {section_title}")
            return []
        
        chunks = []
        position = 0
        
        # Process each paragraph
        for i, paragraph in enumerate(paragraphs):
            paragraph_tokens = self.estimate_tokens(paragraph)
            
            logger.debug(f"📄 Processing paragraph {i+1}/{len(paragraphs)}", extra={
                "paragraph_length": len(paragraph),
                "paragraph_tokens": paragraph_tokens,
                "max_tokens": self.max_tokens_per_chunk
            })
            
            # If paragraph fits within token limit, create a single chunk
            if paragraph_tokens <= self.max_tokens_per_chunk:
                chunk_data = self._create_chunk_data(
                    content=paragraph,
                    section_title=section_title,
                    parent_id=parent_id,
                    level=level,
                    position=position,
                    chunk_type="paragraph"
                )
                chunks.append(chunk_data)
                position += 1
                
                logger.debug(f"📦 Created paragraph chunk", extra={
                    "chunk_id": chunk_data["id"],
                    "token_count": chunk_data["token_count"]
                })
            
            else:
                # Paragraph is too large, split it semantically
                logger.info(f"🔪 Large paragraph detected, splitting semantically")
                sub_chunks = self._split_large_paragraph_semantically(
                    paragraph, section_title, parent_id, level, position
                )
                chunks.extend(sub_chunks)
                position += len(sub_chunks)
        
        # Apply controlled overlap only between chunks that need it
        if len(chunks) > 1:
            chunks = self._apply_controlled_overlap(chunks)
        
        # Remove duplicate content
        chunks = self._remove_duplicate_content(chunks)
        
        logger.success(f"✅ Semantic chunking completed", extra={
            "section_title": section_title,
            "chunks_created": len(chunks),
            "total_tokens": sum(chunk['token_count'] for chunk in chunks),
            "average_tokens": sum(chunk['token_count'] for chunk in chunks) // len(chunks) if chunks else 0
        })
        
        return chunks

    def _split_large_paragraph_semantically(self, paragraph: str, section_title: str, parent_id: str, level: int, start_position: int) -> List[Dict]:
        """Split large paragraphs at sentence boundaries"""
        sentences = self.detect_sentences(paragraph)
        chunks = []
        position = start_position
        
        current_chunk = []
        current_tokens = 0
        
        for sentence in sentences:
            sentence_tokens = self.estimate_tokens(sentence)
            
            # If adding this sentence would exceed the limit
            if current_tokens + sentence_tokens > self.max_tokens_per_chunk and current_chunk:
                # Create chunk from current sentences
                chunk_content = ' '.join(current_chunk)
                chunk_data = self._create_chunk_data(
                    content=chunk_content,
                    section_title=f"{section_title} (Part {len(chunks) + 1})",
                    parent_id=parent_id,
                    level=level,
                    position=position,
                    chunk_type="sentence_group"
                )
                chunks.append(chunk_data)
                position += 1
                
                # Start new chunk with current sentence
                current_chunk = [sentence]
                current_tokens = sentence_tokens
            else:
                current_chunk.append(sentence)
                current_tokens += sentence_tokens
        
        # Add the last chunk if there's content
        if current_chunk:
            chunk_content = ' '.join(current_chunk)
            chunk_data = self._create_chunk_data(
                content=chunk_content,
                section_title=f"{section_title} (Part {len(chunks) + 1})",
                parent_id=parent_id,
                level=level,
                position=position,
                chunk_type="sentence_group"
            )
            chunks.append(chunk_data)
        
        return chunks

    def _create_chunk_data(self, content: str, section_title: str, parent_id: str, level: int, position: int, chunk_type: str) -> Dict:
        """Create standardized chunk data"""
        chunk_id = self.generate_id()
        lang = self.detect_language(content)
        
        return {
            "id": chunk_id,
            "parent_id": parent_id,
            "title": section_title,
            "content": content,
            "token_count": self.estimate_tokens(content),
            "lang": lang,
            "level": level,
            "position": position,
            "is_empty": False,
            "type": chunk_type
        }

    def _apply_controlled_overlap(self, chunks: List[Dict]) -> List[Dict]:
        """Apply controlled overlap only when necessary"""
        logger.info(f"🔄 Applying controlled overlap", extra={
            "chunks_count": len(chunks),
            "overlap_tokens": self.overlap_tokens
        })
        
        if len(chunks) <= 1:
            return chunks
        
        overlapped_chunks = []
        
        for i, chunk in enumerate(chunks):
            current_content = chunk['content']
            current_tokens = chunk['token_count']
            
            # Only add overlap if the previous chunk exists and we need context
            if i > 0:
                prev_chunk = chunks[i-1]
                prev_content = prev_chunk['content']
                
                # Get the last few sentences from previous chunk for context
                overlap_content = self._extract_context_overlap(prev_content, self.overlap_tokens)
                
                if overlap_content and not self._is_duplicate_content(overlap_content, current_content):
                    current_content = overlap_content + '\n\n' + current_content
                    current_tokens = self.estimate_tokens(current_content)
                    
                    logger.debug(f"🔄 Added controlled overlap to chunk {i+1}", extra={
                        "overlap_length": len(overlap_content),
                        "new_token_count": current_tokens
                    })
            
            # Update chunk with overlapped content
            overlapped_chunk = chunk.copy()
            overlapped_chunk['content'] = current_content
            overlapped_chunk['token_count'] = current_tokens
            
            overlapped_chunks.append(overlapped_chunk)
        
        logger.success(f"✅ Controlled overlap applied", extra={
            "original_chunks": len(chunks),
            "overlapped_chunks": len(overlapped_chunks)
        })
        
        return overlapped_chunks

    def _extract_context_overlap(self, text: str, max_overlap_tokens: int) -> str:
        """Extract context overlap from the end of text"""
        sentences = self.detect_sentences(text)
        
        if not sentences:
            return ""
        
        # Start with the last sentence and work backwards
        overlap_sentences = []
        current_tokens = 0
        
        for sentence in reversed(sentences):
            sentence_tokens = self.estimate_tokens(sentence)
            
            if current_tokens + sentence_tokens <= max_overlap_tokens:
                overlap_sentences.insert(0, sentence)
                current_tokens += sentence_tokens
            else:
                break
        
        return ' '.join(overlap_sentences)

    def _is_duplicate_content(self, content1: str, content2: str, threshold: float = 0.8) -> bool:
        """Check if two content pieces are duplicates"""
        # Simple duplicate detection based on content similarity
        words1 = set(content1.lower().split())
        words2 = set(content2.lower().split())
        
        if not words1 or not words2:
            return False
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        similarity = len(intersection) / len(union)
        
        return similarity > threshold

    def _remove_duplicate_content(self, chunks: List[Dict]) -> List[Dict]:
        """Remove chunks with duplicate content"""
        if len(chunks) <= 1:
            return chunks
        
        filtered_chunks = [chunks[0]]  # Keep the first chunk
        
        for i in range(1, len(chunks)):
            current_chunk = chunks[i]
            is_duplicate = False
            
            # Check against previous chunks
            for prev_chunk in filtered_chunks[-2:]:  # Check against last 2 chunks
                if self._is_duplicate_content(current_chunk['content'], prev_chunk['content']):
                    is_duplicate = True
                    logger.warning(f"⚠️ Removed duplicate chunk {i+1}", extra={
                        "chunk_id": current_chunk["id"],
                        "similarity_with": prev_chunk["id"]
                    })
                    break
            
            if not is_duplicate:
                filtered_chunks.append(current_chunk)
        
        logger.info(f"🧹 Removed {len(chunks) - len(filtered_chunks)} duplicate chunks", extra={
            "original_count": len(chunks),
            "filtered_count": len(filtered_chunks)
        })
        
        return filtered_chunks

    def detect_headings(self, text: str) -> List[Dict]:
        logger.info(f"🔍 Starting heading detection", extra={
            "text_length": len(text)
        })
        
        sections = []
        current_title = "Introduction"
        current_content = ""
        lines = text.splitlines()
        position = 0

        for i, line in enumerate(lines):
            line = line.strip()
            if not line:
                continue

            if re.match(r"^(\d+(\.\d+)*\.?|[A-Z ]{3,})$", line):
                if current_content.strip():
                    section_data = {
                        "title": current_title,
                        "content": current_content.strip(),
                        "level": current_title.count(".") + 1,
                        "position": position,
                        "id": self.generate_id()
                    }
                    sections.append(section_data)
                    
                    logger.info(f"📋 Detected section", extra={
                        "title": current_title,
                        "level": section_data["level"],
                        "position": position,
                        "content_length": len(current_content.strip())
                    })
                    
                    position += 1
                    current_content = ""

                current_title = line
                logger.debug(f"🎯 Found heading", extra={
                    "heading": line,
                    "line_number": i+1
                })
            else:
                current_content += line + "\n"

        # Handle last section
        if current_content.strip():
            section_data = {
                "title": current_title,
                "content": current_content.strip(),
                "level": current_title.count(".") + 1,
                "position": position,
                "id": self.generate_id()
            }
            sections.append(section_data)
            
            logger.info(f"📋 Detected final section", extra={
                "title": current_title,
                "level": section_data["level"],
                "position": position,
                "content_length": len(current_content.strip())
            })

        logger.success(f"✅ Heading detection completed", extra={
            "sections_found": len(sections),
            "average_level": sum(s["level"] for s in sections) / len(sections) if sections else 0
        })

        return sections

    def process_pdf_text(self, text: str) -> List[Dict]:
        logger.info(f"🚀 Starting enhanced PDF text processing", extra={
            "text_length": len(text),
            "max_tokens_per_chunk": self.max_tokens_per_chunk,
            "overlap_tokens": self.overlap_tokens
        })
        
        # Step 1: Clean the text
        logger.info(f"🧹 Step 1: Cleaning input text")
        cleaned_text = self.clean_text(text)
        
        # Step 2: Detect headings and sections
        logger.info(f"🔍 Step 2: Detecting headings and sections")
        sections = self.detect_headings(cleaned_text)
        
        # Step 3: Process each section
        logger.info(f"🏗️ Step 3: Processing sections with enhanced chunking")
        all_chunks = []
        chunk_position = 0

        for section in sections:
            logger.info(f"📂 Processing section: {section['title']}", extra={
                "section_id": section["id"],
                "level": section["level"],
                "content_length": len(section["content"])
            })
            
            # Create chunks from paragraphs
            subchunks = self.create_semantic_chunks(section["content"], section["title"], section["id"], section["level"])
            
            # Add section header chunk (but mark it properly)
            section_chunk = {
                "id": section["id"],
                "parent_id": None,
                "title": section["title"],
                "content": "",
                "token_count": 0,
                "lang": self.detect_language(section["title"]),
                "level": section["level"],
                "position": chunk_position,
                "is_empty": True,
                "type": "section"
            }
            
            all_chunks.append(section_chunk)
            chunk_position += 1
            
            # Add subchunks with proper positioning
            for subchunk in subchunks:
                subchunk["position"] = chunk_position
                all_chunks.append(subchunk)
                chunk_position += 1
            
            logger.info(f"✅ Section processed", extra={
                "section_title": section["title"],
                "subchunks_created": len(subchunks),
                "total_tokens": sum(chunk['token_count'] for chunk in subchunks)
            })

        logger.success(f"🎉 Enhanced PDF text processing completed", extra={
            "total_chunks": len(all_chunks),
            "sections": len(sections),
            "subchunks": len(all_chunks) - len(sections),
            "total_tokens": sum(chunk['token_count'] for chunk in all_chunks),
            "average_tokens_per_chunk": sum(chunk['token_count'] for chunk in all_chunks) // len(all_chunks) if all_chunks else 0
        })

        return all_chunks

    def process_pdf_text_by_page(self, page_text: str, page_number: int, document_id: str = None) -> List[Dict]:
        """
        Process PDF text for a single page, ensuring all chunks stay within page boundaries.
        
        Args:
            page_text: Text content for a single page
            page_number: Page number (0-indexed)
            document_id: Optional document ID for metadata
            
        Returns:
            List of chunks for this page
        """
        logger.info(f"📄 Starting page-level PDF text processing", extra={
            "page_number": page_number,
            "text_length": len(page_text),
            "max_tokens_per_chunk": self.max_tokens_per_chunk,
            "overlap_tokens": self.overlap_tokens,
            "document_id": document_id
        })
        
        # Step 1: Clean the page text
        logger.info(f"🧹 Step 1: Cleaning page text")
        cleaned_text = self.clean_text(page_text)
        
        # Step 2: Detect headings and sections for this page
        logger.info(f"🔍 Step 2: Detecting headings and sections for page {page_number}")
        sections = self.detect_headings(cleaned_text)
        
        # Step 3: Process each section within the page
        logger.info(f"🏗️ Step 3: Processing page sections with enhanced chunking")
        page_chunks = []
        chunk_position = 0

        for section in sections:
            logger.info(f"📂 Processing section on page {page_number}: {section['title']}", extra={
                "section_id": section["id"],
                "level": section["level"],
                "content_length": len(section["content"])
            })
            
            # Create chunks from paragraphs
            subchunks = self.create_semantic_chunks(section["content"], section["title"], section["id"], section["level"])
            
            # Add page metadata to all chunks
            for subchunk in subchunks:
                subchunk["page_number"] = page_number
                subchunk["document_id"] = document_id
                subchunk["position"] = chunk_position
                chunk_position += 1
            
            # Add section header chunk (but mark it properly)
            section_chunk = {
                "id": section["id"],
                "parent_id": None,
                "title": section["title"],
                "content": "",
                "token_count": 0,
                "lang": self.detect_language(section["title"]),
                "level": section["level"],
                "position": chunk_position,
                "is_empty": True,
                "type": "section",
                "page_number": page_number,
                "document_id": document_id
            }
            
            page_chunks.append(section_chunk)
            chunk_position += 1
            
            # Add subchunks
            page_chunks.extend(subchunks)
            
            logger.info(f"✅ Section processed on page {page_number}", extra={
                "section_title": section["title"],
                "subchunks_created": len(subchunks),
                "total_tokens": sum(chunk['token_count'] for chunk in subchunks)
            })

        logger.success(f"🎉 Page-level PDF text processing completed", extra={
            "page_number": page_number,
            "total_chunks": len(page_chunks),
            "sections": len(sections),
            "subchunks": len(page_chunks) - len(sections),
            "total_tokens": sum(chunk['token_count'] for chunk in page_chunks),
            "average_tokens_per_chunk": sum(chunk['token_count'] for chunk in page_chunks) // len(page_chunks) if page_chunks else 0
        })

        return page_chunks

    def process_multiple_pages(self, pages_data: Dict[int, str], document_id: str = None) -> List[Dict]:
        """
        Process multiple pages and combine all chunks while maintaining page boundaries.
        
        Args:
            pages_data: Dictionary with page numbers as keys and page text as values
            document_id: Optional document ID for metadata
            
        Returns:
            List of all chunks from all pages, sorted by page number and position
        """
        logger.info(f"📚 Starting multi-page PDF processing", extra={
            "pages_count": len(pages_data),
            "document_id": document_id
        })
        
        all_chunks = []
        global_chunk_index = 0
        
        # Process pages in order
        for page_number in sorted(pages_data.keys()):
            page_text = pages_data[page_number]
            
            logger.info(f"📄 Processing page {page_number}", extra={
                "page_text_length": len(page_text),
                "global_chunk_index": global_chunk_index
            })
            
            # Process this page
            page_chunks = self.process_pdf_text_by_page(page_text, page_number, document_id)
            
            # Update global positioning
            for chunk in page_chunks:
                chunk["global_position"] = global_chunk_index
                global_chunk_index += 1
            
            all_chunks.extend(page_chunks)
            
            logger.info(f"✅ Page {page_number} processed", extra={
                "chunks_created": len(page_chunks),
                "total_chunks_so_far": len(all_chunks)
            })
        
        logger.success(f"🎉 Multi-page PDF processing completed", extra={
            "total_pages": len(pages_data),
            "total_chunks": len(all_chunks),
            "average_chunks_per_page": len(all_chunks) / len(pages_data) if pages_data else 0
        })
        
        return all_chunks

    def chunk_to_markdown(self, chunk: Dict) -> str:
        logger.debug(f"📝 Converting chunk to markdown", extra={
            "chunk_id": chunk["id"],
            "chunk_type": chunk["type"]
        })
        
        yaml_header = {
            "id": chunk["id"],
            "parent_id": chunk["parent_id"],
            "title": chunk["title"],
            "level": chunk["level"],
            "position": chunk["position"],
            "token_count": chunk["token_count"],
            "lang": chunk["lang"],
            "is_empty": chunk["is_empty"],
            "type": chunk["type"]
        }
        yaml_lines = ["---"] + [f"{k}: {v}" for k, v in yaml_header.items()] + ["---", ""]
        markdown_content = "\n".join(yaml_lines) + chunk["content"] + "\n"
        
        logger.debug(f"✅ Markdown conversion completed", extra={
            "chunk_id": chunk["id"],
            "markdown_length": len(markdown_content)
        })
        
        return markdown_content

    def save_chunks(self, chunks: List[Dict], out_dir: str):
        logger.info(f"💾 Starting chunk file saving", extra={
            "chunks_count": len(chunks),
            "output_directory": out_dir
        })
        
        # Step 9: Each chunk is written to .md file
        logger.info(f"📄 Step 9: Writing chunks to .md files")
        Path(out_dir).mkdir(parents=True, exist_ok=True)
        index = []

        for i, chunk in enumerate(chunks):
            md = self.chunk_to_markdown(chunk)
            file_path = os.path.join(out_dir, f"{chunk['id']}.md")
            
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(md)
            
            index.append(chunk)
            
            logger.debug(f"💾 Saved chunk file {i+1}/{len(chunks)}", extra={
                "chunk_id": chunk["id"],
                "file_path": file_path,
                "file_size": len(md)
            })

        # Step 10: Index file is written
        logger.info(f"📋 Step 10: Writing index file")
        index_path = os.path.join(out_dir, "index.json")
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index, f, indent=2)
        
        logger.success(f"✅ Chunk file saving completed", extra={
            "files_created": len(chunks),
            "index_file": index_path,
            "total_size": sum(os.path.getsize(os.path.join(out_dir, f"{chunk['id']}.md")) for chunk in chunks)
        })

if __name__ == "__main__":
    logger.info(f"🧪 Running PDFChunker test")
    
    with open("sample_input.txt", "r", encoding="utf-8") as f:
        raw_text = f.read()

    chunker = PDFChunker()
    chunks = chunker.process_pdf_text(raw_text)
    chunker.save_chunks(chunks, "output_chunks")
    
    logger.success(f"✅ PDFChunker test completed")
