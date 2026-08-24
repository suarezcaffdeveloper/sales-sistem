from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    total_amount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)  # Monto pagado al proveedor
    debt_amount = Column(Float, default=0.0)  # Monto pendiente de pago al proveedor
    status = Column(String, default="pendiente")  # "pagado", "parcial", "pendiente"

    # Relaciones
    company = relationship("Company", back_populates="purchases")
    supplier = relationship("Supplier", back_populates="purchases")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")
    payments = relationship("SupplierPayment", back_populates="purchase", cascade="all, delete-orphan")
