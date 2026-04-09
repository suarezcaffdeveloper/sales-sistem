from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    total_amount = Column(Float)  # Total de la venta
    paid_amount = Column(Float, default=0)  # Monto pagado
    debt_amount = Column(Float, default=0)  # Monto pendiente
    status = Column(String, default="pendiente")  # "pagado", "parcial", "pendiente"
    created_at = Column(DateTime, default=datetime.utcnow)

    customer_id = Column(Integer, ForeignKey("customers.id"))
    daily_box_id = Column(Integer, ForeignKey("daily_boxes.id"), nullable=True)

    customer = relationship("Customer", back_populates="sales")
    daily_box = relationship("DailyBox")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")