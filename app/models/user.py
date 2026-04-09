from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    password = Column(String)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    # Relationships
    company = relationship("Company", back_populates="users")