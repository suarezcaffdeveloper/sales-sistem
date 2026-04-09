from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base
from sqlalchemy.orm import relationship

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, index=True)
    phone = Column(String, nullable=True)
    address = Column(String, nullable=True)

    sales = relationship("Sale", back_populates="customer")

