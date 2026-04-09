from pydantic import BaseModel
from pydantic import Field
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str = Field(..., max_length=72)  # Validación de longitud mínima
    company_id: Optional[int] = None

class UserRegister(BaseModel):
    """
    Esquema para registro: permite crear usuario con flexible company assignment
    
    Opciones:
    1. Proporcionar 'company_name' → se crea nueva compañía
    2. Proporcionar 'company_id' → se asigna a compañía existente  
    3. No proporcionar nada → se crea compañía automáticamente con el nombre del usuario
    
    Los campos company_name y company_id son COMPLETAMENTE OPCIONALES
    Si no se proporciona nada, el sistema crea una compañía automáticamente.
    """
    username: str
    password: str = Field(..., max_length=72)
    company_name: Optional[str] = None  # Opcional: crear nueva compañía
    company_id: Optional[int] = None    # Opcional: usar compañía existente

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    company_id: Optional[int] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str