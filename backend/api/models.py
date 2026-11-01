import re
from pydantic import BaseModel, Field, field_validator
from typing import Literal, Optional, List
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
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=8_000)

class ChatRequest(BaseModel):
    messages: List[ChatMessage] = Field(min_length=1, max_length=50)

class ChatResponse(BaseModel):
    reply: str
