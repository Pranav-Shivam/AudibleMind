from core.db.couch_conn import CouchDBConnection
from core.configuration import *
from core.utils.helper import generate_uid
from core.utils.pdf_extraction_utils import extract_pdf_using_adobe, extract_pdf_by_pages, process_page_content
from core.utils.adobe_parser import adjust_para_tokens
from core.utils.pdf_chunking import PDFChunker
from app.document.models.document import *
from datetime import datetime
from core.ollama_setup.document_summary import DocumentSummarizer
from core.text_processing import TextProcessing
from core.logger import logger, LoggerUtils
import json
import time
import os
from typing import Dict, List
from app.document.services.models import ChunkResponse
from core.utils.global_utils import GlobalUtils

class DocumentService:
    def __init__(self):
        logger.info("📄 Initializing DocumentService")
        
        start_time = time.time()
        self.couch_client = CouchDBConnection()
        self.db = self.couch_client.get_db(COUCH_PDF_DB_NAME)
        self.document_summarizer = DocumentSummarizer()
        self.text_processing = TextProcessing()
        self.global_utils = GlobalUtils()
        init_duration = (time.time() - start_time) * 1000
        logger.success(f"✅ DocumentService initialized", extra={
            "init_duration": round(init_duration, 2),
            "pdf_db": COUCH_PDF_DB_NAME,
            "document_db": COUCH_DOCUMENT_DB_NAME,
            "paragraph_db": COUCH_PARAGRAPH_DB_NAME,
            "chunk_db": COUCH_CHUNK_DB_NAME
        })
        
    def upload_file(self, user_prompt, file, user_id=None):
        """Process and upload a PDF file with comprehensive logging using page-level chunking"""
        start_time = time.time()
        upload_id = f"upload_{int(start_time * 1000)}"
        
        logger.info(f"🚀 Starting file upload process with page-level chunking", extra={
            "upload_id": upload_id,
            "filename": file.filename,
            "user_prompt_length": len(user_prompt)
        })
        
        try:
            # Read file data
            file_read_start = time.time()
            file.file.seek(0)
            data = file.file.read()
            filename = file.filename
            title, file_extension = os.path.splitext(filename)
            file_size = len(data)
            
            file_read_duration = (time.time() - file_read_start) * 1000
            logger.info(f"📁 File read successfully", extra={
                "upload_id": upload_id,
                "filename": filename,
                "file_size_bytes": file_size,
                "file_extension": file_extension,
                "read_duration": round(file_read_duration, 2)
            })
            
            LoggerUtils.log_file_operation("read", filename, file_size, file_read_duration)
            
            # Create document model and save to CouchDB
            doc_save_start = time.time()
            document_id = generate_uid()
            doc_model = DocumentModel(_id=document_id,
                                      title=title,
                                      file_extension=file_extension,
                                      created_at=datetime.now(),
                                      user_id=user_id or "anonymous"
                                      )

            document_id = self.couch_client.save_to_db(COUCH_DOCUMENT_DB_NAME, doc_model)
            doc_save_duration = (time.time() - doc_save_start) * 1000
            
            logger.success(f"💾 Document metadata saved", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "title": title,
                "save_duration": round(doc_save_duration, 2)
            })

            # Upload PDF to CouchDB
            pdf_upload_start = time.time()
            doc = self.create_pdf_doc(file_name=filename)
            self.db.put_attachment(doc, data, filename=filename, content_type="application/pdf")
            pdf_upload_duration = (time.time() - pdf_upload_start) * 1000
            
            logger.success(f"📤 PDF uploaded to database", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "upload_duration": round(pdf_upload_duration, 2)
            })

            # Extract PDF using Adobe with page-level processing
            extraction_start = time.time()
            logger.info(f"🔍 Starting page-level PDF extraction with Adobe", extra={
                "upload_id": upload_id,
                "document_id": document_id
            })
            
            # Use the new page-level extraction
            data, page_grouped_data = extract_pdf_by_pages(file, document_id)
            extraction_duration = (time.time() - extraction_start) * 1000
            
            logger.success(f"✂️ Page-level PDF extraction completed", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "extraction_duration": round(extraction_duration, 2),
                "extracted_length": len(data) if data else 0,
                "pages_found": len(page_grouped_data)
            })
            
            # Process pages and create chunks using page-level PDFChunker
            para_process_start = time.time()
            
            # Convert page-grouped data to text format for each page
            pages_text_data = {}
            total_text_extracted = 0
            
            for page_num, page_elements in page_grouped_data.items():
                page_text = ""
                elements_processed = 0
                
                for item in page_elements:
                    if 'text' in item and item['text'].strip():
                        page_text += f"{item['text'].strip()}\n"
                        elements_processed += 1
                    elif isinstance(item, dict):
                        # Handle different text field names that might be used
                        for text_field in ['Text', 'content', 'text']:
                            if text_field in item and item[text_field] and item[text_field].strip():
                                page_text += f"{item[text_field].strip()}\n"
                                elements_processed += 1
                                break
                
                if page_text.strip():
                    pages_text_data[page_num] = page_text.strip()
                    total_text_extracted += len(page_text)
                    
                logger.debug(f"📄 Page {page_num} processed", extra={
                    "elements_in_page": len(page_elements),
                    "elements_processed": elements_processed,
                    "page_text_length": len(page_text),
                    "has_text": bool(page_text.strip())
                })
            
            para_process_duration = (time.time() - para_process_start) * 1000
            logger.info(f"📝 Pages processed for chunking", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "pages_count": len(pages_text_data),
                "pages_with_text": len([p for p in pages_text_data.values() if p.strip()]),
                "process_duration": round(para_process_duration, 2),
                "total_text_length": total_text_extracted,
                "sample_text": list(pages_text_data.values())[0][:200] + "..." if pages_text_data else "No text found"
            })

            # Check if we have any text to process
            if not pages_text_data or total_text_extracted == 0:
                logger.error(f"❌ No text extracted from PDF", extra={
                    "upload_id": upload_id,
                    "document_id": document_id,
                    "pages_count": len(page_grouped_data),
                    "elements_total": sum(len(elements) for elements in page_grouped_data.values()) if page_grouped_data else 0
                })
                raise ValueError("No text could be extracted from the PDF. The document may be image-based or corrupted.")
            
            # Create chunks using page-level PDFChunker
            chunk_start = time.time()
            logger.info(f"✂️ Creating page-level intelligent chunks using PDFChunker", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "pages_count": len(pages_text_data),
                "text_length": total_text_extracted
            })
            
            # Use PDFChunker for page-level chunking with improved semantic chunking
            chunker = PDFChunker(max_tokens_per_chunk=500, overlap_tokens=20)
            pdf_chunks = chunker.process_multiple_pages(pages_text_data, document_id)
            
            # Convert chunker format to our existing format, filtering out empty chunks
            chunks = []
            chunk_index = 0
            max_allowed_tokens = 500  # Slightly higher than chunker's 450 for safety
            skipped_empty = 0
            skipped_oversized = 0
            
            logger.info(f"🔍 Processing {len(pdf_chunks)} raw chunks from PDFChunker", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "raw_chunks_count": len(pdf_chunks)
            })
            
            for i, chunk in enumerate(pdf_chunks):
                logger.debug(f"🔍 Processing chunk {i+1}/{len(pdf_chunks)}", extra={
                    "chunk_id": chunk.get('id', 'Unknown'),
                    "is_empty": chunk.get('is_empty', False),
                    "content_length": len(chunk.get('content', '')),
                    "token_count": chunk.get('token_count', 0),
                    "content_preview": chunk.get('content', '')[:100] + "..." if len(chunk.get('content', '')) > 100 else chunk.get('content', '')
                })
                
                # Skip empty section headers
                if chunk.get('is_empty', False):
                    logger.debug(f"⏭️ Skipping empty section chunk: {chunk.get('title', 'Unknown')}")
                    skipped_empty += 1
                    continue
                
                # Only include chunks with actual content (be more lenient with minimum length)
                content = chunk.get('content', '').strip()
                if content and len(content) >= 10:  # Minimum 10 characters for a valid chunk
                    token_count = chunk.get('token_count', 0)
                    
                    # Validate token count but be more lenient
                    if token_count > max_allowed_tokens:
                        logger.warning(f"⚠️ Chunk exceeds token limit but including anyway: {token_count} > {max_allowed_tokens}", extra={
                            "upload_id": upload_id,
                            "document_id": document_id,
                            "chunk_id": chunk.get('id', 'Unknown'),
                            "page_number": chunk.get('page_number', 'Unknown'),
                            "content_preview": content[:100] + "..." if len(content) > 100 else content
                        })
                        skipped_oversized += 1
                    
                    chunks.append({
                        'content': content,
                        'token_count': token_count,
                        'chunk_index': chunk_index,  # Use sequential indexing
                        'page_number': chunk.get('page_number', 0),  # Add page number
                        'document_id': document_id  # Add document ID
                    })
                    chunk_index += 1
                else:
                    logger.debug(f"⏭️ Skipping chunk with insufficient content: {chunk.get('id', 'Unknown')} (length: {len(content)})")
                    skipped_empty += 1
            
            logger.info(f"📊 Chunk processing summary", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "raw_chunks": len(pdf_chunks),
                "valid_chunks": len(chunks),
                "skipped_empty": skipped_empty,
                "skipped_oversized": skipped_oversized
            })
            
            # Final validation
            oversized_chunks = [chunk for chunk in chunks if chunk['token_count'] > max_allowed_tokens]
            if oversized_chunks:
                logger.warning(f"⚠️ Found {len(oversized_chunks)} chunks exceeding token limit", extra={
                    "upload_id": upload_id,
                    "document_id": document_id,
                    "oversized_count": len(oversized_chunks),
                    "max_tokens_found": max(chunk['token_count'] for chunk in oversized_chunks)
                })
            
            chunk_duration = (time.time() - chunk_start) * 1000
            
            logger.success(f"📦 Created {len(chunks)} page-level intelligent chunks", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "chunks_created": len(chunks),
                "chunk_duration": round(chunk_duration, 2),
                "pages_processed": len(pages_text_data),
                "average_tokens": sum(chunk['token_count'] for chunk in chunks) // len(chunks) if chunks else 0,
                "max_tokens": max(chunk['token_count'] for chunk in chunks) if chunks else 0
            })
            
            # Update document with chunk count (no auto-summary)
            doc_model.total_chunks = len(chunks)
            self.couch_client.save_to_db(COUCH_DOCUMENT_DB_NAME, doc_model)

            # Save chunks to database
            chunk_save_start = time.time()
            saved_chunks = 0
            
            # Prepare in-memory list for chunks
            chunk_models = []

            # 1️⃣ Build ChunkModel instances in memory
            for chunk_data in chunks:
                chunk_id = generate_uid()
                model = ChunkModel(
                    _id=chunk_id,
                    document_id=document_id,
                    chunk_index=chunk_data['chunk_index'],
                    content=chunk_data['content'],
                    summary="",
                    token_count=chunk_data['token_count'],
                    page_number=chunk_data['page_number'],
                    number_of_words=self.global_utils.count_words(chunk_data['content']),
                    is_user_liked=False,
                    heading=self.global_utils.generate_heading(chunk_data['content']),
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    bundle_index=0,
                    bundle_id="",
                    bundle_text="",
                    bundle_summary=""
                )
                chunk_models.append(model)

            # 2️⃣ Build bundles and update chunks, then persist bundles on the fly
            bundle_index = 1
            for i in range(0, len(chunk_models), 4):
                group = chunk_models[i:i+4]
                bundle_text = "\n".join([c.content for c in group])
                bundle_summary = self.document_summarizer.get_bundle_summary(bundle_text)
                bundle_id = generate_uid()

                # Create and save BundleModel immediately
                bundle = BundleModel(
                    _id=bundle_id,
                    bundle_index=bundle_index,
                    bundle_id=bundle_id,
                    bundle_summary=bundle_summary,
                    created_at=datetime.now(),
                    updated_at=datetime.now(),
                    chunks_text=bundle_text,
                    document_id=document_id
                )
                self.couch_client.save_to_db(COUCH_BUNDLE_DB_NAME, bundle)

                # Stamp bundle metadata into chunk models
                for chunk in group:
                    chunk.bundle_index = bundle_index
                    chunk.bundle_id = bundle_id
                    chunk.bundle_text = bundle_text
                    chunk.bundle_summary = bundle_summary
                    chunk.updated_at = datetime.now()

                bundle_index += 1

            # 3️⃣ Persist all chunks in one phase
            start_time = time.time()
            saved_count = 0
            for model in chunk_models:
                self.couch_client.save_to_db(COUCH_CHUNK_DB_NAME, model)
                saved_count += 1

            duration_ms = (time.time() - start_time) * 1000
            logger.success(
                "💾 Chunks and bundles persisted efficiently",
                extra={
                    "upload_id": upload_id,
                    "document_id": document_id,
                    "chunks_saved": saved_count,
                    "bundles_created": bundle_index - 1,
                    "total_duration_ms": round(duration_ms, 2)
                }
            )
            
            
            # Save user prompt
            prompt_save_start = time.time()
            with open('user_prompt.json', 'w') as f:
                json.dump({'user_prompt': user_prompt}, f)
            prompt_save_duration = (time.time() - prompt_save_start) * 1000
            
            logger.debug(f"💾 User prompt saved", extra={
                "upload_id": upload_id,
                "save_duration": round(prompt_save_duration, 2)
            })
            
            # Calculate total processing time
            total_duration = (time.time() - start_time) * 1000
            
            logger.success(f"🎉 Page-level file upload process completed successfully", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "filename": filename,
                "total_duration": round(total_duration, 2),
                "file_size_bytes": file_size,
                "pages_processed": len(pages_text_data),
                "chunks_created": len(chunks)
            })
            
            # Log performance metrics
            LoggerUtils.log_performance("document_upload_page_level", total_duration,
                                      file_size=file_size,
                                      pages_processed=len(pages_text_data),
                                      chunks_created=len(chunks),
                                      extraction_duration=extraction_duration,
                                      chunk_duration=chunk_duration)
            
            return document_id
            
        except Exception as e:
            total_duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Page-level file upload process failed: {str(e)}", extra={
                "upload_id": upload_id,
                "filename": file.filename if hasattr(file, 'filename') else 'unknown',
                "duration": round(total_duration, 2),
                "error_type": type(e).__name__
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "document_upload_page_level",
                "upload_id": upload_id,
                "filename": file.filename if hasattr(file, 'filename') else 'unknown',
                "duration": total_duration
            })
            raise

    def get_document_chunks(self, document_id):
        """Get all chunks for a document"""
        try:
            logger.info(f"🔍 Searching for chunks with document_id: {document_id}")
            
            # Get all chunk documents for this document_id
            chunk_db = self.couch_client.get_db(COUCH_CHUNK_DB_NAME)
            
            # Query by document_id (we'll need to iterate through all docs)
            response_chunks = []
            total_docs_checked = 0
            matching_docs_found = 0
            
            for doc_id in chunk_db:
                total_docs_checked += 1
                try:
                    chunk_doc = chunk_db[doc_id]
                    stored_document_id = chunk_doc.get('document_id', '')
                    
                    # Debug logging for document ID comparison
                    if total_docs_checked <= 5:  # Only log first few for debugging
                        logger.debug(f"🔍 Checking chunk {doc_id}: stored_document_id='{stored_document_id}', searching_for='{document_id}', match={stored_document_id == document_id}")
                    
                    if stored_document_id == document_id:
                        matching_docs_found += 1
                        
                        current_chunk = ChunkResponse(
                            id=chunk_doc['_id'],
                            chunk_index=chunk_doc.get('chunk_index', 0),
                            content=chunk_doc.get('content', ''),
                            summary=chunk_doc.get('summary', ''),
                            token_count=chunk_doc.get('token_count', 0),
                            page_number=chunk_doc.get('page_number', 0),
                            number_of_words=chunk_doc.get('number_of_words', 0),
                            is_user_liked=chunk_doc.get('is_user_liked', False),
                            heading=chunk_doc.get('heading', ''),
                            created_at=chunk_doc.get('created_at', ''),
                            updated_at=chunk_doc.get('updated_at', ''),
                            bundle_index=chunk_doc.get('bundle_index', 0),
                            bundle_id=chunk_doc.get('bundle_id', ''),
                            bundle_text=chunk_doc.get('bundle_text', ''),
                            bundle_summary=chunk_doc.get('bundle_summary', '')
                        )
                        response_chunks.append(current_chunk)
                        
                except Exception as e:
                    logger.warning(f"⚠️ Skipping invalid chunk document {doc_id}: {str(e)}")
                    continue
            
            # Sort by chunk_index to ensure proper order
            response_chunks.sort(key=lambda x: x.chunk_index)
            
            logger.info(f"📦 Retrieved chunks for document {document_id}", extra={
                "document_id": document_id,
                "chunks_found": len(response_chunks),
                "total_docs_checked": total_docs_checked,
                "matching_docs_found": matching_docs_found
            })
            
            # If no chunks found, log additional debug info
            if len(response_chunks) == 0:
                logger.warning(f"🚨 No chunks found for document {document_id}. Checked {total_docs_checked} total chunk documents, found {matching_docs_found} matches.")
                
                # Check if document exists in documents database
                try:
                    doc_db = self.couch_client.get_db(COUCH_DOCUMENT_DB_NAME)
                    doc = doc_db.get(document_id)
                    if doc:
                        logger.warning(f"📄 Document {document_id} exists in documents DB but has no chunks. Title: {doc.get('title', 'Unknown')}")
                    else:
                        logger.error(f"❌ Document {document_id} not found in documents DB either!")
                except Exception as doc_check_error:
                    logger.error(f"❌ Error checking document existence: {str(doc_check_error)}")
            
            return response_chunks
            
        except Exception as e:
            logger.error(f"❌ Error retrieving chunks for document {document_id}: {str(e)}")
            return []

    def get_chunks_by_page(self, document_id: str, page_number: int = None):
        """
        Get chunks for a document, optionally filtered by page number.
        
        Args:
            document_id: The document ID
            page_number: Optional page number to filter by (0-indexed)
            
        Returns:
            List of chunks, optionally filtered by page
        """
        try:
            # Get all chunk documents for this document_id
            chunk_db = self.couch_client.get_db(COUCH_CHUNK_DB_NAME)
            
            chunks = []
            for doc_id in chunk_db:
                try:
                    chunk_doc = chunk_db[doc_id]
                    if chunk_doc.get('document_id') == document_id:
                        chunk_page = chunk_doc.get('page_number', 0)
                        
                        # Filter by page number if specified
                        if page_number is not None and chunk_page != page_number:
                            continue
                            
                        chunks.append({
                            'id': chunk_doc['_id'],
                            'chunk_index': chunk_doc.get('chunk_index', 0),
                            'content': chunk_doc.get('content', ''),
                            'summary': chunk_doc.get('summary', ''),
                            'token_count': chunk_doc.get('token_count', 0),
                            'page_number': chunk_page
                        })
                except Exception as e:
                    logger.warning(f"⚠️ Skipping invalid chunk document: {doc_id}")
                    continue
            
            # Sort by chunk_index to ensure proper order
            chunks.sort(key=lambda x: x['chunk_index'])
            
            filter_info = f"page {page_number}" if page_number is not None else "all pages"
            logger.info(f"📦 Retrieved chunks for document {document_id} ({filter_info})", extra={
                "document_id": document_id,
                "page_number": page_number,
                "chunks_found": len(chunks)
            })
            
            return chunks
            
        except Exception as e:
            logger.error(f"❌ Error retrieving chunks for document {document_id}: {str(e)}")
            return []

    def get_page_summary(self, document_id: str, page_number: int):
        """
        Get a summary of all chunks on a specific page.
        
        Args:
            document_id: The document ID
            page_number: Page number (0-indexed)
            
        Returns:
            Dictionary with page summary information
        """
        try:
            page_chunks = self.get_chunks_by_page(document_id, page_number)
            
            if not page_chunks:
                logger.warning(f"⚠️ No chunks found for page {page_number} in document {document_id}")
                return {
                    'page_number': page_number,
                    'chunks_count': 0,
                    'total_tokens': 0,
                    'content_preview': '',
                    'chunks': []
                }
            
            # Calculate page statistics
            total_tokens = sum(chunk['token_count'] for chunk in page_chunks)
            content_preview = ' '.join(chunk['content'][:100] for chunk in page_chunks[:3])
            
            page_summary = {
                'page_number': page_number,
                'chunks_count': len(page_chunks),
                'total_tokens': total_tokens,
                'content_preview': content_preview[:500] + "..." if len(content_preview) > 500 else content_preview,
                'chunks': page_chunks
            }
            
            logger.info(f"📄 Generated page summary for page {page_number}", extra={
                "document_id": document_id,
                "page_number": page_number,
                "chunks_count": len(page_chunks),
                "total_tokens": total_tokens
            })
            
            return page_summary
            
        except Exception as e:
            logger.error(f"❌ Error generating page summary for page {page_number}: {str(e)}")
            return None

    def summarize_chunk(self, document_id, chunk_index, user_prompt=""):
        """Summarize a specific chunk on-demand"""
        try:
            # Get the specific chunk
            chunk_db = self.couch_client.get_db(COUCH_CHUNK_DB_NAME)
            
            # Find the chunk with matching document_id and chunk_index
            target_chunk = None
            for doc_id in chunk_db:
                try:
                    chunk_doc = chunk_db[doc_id]
                    if (chunk_doc.get('document_id') == document_id and 
                        chunk_doc.get('chunk_index') == chunk_index):
                        target_chunk = chunk_doc
                        break
                except Exception:
                    continue
            
            if not target_chunk:
                logger.error(f"❌ Chunk not found: document_id={document_id}, chunk_index={chunk_index}")
                return None
            
            # Check if chunk already has a summary
            if target_chunk.get('summary') and target_chunk['summary'].strip():
                logger.info(f"📋 Returning existing summary for chunk {chunk_index}")
                return target_chunk['summary']
            
            # Generate summary for this chunk
            chunk_content = target_chunk.get('content', '')
            if not chunk_content:
                logger.warning(f"⚠️ Empty chunk content for document {document_id}, chunk {chunk_index}")
                return "Empty chunk - no content to summarize."
            
            logger.info(f"🤖 Generating summary for chunk {chunk_index}", extra={
                "document_id": document_id,
                "chunk_index": chunk_index,
                "content_length": len(chunk_content)
            })
            
            # Use the document summarizer to create chunk summary
            summary = self.document_summarizer.summarize_chunk(chunk_content, user_prompt)
            
            # Update the chunk with the summary
            target_chunk['summary'] = summary
            chunk_db.save(target_chunk)
            
            logger.success(f"✅ Chunk summary generated and saved", extra={
                "document_id": document_id,
                "chunk_index": chunk_index,
                "summary_length": len(summary)
            })
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ Error summarizing chunk: {str(e)}", extra={
                "document_id": document_id,
                "chunk_index": chunk_index
            })
            return None

    
    def create_pdf_doc(self, file_name):
        """Create PDF document entry in database"""
        start_time = time.time()
        try:
            doc_id, _ = self.db.save({'pdf_name': file_name})
            duration = (time.time() - start_time) * 1000
            
            logger.debug(f"📄 PDF document entry created", extra={
                "doc_id": doc_id,
                "file_name": file_name,
                "duration": round(duration, 2)
            })
            
            return self.db[doc_id]
            
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Failed to create PDF document entry: {str(e)}", extra={
                "file_name": file_name,
                "duration": round(duration, 2)
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "pdf_doc_creation",
                "file_name": file_name,
                "duration": duration
            })
            raise

    def get_document(self, document_id: str):
        """Get document details including summary and paragraphs"""
        start_time = time.time()
        get_id = f"get_{int(start_time * 1000)}"
        
        logger.info(f"📖 Starting document retrieval", extra={
            "get_id": get_id,
            "document_id": document_id
        })
        
        try:
            # Get document from documents database
            doc_db = self.couch_client.get_db(COUCH_DOCUMENT_DB_NAME)
            document_doc = doc_db.get(document_id)
            
            if not document_doc:
                logger.warning(f"⚠️ Document {document_id} not found", extra={
                    "get_id": get_id,
                    "document_id": document_id
                })
                return None
            
            logger.info(f"📄 Document found", extra={
                "get_id": get_id,
                "document_id": document_id,
                "title": document_doc.get('title', 'Unknown Document')
            })
            
            # Get all paragraphs from paragraphs database
            para_start = time.time()
            para_db = self.couch_client.get_db(COUCH_PARAGRAPH_DB_NAME)
            all_paragraphs = []
            
            # Get all documents from paragraph DB
            for row in para_db.view('_all_docs', include_docs=True):
                if not row.id.startswith('_design'):
                    para_doc = row.doc
                    # For now, include all paragraphs since we don't have document association
                    all_paragraphs.append({
                        'id': para_doc.get('_id'),
                        'text': para_doc.get('text', ''),
                        'page_number': 1  # Default page number, could be enhanced later
                    })
            
            para_duration = (time.time() - para_start) * 1000
            logger.info(f"📝 Retrieved paragraphs", extra={
                "get_id": get_id,
                "document_id": document_id,
                "paragraph_count": len(all_paragraphs),
                "retrieval_duration": round(para_duration, 2)
            })
            
            # Prepare response
            summary = document_doc.get('file_summary') or 'Summary not available'
            response = {
                'id': document_id,
                'title': document_doc.get('title', 'Unknown Document'),
                'file_extension': document_doc.get('file_extension', '.pdf'),
                'created_at': document_doc.get('created_at'),
                'summary': summary,
                'paragraphs': all_paragraphs
            }
            
            total_duration = (time.time() - start_time) * 1000
            logger.success(f"✅ Document retrieval completed", extra={
                "get_id": get_id,
                "document_id": document_id,
                "total_duration": round(total_duration, 2),
                "paragraphs_included": len(all_paragraphs),
                "summary_length": len(summary) if summary else 0
            })
            
            LoggerUtils.log_performance("document_retrieval", total_duration,
                                      document_id=document_id,
                                      paragraphs=len(all_paragraphs))
            
            return response
            
        except Exception as e:
            total_duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Document retrieval failed: {str(e)}", extra={
                "get_id": get_id,
                "document_id": document_id,
                "duration": round(total_duration, 2),
                "error_type": type(e).__name__
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "document_retrieval",
                "get_id": get_id,
                "document_id": document_id,
                "duration": total_duration
            })
            raise

    def get_user_documents(self, user_id: str):
        """Get all documents for a specific user"""
        try:
            logger.info(f"📋 Retrieving documents for user {user_id}")
            
            doc_db = self.couch_client.get_db(COUCH_DOCUMENT_DB_NAME)
            user_documents = []
            
            # Iterate through all documents and filter by user_id
            for doc_id in doc_db:
                try:
                    doc = doc_db[doc_id]
                    if doc.get('user_id') == user_id:
                        user_documents.append({
                            'id': doc['_id'],
                            'title': doc.get('title', 'Unknown Document'),
                            'heading': doc.get('title', 'Unknown Document'),  # Alias for heading
                            'name': f"{doc.get('title', 'Unknown Document')}{doc.get('file_extension', '.pdf')}",
                            'file_extension': doc.get('file_extension', '.pdf'),
                            'extension': doc.get('file_extension', '.pdf').replace('.', ''),  # Extension without dot
                            'created_at': doc.get('created_at'),
                            'total_chunks': doc.get('total_chunks', 0)
                        })
                except Exception as e:
                    logger.warning(f"⚠️ Skipping invalid document: {doc_id}")
                    continue
            
            # Sort by creation date (newest first)
            user_documents.sort(key=lambda x: x.get('created_at', ''), reverse=True)
            
            logger.success(f"✅ Retrieved {len(user_documents)} documents for user {user_id}")
            return user_documents
            
        except Exception as e:
            logger.error(f"❌ Error retrieving documents for user {user_id}: {str(e)}")
            return []

    def user_owns_document(self, user_id: str, document_id: str) -> bool:
        """Check if a user owns a specific document"""
        try:
            doc_db = self.couch_client.get_db(COUCH_DOCUMENT_DB_NAME)
            document_doc = doc_db.get(document_id)
            
            if not document_doc:
                logger.warning(f"⚠️ Document {document_id} not found for ownership check")
                return False
            
            doc_user_id = document_doc.get('user_id', '')
            owns_document = doc_user_id == user_id
            
            logger.info(f"🔐 Ownership check for document {document_id}: user_id='{user_id}', doc_user_id='{doc_user_id}', owns={owns_document}")
            
            return owns_document
            
        except Exception as e:
            logger.error(f"❌ Error checking document ownership: {str(e)}")
            return False

    def get_pdf_file(self, document_id: str, filename: str):
        """Get PDF file data for serving"""
        try:
            # Find the PDF document by filename
            for doc_id in self.db:
                try:
                    doc = self.db[doc_id]
                    if doc.get('pdf_name') == filename:
                        # Get the attachment
                        attachment = self.db.get_attachment(doc, filename)
                        if attachment:
                            return attachment.read()
                except Exception:
                    continue
            
            logger.warning(f"⚠️ PDF file not found: {filename}")
            return None
            
        except Exception as e:
            logger.error(f"❌ Error retrieving PDF file {filename}: {str(e)}")
            return None

    def enhance_document_chunks(self, document_id: str, user_prompt: str = None):
        """Enhance all chunks in a document with AI analysis"""
        try:
            logger.info(f"🚀 Starting document enhancement for {document_id}")
            
            # Get all chunks for the document
            chunks = self.get_document_chunks(document_id)
            if not chunks:
                logger.warning(f"⚠️ No chunks found for document {document_id}")
                return None
            
            enhanced_count = 0
            chunk_db = self.couch_client.get_db(COUCH_CHUNK_DB_NAME)
            
            # Process each chunk
            for chunk in chunks:
                try:
                    chunk_doc = chunk_db[chunk.id]
                    
                    # Skip if chunk already has a summary and no custom prompt
                    if chunk_doc.get('summary') and chunk_doc['summary'].strip() and not user_prompt:
                        continue
                    
                    # Generate enhanced summary
                    content = chunk_doc.get('content', '')
                    if content:
                        if user_prompt:
                            enhanced_summary = self.document_summarizer.summarize_chunk(content, user_prompt)
                        else:
                            enhanced_summary = self.document_summarizer.summarize_chunk(content)
                        
                        # Update the chunk with enhanced summary
                        chunk_doc['summary'] = enhanced_summary
                        chunk_db.save(chunk_doc)
                        enhanced_count += 1
                        
                except Exception as e:
                    logger.warning(f"⚠️ Failed to enhance chunk {chunk.id}: {str(e)}")
                    continue
            
            logger.success(f"✅ Enhanced {enhanced_count} chunks for document {document_id}")
            
            return {
                "enhanced_chunks": enhanced_count,
                "total_chunks": len(chunks),
                "document_id": document_id
            }
            
        except Exception as e:
            logger.error(f"❌ Error enhancing document chunks: {str(e)}")
            return None