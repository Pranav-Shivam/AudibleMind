from core.db.couch_conn import CouchDBConnection
from core.configuration import *
from core.utils.helper import generate_uid
from core.utils.pdf_extraction_utils import extract_pdf_using_adobe
from core.utils.adobe_parser import adjust_para_tokens
from app.document.models.document import *
from datetime import datetime
from core.ollama_setup.document_summary import DocumentSummarizer
from core.text_processing import TextProcessing
from core.logger import logger, LoggerUtils
import json
import time
import os

class DocumentService:
    def __init__(self):
        logger.info("📄 Initializing DocumentService")
        
        start_time = time.time()
        self.couch_client = CouchDBConnection()
        self.db = self.couch_client.get_db(COUCH_PDF_DB_NAME)
        self.document_summarizer = DocumentSummarizer()
        self.text_processing = TextProcessing()
        
        init_duration = (time.time() - start_time) * 1000
        logger.success(f"✅ DocumentService initialized", extra={
            "init_duration": round(init_duration, 2),
            "pdf_db": COUCH_PDF_DB_NAME,
            "document_db": COUCH_DOCUMENT_DB_NAME,
            "paragraph_db": COUCH_PARAGRAPH_DB_NAME,
            "chunk_db": COUCH_CHUNK_DB_NAME
        })
        
    def upload_file(self, user_prompt, file):
        """Process and upload a PDF file with comprehensive logging"""
        start_time = time.time()
        upload_id = f"upload_{int(start_time * 1000)}"
        
        logger.info(f"🚀 Starting file upload process", extra={
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

            # Extract PDF using Adobe
            extraction_start = time.time()
            logger.info(f"🔍 Starting PDF extraction with Adobe", extra={
                "upload_id": upload_id,
                "document_id": document_id
            })
            
            data, structured_data = extract_pdf_using_adobe(file, document_id)
            extraction_duration = (time.time() - extraction_start) * 1000
            
            logger.success(f"✂️ PDF extraction completed", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "extraction_duration": round(extraction_duration, 2),
                "extracted_length": len(data) if data else 0
            })
            
            # Process paragraphs
            para_process_start = time.time()
            paras, pages = adjust_para_tokens(data, MAX_PARA_LENGTH, 30)
            
            all_paras = ""
            for i in range(len(paras)):
                all_paras += f"Page {pages[i]}: {paras[i]}\n"
            
            para_process_duration = (time.time() - para_process_start) * 1000
            logger.info(f"📝 Paragraphs processed", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "paragraph_count": len(paras),
                "process_duration": round(para_process_duration, 2),
                "total_text_length": len(all_paras)
            })

            # Create chunks using original logic
            chunk_start = time.time()
            logger.info(f"✂️ Creating dynamic chunks from paragraphs", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "total_paragraphs": len(paras),
                "text_length": len(all_paras)
            })
            
            # Use the original chunking logic - dynamic based on content
            cleaned_text = self.text_processing.clean_text(all_paras)
            raw_chunks = self.text_processing.chunk_text(cleaned_text, CHUNK_SIZE)
            
            # Convert to our chunk format with metadata
            chunks = []
            for i, chunk_content in enumerate(raw_chunks):
                token_count = len(chunk_content) // 4  # Rough estimate: 1 token ≈ 4 characters
                chunks.append({
                    'content': chunk_content,
                    'token_count': token_count
                })
            
            chunk_duration = (time.time() - chunk_start) * 1000
            
            logger.success(f"📦 Created {len(chunks)} dynamic chunks", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "chunks_created": len(chunks),
                "chunk_duration": round(chunk_duration, 2),
                "chunk_size": CHUNK_SIZE
            })
            
            # Update document with chunk count (no auto-summary)
            doc_model.total_chunks = len(chunks)
            self.couch_client.save_to_db(COUCH_DOCUMENT_DB_NAME, doc_model)

            # Save chunks to database
            chunk_save_start = time.time()
            saved_chunks = 0
            
            for chunk_index, chunk in enumerate(chunks):
                chunk_id = generate_uid()
                chunk_model = ChunkModel(
                    _id=chunk_id,
                    document_id=document_id,
                    chunk_index=chunk_index,
                    content=chunk['content'],
                    summary="",  # Will be populated on-demand
                    token_count=chunk['token_count']
                )
                self.couch_client.save_to_db(COUCH_CHUNK_DB_NAME, chunk_model)
                saved_chunks += 1
            
            chunk_save_duration = (time.time() - chunk_save_start) * 1000
            logger.success(f"💾 Chunks saved to database", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "saved_chunks": saved_chunks,
                "save_duration": round(chunk_save_duration, 2)
            })
            
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
            
            logger.success(f"🎉 File upload process completed successfully", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "filename": filename,
                "total_duration": round(total_duration, 2),
                "file_size_bytes": file_size,
                "paragraphs_extracted": len(paras),
                "chunks_created": len(chunks)
            })
            
            # Log performance metrics
            LoggerUtils.log_performance("document_upload", total_duration,
                                      file_size=file_size,
                                      paragraphs=len(paras),
                                      chunks_created=len(chunks),
                                      extraction_duration=extraction_duration,
                                      chunk_duration=chunk_duration)
            
            return document_id
            
        except Exception as e:
            total_duration = (time.time() - start_time) * 1000
            logger.error(f"❌ File upload process failed: {str(e)}", extra={
                "upload_id": upload_id,
                "filename": file.filename if hasattr(file, 'filename') else 'unknown',
                "duration": round(total_duration, 2),
                "error_type": type(e).__name__
            })
            LoggerUtils.log_error_with_context(e, {
                "component": "document_upload",
                "upload_id": upload_id,
                "filename": file.filename if hasattr(file, 'filename') else 'unknown',
                "duration": total_duration
            })
            raise

    def get_document_chunks(self, document_id):
        """Get all chunks for a document"""
        try:
            # Get all chunk documents for this document_id
            chunk_db = self.couch_client.get_db(COUCH_CHUNK_DB_NAME)
            
            # Query by document_id (we'll need to iterate through all docs)
            chunks = []
            for doc_id in chunk_db:
                try:
                    chunk_doc = chunk_db[doc_id]
                    if chunk_doc.get('document_id') == document_id:
                        chunks.append({
                            'id': chunk_doc['_id'],
                            'chunk_index': chunk_doc.get('chunk_index', 0),
                            'content': chunk_doc.get('content', ''),
                            'summary': chunk_doc.get('summary', ''),
                            'token_count': chunk_doc.get('token_count', 0)
                        })
                except Exception as e:
                    logger.warning(f"⚠️ Skipping invalid chunk document: {doc_id}")
                    continue
            
            # Sort by chunk_index to ensure proper order
            chunks.sort(key=lambda x: x['chunk_index'])
            
            logger.info(f"📦 Retrieved chunks for document {document_id}", extra={
                "document_id": document_id,
                "chunks_found": len(chunks)
            })
            
            return chunks
            
        except Exception as e:
            logger.error(f"❌ Error retrieving chunks for document {document_id}: {str(e)}")
            return []

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
                "title": document_doc.get('title', 'Unknown')
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
            response = {
                'id': document_id,
                'title': document_doc.get('title', 'Unknown Document'),
                'file_extension': document_doc.get('file_extension', '.pdf'),
                'created_at': document_doc.get('created_at'),
                'summary': document_doc.get('file_summary', 'Summary not available'),
                'paragraphs': all_paragraphs
            }
            
            total_duration = (time.time() - start_time) * 1000
            logger.success(f"✅ Document retrieval completed", extra={
                "get_id": get_id,
                "document_id": document_id,
                "total_duration": round(total_duration, 2),
                "paragraphs_included": len(all_paragraphs),
                "summary_length": len(response['summary'])
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