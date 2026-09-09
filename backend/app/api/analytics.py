from datetime import datetime, date, timedelta, timezone
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.database import get_db
from backend.app.models.models import Sale, SaleItem, Medicine, Batch, Prescription, User
from backend.app.api.auth import get_current_user, RoleChecker

router = APIRouter(prefix="/analytics", tags=["Analytics & Reports"])

@router.get("/summary")
def get_dashboard_summary(
    user: User = Depends(RoleChecker(["Admin", "Pharmacist"])),
    db: Session = Depends(get_db)
):
    """
    Computes key executive KPIs: revenue, inventory valuation,
    expiring stocks, low inventory items, and recent 7-day sales trends.
    """
    today = date.today()
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)

    # 1. Today's sales
    today_sales = db.query(Sale).filter(Sale.created_at >= today_start).all()
    today_revenue = sum(s.total_amount for s in today_sales)
    today_count = len(today_sales)

    # 2. Total all-time revenue
    total_revenue = db.query(func.sum(Sale.total_amount)).scalar() or 0.0

    # 3. Inventory counts & valuations
    all_batches = db.query(Batch).filter(Batch.current_quantity > 0).all()
    inventory_cost_value = sum(b.current_quantity * b.purchase_cost for b in all_batches)
    inventory_retail_value = sum(b.current_quantity * b.selling_price for b in all_batches)
    total_medicines_count = db.query(Medicine).count()

    # 4. Low stock count
    medicines = db.query(Medicine).all()
    low_stock_count = 0
    for m in medicines:
        stock = sum(b.current_quantity for b in m.batches if b.current_quantity > 0)
        if stock <= m.reorder_level:
            low_stock_count += 1

    # 5. Expiring batches (within 90 days)
    threshold = today + timedelta(days=90)
    expiring_count = db.query(Batch).filter(
        Batch.current_quantity > 0,
        Batch.expiry_date <= threshold
    ).count()

    # 6. Prescriptions pending review
    pending_rx_count = db.query(Prescription).filter(
        Prescription.status == "Pending",
        Prescription.is_archived == False
    ).count()

    # 7. 7-Day sales trend
    sales_trend: List[Dict[str, Any]] = []
    for i in range(6, -1, -1):
        day_date = today - timedelta(days=i)
        day_start = datetime.combine(day_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = datetime.combine(day_date, datetime.max.time()).replace(tzinfo=timezone.utc)
        
        day_sales = db.query(Sale).filter(Sale.created_at >= day_start, Sale.created_at <= day_end).all()
        rev = sum(s.total_amount for s in day_sales)
        sales_trend.append({
            "date": day_date.strftime("%b %d"),
            "revenue": round(rev, 2),
            "orders": len(day_sales)
        })

    # 8. Top 5 selling items
    top_items_query = (
        db.query(
            SaleItem.medicine_name,
            func.sum(SaleItem.quantity).label("total_qty"),
            func.sum(SaleItem.subtotal).label("total_revenue")
        )
        .group_by(SaleItem.medicine_name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(5)
        .all()
    )

    top_sellers = [
        {"name": row[0], "quantity": int(row[1] or 0), "revenue": round(float(row[2] or 0), 2)}
        for row in top_items_query
    ]

    return {
        "today_revenue": round(today_revenue, 2),
        "today_transactions": today_count,
        "total_revenue": round(total_revenue, 2),
        "total_medicines": total_medicines_count,
        "low_stock_count": low_stock_count,
        "expiring_batches_count": expiring_count,
        "pending_prescriptions": pending_rx_count,
        "inventory_cost_valuation": round(inventory_cost_value, 2),
        "inventory_retail_valuation": round(inventory_retail_value, 2),
        "sales_trend": sales_trend,
        "top_sellers": top_sellers
    }
