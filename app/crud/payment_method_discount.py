from sqlalchemy.orm import Session
from app.models.payment_method_discount import PaymentMethodDiscount

# Métodos de pago soportados por el sistema (mismo set que usan Payment/SupplierPayment)
PAYMENT_METHODS = ["efectivo", "transferencia", "tarjeta"]


def get_payment_method_discounts(db: Session, company_id: int):
    """
    Devuelve el descuento configurado para cada método de pago conocido.
    Un método sin configuración guardada todavía se devuelve en 0% e inactivo
    (comportamiento por defecto: sin descuento automático).
    """
    existing = {
        d.payment_method: d
        for d in db.query(PaymentMethodDiscount).filter(PaymentMethodDiscount.company_id == company_id).all()
    }
    return [
        {
            "payment_method": method,
            "discount_percent": float(existing[method].discount_percent) if method in existing else 0.0,
            "active": bool(existing[method].active) if method in existing else False,
        }
        for method in PAYMENT_METHODS
    ]


def set_payment_method_discount(db: Session, company_id: int, payment_method: str, discount_percent: float, active: bool):
    """Crea o actualiza (upsert) el descuento configurado para un método de pago."""
    if payment_method not in PAYMENT_METHODS:
        raise Exception(f"Método de pago inválido: {payment_method}")

    record = db.query(PaymentMethodDiscount).filter(
        PaymentMethodDiscount.company_id == company_id,
        PaymentMethodDiscount.payment_method == payment_method
    ).first()

    if record:
        record.discount_percent = discount_percent
        record.active = active
    else:
        record = PaymentMethodDiscount(
            company_id=company_id,
            payment_method=payment_method,
            discount_percent=discount_percent,
            active=active
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return {
        "payment_method": record.payment_method,
        "discount_percent": float(record.discount_percent),
        "active": bool(record.active)
    }


def get_active_discount_for_method(db: Session, company_id: int, payment_method: str):
    """Usado al crear una venta: devuelve el % activo para ese método, o None si no aplica."""
    if not payment_method:
        return None
    record = db.query(PaymentMethodDiscount).filter(
        PaymentMethodDiscount.company_id == company_id,
        PaymentMethodDiscount.payment_method == payment_method,
        PaymentMethodDiscount.active == True
    ).first()
    return float(record.discount_percent) if record and record.discount_percent else None
