from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class SaleReturn(Base):
    """Encabezado de una devolución parcial de productos de una venta."""
    __tablename__ = "sale_returns"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    reason = Column(String, nullable=True)
    refund_amount = Column(Float, default=0)  # Monto ya con descuento de la venta prorrateado
    created_at = Column(DateTime, default=datetime.utcnow)

    company = relationship("Company")
    sale = relationship("Sale")
    items = relationship("SaleReturnItem", back_populates="sale_return", cascade="all, delete-orphan")
