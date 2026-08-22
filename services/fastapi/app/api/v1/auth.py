from typing import Optional
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.models import OfficerModel
from app.core.security import verify_password, create_access_token
from app.core.exceptions import SakshamException
from app.schemas.auth import LoginRequest, LoginResponse, OfficerProfile
from app.api.dependencies import get_current_officer

router = APIRouter()

@router.post("/login", response_model=LoginResponse, summary="Officer Login API")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    # 1. Lookup officer by email
    officer = db.query(OfficerModel).filter(OfficerModel.email == req.email).first()
    if not officer:
        raise SakshamException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_CREDENTIALS",
            message="Invalid email or password."
        )

    # 2. Verify password
    if not verify_password(req.password, officer.passwordHash):
        raise SakshamException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="INVALID_CREDENTIALS",
            message="Invalid email or password."
        )

    # 3. Check account verification status
    if officer.verificationStatus != "VERIFIED":
        raise SakshamException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="UNVERIFIED_OFFICER",
            message=f"Officer account is not verified. Current status: {officer.verificationStatus}."
        )

    # 4. Check account activity status
    if officer.accountStatus != "ACTIVE":
        raise SakshamException(
            status_code=status.HTTP_403_FORBIDDEN,
            code="INACTIVE_ACCOUNT",
            message=f"Officer account is inactive. Current status: {officer.accountStatus}."
        )

    # 5. Generate JWT token
    token = create_access_token(
        subject=str(officer.id),
        role=officer.role,
        region=officer.region
    )

    profile = OfficerProfile(
        id=str(officer.id),
        name=officer.name,
        email=officer.email,
        role=officer.role,
        region=officer.region,
        verificationStatus=officer.verificationStatus,
        accountStatus=officer.accountStatus
    )

    return LoginResponse(
        accessToken=token,
        access_token=token,
        tokenType="bearer",
        token_type="bearer",
        officer=profile
    )


@router.get("/me", response_model=OfficerProfile, summary="Get details of current logged-in officer")
async def get_me(current_officer: OfficerModel = Depends(get_current_officer)):
    return OfficerProfile(
        id=str(current_officer.id),
        name=current_officer.name,
        email=current_officer.email,
        role=current_officer.role,
        region=current_officer.region,
        verificationStatus=current_officer.verificationStatus,
        accountStatus=current_officer.accountStatus
    )
