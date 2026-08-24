from sqlalchemy.orm import Session
from app.models.supplier_payment import SupplierPayment
from app.models.purchase import Purchase
from app.schemas.supplier_payment import SupplierPaymentCreate


def create_supplier_payment(db: Session, payment_data: SupplierPaymentCreate, company_id: int) -> SupplierPayment:
    """
    Registra un pago a un proveedor por una compra.
    Actualiza paid_amount, debt_amount y status de la compra.
    """
    purchase = db.query(Purchase).filter(
        Purchase.id == payment_data.purchase_id,
        Purchase.company_id == company_id
    ).first()

    if not purchase:
        raise Exception(f"Compra {payment_data.purchase_id} no existe")

    if payment_data.amount > purchase.debt_amount:
        raise Exception(
            f"El pago (${payment_data.amount}) no puede exceder la deuda (${purchase.debt_amount})"
        )

    payment = SupplierPayment(
        company_id=company_id,
        purchase_id=payment_data.purchase_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method
    )

    db.add(payment)

    purchase.paid_amount += payment_data.amount
    purchase.debt_amount = purchase.total_amount - purchase.paid_amount

    if purchase.paid_amount >= purchase.total_amount:
        purchase.status = "pagado"
        purchase.debt_amount = 0
    elif purchase.paid_amount > 0:
        purchase.status = "parcial"

    db.commit()
    db.refresh(payment)

    return payment


def get_purchase_payments(db: Session, purchase_id: int, company_id: int) -> list:
    """Obtiene todos los pagos de una compra"""
    payments = db.query(SupplierPayment).filter(
        SupplierPayment.purchase_id == purchase_id,
        SupplierPayment.company_id == company_id
    ).all()
    return payments


def get_all_supplier_payments(db: Session, company_id: int, limit: int = 100) -> list:
    """Obtiene todos los pagos a proveedores registrados"""
    from sqlalchemy import desc
    payments = db.query(SupplierPayment).filter(
        SupplierPayment.company_id == company_id
    ).order_by(desc(SupplierPayment.created_at)).limit(limit).all()
    return payments
