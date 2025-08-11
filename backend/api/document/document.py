from fastapi import APIRouter, UploadFile, File, Form, Request, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.document.services.document import DocumentService
from core.auth.middleware import require_auth
from core.logger import logger
from core.configuration import COUCH_DOCUMENT_DB_NAME

document_router = APIRouter()

# Request models
class EnhanceDocumentRequest(BaseModel):
    prompt: Optional[str] = None


@document_router.get("/test")
def test():
    return "Success"


@document_router.get("/document")
def list_user_documents(user: Dict[str, Any] = Depends(require_auth)):
    """Get all documents for the authenticated user"""
    document_service = DocumentService()
    documents = document_service.get_user_documents(user["user_id"])
    return {
        "documents": documents,
        "total": len(documents)
    }


@document_router.post("/document/upload-file")
def upload_file(
    file: UploadFile = File(...), 
    user_prompt: str = Form(""),
    user: Dict[str, Any] = Depends(require_auth)
):
    """Upload a PDF file with optional user prompt for summarization"""
    try:
        return DocumentService().upload_file(user_prompt, file, user["user_id"])
    except ValueError as ve:
        # Known validation error (e.g., no text extracted)
        logger.error(f"Validation error while uploading file: {str(ve)}")
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        # Unexpected errors
        logger.error(f"Unexpected error while uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error processing document upload")


@document_router.get("/aud_pdf/{document_id}/{filename}")
def serve_pdf_file(document_id: str, filename: str):
    """Serve PDF file for viewing"""
    from fastapi.responses import StreamingResponse
    import io
    
    document_service = DocumentService()
    pdf_data = document_service.get_pdf_file(document_id, filename)
    
    if not pdf_data:
        raise HTTPException(status_code=404, detail="PDF file not found")
    
    return StreamingResponse(
        io.BytesIO(pdf_data),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={filename}"}
    )


@document_router.get("/document/{document_id}")
def get_document(document_id: str, user: Dict[str, Any] = Depends(require_auth)):
    """Get document details including summary and paragraphs"""
    document_service = DocumentService()
    
    # Verify user owns this document
    if not document_service.user_owns_document(user["user_id"], document_id):
        raise HTTPException(status_code=403, detail="Access denied to this document")
    
    document = document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@document_router.get("/document/{document_id}/chunks")
def get_document_chunks(document_id: str, user: Dict[str, Any] = Depends(require_auth)):
    """Get all chunks for a document (dynamic number based on content)"""
    document_service = DocumentService()
    
    # First check if document exists
    document = document_service.get_document(document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Verify user owns this document
    if not document_service.user_owns_document(user["user_id"], document_id):
        raise HTTPException(status_code=403, detail="Access denied to this document")
    
    chunks = document_service.get_document_chunks(document_id)
    
    if not chunks:
        # Check if this document has chunks that need to be created
        # This might happen if the document was uploaded but chunk processing failed
        logger.warning(f"No chunks found for document {document_id}, attempting to create chunks")
        
        # Try to trigger chunk creation if the document exists but has no chunks
        try:
            # Get the document to see if we can recreate chunks
            doc_db = document_service.couch_client.get_db(COUCH_DOCUMENT_DB_NAME)
            doc = doc_db.get(document_id)
            
            if doc:
                # Document exists but no chunks - this is a data inconsistency
                raise HTTPException(
                    status_code=422, 
                    detail=f"Document exists but has no processed chunks. Document may need to be re-uploaded or processed."
                )
            else:
                raise HTTPException(status_code=404, detail="Document not found")
        except Exception as e:
            logger.error(f"Error checking document consistency: {str(e)}")
            raise HTTPException(status_code=500, detail="Error retrieving document chunks")
    
    return {
        "document_id": document_id,
        "total_chunks": len(chunks),
        "chunks": chunks
    }


@document_router.post("/document/{document_id}/chunks")
def enhance_document_chunks(
    document_id: str, 
    request: EnhanceDocumentRequest,
    user: Dict[str, Any] = Depends(require_auth)
):
    """Enhance document chunks with AI analysis - with optional user prompt"""
    document_service = DocumentService()
    
    # Verify user owns this document
    if not document_service.user_owns_document(user["user_id"], document_id):
        raise HTTPException(status_code=403, detail="Access denied to this document")
    
    result = document_service.enhance_document_chunks(document_id, request.prompt)
    
    if not result:
        raise HTTPException(status_code=404, detail="Document not found or could not be enhanced")
    
    return {
        "document_id": document_id,
        "message": "Document enhanced successfully",
        "enhanced_chunks": result.get("enhanced_chunks", 0),
        "analysis_type": "custom_prompt" if request.prompt else "default_ai"
    }


@document_router.post("/document/{document_id}/chunks/{chunk_index}/summarize")
def summarize_chunk(
    document_id: str, 
    chunk_index: int, 
    user_prompt: str = Form(""),
    user: Dict[str, Any] = Depends(require_auth)
):
    """Summarize a specific chunk on-demand"""
    if chunk_index < 0:
        raise HTTPException(status_code=400, detail="Chunk index must be non-negative")
    
    document_service = DocumentService()
    
    # Verify user owns this document
    if not document_service.user_owns_document(user["user_id"], document_id):
        raise HTTPException(status_code=403, detail="Access denied to this document")
    
    summary = document_service.summarize_chunk(document_id, chunk_index, user_prompt)
    
    if summary is None:
        raise HTTPException(status_code=404, detail="Chunk not found or could not be summarized")
    
    return {
        "document_id": document_id,
        "chunk_index": chunk_index,
        "summary": summary
    }