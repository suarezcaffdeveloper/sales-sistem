from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
from argon2 import PasswordHasher, exceptions as argon2_exceptions


SECRET_KEY = "supersecretkey"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto"
)

# 🔒 hash password
def hash_password(password: str):
    safe_password = password.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.hash(safe_password)


def verify_password(plain, hashed):
    safe_plain = plain.encode("utf-8")[:72].decode("utf-8", errors="ignore")
    return pwd_context.verify(safe_plain, hashed)

# 🎟 generar token
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)