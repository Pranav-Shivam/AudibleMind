import os
from typing import Optional, List
from dataclasses import dataclass


@dataclass
class DatabaseConfig:
    """Database configuration settings"""
    username: str = os.getenv("COUCH_USERNAME", "root")
    password: str = os.getenv("COUCH_PASSWORD", "root")
    host: str = os.getenv("COUCH_HOST", "localhost")
    port: int = int(os.getenv("COUCH_PORT", "5984"))
    
    # Database names
    pdf_db_name: str = "aud_pdf"
    document_db_name: str = "aud_documents"
    paragraph_db_name: str = "aud_paras"
    chunk_db_name: str = "aud_chunks"
    bundle_db_name: str = "aud_bundles"
    user_db_name: str = "aud_users"

@dataclass
class ServerConfig:
    """Server configuration settings"""
    host: str = os.getenv("SERVER_HOST", "0.0.0.0")
    port: int = int(os.getenv("SERVER_PORT", "8001"))
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")


@dataclass
class OllamaConfig:
    """Ollama configuration settings"""
    # model: str = os.getenv("OLLAMA_MODEL", "llama3:8b-instruct-q4_K_M") #ollama pull tinyllama:chat, llama3.2:latest 
    model: str = os.getenv("OLLAMA_MODEL", "phi3:3.8b") #ollama pull tinyllama:chat, llama3.2:latest 
    small_model: str = os.getenv("OLLAMA_SMALL_MODEL", "phi3:instruct")
    temperature: float = float(os.getenv("OLLAMA_TEMPERATURE", "0.3"))
    max_tokens: int = int(os.getenv("OLLAMA_MAX_TOKENS", "1000"))
    top_p: float = float(os.getenv("OLLAMA_TOP_P", "0.9"))
    num_ctx: int = int(os.getenv("OLLAMA_NUM_CTX", "4096"))


@dataclass
class OpenAIConfig:
    """OpenAI configuration settings"""
    api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    model: str = os.getenv("OPENAI_MODEL", "gpt-4o")
    max_tokens: int = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
    temperature: float = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))


@dataclass
class AdobeConfig:
    """Adobe API configuration settings"""
    client_id: str = os.getenv("ADOBE_CLIENT_ID", "cce743676d404aaa9e469b616a56418c")
    client_secret: str = os.getenv("ADOBE_CLIENT_SECRET", "p8e-g2otO2nUCz1UYhvJrTDG451-8EYqoYb6")


@dataclass
class ProcessingConfig:
    """Text processing configuration settings"""
    max_paragraph_length: int = int(os.getenv("MAX_PARA_LENGTH", "700"))
    chunk_size: int = int(os.getenv("CHUNK_SIZE", "2500"))
    max_history_tokens: int = int(os.getenv("MAX_HISTORY_TOKENS", "1000"))

@dataclass
class ChunkingConfig:
    """Chunking configuration settings"""
    max_tokens_per_chunk: int = int(os.getenv("MAX_TOKENS_PER_CHUNK", "450"))
    overlap_tokens: int = int(os.getenv("OVERLAP_TOKENS", "50"))

@dataclass
class AppConfig:
    """Application configuration settings"""
    default_llm_provider: str = os.getenv("DEFAULT_LLM_PROVIDER", "ollama")
    max_turns_per_learner: int = int(os.getenv("MAX_TURNS_PER_LEARNER", "3"))
    rate_limit_per_minute: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", "60"))
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "app.log")
    
    # Authentication settings
    jwt_secret_key: str = os.getenv("JWT_SECRET_KEY", "7590598dcebdfd73a808a37e97a01ae5cd19e7bdb9b4838243fc7c10e33b3a6c")
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    cors_origins: str = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8001,http://localhost:5173")


class Config:
    """Main configuration class that consolidates all settings"""
    
    def __init__(self):
        self.database = DatabaseConfig()
        self.server = ServerConfig()
        self.ollama = OllamaConfig()
        self.openai = OpenAIConfig()
        self.adobe = AdobeConfig()
        self.processing = ProcessingConfig()
        self.chunking = ChunkingConfig()
        self.app = AppConfig()
    
    def validate(self) -> bool:
        """Validate that required configuration is present"""
        if self.app.default_llm_provider == "openai" and not self.openai.api_key:
            print("Warning: OpenAI API key is required when using OpenAI as default provider")
            return False
        return True
    
    def get_cors_origins(self) -> List[str]:
        """Get CORS origins as a list"""
        return [origin.strip() for origin in self.app.cors_origins.split(",") if origin.strip()]
    
    def get_database_url(self) -> str:
        """Get the database connection URL"""
        return f"http://{self.database.username}:{self.database.password}@{self.database.host}:{self.database.port}"
    
    def get_server_url(self) -> str:
        """Get the server URL"""
        return f"http://{self.server.host}:{self.server.port}"


# Global configuration instance
config = Config()

# Legacy compatibility - keeping these for backward compatibility
# These will be deprecated in future versions
SERVER_HOST = config.server.host
SERVER_PORT = config.server.port

COUCH_USERNAME = config.database.username
COUCH_PASSWORD = config.database.password
COUCH_HOST = config.database.host
COUCH_PORT = config.database.port

COUCH_PDF_DB_NAME = config.database.pdf_db_name
COUCH_DOCUMENT_DB_NAME = config.database.document_db_name
COUCH_PARAGRAPH_DB_NAME = config.database.paragraph_db_name
COUCH_CHUNK_DB_NAME = config.database.chunk_db_name
COUCH_BUNDLE_DB_NAME = config.database.bundle_db_name

OPENAI_KEY = config.openai.api_key
OPENAI_MODEL = config.openai.model

ADOBE_CLIENT_ID = config.adobe.client_id
ADOBE_CLIENT_SECRET = config.adobe.client_secret

MAX_PARA_LENGTH = config.processing.max_paragraph_length
OLLAMA_MODEL = config.ollama.model
CHUNK_SIZE = config.processing.chunk_size
CURRENT_MAX_TOKENS = config.chunking.max_tokens_per_chunk
CURRENT_OVERLAP_TOKENS = config.chunking.overlap_tokens