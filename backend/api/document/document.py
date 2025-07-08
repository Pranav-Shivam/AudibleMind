from fastapi import APIRouter



document_router = APIRouter()


@document_router.get("/test")
def test():
    return "Success"



