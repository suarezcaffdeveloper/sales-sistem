from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, String, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    subtotal_amount = Column(Float)  # Suma de items antes del descuento
    total_amount = Column(Float)  # Total de la venta (subtotal - descuento)
    discount_percent = Column(Float, nullable=True)  # Si el descuento se cargó como %, para mostrarlo
    discount_amount = Column(Float, default=0)  # Monto de descuento en $, siempre poblado
    paid_amount = Column(Float, default=0)  # Monto pagado
    debt_amount = Column(Float, default=0)  # Monto pendiente
    status = Column(String, default="pendiente")  # "pagado", "parcial", "pendiente"
    created_at = Column(DateTime, default=datetime.utcnow)
    cancelled_at = Column(DateTime, nullable=True)  # Si no es None, la venta fue anulada
    cancel_reason = Column(String, nullable=True)
    due_date = Column(Date, nullable=True)  # Vencimiento de la deuda (fiado), si se definió uno

    customer_id = Column(Integer, ForeignKey("customers.id"))
    daily_box_id = Column(Integer, ForeignKey("daily_boxes.id"), nullable=True)

    # Relationships
    company = relationship("Company", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")
    daily_box = relationship("DailyBox")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")