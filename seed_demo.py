from app.db.database import SessionLocal
from app.models.company import Company
from app.models.user import User
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def seed_demo():
    db = SessionLocal()

    # 1. Verificar si ya existe
    existing = db.query(User).filter(User.username == "demo").first()
    if existing:
        print("Demo ya existe")
        return

    # 2. Crear company
    demo_company = Company(
        name="Demo Company",
        tax_id="00000000",
        address="Demo 123",
        phone="123456",
        email="demo@demo.com"
    )

    db.add(demo_company)
    db.commit()
    db.refresh(demo_company)

    # 3. Crear user
    hashed_password = pwd_context.hash("demo123")

    demo_user = User(
        username="demo",
        password=hashed_password,
        company_id=demo_company.id
    )

    db.add(demo_user)
    db.commit()

    print("Demo creado correctamente")

    db.close()