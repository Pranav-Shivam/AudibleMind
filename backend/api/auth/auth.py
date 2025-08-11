from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.auth.services.auth_service import AuthService, AuthenticationError
from core.auth.middleware import require_auth, optional_auth
from core.logger import logger
import time

# Create router
auth_router = APIRouter()

# Initialize auth service
auth_service = AuthService()


# Request/Response Models
class UserRegistrationRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=6, max_length=128, description="User's password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "password": "securepassword123"
            }
        }


class UserLoginRequest(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")
    
    class Config:
        json_schema_extra = {
            "example": {
                "email": "john.doe@example.com",
                "password": "securepassword123"
            }
        }


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(..., description="Refresh token")


class AuthResponse(BaseModel):
    success: bool
    message: str
    token: Optional[str] = None
    refresh_token: Optional[str] = None
    user: Optional[dict] = None


class MessageResponse(BaseModel):
    success: bool
    message: str


class UserProfileResponse(BaseModel):
    success: bool
    user: dict


# Authentication Routes

@auth_router.post("/register", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserRegistrationRequest):
    """
    Register a new user account
    
    - **name**: User's full name (2-100 characters)
    - **email**: Valid email address
    - **password**: Password (6-128 characters)
    """
    start_time = time.time()
    
    try:
        result = auth_service.register_user(
            name=user_data.name,
            email=user_data.email,
            password=user_data.password
        )
        
        duration = (time.time() - start_time) * 1000
        logger.success(f"✅ User registration successful: {user_data.email}", extra={
            "email": user_data.email,
            "duration": round(duration, 2)
        })
        
        return MessageResponse(
            success=True,
            message="Account created successfully. You can now log in."
        )
        
    except AuthenticationError as e:
        duration = (time.time() - start_time) * 1000
        logger.warning(f"⚠️ Registration failed: {str(e)}", extra={
            "email": user_data.email,
            "duration": round(duration, 2)
        })
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"❌ Registration error: {str(e)}", extra={
            "email": user_data.email,
            "duration": round(duration, 2)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again."
        )


@auth_router.post("/login", response_model=AuthResponse)
async def login_user(login_data: UserLoginRequest):
    """
    Authenticate user and return access token
    
    - **email**: User's registered email address
    - **password**: User's password
    
    Returns JWT access token and refresh token for authenticated requests.
    """
    start_time = time.time()
    
    try:
        result = auth_service.login_user(
            email=login_data.email,
            password=login_data.password
        )
        
        duration = (time.time() - start_time) * 1000
        logger.success(f"✅ User login successful: {login_data.email}", extra={
            "email": login_data.email,
            "duration": round(duration, 2)
        })
        
        return AuthResponse(
            success=True,
            message="Login successful",
            token=result["token"],
            refresh_token=result["refresh_token"],
            user=result["user"]
        )
        
    except AuthenticationError as e:
        duration = (time.time() - start_time) * 1000
        logger.warning(f"⚠️ Login failed: {str(e)}", extra={
            "email": login_data.email,
            "duration": round(duration, 2)
        })
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        duration = (time.time() - start_time) * 1000
        logger.error(f"❌ Login error: {str(e)}", extra={
            "email": login_data.email,
            "duration": round(duration, 2)
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed. Please try again."
        )


@auth_router.post("/refresh", response_model=AuthResponse)
async def refresh_token(refresh_data: TokenRefreshRequest):
    """
    Refresh access token using refresh token
    
    - **refresh_token**: Valid refresh token
    
    Returns new access token if refresh token is valid.
    """
    try:
        result = auth_service.refresh_access_token(refresh_data.refresh_token)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )
        
        logger.info("🔄 Token refreshed successfully")
        
        return AuthResponse(
            success=True,
            message="Token refreshed successfully",
            token=result["token"],
            user=result["user"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Token refresh error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed. Please log in again."
        )


@auth_router.get("/verify-token", response_model=MessageResponse)
async def verify_token(user: dict = Depends(require_auth)):
    """
    Verify if the provided token is valid
    
    Requires: Bearer token in Authorization header
    
    Returns success message if token is valid.
    """
    logger.info(f"✅ Token verified for user: {user.get('email', 'unknown')}")
    
    return MessageResponse(
        success=True,
        message="Token is valid"
    )


@auth_router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(user: dict = Depends(require_auth)):
    """
    Get current user's profile information
    
    Requires: Bearer token in Authorization header
    
    Returns user profile data.
    """
    try:
        user_profile = auth_service.get_user_profile(user["user_id"])
        
        if not user_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found"
            )
        
        logger.info(f"📊 Profile retrieved for user: {user.get('email', 'unknown')}")
        
        return UserProfileResponse(
            success=True,
            user=user_profile
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Profile retrieval error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve profile"
        )


@auth_router.post("/logout", response_model=MessageResponse)
async def logout_user(user: dict = Depends(require_auth)):
    """
    Logout user (invalidate token on client side)
    
    Requires: Bearer token in Authorization header
    
    Note: With JWT tokens, logout is typically handled on the client side
    by removing the token. This endpoint can be used for logging purposes.
    """
    logger.info(f"👋 User logged out: {user.get('email', 'unknown')}")
    
    return MessageResponse(
        success=True,
        message="Logged out successfully"
    )


# Health check for auth service
@auth_router.get("/health", response_model=MessageResponse)
async def auth_health_check():
    """
    Health check endpoint for authentication service
    
    Returns service status and basic information.
    """
    return MessageResponse(
        success=True,
        message="Authentication service is healthy"
    )