from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base
from sqlalchemy.orm import relationship

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    tax_id = Column(String, nullable=True)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)

    # Relationships
    users = relationship("User", back_populates="company")
    customers = relationship("Customer", back_populates="company", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="company", cascade="all, delete-orphan")
    suppliers = relationship("Supplier", back_populates="company", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="company", cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="company", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="company", cascade="all, delete-orphan")
    daily_boxes = relationship("DailyBox", back_populates="company", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Company(name={self.name}, tax_id={self.tax_id})>"