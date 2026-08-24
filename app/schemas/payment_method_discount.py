from pydantic import BaseModel, Field

class PaymentMethodDiscountUpdate(BaseModel):
    discount_percent: float = Field(ge=0, le=100)
    active: bool = True

class PaymentMethodDiscountResponse(BaseModel):
    payment_method: str
    discount_percent: float
    active: bool

    class Config:
        from_attributes = True
