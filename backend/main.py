from fastapi import FastAPI
import uvicorn
from core.configuration import *
from api.document.document import document_router

app = FastAPI()



app.include_router(document_router)





if __name__ == "__main__":
    uvicorn.run("main:app",host=SERVER_HOST, port=SERVER_PORT,reload=False)