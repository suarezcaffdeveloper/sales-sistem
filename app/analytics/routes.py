from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.analytics.dashboard_analytics import get_dashboard_stats_pandas

router = APIRouter()

@router.get("/dashboard", summary="Estadísticas del dashboard", tags=["analytics"])
def dashboard_stats(company_id: int, db: Session = Depends(get_db)):
    """Devuelve métricas de ventas y productos para el dashboard."""
    return get_dashboard_stats_pandas(db, company_id)
