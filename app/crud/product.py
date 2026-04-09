from sqlalchemy.orm import Session, joinedload
from app.models.product import Product
from app.schemas.product import ProductCreate

def create_product(db: Session, product: ProductCreate):
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

def get_products(db: Session):
    return db.query(Product).options(joinedload(Product.supplier)).all()

def update_product(db: Session, product_id: int, product_data: ProductCreate):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        return None

    for key, value in product_data.model_dump().items():
        setattr(product, key, value)

    db.commit()
    db.refresh(product)
    return product

def delete_product(db: Session, product_id: int):
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        return None

    db.delete(product)
    db.commit()
    return product

def get_products_filtered(db: Session, category: str = None, max_price: float = None):
    query = db.query(Product)

    if category:
        query = query.filter(Product.category == category)

    if max_price:
        query = query.filter(Product.price <= max_price)

    return query.all()