from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from passlib.context import CryptContext
from jose import JWTError, jwt
from core.configuration import config
from core.logger import logger
import secrets

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = config.app.jwt_secret_key
ALGORITHM = config.app.jwt_algorithm
ACCESS_TOKEN_EXPIRE_MINUTES = config.app.access_token_expire_minutes * 24 * 7  # 7 days


class PasswordUtils:
    """Utility class for password operations"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password for storing"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)


class TokenUtils:
    """Utility class for JWT token operations"""
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access_token"})
        
        try:
            encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
            logger.info(f"🔐 Created access token for user: {data.get('sub', 'unknown')}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"❌ Failed to create access token: {e}")
            raise
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """Verify and decode a JWT token"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            
            # Check token type
            if payload.get("type") != "access_token":
                logger.warning("⚠️ Invalid token type")
                return None
            
            # Check expiration
            exp = payload.get("exp")
            if exp is None or datetime.utcfromtimestamp(exp) < datetime.utcnow():
                logger.warning("⚠️ Token has expired")
                return None
            
            user_id = payload.get("sub")
            if user_id is None:
                logger.warning("⚠️ Token missing user ID")
                return None
            
            logger.debug(f"✅ Token verified for user: {user_id}")
            return payload
            
        except JWTError as e:
            logger.warning(f"⚠️ JWT validation error: {e}")
            return None
        except Exception as e:
            logger.error(f"❌ Unexpected error verifying token: {e}")
            return None
    
    @staticmethod
    def create_refresh_token(user_id: str) -> str:
        """Create a refresh token for token renewal"""
        data = {
            "sub": user_id,
            "type": "refresh_token"
        }
        expire = datetime.utcnow() + timedelta(days=30)  # 30 days for refresh token
        data.update({"exp": expire})
        
        try:
            encoded_jwt = jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)
            logger.info(f"🔄 Created refresh token for user: {user_id}")
            return encoded_jwt
        except Exception as e:
            logger.error(f"❌ Failed to create refresh token: {e}")
            raise


class SecurityUtils:
    """General security utilities"""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate a secure random token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def is_password_strong(password: str) -> tuple[bool, str]:
        """Check if password meets security requirements"""
        if len(password) < 6:
            return False, "Password must be at least 6 characters long"
        
        if len(password) > 128:
            return False, "Password must be less than 128 characters"
        
        # Additional password strength checks can be added here
        has_letter = any(c.isalpha() for c in password)
        has_number = any(c.isdigit() for c in password)
        
        if not has_letter:
            return False, "Password must contain at least one letter"
        
        # For now, we'll keep it simple for demo purposes
        return True, "Password is acceptable"
    
    @staticmethod
    def validate_email(email: str) -> tuple[bool, str]:
        """Basic email validation"""
        import re
        
        if not email:
            return False, "Email is required"
        
        # Basic email regex
        email_pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_pattern, email):
            return False, "Invalid email format"
        
        if len(email) > 255:
            return False, "Email is too long"
        
        return True, "Email is valid"