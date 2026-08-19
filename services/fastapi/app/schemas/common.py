from enum import Enum
from pydantic import BaseModel

class Role(str, Enum):
    OPERATOR = "OPERATOR"
    REGIONAL_AUTHORITY = "REGIONAL_AUTHORITY"
    ADMIN = "ADMIN"

class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    error: ErrorDetail
