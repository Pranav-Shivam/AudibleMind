from couchdb.mapping import Document, TextField, DateTimeField, BooleanField
from datetime import datetime
from typing import Optional
import uuid


class UserModel(Document):
    """User model for CouchDB storage"""
    
    # Core fields
    email = TextField()
    name = TextField()
    password_hash = TextField()
    
    # Metadata
    created_at = DateTimeField(default=datetime.now)
    updated_at = DateTimeField(default=datetime.now)
    last_login = DateTimeField()
    
    # Status
    is_active = BooleanField(default=True)
    is_verified = BooleanField(default=False)
    
    # Optional profile data
    profile_picture = TextField()
    bio = TextField()
    
    def __init__(self, _id=None, **kwargs):
        # Generate UUID if no ID provided
        if _id is None:
            _id = f"user_{uuid.uuid4().hex}"
        super().__init__(_id=_id, **kwargs)
    
    def to_dict(self, include_password=False):
        """Convert user model to dictionary for API responses"""
        data = {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'profile_picture': self.profile_picture,
            'bio': self.bio
        }
        
        if include_password:
            data['password_hash'] = self.password_hash
            
        return data
    
    def update_last_login(self):
        """Update the last login timestamp"""
        self.last_login = datetime.now()
        self.updated_at = datetime.now()
    
    def update_profile(self, **kwargs):
        """Update user profile fields"""
        updatable_fields = ['name', 'bio', 'profile_picture']
        
        for field, value in kwargs.items():
            if field in updatable_fields and hasattr(self, field):
                setattr(self, field, value)
        
        self.updated_at = datetime.now()
    
    def deactivate(self):
        """Deactivate user account"""
        self.is_active = False
        self.updated_at = datetime.now()
    
    def verify_email(self):
        """Mark user email as verified"""
        self.is_verified = True
        self.updated_at = datetime.now()
    
    @classmethod
    def create_user(cls, email: str, name: str, password_hash: str) -> 'UserModel':
        """Factory method to create a new user"""
        user = cls(
            email=email.lower().strip(),
            name=name.strip(),
            password_hash=password_hash,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        return user