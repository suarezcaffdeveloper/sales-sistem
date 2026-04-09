from sqlalchemy.orm import Session
from app.models.daily_box import DailyBox
from app.models.sale import Sale
from app.models.product import Product
from app.models.sale_item import SaleItem
from datetime import datetime, date as date_type
from sqlalchemy import func, and_

def open_daily_box(db: Session, opening_balance: float = 0.0, user_id: int = None):
    """Abre una caja para el día actual"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Verificar si ya existe una caja ABIERTA hoy
    existing_box = db.query(DailyBox).filter(
        and_(DailyBox.date == today, DailyBox.status == "open")
    ).first()
    if existing_box:
        raise Exception(f"Ya existe una caja abierta para hoy ({today})")
    
    # Crear nueva caja
    new_box = DailyBox(
        date=today,
        opening_balance=opening_balance,
        status="open",
        user_id=user_id
    )
    
    db.add(new_box)
    db.commit()
    db.refresh(new_box)
    
    return new_box


def close_daily_box(db: Session, closing_balance: float):
    """Cierra la caja del día actual"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    # Buscar caja abierta del día
    box = db.query(DailyBox).filter(
        and_(DailyBox.date == today, DailyBox.status == "open")
    ).first()
    
    if not box:
        raise Exception(f"No hay caja abierta para hoy")
    
    # Actualizar caja
    box.closed_at = datetime.utcnow()
    box.closing_balance = closing_balance
    box.status = "closed"
    
    db.commit()
    db.refresh(box)
    
    return box


def get_current_daily_box(db: Session):
    """Obtiene la caja abierta actualmente (hoy)"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    box = db.query(DailyBox).filter(
        and_(DailyBox.date == today, DailyBox.status == "open")
    ).first()
    return box


def get_daily_box_by_date(db: Session, box_date: str):
    """Obtiene los detalles completos de una caja por fecha"""
    box = db.query(DailyBox).filter(DailyBox.date == box_date).first()
    
    if not box:
        raise Exception(f"No existe caja para la fecha {box_date}")
    
    # Obtener todas las ventas del día sin usar func.date() (incompatible con SQLite)
    # Se filtra por rango de datetime
    date_start = datetime.strptime(box_date, "%Y-%m-%d")
    date_end = datetime.strptime(box_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
    
    sales_data = db.query(Sale).filter(
        and_(Sale.created_at >= date_start, Sale.created_at <= date_end)
    ).all()
    
    total_sales = sum(s.total_amount for s in sales_data)
    sale_count = len(sales_data)
    
    # Calcular ganancia del día
    total_profit = 0.0
    for sale in sales_data:
        for item in sale.items:
            product = item.product
            profit = (product.price - (product.cost_price or 0)) * item.quantity
            total_profit += profit
    
    return {
        "id": box.id,
        "date": box.date,
        "opened_at": box.opened_at,
        "closed_at": box.closed_at,
        "opening_balance": box.opening_balance,
        "closing_balance": box.closing_balance,
        "status": box.status,
        "total_sales": total_sales,
        "total_profit": total_profit,
        "sale_count": sale_count
    }


def get_daily_box_details_by_id(db: Session, box_id: int):
    """Obtiene los detalles completos de una caja por ID (filtrado por daily_box_id en ventas)"""
    box = db.query(DailyBox).filter(DailyBox.id == box_id).first()
    
    if not box:
        raise Exception(f"No existe caja con ID {box_id}")
    
    # Obtener todas las ventas asociadas a esta caja
    sales_data = db.query(Sale).filter(Sale.daily_box_id == box_id).all()
    
    total_sales = sum(s.total_amount for s in sales_data)
    sale_count = len(sales_data)
    
    # Calcular ganancia
    total_profit = 0.0
    for sale in sales_data:
        for item in sale.items:
            product = item.product
            profit = (product.price - (product.cost_price or 0)) * item.quantity
            total_profit += profit
    
    return {
        "id": box.id,
        "date": box.date,
        "opened_at": box.opened_at,
        "closed_at": box.closed_at,
        "opening_balance": box.opening_balance,
        "closing_balance": box.closing_balance,
        "status": box.status,
        "total_sales": total_sales,
        "total_profit": total_profit,
        "sale_count": sale_count
    }


def get_all_daily_boxes(db: Session):
    """Obtiene todas las cajas ordenadas por fecha descendente"""
    try:
        boxes = db.query(DailyBox).order_by(DailyBox.date.desc()).all()
        
        result = []
        for box in boxes:
            try:
                box_detail = get_daily_box_by_date(db, box.date)
                result.append(box_detail)
            except Exception as e:
                # Si hay error en una caja, crear una respuesta básica sin ventas
                result.append({
                    "id": box.id,
                    "date": box.date,
                    "opened_at": box.opened_at,
                    "closed_at": box.closed_at,
                    "opening_balance": box.opening_balance,
                    "closing_balance": box.closing_balance,
                    "status": box.status,
                    "total_sales": 0.0,
                    "total_profit": 0.0,
                    "sale_count": 0
                })
        
        return result
    except Exception as e:
        return []
