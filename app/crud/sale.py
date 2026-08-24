from sqlalchemy.orm import Session
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.schemas.sale import SaleCreate
from sqlalchemy import desc
from datetime import datetime
from app.crud.daily_box import get_current_daily_box

# Tope de descuento que puede aplicar un cajero sin ser admin. El admin no
# tiene tope. Ver deps.require_admin para el resto de los permisos por rol.
CAJERO_MAX_DISCOUNT_PERCENT = 15.0


def _calculate_discount(subtotal_amount: float, sale_data: SaleCreate, role: str) -> tuple[float, float]:
    """
    Calcula el descuento a aplicar sobre una venta y devuelve
    (discount_amount, discount_percent_para_mostrar).
    Valida que no se hayan mandado los dos tipos de descuento juntos, que
    no exceda el subtotal, y que un cajero no supere su tope permitido.
    """
    discount_percent = sale_data.discount_percent
    discount_amount = sale_data.discount_amount

    if discount_percent and discount_amount:
        raise Exception("Elegí un solo tipo de descuento: porcentaje o monto fijo, no ambos")

    if discount_percent:
        computed_amount = subtotal_amount * discount_percent / 100
        effective_percent = discount_percent
    elif discount_amount:
        computed_amount = discount_amount
        effective_percent = (discount_amount / subtotal_amount * 100) if subtotal_amount > 0 else 0
    else:
        return 0.0, None

    if computed_amount > subtotal_amount:
        raise Exception("El descuento no puede ser mayor al subtotal de la venta")

    if role == "cajero" and effective_percent > CAJERO_MAX_DISCOUNT_PERCENT:
        raise Exception(
            f"Como cajero podés aplicar hasta {CAJERO_MAX_DISCOUNT_PERCENT:.0f}% de descuento. "
            f"Para más, pedile a un administrador que complete la venta."
        )

    return float(computed_amount), (float(discount_percent) if discount_percent else None)


def create_sale(db: Session, sale_data: SaleCreate, company_id: int, role: str = "admin"):
    subtotal_amount = 0
    sale_items = []

    print(f"📝 Iniciando creación de venta para cliente {sale_data.customer_id}")
    print(f"   Items: {len(sale_data.items)}, Pago inicial: {sale_data.initial_payment}")

    # 🔍 1. Validar stock + calcular subtotal
    for item in sale_data.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.company_id == company_id
        ).first()

        if not product:
            raise Exception(f"Producto {item.product_id} no existe")

        if product.stock < item.quantity:
            raise Exception(f"Stock insuficiente para {product.name} (disponible: {product.stock}, solicitado: {item.quantity})")

        subtotal_amount += product.price * item.quantity

        sale_items.append({
            "product": product,
            "quantity": item.quantity
        })

    discount_amount, discount_percent = _calculate_discount(subtotal_amount, sale_data, role)
    total_amount = subtotal_amount - discount_amount

    # Validar pago inicial - pero SOLO para validación, no para guardar aquí
    initial_payment = sale_data.initial_payment or 0
    if initial_payment > total_amount:
        raise Exception(f"El pago inicial no puede exceder el total de la venta")

    # Obtener caja diaria activa
    current_box = get_current_daily_box(db, company_id)
    daily_box_id = current_box.id if current_box else None

    # 💾 2. Crear venta - SIEMPRE con pagado=0, será actualizado por el pago después
    sale = Sale(
        company_id=company_id,
        customer_id=sale_data.customer_id,
        daily_box_id=daily_box_id,
        subtotal_amount=float(subtotal_amount),
        total_amount=float(total_amount),
        discount_percent=discount_percent,
        discount_amount=float(discount_amount),
        paid_amount=0.0,  # Siempre 0 aquí, será actualizado por pagos
        debt_amount=float(total_amount),  # Inicialmente es el total
        status="pendiente"  # Siempre pendiente al crear
    )

    db.add(sale)
    db.flush()  # Flush para obtener el ID sin hacer commit aún
    db.refresh(sale)

    # 📦 3. Crear items + descontar stock
    for item in sale_items:
        product = item["product"]

        sale_item = SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=item["quantity"]
        )

        # 🔻 descontar stock
        product.stock -= item["quantity"]

        db.add(sale_item)

    # Nota: No creamos el pago aquí, se registrará desde el frontend si es necesario
    # Esto evita conflictos con múltiples registros de un mismo pago

    db.commit()
    db.refresh(sale)
    
    print(f"   ✅ Venta creada con ID: {sale.id}")

    return sale


def cancel_sale(db: Session, sale_id: int, company_id: int, reason: str = None):
    """
    Anula una venta: repone el stock de todos sus items y la marca como
    cancelada. No borra la venta ni sus montos históricos (total_amount,
    paid_amount quedan como constancia de lo que pasó), pero pone la deuda
    en 0 (una venta anulada no genera deuda) y a partir de ahí queda
    excluida de las estadísticas, cajas y reportes.
    """
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == company_id
    ).first()

    if not sale:
        raise Exception(f"Venta {sale_id} no existe")

    if sale.cancelled_at is not None:
        raise Exception("La venta ya fue anulada")

    # Reponer stock de cada item
    for item in sale.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if product:
            product.stock += item.quantity

    refund_due = sale.paid_amount or 0.0

    sale.cancelled_at = datetime.utcnow()
    sale.cancel_reason = reason
    sale.debt_amount = 0.0

    db.commit()
    db.refresh(sale)

    return {
        "id": sale.id,
        "cancelled_at": sale.cancelled_at,
        "cancel_reason": sale.cancel_reason,
        "refund_due": refund_due
    }


def get_sale_details(db: Session, sale_id: int, company_id: int):
    """Obtiene los detalles completos de una venta para el ticket/factura"""
    print(f"\n📋 Obteniendo detalles de venta {sale_id}")
    
    sale = db.query(Sale).filter(
        Sale.id == sale_id,
        Sale.company_id == company_id
    ).first()
    
    if not sale:
        raise Exception(f"Venta {sale_id} no existe")
    
    print(f"   ✓ Venta encontrada: Total ${sale.total_amount}")
    
    # Obtener items de la venta con detalles del producto
    items = db.query(
        SaleItem.product_id,
        Product.name.label("product_name"),
        Product.price,
        SaleItem.quantity
    ).join(Product).filter(SaleItem.sale_id == sale_id).all()
    
    print(f"   ✓ Items encontrados: {len(items)}")
    
    items_detail = []
    for item in items:
        price = float(item.price) if item.price else 0.0
        quantity = float(item.quantity) if item.quantity else 0.0
        subtotal = price * quantity
        
        items_detail.append({
            "product_id": item.product_id,
            "product_name": str(item.product_name) if item.product_name else "Desconocido",
            "quantity": quantity,
            "price": price,
            "subtotal": subtotal
        })
        print(f"     - {item.product_name}: {quantity}x${price} = ${subtotal}")
    
    # Validar que el cliente existe
    customer_name = sale.customer.name if sale.customer else "Cliente desconocido"
    customer_email = sale.customer.email if sale.customer and hasattr(sale.customer, 'email') else None
    customer_phone = sale.customer.phone if sale.customer and hasattr(sale.customer, 'phone') else None
    
    result = {
        "id": sale.id,
        "customer_name": customer_name,
        "customer_email": customer_email,
        "customer_phone": customer_phone,
        "created_at": sale.created_at,
        "items": items_detail,
        "subtotal_amount": float(sale.subtotal_amount) if sale.subtotal_amount is not None else float(sale.total_amount),
        "total_amount": float(sale.total_amount),
        "discount_percent": float(sale.discount_percent) if sale.discount_percent else None,
        "discount_amount": float(sale.discount_amount) if sale.discount_amount else 0.0,
        "paid_amount": float(sale.paid_amount) if sale.paid_amount else 0.0,
        "debt_amount": float(sale.debt_amount) if sale.debt_amount else 0.0,
        "status": sale.status or "pendiente",
        "cancelled": sale.cancelled_at is not None,
        "cancelled_at": sale.cancelled_at,
        "cancel_reason": sale.cancel_reason
    }
    
    print(f"   ✅ Detalles preparados: {len(items_detail)} items, Total ${result['total_amount']}")
    
    return result


def get_all_sales(db: Session, company_id: int):
    """Obtiene todas las ventas ordenadas por fecha (más recientes primero)"""
    sales = db.query(Sale).filter(
        Sale.company_id == company_id
    ).order_by(desc(Sale.created_at)).all()
    
    sales_list = []
    for sale in sales:
        # Validar que el cliente existe
        customer_name = sale.customer.name if sale.customer else "Cliente desconocido"
        customer_phone = sale.customer.phone if sale.customer else "-"
        item_count = len(sale.items) if sale.items else 0
        
        sales_list.append({
            "id": sale.id,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "created_at": sale.created_at,
            "subtotal_amount": sale.subtotal_amount if sale.subtotal_amount is not None else sale.total_amount,
            "total_amount": sale.total_amount,
            "discount_percent": sale.discount_percent,
            "discount_amount": sale.discount_amount or 0.0,
            "paid_amount": sale.paid_amount,
            "debt_amount": sale.debt_amount,
            "status": sale.status,
            "item_count": item_count,
            "cancelled": sale.cancelled_at is not None,
            "cancelled_at": sale.cancelled_at,
            "cancel_reason": sale.cancel_reason
        })
    
    return sales_list


def get_pending_debts(db: Session, company_id: int):
    """Obtiene todas las ventas con deuda pendiente (deuda > 0) para la compañía."""
    sales = db.query(Sale).filter(
        Sale.company_id == company_id,
        Sale.debt_amount > 0,
        Sale.total_amount > 0
    ).order_by(desc(Sale.created_at)).all()

    debts = []
    total_debt = 0.0
    for sale in sales:
        customer_name = sale.customer.name if sale.customer else "Desconocido"
        customer_phone = sale.customer.phone if sale.customer else "-"
        item_count = len(sale.items) if sale.items else 0
        debt = float(sale.debt_amount or 0)
        total_debt += debt
        debts.append({
            "sale_id": sale.id,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "item_count": item_count,
            "total_amount": float(sale.total_amount or 0),
            "paid_amount": float(sale.paid_amount or 0),
            "debt_amount": debt
        })

    return {
        "pending_count": len(debts),
        "total_debt": total_debt,
        "debts": debts
    }