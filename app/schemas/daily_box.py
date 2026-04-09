from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class DailyBoxCreate(BaseModel):
    opening_balance: float = 0.0

class DailyBoxClose(BaseModel):
    closing_balance: float

class DailyBoxResponse(BaseModel):
    id: int
    date: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opening_balance: float
    closing_balance: Optional[float] = None
    status: str
    
    class Config:
        from_attributes = True

class DailyBoxDetail(BaseModel):
    id: int
    date: str
    opened_at: datetime
    closed_at: Optional[datetime] = None
    opening_balance: float
    closing_balance: Optional[float] = None
    status: str
    total_sales: float = 0.0
    total_profit: float = 0.0
    
    class Config:
        from_attributes = True
