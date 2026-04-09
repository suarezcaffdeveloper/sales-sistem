from pydantic import BaseModel
from pydantic import Field

class UserCreate(BaseModel):
    username: str
    password: str = Field(..., max_length=72)  # Validación de longitud mínima

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str