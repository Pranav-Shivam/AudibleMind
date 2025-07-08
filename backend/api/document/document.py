from fastapi import APIRouter
from fastapi import APIRouter, UploadFile, File, Request, Depends

from app.document.services.document import DocumentService

document_router = APIRouter()


@document_router.get("/test")
def test():
    return "Success"



@document_router.post("/document/upload-file")
def upload_file(user_prompt:str, file: UploadFile = File(...)):
    return DocumentService().upload_file(user_prompt,file)