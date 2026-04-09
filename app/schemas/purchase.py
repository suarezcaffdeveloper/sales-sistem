from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class PurchaseItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0, description="Cantidad debe ser mayor a 0")
    unit_cost: float = Field(..., gt=0, description="Costo unitario debe ser mayor a 0")

class PurchaseItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    unit_cost: float
    subtotal: float
    
    class Config:
        from_attributes = True

class PurchaseCreate(BaseModel):
    supplier_id: int
    items: List[PurchaseItemCreate] = Field(..., min_items=1, description="Al menos un producto es requerido")

class PurchaseResponse(BaseModel):
    id: int
    supplier_id: int
    date: datetime
    total_amount: float
    
    class Config:
        from_attributes = True

class PurchaseDetail(BaseModel):
    id: int
    supplier_name: str
    supplier_email: Optional[str] = None
    supplier_phone: Optional[str] = None
    date: datetime
    items: List[PurchaseItemResponse]
    total_amount: float
    
    class Config:
        from_attributes = True

class PurchaseSummary(BaseModel):
    id: int
    supplier_name: str
    date: datetime
    items_count: int
    total_amount: float
    
    class Config:
        from_attributes = True
