from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class OfficerProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    region: Optional[str] = None
    verificationStatus: str
    accountStatus: str

class LoginResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    officer: OfficerProfile
