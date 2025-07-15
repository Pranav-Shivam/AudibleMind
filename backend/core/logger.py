import sys
import os
from pathlib import Path
from loguru import logger
from typing import Dict, Any
from datetime import datetime


class LoggerConfig:
    """Centralized Loguru logger configuration for AudibleMind backend"""
    
    def __init__(self):
        self.log_dir = Path("logs")
        self.log_dir.mkdir(exist_ok=True)
        self.setup_logger()
    
    def setup_logger(self):
        """Configure Loguru logger with multiple handlers and formats"""
        
        # Remove default handler
        logger.remove()
        
        # Console handler with colored output
        logger.add(
            sys.stderr,
            format="<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
                   "<level>{level: <8}</level> | "
                   "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
                   "<level>{message}</level>",
            level="INFO",
            colorize=True,
            backtrace=True,
            diagnose=True
        )
        
        # Main application log file (rotating)
        logger.add(
            self.log_dir / "app_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="30 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message}",
            level="DEBUG",
            enqueue=True
        )
        
        # Error-only log file for critical issues
        logger.add(
            self.log_dir / "errors_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="60 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {name}:{function}:{line} | {message} | {extra}",
            level="ERROR",
            enqueue=True
        )
        
        # API requests log file (for monitoring)
        logger.add(
            self.log_dir / "api_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="14 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {extra[endpoint]} | {extra[method]} | {extra[status_code]} | {extra[duration]}ms | {message}",
            level="INFO",
            filter=lambda record: "api_request" in record["extra"],
            enqueue=True
        )
        
        # Database operations log file
        logger.add(
            self.log_dir / "database_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="14 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {extra[operation]} | {extra[db_name]} | {message}",
            level="DEBUG",
            filter=lambda record: "db_operation" in record["extra"],
            enqueue=True
        )
        
        # LLM operations log file
        logger.add(
            self.log_dir / "llm_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="7 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | {extra[provider]} | {extra[model]} | {extra[tokens]} | {extra[duration]}ms | {message}",
            level="DEBUG",
            filter=lambda record: "llm_operation" in record["extra"],
            enqueue=True
        )
        
        # Performance monitoring log
        logger.add(
            self.log_dir / "performance_{time:YYYY-MM-DD}.log",
            rotation="1 day",
            retention="7 days",
            compression="zip",
            format="{time:YYYY-MM-DD HH:mm:ss.SSS} | {extra[operation]} | {extra[duration]}ms | {extra[memory_usage]}MB | {message}",
            level="INFO",
            filter=lambda record: "performance" in record["extra"],
            enqueue=True
        )
        
        logger.info("🚀 Loguru logger initialized successfully", 
                   extra={"startup": True, "log_dir": str(self.log_dir)})


# Logger utility functions for structured logging
class LoggerUtils:
    """Utility functions for structured logging throughout the application"""
    
    @staticmethod
    def log_api_request(endpoint: str, method: str, status_code: int, duration: float, user_id: str = None, **kwargs):
        """Log API request details"""
        extra = {
            "api_request": True,
            "endpoint": endpoint,
            "method": method,
            "status_code": status_code,
            "duration": round(duration, 2),
            "user_id": user_id or "anonymous"
        }
        extra.update(kwargs)
        
        level = "ERROR" if status_code >= 400 else "INFO"
        logger.log(level, f"API {method} {endpoint} - {status_code}", extra=extra)
    
    @staticmethod
    def log_db_operation(operation: str, db_name: str, doc_id: str = None, duration: float = None, **kwargs):
        """Log database operations"""
        extra = {
            "db_operation": True,
            "operation": operation,
            "db_name": db_name,
            "doc_id": doc_id,
            "duration": round(duration, 2) if duration else None
        }
        extra.update(kwargs)
        
        logger.info(f"DB {operation} on {db_name}", extra=extra)
    
    @staticmethod
    def log_llm_operation(provider: str, model: str, tokens: int = None, duration: float = None, **kwargs):
        """Log LLM operations"""
        extra = {
            "llm_operation": True,
            "provider": provider,
            "model": model,
            "tokens": tokens or 0,
            "duration": round(duration, 2) if duration else None
        }
        extra.update(kwargs)
        
        logger.info(f"LLM {provider} call with {model}", extra=extra)
    
    @staticmethod
    def log_performance(operation: str, duration: float, memory_usage: float = None, **kwargs):
        """Log performance metrics"""
        extra = {
            "performance": True,
            "operation": operation,
            "duration": round(duration, 2),
            "memory_usage": round(memory_usage, 2) if memory_usage else None
        }
        extra.update(kwargs)
        
        logger.info(f"Performance: {operation}", extra=extra)
    
    @staticmethod
    def log_error_with_context(error: Exception, context: Dict[str, Any] = None, **kwargs):
        """Log errors with full context"""
        extra = {
            "error_type": type(error).__name__,
            "error_message": str(error),
            "context": context or {}
        }
        extra.update(kwargs)
        
        logger.error(f"Error occurred: {error}", extra=extra, exception=error)
    
    @staticmethod
    def log_startup_info(component: str, version: str = None, **kwargs):
        """Log application startup information"""
        extra = {
            "startup": True,
            "component": component,
            "version": version,
            "timestamp": datetime.now().isoformat()
        }
        extra.update(kwargs)
        
        logger.info(f"Starting {component}", extra=extra)
    
    @staticmethod
    def log_file_operation(operation: str, file_path: str, file_size: int = None, duration: float = None, **kwargs):
        """Log file operations"""
        extra = {
            "file_operation": True,
            "operation": operation,
            "file_path": file_path,
            "file_size": file_size,
            "duration": round(duration, 2) if duration else None
        }
        extra.update(kwargs)
        
        logger.info(f"File {operation}: {file_path}", extra=extra)


# Initialize logger configuration
logger_config = LoggerConfig()

# Export configured logger for use throughout the application
__all__ = ["logger", "LoggerUtils"] 