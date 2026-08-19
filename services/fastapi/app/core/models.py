import uuid
from sqlalchemy import Column, String, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base

class OfficerModel(Base):
    __tablename__ = "Officer"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False) # e.g. "OPERATOR", "REGIONAL_AUTHORITY", "ADMIN"
    region = Column(String, nullable=True)
    passwordHash = Column(String, nullable=False, server_default="")
    verificationStatus = Column(String, nullable=False, server_default="VERIFIED")
    accountStatus = Column(String, nullable=False, server_default="ACTIVE")
    createdAt = Column(DateTime, nullable=False, server_default=text("now()"))
    updatedAt = Column(DateTime, nullable=False, server_default=text("now()"), onupdate=text("now()"))
