from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int

class SaleCreate(BaseModel):
    customer_id: int
    items: List[SaleItemCreate]
    initial_payment: float = Field(default=0, ge=0)  # Pago inicial (opcional)
    discount_percent: Optional[float] = Field(default=None, ge=0, le=100)  # Descuento como % (opcional)
    discount_amount: Optional[float] = Field(default=None, ge=0)  # Descuento en $ (opcional, excluyente con el %)

class SaleCancelRequest(BaseModel):
    reason: Optional[str] = None

class SaleResponse(BaseModel):
    id: int
    subtotal_amount: float
    total_amount: float
    discount_percent: Optional[float] = None
    discount_amount: float
    paid_amount: float
    debt_amount: float
    status: str
    created_at: datetime = None

    class Config:
        from_attributes = True

# Esquema para retornar detalles de items en una venta
class SaleItemDetail(BaseModel):
    product_id: int
    product_name: str
    quantity: int
    price: float
    subtotal: float

    class Config:
        from_attributes = True

# Esquema para retornar detalles completos de una venta (para ticket/factura)
class SaleDetail(BaseModel):
    id: int
    customer_name: str
    customer_email: str = None
    customer_phone: str = None
    created_at: datetime
    items: List[SaleItemDetail]
    subtotal_amount: float
    total_amount: float
    discount_percent: Optional[float] = None
    discount_amount: float
    paid_amount: float
    debt_amount: float
    status: str

    class Config:
        from_attributes = True

class SalesSummary(BaseModel):
    """Para reportes y lista de ventas"""
    id: int
    customer_name: str
    total_amount: float
    discount_amount: float
    paid_amount: float
    debt_amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True