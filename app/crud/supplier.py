from sqlalchemy.orm import Session
from app.models.supplier import Supplier
from app.schemas.supplier import SupplierCreate

def create_supplier(db: Session, supplier: SupplierCreate):
    db_supplier = Supplier(**supplier.model_dump())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

def get_suppliers(db: Session):
    return db.query(Supplier).all()

def update_supplier(db: Session, supplier_id: int, supplier_data: SupplierCreate):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()

    if not supplier:
        return None

    for key, value in supplier_data.model_dump().items():
        setattr(supplier, key, value)

    db.commit()
    db.refresh(supplier)
    return supplier

def delete_supplier(db: Session, supplier_id: int):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()

    if not supplier:
        return None

    db.delete(supplier)
    db.commit()
    return supplier

