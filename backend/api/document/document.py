from fastapi import APIRouter, UploadFile, File, Form, Request, Depends, HTTPException

from app.document.services.document import DocumentService

document_router = APIRouter()


@document_router.get("/test")
def test():
    return "Success"


@document_router.post("/document/upload-file")
def upload_file(file: UploadFile = File(...), user_prompt: str = Form("")):
    """Upload a PDF file with optional user prompt for summarization"""
    return DocumentService().upload_file(user_prompt, file)


@document_router.get("/document/{document_id}")
def get_document(document_id: str):
    """Get document details including summary and paragraphs"""
    document_service = DocumentService()
    document = document_service.get_document(document_id)
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return document


@document_router.get("/document/{document_id}/chunks")
def get_document_chunks(document_id: str):
    """Get all chunks for a document (dynamic number based on content)"""
    document_service = DocumentService()
    chunks = document_service.get_document_chunks(document_id)
    
    if not chunks:
        raise HTTPException(status_code=404, detail="Document chunks not found")
    
    return {
        "document_id": document_id,
        "total_chunks": len(chunks),
        "chunks": chunks
    }


@document_router.post("/document/{document_id}/chunks/{chunk_index}/summarize")
def summarize_chunk(document_id: str, chunk_index: int, user_prompt: str = Form("")):
    """Summarize a specific chunk on-demand"""
    if chunk_index < 0:
        raise HTTPException(status_code=400, detail="Chunk index must be non-negative")
    
    document_service = DocumentService()
    summary = document_service.summarize_chunk(document_id, chunk_index, user_prompt)
    
    if summary is None:
        raise HTTPException(status_code=404, detail="Chunk not found or could not be summarized")
    
    return {
        "document_id": document_id,
        "chunk_index": chunk_index,
        "summary": summary
    }