from sqlalchemy.orm import Session
from app.models.purchase import Purchase
from app.models.purchase_item import PurchaseItem
from app.models.product import Product
from app.models.supplier import Supplier
from app.schemas.purchase import PurchaseCreate
from sqlalchemy import desc

def create_purchase(db: Session, purchase_data: PurchaseCreate, company_id: int):
    """Crear una compra y actualizar stock de productos"""
    
    # 🔍 1. Validar que el proveedor existe y pertenece a la compañía
    supplier = db.query(Supplier).filter(
        Supplier.id == purchase_data.supplier_id,
        Supplier.company_id == company_id
    ).first()
    if not supplier:
        raise Exception(f"Proveedor {purchase_data.supplier_id} no existe")
    
    # 🔍 2. Validar que todos los productos existan y pertenezcan a la compañía
    total_amount = 0.0
    purchase_items_data = []
    
    for item in purchase_data.items:
        product = db.query(Product).filter(
            Product.id == item.product_id,
            Product.company_id == company_id
        ).first()
        
        if not product:
            raise Exception(f"Producto {item.product_id} no existe")
        
        # Validar cantidades
        if item.quantity <= 0:
            raise Exception(f"La cantidad debe ser mayor a 0")
        
        if item.unit_cost <= 0:
            raise Exception(f"El costo unitario debe ser mayor a 0")
        
        # Calcular subtotal
        subtotal = item.quantity * item.unit_cost
        total_amount += subtotal
        
        purchase_items_data.append({
            "product": product,
            "quantity": item.quantity,
            "unit_cost": item.unit_cost,
            "subtotal": subtotal
        })
    
    # Validar pago inicial - pero SOLO para validación, no para guardar aquí
    initial_payment = purchase_data.initial_payment or 0
    if initial_payment > total_amount:
        raise Exception("El pago inicial no puede exceder el total de la compra")

    # 💾 3. Crear compra - SIEMPRE con pagado=0, será actualizado por el pago después
    purchase = Purchase(
        company_id=company_id,
        supplier_id=purchase_data.supplier_id,
        total_amount=total_amount,
        paid_amount=0.0,
        debt_amount=total_amount,
        status="pendiente"
    )

    db.add(purchase)
    db.commit()
    db.refresh(purchase)
    
    # 📦 4. Crear items y actualizar stock
    for item_data in purchase_items_data:
        product = item_data["product"]
        quantity = item_data["quantity"]
        
        # Crear registro de compra-item
        purchase_item = PurchaseItem(
            purchase_id=purchase.id,
            product_id=product.id,
            quantity=quantity,
            unit_cost=item_data["unit_cost"],
            subtotal=item_data["subtotal"]
        )
        
        # 📈 Aumentar stock del producto
        product.stock += quantity
        
        # 💰 Actualizar costo unitario del producto
        product.cost_price = item_data["unit_cost"]
        
        db.add(purchase_item)
    
    db.commit()
    
    return purchase


def get_purchase_details(db: Session, purchase_id: int, company_id: int):
    """Obtener los detalles completos de una compra"""
    purchase = db.query(Purchase).filter(
        Purchase.id == purchase_id,
        Purchase.company_id == company_id
    ).first()
    
    if not purchase:
        raise Exception(f"Compra {purchase_id} no existe")
    
    # Obtener los items de la compra
    items = db.query(
        PurchaseItem.id,
        PurchaseItem.product_id,
        Product.name.label("product_name"),
        PurchaseItem.quantity,
        PurchaseItem.unit_cost,
        PurchaseItem.subtotal
    ).join(Product).filter(PurchaseItem.purchase_id == purchase_id).all()
    
    items_detail = [
        {
            "id": item.id,
            "product_id": item.product_id,
            "product_name": item.product_name,
            "quantity": item.quantity,
            "unit_cost": item.unit_cost,
            "subtotal": item.subtotal
        }
        for item in items
    ]
    
    return {
        "id": purchase.id,
        "supplier_name": purchase.supplier.name,
        "supplier_email": purchase.supplier.email,
        "supplier_phone": purchase.supplier.phone,
        "date": purchase.date,
        "items": items_detail,
        "total_amount": purchase.total_amount,
        "paid_amount": purchase.paid_amount or 0.0,
        "debt_amount": purchase.debt_amount or 0.0,
        "status": purchase.status or "pendiente"
    }


def get_all_purchases(db: Session, company_id: int):
    """Obtener todas las compras ordenadas por fecha descendente"""
    purchases = db.query(Purchase).filter(
        Purchase.company_id == company_id
    ).order_by(desc(Purchase.date)).all()
    
    result = []
    for purchase in purchases:
        items = db.query(PurchaseItem).filter(PurchaseItem.purchase_id == purchase.id).all()
        
        result.append({
            "id": purchase.id,
            "supplier_name": purchase.supplier.name,
            "date": purchase.date,
            "items_count": len(items),
            "total_amount": purchase.total_amount,
            "paid_amount": purchase.paid_amount or 0.0,
            "debt_amount": purchase.debt_amount or 0.0,
            "status": purchase.status or "pendiente"
        })

    return result


def get_pending_supplier_debts(db: Session, company_id: int):
    """Obtiene todas las compras con deuda pendiente (deuda > 0) a proveedores."""
    purchases = db.query(Purchase).filter(
        Purchase.company_id == company_id,
        Purchase.debt_amount > 0,
        Purchase.total_amount > 0
    ).order_by(desc(Purchase.date)).all()

    debts = []
    total_debt = 0.0
    for purchase in purchases:
        supplier_name = purchase.supplier.name if purchase.supplier else "Desconocido"
        supplier_phone = purchase.supplier.phone if purchase.supplier else "-"
        item_count = len(purchase.items) if purchase.items else 0
        debt = float(purchase.debt_amount or 0)
        total_debt += debt
        debts.append({
            "purchase_id": purchase.id,
            "supplier_name": supplier_name,
            "supplier_phone": supplier_phone,
            "item_count": item_count,
            "total_amount": float(purchase.total_amount or 0),
            "paid_amount": float(purchase.paid_amount or 0),
            "debt_amount": debt
        })

    return {
        "pending_count": len(debts),
        "total_debt": total_debt,
        "debts": debts
    }


def get_purchases_by_supplier(db: Session, supplier_id: int, company_id: int):
    """Obtener todas las compras de un proveedor específico"""
    supplier = db.query(Supplier).filter(
        Supplier.id == supplier_id,
        Supplier.company_id == company_id
    ).first()
    
    if not supplier:
        raise Exception(f"Proveedor {supplier_id} no existe")
    
    purchases = db.query(Purchase).filter(
        Purchase.supplier_id == supplier_id,
        Purchase.company_id == company_id
    ).order_by(desc(Purchase.date)).all()
    
    result = []
    for purchase in purchases:
        items = db.query(PurchaseItem).filter(PurchaseItem.purchase_id == purchase.id).all()
        
        result.append({
            "id": purchase.id,
            "supplier_name": purchase.supplier.name,
            "date": purchase.date,
            "items_count": len(items),
            "total_amount": purchase.total_amount,
            "paid_amount": purchase.paid_amount or 0.0,
            "debt_amount": purchase.debt_amount or 0.0,
            "status": purchase.status or "pendiente"
        })
    
    return result
