from pydantic import BaseModel
from typing import Optional


class CompanyCreate(BaseModel):
    name: str
    tax_id: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class CompanyResponse(BaseModel):
    id: int
    name: str
    tax_id: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    class Config:
        from_attributes = True
