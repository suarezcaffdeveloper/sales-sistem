from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from datetime import datetime, timedelta

def get_sales_by_period(db: Session, company_id: int, period: str = "day"):
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
    
    total = db.query(func.sum(Sale.total_amount)).filter(Sale.company_id == company_id).scalar() or 0
    period_total = db.query(func.sum(Sale.total_amount)).filter(Sale.company_id == company_id).scalar() or 0
    
    return {
        "period": period,
        "total": float(total),
        "period_total": float(period_total)
    }

def get_top_products(db: Session, company_id: int, limit: int = 5):
    """
    Obtiene los productos más vendidos con cálculo de ganancia
    """
    results = db.query(
        Product.id,
        Product.name,
        Product.price,
        Product.cost_price,
        func.sum(SaleItem.quantity).label("total_quantity")
    ).join(SaleItem, Product.id == SaleItem.product_id).filter(
        Product.company_id == company_id
    ).group_by(
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

def get_bottom_products(db: Session, company_id: int, limit: int = 5):
    """
    Obtiene los productos menos vendidos con cálculo de ganancia
    """
    results = db.query(
        Product.id,
        Product.name,
        Product.price,
        Product.cost_price,
        func.sum(SaleItem.quantity).label("total_quantity")
    ).outerjoin(SaleItem, Product.id == SaleItem.product_id).filter(
        Product.company_id == company_id
    ).group_by(
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

def get_low_stock_products(db: Session, company_id: int, threshold: int = 3):
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

def get_total_products(db: Session, company_id: int):
    """
    Obtiene el total de productos
    """
    return db.query(func.count(Product.id)).filter(Product.company_id == company_id).scalar() or 0

def get_total_customers(db: Session, company_id: int):
    """
    Obtiene el total de clientes
    """
    from app.models.customer import Customer
    return db.query(func.count(Customer.id)).filter(Customer.company_id == company_id).scalar() or 0

def get_total_sales(db: Session, company_id: int):
    """
    Obtiene el total de ventas (ingresos)
    """
    return db.query(func.sum(Sale.total_amount)).filter(Sale.company_id == company_id).scalar() or 0

def get_total_sales_count(db: Session, company_id: int):
    """
    Obtiene la cantidad total de ventas realizadas
    """
    return db.query(func.count(Sale.id)).filter(Sale.company_id == company_id).scalar() or 0

def get_total_profit(db: Session, company_id: int):
    """
    Calcula la ganancia total (ingresos - costo de productos vendidos)
    """
    # Obtener todos los items vendidos con sus costos
    try:
        results = db.query(
            func.sum(SaleItem.quantity * Product.price).label("total_revenue"),
            func.sum(SaleItem.quantity * Product.cost_price).label("total_cost")
        ).join(Product, SaleItem.product_id == Product.id).filter(
            Product.company_id == company_id
        ).all()
        
        if results and results[0][0]:
            revenue = float(results[0][0]) if results[0][0] else 0
            cost = float(results[0][1]) if results[0][1] else 0
            return revenue - cost
    except:
        pass
    return 0

def get_total_cost_invested(db: Session, company_id: int):
    """
    Obtiene el costo total invertido en productos vendidos
    """
    try:
        result = db.query(
            func.sum(SaleItem.quantity * Product.cost_price)
        ).join(Product, SaleItem.product_id == Product.id).filter(
            Product.company_id == company_id
        ).scalar()
        
        return float(result) if result else 0
    except:
        return 0

def get_dashboard_stats(db: Session, company_id: int):
    """
    Obtiene todas las estadísticas del dashboard
    """
    from app.models.customer import Customer
    
    total_sales = db.query(func.sum(Sale.total_amount)).filter(Sale.company_id == company_id).scalar() or 0
    sales_count = db.query(func.count(Sale.id)).filter(Sale.company_id == company_id).scalar() or 0
    total_profit = get_total_profit(db, company_id)
    total_cost_invested = get_total_cost_invested(db, company_id)
    total_products = db.query(func.count(Product.id)).filter(Product.company_id == company_id).scalar() or 0
    total_customers = db.query(func.count(Customer.id)).filter(Customer.company_id == company_id).scalar() or 0
    low_stock = db.query(Product).filter(
        Product.stock < 3,
        Product.company_id == company_id
    ).all()
    top_products = get_top_products(db, company_id, limit=5)
    bottom_products = get_bottom_products(db, company_id, limit=5)
    low_stock_products = get_low_stock_products(db, company_id)
    
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

def get_most_used_payment_method(db: Session, company_id: int):
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
        ).filter(
            Payment.company_id == company_id
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

def get_pending_debts(db: Session, company_id: int):
    """
    Obtiene todas las facturas con deuda pendiente
    """
    try:
        print(f"[*] Buscando deudas pendientes para company_id={company_id}")
        
        # Obtener todas las ventas con deuda
        sales_with_debt = db.query(Sale).filter(
            Sale.debt_amount > 0,
            Sale.company_id == company_id
        ).order_by(desc(Sale.created_at)).all()
        
        print(f"    [+] Encontradas {len(sales_with_debt)} ventas con deuda")
        
        pending_debts = []
        total_debt = 0.0
        
        for sale in sales_with_debt:
            try:
                # Obtener items
                items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
                item_count = len(items) if items else 0
                
                # Obtener cliente con manejo seguro
                customer_name = "Desconocido"
                customer_phone = "-"
                
                if sale.customer:
                    customer_name = sale.customer.name if hasattr(sale.customer, 'name') and sale.customer.name else "Desconocido"
                    customer_phone = sale.customer.phone if hasattr(sale.customer, 'phone') and sale.customer.phone else "-"
                
                # Convertir valores numericos de forma segura
                total_amount = float(sale.total_amount) if sale.total_amount else 0.0
                paid_amount = float(sale.paid_amount) if sale.paid_amount else 0.0
                debt_amount = float(sale.debt_amount) if sale.debt_amount else 0.0
                
                pending_debts.append({
                    "sale_id": sale.id,
                    "customer_name": str(customer_name),
                    "customer_phone": str(customer_phone),
                    "created_at": sale.created_at.isoformat() if hasattr(sale.created_at, 'isoformat') else str(sale.created_at),
                    "item_count": item_count,
                    "total_amount": total_amount,
                    "paid_amount": paid_amount,
                    "debt_amount": debt_amount
                })
                
                total_debt += debt_amount
                
            except Exception as item_error:
                print(f"    [!] Error procesando venta {sale.id}: {str(item_error)}")
                # Continuar con la siguiente venta
                continue
        
        result = {
            "pending_count": len(pending_debts),
            "total_debt": total_debt,
            "debts": pending_debts
        }
        
        print(f"    [OK] Retornando {len(pending_debts)} deudas, total: ${total_debt:.2f}")
        return result
        
    except Exception as e:
        print(f"[ERROR] Error en get_pending_debts: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            "pending_count": 0,
            "total_debt": 0,
            "debts": []
        }

