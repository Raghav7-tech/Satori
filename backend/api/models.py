import re
from pydantic import BaseModel, HttpUrl, field_validator
from typing import Optional, List, Dict, Any
# dd
class AnalyzeRequest(BaseModel):
    url: str

    @field_validator('url')
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        pattern = r'^https?://(www\.)?github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)/?$'
        if not re.match(pattern, v):
            raise ValueError('Must be a valid public GitHub repository URL (e.g. https://github.com/owner/repo)')
        return v

class JobStatusResponse(BaseModel):
    job_id: str
    status: str

class RepoStatusResponse(BaseModel):
    status: str
    message: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

class ChatResponse(BaseModel):
    reply: str
