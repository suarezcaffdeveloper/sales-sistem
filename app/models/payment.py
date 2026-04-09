from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    amount = Column(Float, nullable=False)
    payment_method = Column(String)  # "efectivo", "transferencia", "tarjeta"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company = relationship("Company", back_populates="payments")
    sale = relationship("Sale", back_populates="payments")
