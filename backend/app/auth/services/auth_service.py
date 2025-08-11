from typing import Optional, Dict, Any
from datetime import datetime
from app.auth.models.user import UserModel
from core.auth.security import PasswordUtils, TokenUtils, SecurityUtils
from core.db.couch_conn import CouchDBConnection
from core.logger import logger
from core.configuration import config
import time


class AuthenticationError(Exception):
    """Custom exception for authentication errors"""
    pass


class AuthService:
    """Service class for authentication operations"""
    
    def __init__(self):
        self.couch_client = CouchDBConnection()
        self.users_db_name = config.database.user_db_name
        logger.info("🔐 Initializing AuthService")
    
    def register_user(self, name: str, email: str, password: str) -> Dict[str, Any]:
        """Register a new user"""
        start_time = time.time()
        
        try:
            # Validate input
            email_valid, email_msg = SecurityUtils.validate_email(email)
            if not email_valid:
                raise AuthenticationError(email_msg)
            
            password_valid, password_msg = SecurityUtils.is_password_strong(password)
            if not password_valid:
                raise AuthenticationError(password_msg)
            
            if not name or len(name.strip()) < 2:
                raise AuthenticationError("Name must be at least 2 characters long")
            
            # Check if user already exists
            if self._user_exists(email):
                raise AuthenticationError("User with this email already exists")
            
            # Hash password
            password_hash = PasswordUtils.hash_password(password)
            
            # Create user model
            user = UserModel.create_user(
                email=email.lower().strip(),
                name=name.strip(),
                password_hash=password_hash
            )
            
            # Save to database
            user_id = self.couch_client.save_to_db(self.users_db_name, user)
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"✅ User registered successfully: {email}", extra={
                "user_id": user_id,
                "email": email,
                "duration": round(duration, 2)
            })
            
            return {
                "success": True,
                "message": "User registered successfully",
                "user_id": user_id
            }
            
        except AuthenticationError:
            raise
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Registration failed for {email}: {e}", extra={
                "email": email,
                "duration": round(duration, 2)
            })
            raise AuthenticationError("Registration failed. Please try again.")
    
    def login_user(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate user and return tokens"""
        start_time = time.time()
        
        try:
            # Validate input
            if not email or not password:
                raise AuthenticationError("Email and password are required")
            
            # Get user from database
            user = self._get_user_by_email(email.lower().strip())
            if not user:
                raise AuthenticationError("Invalid email or password")
            
            # Check if user is active
            if not user.is_active:
                raise AuthenticationError("Account is deactivated")
            
            # Verify password
            if not PasswordUtils.verify_password(password, user.password_hash):
                raise AuthenticationError("Invalid email or password")
            
            # Update last login
            user.update_last_login()
            
            # Save updated user
            db = self.couch_client.get_db(self.users_db_name)
            user.store(db)
            
            # Create tokens
            token_data = {"sub": user.id, "email": user.email, "name": user.name}
            access_token = TokenUtils.create_access_token(token_data)
            refresh_token = TokenUtils.create_refresh_token(user.id)
            
            duration = (time.time() - start_time) * 1000
            logger.success(f"✅ User logged in successfully: {email}", extra={
                "user_id": user.id,
                "email": email,
                "duration": round(duration, 2)
            })
            
            return {
                "success": True,
                "message": "Login successful",
                "token": access_token,
                "refresh_token": refresh_token,
                "user": user.to_dict()
            }
            
        except AuthenticationError:
            duration = (time.time() - start_time) * 1000
            logger.warning(f"⚠️ Login failed for {email}", extra={
                "email": email,
                "duration": round(duration, 2)
            })
            raise
        except Exception as e:
            duration = (time.time() - start_time) * 1000
            logger.error(f"❌ Login error for {email}: {e}", extra={
                "email": email,
                "duration": round(duration, 2)
            })
            raise AuthenticationError("Login failed. Please try again.")
    
    def verify_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Verify JWT token and return user data"""
        try:
            payload = TokenUtils.verify_token(token)
            if not payload:
                return None
            
            user_id = payload.get("sub")
            user = self._get_user_by_id(user_id)
            
            if not user or not user.is_active:
                return None
            
            return {
                "user_id": user.id,
                "email": user.email,
                "name": user.name,
                "is_verified": user.is_verified
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Token verification failed: {e}")
            return None
    
    def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """Generate new access token from refresh token"""
        try:
            payload = TokenUtils.verify_token(refresh_token)
            if not payload or payload.get("type") != "refresh_token":
                return None
            
            user_id = payload.get("sub")
            user = self._get_user_by_id(user_id)
            
            if not user or not user.is_active:
                return None
            
            # Create new access token
            token_data = {"sub": user.id, "email": user.email, "name": user.name}
            access_token = TokenUtils.create_access_token(token_data)
            
            logger.info(f"🔄 Access token refreshed for user: {user.email}")
            
            return {
                "success": True,
                "token": access_token,
                "user": user.to_dict()
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Token refresh failed: {e}")
            return None
    
    def get_user_profile(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user profile by ID"""
        try:
            user = self._get_user_by_id(user_id)
            if user:
                return user.to_dict()
            return None
        except Exception as e:
            logger.error(f"❌ Failed to get user profile for {user_id}: {e}")
            return None
    
    def _user_exists(self, email: str) -> bool:
        """Check if user with email exists"""
        try:
            db = self.couch_client.get_db(self.users_db_name)
            for row in db.view('_all_docs', include_docs=True):
                if not row.id.startswith('_design'):
                    doc = row.doc
                    if doc.get('email') == email.lower().strip():
                        return True
            return False
        except Exception as e:
            logger.error(f"❌ Error checking if user exists: {e}")
            return False
    
    def _get_user_by_email(self, email: str) -> Optional[UserModel]:
        """Get user by email address"""
        try:
            db = self.couch_client.get_db(self.users_db_name)
            for row in db.view('_all_docs', include_docs=True):
                if not row.id.startswith('_design'):
                    doc = row.doc
                    if doc.get('email') == email.lower().strip():
                        user = UserModel.load(db, row.id)
                        return user
            return None
        except Exception as e:
            logger.error(f"❌ Error getting user by email {email}: {e}")
            return None
    
    def _get_user_by_id(self, user_id: str) -> Optional[UserModel]:
        """Get user by ID"""
        try:
            db = self.couch_client.get_db(self.users_db_name)
            user = UserModel.load(db, user_id)
            return user
        except Exception as e:
            logger.error(f"❌ Error getting user by ID {user_id}: {e}")
            return None