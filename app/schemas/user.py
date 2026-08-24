from pydantic import BaseModel
from pydantic import Field
from typing import Optional, Literal

class UserCreate(BaseModel):
    username: str
    password: str = Field(..., max_length=72)  # Validación de longitud mínima
    company_id: Optional[int] = None

class UserRegister(BaseModel):
    """
    Esquema para registro: /register siempre crea una compañía nueva (de la
    que el usuario registrado es admin), nunca une a una compañía existente.
    Para sumar gente a una compañía ya creada existe el panel de Usuarios
    (solo accesible para un admin ya logueado), que es el único lugar desde
    donde se pueden dar altas dentro de una empresa existente.

    Opciones:
    1. Proporcionar 'company_name' → la compañía nueva se crea con ese nombre
    2. No proporcionarlo → se crea automáticamente con el nombre del usuario
    """
    username: str
    password: str = Field(..., max_length=72)
    company_name: Optional[str] = None  # Opcional: nombre de la compañía nueva

class UserLogin(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    company_id: Optional[int] = None
    role: Optional[str] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TeammateCreate(BaseModel):
    """Usado por un admin para crear un usuario dentro de su propia empresa."""
    username: str
    password: str = Field(..., max_length=72)
    role: Literal["admin", "cajero"] = "cajero"

class UserRoleUpdate(BaseModel):
    role: Literal["admin", "cajero"]

class RegisterResponse(BaseModel):
    """
    Respuesta de /register. Cuando el registro crea una empresa nueva,
    incluye una única vez las credenciales del cajero que se creó junto
    con la empresa (después no se pueden volver a mostrar, solo resetear).
    """
    id: int
    username: str
    company_id: Optional[int] = None
    role: Optional[str] = None
    employee_username: Optional[str] = None
    employee_password: Optional[str] = None

class ResetPasswordResponse(BaseModel):
    username: str
    password: str