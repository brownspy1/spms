from datetime import datetime, timedelta, timezone
from typing import List, Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.core.config import settings
from backend.app.core.security import (
    verify_password, get_password_hash, create_access_token, create_refresh_token,
    verify_totp, generate_totp_secret, get_totp_uri, oauth2_scheme
)
from backend.app.models.models import User
from backend.app.schemas.schemas import (
    LoginRequest, Token, UserResponse, UserCreate,
    Setup2FAResponse, Verify2FARequest
)
from backend.app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Dependency: Extracts and verifies user from JWT Bearer token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials or token expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "access":
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=401, detail="Inactive or non-existent user")
    return user

class RoleChecker:
    """Enforces server-side RBAC on endpoints."""
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        if user.role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {self.allowed_roles}. Current role: {user.role}"
            )
        return user

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """
    Authenticate user, enforce account lockout, verify 2FA if enabled,
    and generate JWT access + refresh tokens.
    """
    now = datetime.now(timezone.utc)
    user = db.query(User).filter(
        (User.username == login_data.username) | (User.email == login_data.username)
    ).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Check Account Lockout
    if user.locked_until:
        # Normalize timezone
        locked_until_tz = user.locked_until
        if locked_until_tz.tzinfo is None:
            locked_until_tz = locked_until_tz.replace(tzinfo=timezone.utc)
            
        if locked_until_tz > now:
            remaining_mins = int((locked_until_tz - now).total_seconds() / 60) + 1
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is temporarily locked due to repeated failed login attempts. Try again in {remaining_mins} minutes."
            )
        else:
            # Lockout expired
            user.locked_until = None
            user.failed_login_attempts = 0
            db.commit()

    # Verify Password
    if not verify_password(login_data.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= settings.MAX_FAILED_LOGIN_ATTEMPTS:
            user.locked_until = now + timedelta(minutes=settings.LOCKOUT_DURATION_MINUTES)
            log_audit_event(
                db=db,
                action="ACCOUNT_LOCKED",
                entity_type="User",
                entity_id=str(user.id),
                user=user,
                details=f"Account locked after {user.failed_login_attempts} failed login attempts",
                request=request
            )
        else:
            log_audit_event(
                db=db,
                action="LOGIN_FAILED",
                entity_type="User",
                entity_id=str(user.id),
                user=user,
                details=f"Failed password attempt ({user.failed_login_attempts}/{settings.MAX_FAILED_LOGIN_ATTEMPTS})",
                request=request
            )
        db.commit()
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Verify 2FA (TOTP) if enabled
    if user.is_2fa_enabled:
        if not login_data.totp_code:
            raise HTTPException(status_code=403, detail="2FA_REQUIRED")
        if not verify_totp(user.totp_secret, login_data.totp_code):
            raise HTTPException(status_code=401, detail="Invalid 2FA TOTP authentication code")

    # Successful login: reset failed counters
    user.failed_login_attempts = 0
    user.locked_until = None
    db.commit()

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id)

    log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        entity_type="User",
        entity_id=str(user.id),
        user=user,
        details="User logged in successfully",
        request=request
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_2fa_enabled": user.is_2fa_enabled
        }
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_current_user)):
    """Retrieve logged in user information."""
    return user

@router.post("/2fa/setup", response_model=Setup2FAResponse)
def setup_2fa(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Generate a TOTP secret and provisioning URL for 2FA activation."""
    secret = generate_totp_secret()
    user.totp_secret = secret
    db.commit()
    otpauth_url = get_totp_uri(secret, user.username)
    return {"secret": secret, "otpauth_url": otpauth_url}

@router.post("/2fa/verify")
def verify_and_enable_2fa(
    req: Verify2FARequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Confirm TOTP token to activate 2FA on account."""
    if not user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA setup has not been initialized.")
    
    if not verify_totp(user.totp_secret, req.code):
        raise HTTPException(status_code=400, detail="Invalid verification code.")

    user.is_2fa_enabled = True
    db.commit()

    log_audit_event(
        db=db,
        action="2FA_ENABLED",
        entity_type="User",
        entity_id=str(user.id),
        user=user,
        details="Two-factor authentication enabled",
        request=request
    )
    return {"status": "success", "message": "Two-factor authentication enabled successfully."}

@router.post("/2fa/disable")
def disable_2fa(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Disable 2FA on account."""
    user.is_2fa_enabled = False
    user.totp_secret = None
    db.commit()

    log_audit_event(
        db=db,
        action="2FA_DISABLED",
        entity_type="User",
        entity_id=str(user.id),
        user=user,
        details="Two-factor authentication disabled",
        request=request
    )
    return {"status": "success", "message": "Two-factor authentication disabled."}

@router.get("/users", response_model=List[UserResponse])
def list_users(
    user: User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    """Admin only: list all system users."""
    return db.query(User).all()

@router.post("/users", response_model=UserResponse)
def create_user(
    new_user: UserCreate,
    current_admin: User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db),
    request: Request = None
):
    """Admin only: register a new staff or pharmacist user."""
    existing = db.query(User).filter(
        (User.username == new_user.username) | (User.email == new_user.email)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username or Email already registered.")

    created = User(
        username=new_user.username,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
        hashed_password=get_password_hash(new_user.password),
        is_active=True
    )
    db.add(created)
    db.commit()
    db.refresh(created)

    log_audit_event(
        db=db,
        action="USER_CREATED",
        entity_type="User",
        entity_id=str(created.id),
        user=current_admin,
        after_values={"username": created.username, "role": created.role, "email": created.email},
        details=f"Admin {current_admin.username} created user {created.username}",
        request=request
    )
    return created
