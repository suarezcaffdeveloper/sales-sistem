from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password

def create_user(db: Session, username: str, password: str):
    user = User(
        username=username,
        password=hash_password(password)  # 👈 ESTO ES CLAVE
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()