from core.db.couch_conn import CouchDBConnection
from core.configuration import *
from core.utils.helper import generate_uid
from core.utils.pdf_extraction_utils import extract_pdf_using_adobe
from core.utils.adobe_parser import adjust_para_tokens
from app.document.models.document import *
from datetime import datetime
from core.ollama_setup.document_summary import DocumentSummarizer
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
        
        init_duration = (time.time() - start_time) * 1000
        logger.success(f"✅ DocumentService initialized", extra={
            "init_duration": round(init_duration, 2),
            "pdf_db": COUCH_PDF_DB_NAME,
            "document_db": COUCH_DOCUMENT_DB_NAME,
            "paragraph_db": COUCH_PARAGRAPH_DB_NAME
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

            # Generate summary
            summary_start = time.time()
            logger.info(f"🤖 Starting document summarization", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "text_length": len(all_paras)
            })
            
            file_summary = self.document_summarizer.summarize_document(all_paras, user_prompt)
            summary_duration = (time.time() - summary_start) * 1000
            
            logger.success(f"📋 Document summary generated", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "summary_length": len(file_summary),
                "summary_duration": round(summary_duration, 2)
            })
            
            # Update document with summary
            doc_model.file_summary = file_summary
            self.couch_client.save_to_db(COUCH_DOCUMENT_DB_NAME, doc_model)

            # Save paragraphs to database
            para_save_start = time.time()
            saved_paragraphs = 0
            
            for para in paras:
                pid = generate_uid()
                doc = ParagraphModel(_id=pid, text=para)
                self.couch_client.save_to_db(COUCH_PARAGRAPH_DB_NAME, doc)
                saved_paragraphs += 1
            
            para_save_duration = (time.time() - para_save_start) * 1000
            logger.success(f"💾 Paragraphs saved to database", extra={
                "upload_id": upload_id,
                "document_id": document_id,
                "saved_paragraphs": saved_paragraphs,
                "save_duration": round(para_save_duration, 2)
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
                "summary_length": len(file_summary)
            })
            
            # Log performance metrics
            LoggerUtils.log_performance("document_upload", total_duration,
                                      file_size=file_size,
                                      paragraphs=len(paras),
                                      extraction_duration=extraction_duration,
                                      summary_duration=summary_duration)
            
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