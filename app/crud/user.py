from sqlalchemy.orm import Session
from app.models.user import User
from app.core.security import hash_password
from typing import Optional
import secrets

def create_user(db: Session, username: str, password: str, company_id: Optional[int] = None, role: str = "admin"):
    user = User(
        username=username,
        password=hash_password(password),
        company_id=company_id,
        role=role
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def generate_temp_password(length: int = 10) -> str:
    """Contraseña temporal legible (sin caracteres ambiguos), para mostrar una sola vez."""
    alphabet = "abcdefghjkmnpqrstuvwxyz23456789"  # sin 0/O, 1/l/i
    return "".join(secrets.choice(alphabet) for _ in range(length))


def create_default_employee(db: Session, admin_username: str, company_id: int):
    """
    Crea la cuenta de cajero por defecto de una empresa recién creada, con
    usuario derivado del admin y contraseña aleatoria. Devuelve (user,
    plain_password) porque la contraseña en texto plano solo existe en este
    momento — después queda solo el hash.
    """
    base_username = f"{admin_username}_empleado"
    username = base_username
    suffix = 1
    while get_user_by_username(db, username):
        suffix += 1
        username = f"{base_username}{suffix}"

    plain_password = generate_temp_password()
    user = create_user(db, username, plain_password, company_id=company_id, role="cajero")
    return user, plain_password


def reset_user_password(db: Session, user_id: int, company_id: int):
    """Genera y aplica una nueva contraseña temporal para un usuario de la empresa."""
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id
    ).first()

    if not user:
        raise Exception("Usuario no encontrado")

    plain_password = generate_temp_password()
    user.password = hash_password(plain_password)
    db.commit()
    return user.username, plain_password

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


def get_users_by_company(db: Session, company_id: int):
    """Lista los usuarios de una compañía"""
    return db.query(User).filter(User.company_id == company_id).all()


def count_admins(db: Session, company_id: int) -> int:
    return db.query(User).filter(
        User.company_id == company_id,
        User.role == "admin"
    ).count()


def update_user_role(db: Session, user_id: int, company_id: int, role: str):
    """
    Cambia el rol de un usuario de la misma compañía. Evita que la
    compañía se quede sin ningún admin.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id
    ).first()

    if not user:
        raise Exception("Usuario no encontrado")

    if user.role == "admin" and role != "admin" and count_admins(db, company_id) <= 1:
        raise Exception("No podés quitarle el rol de admin al único administrador de la empresa")

    user.role = role
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int, company_id: int):
    """Elimina un usuario de la compañía, sin dejarla sin administradores."""
    user = db.query(User).filter(
        User.id == user_id,
        User.company_id == company_id
    ).first()

    if not user:
        raise Exception("Usuario no encontrado")

    if user.role == "admin" and count_admins(db, company_id) <= 1:
        raise Exception("No podés eliminar al único administrador de la empresa")

    db.delete(user)
    db.commit()
    return True
