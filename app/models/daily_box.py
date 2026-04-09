from sqlalchemy import Column, Integer, Float, DateTime, String, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.database import Base

class DailyBox(Base):
    __tablename__ = "daily_boxes"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, unique=True, index=True)  # Formato: YYYY-MM-DD
    opened_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)
    opening_balance = Column(Float, default=0.0)
    closing_balance = Column(Float, nullable=True)
    status = Column(String, default="open")  # "open" o "closed"
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Relaciones
    user = relationship("User")
