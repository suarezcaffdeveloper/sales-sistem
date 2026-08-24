from pydantic import BaseModel, Field
from datetime import datetime

class SupplierPaymentCreate(BaseModel):
    purchase_id: int
    amount: float = Field(gt=0)
    payment_method: str = Field(default="efectivo")

class SupplierPaymentResponse(BaseModel):
    id: int
    purchase_id: int
    amount: float
    payment_method: str
    created_at: datetime

    class Config:
        from_attributes = True
