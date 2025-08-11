from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
import uvicorn
import time
import psutil
import os
import nltk
from core.configuration import config
from core.logger import logger, LoggerUtils
from api.document.document import document_router
from api.chats.chats import router as chats_router
from api.audio.audio import audio_router
from api.auth.auth import auth_router


# Log application startup
LoggerUtils.log_startup_info("AudibleMind Backend", "1.0.0", 
                           host=config.server.host, 
                           port=config.server.port,
                           environment=config.server.environment)

app = FastAPI(
    title="AudibleMind Backend API",
    description="AI-powered educational document processing and conversation generation",
    version="1.0.0"
)

# Add exception handler for request validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=400,
        content={
            "detail": "Invalid request format. Please check your JSON syntax.",
            "error": str(exc)
        }
    )

# Add CORS middleware
cors_origins = config.get_cors_origins()
logger.info(f"🌐 Configuring CORS for origins: {cors_origins}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("🔄 Downloading nltk resources")
nltk.download('punkt')
nltk.download('stopwords')
logger.info("✅ nltk resources downloaded successfully")

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    # Log incoming request
    logger.info(f"🔄 Incoming request: {request.method} {request.url.path}", 
               extra={"method": request.method, "path": request.url.path, "client_ip": request.client.host})
    
    # Process request
    response = await call_next(request)
    
    # Calculate duration and log response
    duration = (time.time() - start_time) * 1000
    
    LoggerUtils.log_api_request(
        endpoint=str(request.url.path),
        method=request.method,
        status_code=response.status_code,
        duration=duration,
        user_id=request.headers.get("user-id"),
        client_ip=request.client.host,
        user_agent=request.headers.get("user-agent")
    )
    
    return response

# Add startup event
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 FastAPI application starting up")
    
    # Log system information
    memory_info = psutil.virtual_memory()
    cpu_count = psutil.cpu_count()
    
    logger.info(f"💻 System Info - CPU: {cpu_count} cores, Memory: {memory_info.total // (1024**3)}GB total, {memory_info.available // (1024**3)}GB available")
    
    # Log configuration
    logger.info(f"⚙️ Configuration - Environment: {config.server.environment}, Debug: {config.server.debug}")
    logger.info(f"🗄️ Database - Host: {config.database.host}:{config.database.port}")
    logger.info(f"🤖 LLM Provider - Default: {config.app.default_llm_provider}")
    
    # Test database connection
    try:
        from core.db.couch_conn import CouchDBConnection
        db_conn = CouchDBConnection()
        if db_conn.conn:
            logger.success("✅ Database connection established successfully")
        else:
            logger.error("❌ Failed to establish database connection")
    except Exception as e:
        LoggerUtils.log_error_with_context(e, {"component": "database_startup"})

# Add shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 FastAPI application shutting down")

# Include routers
logger.info("📋 Registering API routers")
app.include_router(auth_router, prefix="/api", tags=["authentication"])
app.include_router(document_router, tags=["documents"])
app.include_router(chats_router, tags=["chats"])
app.include_router(audio_router, prefix="/audio", tags=["audio"])
logger.info("✅ All routers registered successfully")

if __name__ == "__main__":
    logger.info(f"🌟 Starting server on {config.server.host}:{config.server.port}")
    uvicorn.run(
        "main:app", 
        host=config.server.host, 
        port=config.server.port, 
        # reload=config.server.debug,
        reload=False,
        log_level="info" if not config.server.debug else "debug"
    )