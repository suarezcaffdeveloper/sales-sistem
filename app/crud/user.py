from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password
from typing import Optional

def create_user(db: Session, username: str, password: str, company_id: Optional[int] = None):
    user = User(
        username=username,
        password=hash_password(password),
        company_id=company_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def update_user_company(db: Session, user_id: int, company_id: int):
    """Asignar una compañía a un usuario existente"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        return None
    
    user.company_id = company_id
    db.commit()
    db.refresh(user)
    return user