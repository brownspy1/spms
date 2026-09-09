import csv
import io
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from backend.app.database import get_db
from backend.app.models.models import AuditLog, User
from backend.app.schemas.schemas import AuditLogResponse
from backend.app.api.auth import RoleChecker

router = APIRouter(prefix="/audit", tags=["Append-Only Audit Logs"])

@router.get("", response_model=List[AuditLogResponse])
def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    username: Optional[str] = None,
    limit: int = Query(100, le=500),
    offset: int = 0,
    current_admin: User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin only: Retrieve system audit trail with filtering by action,
    entity, and actor username. Immutability guaranteed.
    """
    query = db.query(AuditLog)

    if action:
        query = query.filter(AuditLog.action == action)
    if entity_type:
        query = query.filter(AuditLog.entity_type == entity_type)
    if username:
        query = query.filter(AuditLog.username.ilike(f"%{username}%"))

    return query.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()

@router.get("/export/csv")
def export_audit_logs_csv(
    current_admin: User = Depends(RoleChecker(["Admin"])),
    db: Session = Depends(get_db)
):
    """
    Admin only: Export entire append-only audit trail to CSV for external regulatory compliance review.
    """
    logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Log ID", "Timestamp (UTC)", "User ID", "Username", "User Role",
        "Action", "Entity Type", "Entity ID", "IP Address", "Details", "Before Values", "After Values"
    ])

    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat() if log.timestamp else "",
            log.user_id or "N/A",
            log.username,
            log.user_role,
            log.action,
            log.entity_type,
            log.entity_id or "",
            log.ip_address or "",
            log.details or "",
            log.before_values or "",
            log.after_values or ""
        ])

    csv_content = output.getvalue()
    filename = f"spms_audit_trail_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
