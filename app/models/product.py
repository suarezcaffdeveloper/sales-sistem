from sqlalchemy import Column, Integer, String, Float, ForeignKey
from app.db.database import Base
from sqlalchemy.orm import relationship

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    price = Column(Float)
    cost_price = Column(Float, nullable=True)
    stock = Column(Integer)
    description = Column(String, nullable=True)
    brand = Column(String, nullable=True)
    category = Column(String, nullable=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    
    # Relationships
    company = relationship("Company", back_populates="products")
    supplier = relationship("Supplier", back_populates="products")