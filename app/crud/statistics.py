from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from datetime import datetime, timedelta

def get_sales_by_period(db: Session, period: str = "day"):
    """
    Obtiene las ventas totales por período (day, month, year)
    """
    today = datetime.now()
    
    if period == "day":
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "month":
        start_date = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif period == "year":
        start_date = today.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_date = today.replace(hour=0, minute=0, second=0, microsecond=0)
    
    total = db.query(func.sum(Sale.total_amount)).filter(Sale.id > 0).scalar() or 0
    period_total = db.query(func.sum(Sale.total_amount)).filter(Sale.id > 0).scalar() or 0
    
    return {
        "period": period,
        "total": float(total),
        "period_total": float(period_total)
    }

def get_top_products(db: Session, limit: int = 5):
    """
    Obtiene los productos más vendidos con cálculo de ganancia
    """
    results = db.query(
        Product.id,
        Product.name,
        Product.price,
        Product.cost_price,
        func.sum(SaleItem.quantity).label("total_quantity")
    ).join(SaleItem, Product.id == SaleItem.product_id).group_by(
        Product.id, Product.name, Product.price, Product.cost_price
    ).order_by(desc("total_quantity")).limit(limit).all()
    
    products = []
    for r in results:
        qty = r[4] or 0
        price = float(r[2])
        cost_price = float(r[3]) if r[3] else 0
        revenue = price * qty
        cost_invested = cost_price * qty
        profit = revenue - cost_invested
        
        products.append({
            "id": r[0],
            "name": r[1],
            "price": price,
            "cost_price": cost_price,
            "quantity_sold": qty,
            "revenue": revenue,
            "cost_invested": cost_invested,
            "profit": profit
        })
    
    return products

def get_bottom_products(db: Session, limit: int = 5):
    """
    Obtiene los productos menos vendidos con cálculo de ganancia
    """
    results = db.query(
        Product.id,
        Product.name,
        Product.price,
        Product.cost_price,
        func.sum(SaleItem.quantity).label("total_quantity")
    ).outerjoin(SaleItem, Product.id == SaleItem.product_id).group_by(
        Product.id, Product.name, Product.price, Product.cost_price
    ).order_by("total_quantity").limit(limit).all()
    
    products = []
    for r in results:
        qty = r[4] or 0
        price = float(r[2])
        cost_price = float(r[3]) if r[3] else 0
        revenue = price * qty
        cost_invested = cost_price * qty
        profit = revenue - cost_invested
        
        products.append({
            "id": r[0],
            "name": r[1],
            "price": price,
            "cost_price": cost_price,
            "quantity_sold": qty,
            "revenue": revenue,
            "cost_invested": cost_invested,
            "profit": profit
        })
    
    return products

def get_low_stock_products(db: Session, threshold: int = 3):
    """
    Obtiene los productos con stock bajo
    """
    results = db.query(Product).filter(Product.stock < threshold).all()
    
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

def get_total_products(db: Session):
    """
    Obtiene el total de productos
    """
    return db.query(func.count(Product.id)).scalar() or 0

def get_total_customers(db: Session):
    """
    Obtiene el total de clientes
    """
    from app.models.customer import Customer
    return db.query(func.count(Customer.id)).scalar() or 0

def get_total_sales(db: Session):
    """
    Obtiene el total de ventas (ingresos)
    """
    return db.query(func.sum(Sale.total_amount)).scalar() or 0

def get_total_sales_count(db: Session):
    """
    Obtiene la cantidad total de ventas realizadas
    """
    return db.query(func.count(Sale.id)).scalar() or 0

def get_total_profit(db: Session):
    """
    Calcula la ganancia total (ingresos - costo de productos vendidos)
    """
    # Obtener todos los items vendidos con sus costos
    try:
        results = db.query(
            func.sum(SaleItem.quantity * Product.price).label("total_revenue"),
            func.sum(SaleItem.quantity * Product.cost_price).label("total_cost")
        ).join(Product, SaleItem.product_id == Product.id).all()
        
        if results and results[0][0]:
            revenue = float(results[0][0]) if results[0][0] else 0
            cost = float(results[0][1]) if results[0][1] else 0
            return revenue - cost
    except:
        pass
    return 0

def get_total_cost_invested(db: Session):
    """
    Obtiene el costo total invertido en productos vendidos
    """
    try:
        result = db.query(
            func.sum(SaleItem.quantity * Product.cost_price)
        ).join(Product, SaleItem.product_id == Product.id).scalar()
        
        return float(result) if result else 0
    except:
        return 0

def get_dashboard_stats(db: Session):
    """
    Obtiene todas las estadísticas del dashboard
    """
    from app.models.customer import Customer
    
    total_sales = db.query(func.sum(Sale.total_amount)).scalar() or 0
    sales_count = db.query(func.count(Sale.id)).scalar() or 0
    total_profit = get_total_profit(db)
    total_cost_invested = get_total_cost_invested(db)
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    low_stock = db.query(Product).filter(Product.stock < 3).all()
    top_products = get_top_products(db, limit=5)
    bottom_products = get_bottom_products(db, limit=5)
    low_stock_products = get_low_stock_products(db)
    
    return {
        "total_sales": float(total_sales),
        "sales_count": sales_count,
        "total_profit": float(total_profit),
        "total_cost_invested": float(total_cost_invested),
        "total_products": total_products,
        "total_customers": total_customers,
        "low_stock_products": low_stock_products,
        "top_products": top_products,
        "bottom_products": bottom_products
    }

def get_most_used_payment_method(db: Session):
    """
    Obtiene el método de pago más utilizado
    """
    from app.models.payment import Payment
    
    try:
        # Contar pagos por método
        result = db.query(
            Payment.payment_method,
            func.count(Payment.id).label('count'),
            func.sum(Payment.amount).label('total_amount')
        ).group_by(Payment.payment_method).order_by(desc('count')).first()
        
        if result:
            return {
                "payment_method": result[0] or "Sin especificar",
                "count": result[1],
                "total_amount": float(result[2]) if result[2] else 0
            }
        else:
            return {
                "payment_method": "Sin datos",
                "count": 0,
                "total_amount": 0
            }
    except:
        return {
            "payment_method": "Error",
            "count": 0,
            "total_amount": 0
        }

def get_pending_debts(db: Session):
    """
    Obtiene todas las facturas con deuda pendiente
    """
    from app.models.customer import Customer
    
    try:
        # Obtener todas las ventas con deuda
        sales_with_debt = db.query(Sale).filter(
            Sale.debt_amount > 0
        ).order_by(desc(Sale.created_at)).all()
        
        pending_debts = []
        total_debt = 0
        
        for sale in sales_with_debt:
            # Obtener items
            items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
            item_count = len(items)
            
            # Obtener cliente
            customer = sale.customer
            customer_name = customer.name if customer else "Desconocido"
            customer_phone = customer.phone if customer and hasattr(customer, 'phone') else "-"
            
            pending_debts.append({
                "sale_id": sale.id,
                "customer_name": customer_name,
                "customer_phone": customer_phone,
                "created_at": sale.created_at,
                "item_count": item_count,
                "total_amount": float(sale.total_amount),
                "paid_amount": float(sale.paid_amount),
                "debt_amount": float(sale.debt_amount)
            })
            
            total_debt += float(sale.debt_amount)
        
        return {
            "pending_count": len(pending_debts),
            "total_debt": total_debt,
            "debts": pending_debts
        }
    except Exception as e:
        print(f"Error en get_pending_debts: {str(e)}")
        return {
            "pending_count": 0,
            "total_debt": 0,
            "debts": []
        }

