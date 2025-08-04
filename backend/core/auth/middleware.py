from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from app.auth.services.auth_service import AuthService
from core.logger import logger

# HTTP Bearer token security scheme
security = HTTPBearer()


class AuthMiddleware:
    """Authentication middleware for FastAPI"""
    
    def __init__(self):
        self.auth_service = AuthService()
    
    async def get_current_user(self, credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
        """
        Dependency to get current authenticated user
        Use this for endpoints that require authentication
        """
        try:
            token = credentials.credentials
            user_data = self.auth_service.verify_token(token)
            
            if not user_data:
                logger.warning("⚠️ Invalid or expired token")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return user_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"❌ Authentication error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    async def get_current_user_optional(self, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
        """
        Dependency to get current user if token is provided
        Use this for endpoints where authentication is optional
        """
        if not credentials:
            return None
        
        try:
            token = credentials.credentials
            user_data = self.auth_service.verify_token(token)
            return user_data
        except Exception as e:
            logger.warning(f"⚠️ Optional authentication failed: {e}")
            return None


# Create global instance
auth_middleware = AuthMiddleware()

# Export dependencies for easy use in routes
get_current_user = auth_middleware.get_current_user
get_current_user_optional = auth_middleware.get_current_user_optional


def require_auth(user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """
    Simplified dependency for endpoints requiring authentication
    Usage: user = Depends(require_auth)
    """
    return user


def optional_auth(user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> Optional[Dict[str, Any]]:
    """
    Simplified dependency for endpoints with optional authentication
    Usage: user = Depends(optional_auth)
    """
    return user