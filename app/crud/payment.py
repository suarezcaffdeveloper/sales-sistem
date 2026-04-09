from sqlalchemy.orm import Session
from app.models.payment import Payment
from app.models.sale import Sale
from app.schemas.payment import PaymentCreate


def create_payment(db: Session, payment_data: PaymentCreate) -> Payment:
    """
    Registra un pago para una venta.
    Actualiza paid_amount, debt_amount y status de la venta.
    """
    print(f"\n💳 Intentando crear pago: Venta {payment_data.sale_id}, Monto ${payment_data.amount}")
    
    # Validar que la venta existe
    sale = db.query(Sale).filter(Sale.id == payment_data.sale_id).first()
    
    if not sale:
        raise Exception(f"Venta {payment_data.sale_id} no existe")
    
    print(f"   📊 Venta encontrada: Total ${sale.total_amount}, Pagado ${sale.paid_amount}, Deuda ${sale.debt_amount}")
    
    # Validar que el pago no exceda la deuda
    if payment_data.amount > sale.debt_amount:
        raise Exception(
            f"El pago (${payment_data.amount}) no puede exceder la deuda (${sale.debt_amount})"
        )
    
    # Crear pago
    payment = Payment(
        sale_id=payment_data.sale_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method
    )
    
    db.add(payment)
    
    # Actualizar monto pagado y deuda
    sale.paid_amount += payment_data.amount
    sale.debt_amount = sale.total_amount - sale.paid_amount
    
    # Actualizar estado
    if sale.paid_amount >= sale.total_amount:
        sale.status = "pagado"
        sale.debt_amount = 0
    elif sale.paid_amount > 0:
        sale.status = "parcial"
    
    print(f"   ✅ Pago registrado: Nuevo pagado ${sale.paid_amount}, Nueva deuda ${sale.debt_amount}, Estado {sale.status}")
    
    db.commit()
    db.refresh(payment)
    
    return payment


def get_payment(db: Session, payment_id: int) -> Payment:
    """Obtiene un pago específico"""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    
    if not payment:
        raise Exception(f"Pago {payment_id} no existe")
    
    return payment


def get_sale_payments(db: Session, sale_id: int) -> list:
    """Obtiene todos los pagos de una venta"""
    payments = db.query(Payment).filter(Payment.sale_id == sale_id).all()
    return payments


def get_all_payments(db: Session, limit: int = 100) -> list:
    """Obtiene todos los pagos registrados"""
    from sqlalchemy import desc
    payments = db.query(Payment).order_by(desc(Payment.created_at)).limit(limit).all()
    return payments


def get_pending_payments_total(db: Session) -> float:
    """Obtiene el total de pagos pendientes en el sistema"""
    from sqlalchemy import func
    
    result = db.query(func.sum(Sale.debt_amount)).filter(
        Sale.debt_amount > 0
    ).scalar()
    
    return result if result else 0
