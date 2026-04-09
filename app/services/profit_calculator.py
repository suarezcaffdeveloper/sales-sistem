"""
Servicio para calcular ganancia real basada en costos históricos de compra
Utiliza método de promedio ponderado
"""

from sqlalchemy.orm import Session
from app.models.product import Product
from app.models.purchase import Purchase
from app.models.purchase_item import PurchaseItem
from app.models.sale import Sale
from app.models.sale_item import SaleItem


def get_product_average_cost(db: Session, product_id: int) -> float:
    """
    Calcula el costo promedio ponderado de un producto
    basado en todas las compras realizadas.
    
    Formula: total_cost_acumulado / total_stock_acumulado
    """
    purchase_items = db.query(PurchaseItem).filter(
        PurchaseItem.product_id == product_id
    ).all()
    
    if not purchase_items:
        # Si no hay compras, usar el costo del producto actual
        product = db.query(Product).filter(Product.id == product_id).first()
        return product.cost_price if product else 0
    
    total_cost = sum(item.subtotal for item in purchase_items)
    total_quantity = sum(item.quantity for item in purchase_items)
    
    if total_quantity == 0:
        return 0
    
    return total_cost / total_quantity


def calculate_sale_profit(db: Session, sale_id: int) -> dict:
    """
    Calcula la ganancia real de una venta
    """
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    
    if not sale:
        raise Exception(f"Venta {sale_id} no existe")
    
    sale_items = db.query(SaleItem).filter(SaleItem.sale_id == sale_id).all()
    
    total_revenue = 0
    total_cost = 0
    items_breakdown = []
    
    for item in sale_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        average_cost = get_product_average_cost(db, item.product_id)
        
        item_revenue = product.price * item.quantity
        item_cost = average_cost * item.quantity
        item_profit = item_revenue - item_cost
        
        total_revenue += item_revenue
        total_cost += item_cost
        
        items_breakdown.append({
            "product_id": item.product_id,
            "product_name": product.name,
            "quantity": item.quantity,
            "unit_price": product.price,
            "average_cost": average_cost,
            "revenue": item_revenue,
            "cost": item_cost,
            "profit": item_profit,
            "profit_margin": (item_profit / item_revenue * 100) if item_revenue > 0 else 0
        })
    
    total_profit = total_revenue - total_cost
    profit_margin = (total_profit / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "sale_id": sale_id,
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "total_profit": total_profit,
        "profit_margin": profit_margin,
        "items": items_breakdown
    }


def calculate_period_stats(db: Session, start_date, end_date) -> dict:
    """
    Calcula estadísticas de ganancias reales para un período
    """
    sales = db.query(Sale).filter(
        Sale.created_at >= start_date,
        Sale.created_at <= end_date
    ).all()
    
    total_sales_amount = 0
    total_cost_amount = 0
    total_debt = 0
    sales_count = 0
    paid_sales_count = 0
    
    for sale in sales:
        profit_data = calculate_sale_profit(db, sale.id)
        total_sales_amount += profit_data["total_revenue"]
        total_cost_amount += profit_data["total_cost"]
        total_debt += sale.debt_amount
        sales_count += 1
        
        if sale.status == "pagado":
            paid_sales_count += 1
    
    total_profit = total_sales_amount - total_cost_amount
    profit_margin = (total_profit / total_sales_amount * 100) if total_sales_amount > 0 else 0
    
    return {
        "period_start": start_date,
        "period_end": end_date,
        "total_sales": sales_count,
        "paid_sales": paid_sales_count,
        "pending_sales": sales_count - paid_sales_count,
        "total_sales_amount": total_sales_amount,
        "total_cost_amount": total_cost_amount,
        "total_profit": total_profit,
        "profit_margin": profit_margin,
        "total_debt": total_debt,
        "average_profit_per_sale": total_profit / sales_count if sales_count > 0 else 0
    }


def get_top_products_profit(db: Session, start_date, end_date, limit: int = 10) -> list:
    """
    Obtiene los productos con mayor ganancia en un período
    """
    sales = db.query(Sale).filter(
        Sale.created_at >= start_date,
        Sale.created_at <= end_date
    ).all()
    
    product_profit = {}
    
    for sale in sales:
        sale_items = db.query(SaleItem).filter(SaleItem.sale_id == sale.id).all()
        
        for item in sale_items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            average_cost = get_product_average_cost(db, item.product_id)
            
            item_profit = (product.price - average_cost) * item.quantity
            
            if item.product_id not in product_profit:
                product_profit[item.product_id] = {
                    "product_id": item.product_id,
                    "product_name": product.name,
                    "total_quantity_sold": 0,
                    "total_profit": 0,
                    "average_cost": average_cost,
                    "sale_price": product.price
                }
            
            product_profit[item.product_id]["total_quantity_sold"] += item.quantity
            product_profit[item.product_id]["total_profit"] += item_profit
    
    # Ordenar por ganancia total descending
    sorted_products = sorted(
        product_profit.values(),
        key=lambda x: x["total_profit"],
        reverse=True
    )
    
    return sorted_products[:limit]
