import json
from datetime import datetime, timezone
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from fastapi import Request

from backend.app.models.models import AuditLog, User

def log_audit_event(
    db: Session,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    user: Optional[User] = None,
    before_values: Optional[Dict[str, Any]] = None,
    after_values: Optional[Dict[str, Any]] = None,
    details: Optional[str] = None,
    request: Optional[Request] = None
) -> AuditLog:
    """
    Appends an immutable audit log entry into the database.
    Captures actor credentials, operation type, entity identifiers,
    full state mutation diffs, client IP, and timestamps.
    """
    ip = None
    if request:
        ip = request.client.host if request.client else None
        # Support X-Forwarded-For if behind a proxy
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()

    user_id = user.id if user else None
    username = user.username if user else "SYSTEM"
    user_role = user.role if user else "SYSTEM"

    audit_entry = AuditLog(
        timestamp=datetime.now(timezone.utc),
        user_id=user_id,
        username=username,
        user_role=user_role,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        before_values=json.dumps(before_values, default=str) if before_values else None,
        after_values=json.dumps(after_values, default=str) if after_values else None,
        ip_address=ip,
        details=details
    )

    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
