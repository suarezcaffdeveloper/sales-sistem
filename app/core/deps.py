from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from app.core.security import SECRET_KEY, ALGORITHM
from sqlalchemy.orm import Session
from app.db.database import get_db
from app import models

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")

        if username is None:
            raise HTTPException(status_code=401, detail="Token inválido")

        return username

    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")


def get_current_user_with_company(
    username: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtiene el usuario actual y su company_id desde la database
    """
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    
    if not user.company_id:
        raise HTTPException(status_code=400, detail="Usuario no está asociado a una compañía")

    return {"user_id": user.id, "company_id": user.company_id, "username": user.username, "role": user.role or "admin"}


def require_admin(user_info: dict = Depends(get_current_user_with_company)):
    """
    Igual que get_current_user_with_company, pero además exige que el
    usuario sea admin de su compañía. Se usa como dependencia en las rutas
    reservadas para administradores (gestión de productos/clientes/
    proveedores/compras, reportes, estadísticas, usuarios).
    """
    if user_info.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Esta acción requiere permisos de administrador")

    return user_info