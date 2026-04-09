from pydantic import BaseModel, Field
from datetime import datetime

class PaymentCreate(BaseModel):
    sale_id: int
    amount: float = Field(gt=0)
    payment_method: str = Field(default="efectivo")

class PaymentResponse(BaseModel):
    id: int
    sale_id: int
    amount: float
    payment_method: str
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentDetail(BaseModel):
    """Detalle completo del pago"""
    id: int
    sale_id: int
    amount: float
    payment_method: str
    created_at: datetime
    
    class Config:
        from_attributes = True
