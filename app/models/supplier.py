from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base
from sqlalchemy.orm import relationship

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    products = relationship("Product", back_populates="supplier")
    purchases = relationship("Purchase", back_populates="supplier")
    
    def __repr__(self):
        return f"<Supplier(name={self.name}, email={self.email})>"