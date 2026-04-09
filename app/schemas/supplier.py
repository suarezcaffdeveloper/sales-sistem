from pydantic import BaseModel
from typing import Optional

class SupplierBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierResponse(SupplierBase):
    id: int
    name: str
    
    class Config:
        from_attributes = True  

    
