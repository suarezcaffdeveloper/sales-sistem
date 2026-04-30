
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from datetime import datetime, timedelta

def get_top_products(db: Session, company_id: int, limit: int = 5):
    """
    Obtiene los productos más vendidos
    """
    results = db.query(
        SaleItem.product_id,
        func.sum(SaleItem.quantity).label("total_sold")
    ).join(Sale, Sale.id == SaleItem.sale_id)
    results = results.filter(Sale.company_id == company_id)
    results = results.group_by(SaleItem.product_id)
    results = results.order_by(func.sum(SaleItem.quantity).desc())
    results = results.limit(limit).all()

    # Obtener nombres de productos
    product_ids = [r.product_id for r in results]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all()
    product_map = {p.id: p.name for p in products}

    return [
        {
            "product_id": r.product_id,
            "product_name": product_map.get(r.product_id, ""),
            "total_sold": int(r.total_sold)
        }
        for r in results
    ]

def get_sales_by_period(db: Session, company_id: int, period: str = "day"):
    """
    Obtiene estadísticas de ventas agrupadas por día, mes o año
    """
    if period == "day":
        date_format = "%Y-%m-%d"
        trunc_func = func.strftime('%Y-%m-%d', Sale.date)
    elif period == "month":
        date_format = "%Y-%m"
        trunc_func = func.strftime('%Y-%m', Sale.date)
    elif period == "year":
        date_format = "%Y"
        trunc_func = func.strftime('%Y', Sale.date)
    else:
        raise ValueError("Período inválido. Usa 'day', 'month' o 'year'.")

    results = db.query(
        trunc_func.label("period"),
        func.sum(Sale.total_amount).label("total_sales"),
        func.count(Sale.id).label("sales_count")
    ).filter(
        Sale.company_id == company_id
    ).group_by(trunc_func).order_by(trunc_func).all()

    return [
        {
            "period": row.period,
            "total_sales": float(row.total_sales) if row.total_sales else 0,
            "sales_count": row.sales_count
        }
        for row in results
    ]
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from datetime import datetime, timedelta

def get_low_stock_products(db: Session, company_id: int, threshold: int = 3): #mantener
    """
    Obtiene los productos con stock bajo
    """
    results = db.query(Product).filter(
        Product.stock < threshold,
        Product.company_id == company_id
    ).all()
    
    return [
        {
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "price": float(p.price),
            "cost_price": float(p.cost_price) if p.cost_price else None
        }
        for p in results
    ]

def get_total_products(db: Session, company_id: int): #mantener
    """
    Obtiene el total de productos
    """
    return db.query(func.count(Product.id)).filter(Product.company_id == company_id).scalar() or 0

def get_total_customers(db: Session, company_id: int): #mantener
    """
    Obtiene el total de clientes
    """
    from app.models.customer import Customer
    return db.query(func.count(Customer.id)).filter(Customer.company_id == company_id).scalar() or 0

def get_total_sales(db: Session, company_id: int): #mantener
    """
    Obtiene el total de ventas (ingresos)
    """
    return db.query(func.sum(Sale.total_amount)).filter(Sale.company_id == company_id).scalar() or 0

def get_total_sales_count(db: Session, company_id: int): #mantener
    """
    Obtiene la cantidad total de ventas realizadas
    """
    return db.query(func.count(Sale.id)).filter(Sale.company_id == company_id).scalar() or 0

