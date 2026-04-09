from pydantic import BaseModel
from app.schemas.supplier import SupplierResponse
from typing import Optional

class ProductBase(BaseModel):
    name: str
    price: float
    cost_price: Optional[float] = None
    stock: int
    description: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    supplier_id: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductResponse(BaseModel):
    id: int
    name: str
    price: float
    cost_price: Optional[float] = None
    stock: int
    description: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    supplier: Optional[SupplierResponse] = None

    class Config:
        from_attributes = True