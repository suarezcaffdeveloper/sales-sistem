from sqlalchemy.orm import Session
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate


def create_customer(db: Session, customer_data: CustomerCreate):
    db_customer = Customer(**customer_data.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def get_customers(db: Session):
    return db.query(Customer).all()

def update_customer(db: Session, customer_id: int, customer_data: CustomerCreate):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()

    if not customer:
        return None

    for key, value in customer_data.model_dump().items():
        setattr(customer, key, value)

    db.commit()
    db.refresh(customer)
    return customer

def delete_customer(db: Session, customer_id: int):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()

    if not customer:
        return None

    db.delete(customer)
    db.commit()
    return customer

