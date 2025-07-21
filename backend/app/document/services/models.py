from pydantic import BaseModel
from typing import List, Optional

class ChunkResponse(BaseModel):
    id: str
    chunk_index: int 
    content: str
    summary: Optional[str] = ''
    token_count: int = 0
    page_number: int = 0
    number_of_words: int = 0
    is_user_liked: bool = False
    heading: Optional[str] = ''
    created_at: Optional[str] = ''
    updated_at: Optional[str] = ''
    bundle_index: int = 0
    bundle_id: str = ''
    bundle_summary: str = ''
    bundle_text: str = ''