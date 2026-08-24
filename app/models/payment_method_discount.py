from sqlalchemy import Column, Integer, Float, Boolean, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class PaymentMethodDiscount(Base):
    __tablename__ = "payment_method_discounts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    payment_method = Column(String, nullable=False)  # "efectivo", "transferencia", "tarjeta"
    discount_percent = Column(Float, default=0)
    active = Column(Boolean, default=False)

    company = relationship("Company")
