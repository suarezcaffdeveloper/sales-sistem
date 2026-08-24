from sqlalchemy.orm import Session
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.sale_return import SaleReturn
from app.models.sale_return_item import SaleReturnItem


def create_partial_return(db: Session, sale_id: int, company_id: int, items: list, reason: str = None):
    """
    Registra una devolución parcial de una o más líneas de una venta:
    repone el stock devuelto y reduce subtotal/descuento/total de la venta
    en proporción a lo devuelto. El descuento de la venta (si lo hay) se
    prorratea sobre el valor devuelto — es la misma idea que ya usa el
    resto del sistema para tratar el descuento a nivel de venta, no por
    ítem (ver _calculate_discount en crud/sale.py).
    """
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == company_id
    ).first()

    if not sale:
        raise Exception(f"Venta {sale_id} no existe")

    if sale.cancelled_at is not None:
        raise Exception("No se puede devolver productos de una venta anulada")

    if not items:
        raise Exception("Tenés que indicar al menos un producto a devolver")

    discount_rate = (sale.discount_amount / sale.subtotal_amount) if sale.subtotal_amount else 0.0

    total_item_value = 0.0
    return_lines = []

    for req_item in items:
        sale_item = db.query(SaleItem).filter(
            SaleItem.id == req_item.sale_item_id,
            SaleItem.sale_id == sale.id
        ).first()

        if not sale_item:
            raise Exception(f"El ítem {req_item.sale_item_id} no pertenece a esta venta")

        already_returned = sale_item.returned_quantity or 0
        remaining = sale_item.quantity - already_returned

        if req_item.quantity > remaining:
            product_name = sale_item.product.name if sale_item.product else f"producto {sale_item.product_id}"
            raise Exception(
                f"No podés devolver {req_item.quantity} unidades de {product_name}: "
                f"quedan {remaining} disponibles para devolver"
            )

        unit_price = float(sale_item.product.price or 0) if sale_item.product else 0.0
        item_value = unit_price * req_item.quantity
        total_item_value += item_value

        return_lines.append({
            "sale_item": sale_item,
            "quantity": req_item.quantity,
            "unit_price": unit_price
        })

    if total_item_value <= 0:
        raise Exception("La devolución no puede ser de $0")

    total_refund = total_item_value * (1 - discount_rate)

    sale_return = SaleReturn(
        company_id=company_id,
        sale_id=sale.id,
        reason=reason,
        refund_amount=float(total_refund)
    )
    db.add(sale_return)
    db.flush()

    items_returned = []
    for line in return_lines:
        sale_item = line["sale_item"]
        product = sale_item.product

        sale_item.returned_quantity = (sale_item.returned_quantity or 0) + line["quantity"]
        if product:
            product.stock += line["quantity"]

        db.add(SaleReturnItem(
            sale_return_id=sale_return.id,
            sale_item_id=sale_item.id,
            product_id=sale_item.product_id,
            quantity=line["quantity"],
            unit_price=line["unit_price"]
        ))

        items_returned.append({
            "product_id": sale_item.product_id,
            "product_name": product.name if product else "Desconocido",
            "quantity": line["quantity"]
        })

    # Actualizar montos de la venta: lo devuelto deja de formar parte de lo vendido
    sale.subtotal_amount = float((sale.subtotal_amount or 0) - total_item_value)
    sale.discount_amount = float((sale.discount_amount or 0) - (total_item_value * discount_rate))
    sale.total_amount = float((sale.total_amount or 0) - total_refund)
    sale.debt_amount = max(0.0, sale.total_amount - (sale.paid_amount or 0))

    refund_due = max(0.0, (sale.paid_amount or 0) - sale.total_amount)

    if sale.total_amount <= 0 or (sale.paid_amount or 0) >= sale.total_amount:
        sale.status = "pagado"
    elif sale.paid_amount and sale.paid_amount > 0:
        sale.status = "parcial"

    db.commit()
    db.refresh(sale)

    return {
        "sale_id": sale.id,
        "return_id": sale_return.id,
        "items_returned": items_returned,
        "refund_amount": float(total_refund),
        "refund_due": float(refund_due),
        "new_subtotal_amount": sale.subtotal_amount,
        "new_discount_amount": sale.discount_amount,
        "new_total_amount": sale.total_amount,
        "new_debt_amount": sale.debt_amount
    }


def get_sale_returns(db: Session, sale_id: int, company_id: int):
    """Historial de devoluciones parciales de una venta."""
    sale = db.query(Sale).filter(Sale.id == sale_id, Sale.company_id == company_id).first()
    if not sale:
        raise Exception(f"Venta {sale_id} no existe")

    returns = db.query(SaleReturn).filter(
        SaleReturn.sale_id == sale_id,
        SaleReturn.company_id == company_id
    ).order_by(SaleReturn.created_at.desc()).all()

    result = []
    for r in returns:
        result.append({
            "id": r.id,
            "created_at": r.created_at,
            "reason": r.reason,
            "refund_amount": float(r.refund_amount or 0),
            "items": [
                {
                    "product_id": i.product_id,
                    "product_name": i.product.name if i.product else "Desconocido",
                    "quantity": i.quantity,
                    "unit_price": float(i.unit_price or 0)
                }
                for i in r.items
            ]
        })
    return result
