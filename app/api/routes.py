from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.schemas.product import ProductCreate, ProductResponse
from app.crud.product import create_product, get_products, update_product, delete_product
from typing import Optional, List
from app.crud.product import get_products_filtered
from app.schemas.sale import SaleCreate, SaleResponse, SaleDetail
from app.crud.sale import create_sale, get_sale_details, get_all_sales
from app.schemas.purchase import PurchaseCreate, PurchaseResponse, PurchaseDetail
from app.crud.purchase import (
    create_purchase, get_purchase_details, get_all_purchases, get_purchases_by_supplier
)
from app.schemas.daily_box import DailyBoxCreate, DailyBoxClose, DailyBoxResponse
from app.crud.daily_box import (
    open_daily_box, close_daily_box, get_current_daily_box, 
    get_daily_box_by_date, get_all_daily_boxes, get_daily_box_details_by_id
)
from app.schemas.user import UserCreate, UserLogin, Token
from app.crud.user import create_user, get_user_by_username
from app.core.security import verify_password, create_access_token
from fastapi import HTTPException
from app.core.deps import get_current_user

# Router para rutas PROTEGIDAS (requieren autenticación)
protected_router = APIRouter(
    dependencies=[Depends(get_current_user)]
)

# Router para rutas PÚBLICAS (sin autenticación)
public_router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@public_router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = get_user_by_username(db, user.username)

    if existing:
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    return create_user(db, user.username, user.password)

@public_router.post("/login", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, user.username)

    # Mensaje genérico (seguridad)
    if not db_user or not verify_password(user.password, db_user.password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token({"sub": db_user.username})

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@protected_router.get("/validate")
def validate_token(username: str = Depends(get_current_user)):
    """Valida que el token JWT sea válido. Solo se ejecuta si la autenticación es correcta."""
    return {"status": "valid", "username": username}

# ================================
# RUTAS PROTEGIDAS (requieren JWT)
# ================================

@protected_router.post("/products", response_model=ProductResponse)
def create(product: ProductCreate, db: Session = Depends(get_db)):
    return create_product(db, product)

@protected_router.get("/products", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db)):
    return get_products(db)

@protected_router.put("/products/{product_id}", response_model=ProductResponse)
def update(product_id: int, product: ProductCreate, db: Session = Depends(get_db)):
    updated = update_product(db, product_id, product)
    
    if not updated:
        return {"error": "Producto no encontrado"}
    
    return updated

@protected_router.delete("/products/{product_id}")
def delete(product_id: int, db: Session = Depends(get_db)):
    deleted = delete_product(db, product_id)

    if not deleted:
        return {"error": "Producto no encontrado"}

    return {"message": "Producto eliminado"}

@protected_router.get("/products/search", response_model=list[ProductResponse])
def search_products(
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    db: Session = Depends(get_db)
):
    return get_products_filtered(db, category, max_price)

#----------RUTAS PARA PROVEEDORES----------#
from app.schemas.supplier import SupplierCreate, SupplierResponse
from app.crud.supplier import create_supplier, delete_supplier, get_suppliers, update_supplier

@protected_router.post("/suppliers", response_model=SupplierResponse)
def create_supplier_route(supplier: SupplierCreate, db: Session = Depends(get_db)):
    return create_supplier(db, supplier)

@protected_router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    return get_suppliers(db)

@protected_router.delete("/suppliers/{supplier_id}")
def delete_supplier_route(supplier_id: int, db: Session = Depends(get_db)):
    deleted = delete_supplier(db, supplier_id)

    if not deleted:
        return {"error": "Proveedor no encontrado"}

    return {"message": "Proveedor eliminado"}

@protected_router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier_route(supplier_id: int, supplier: SupplierCreate, db: Session =
    Depends(get_db)):
    updated = update_supplier(db, supplier_id, supplier)
    
    if not updated:
        return {"error": "Proveedor no encontrado"}
    
    return updated

#----------RUTAS PARA CLIENTES----------#
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.crud.customer import create_customer, delete_customer, get_customers, update_customer

@protected_router.post("/customers", response_model=CustomerResponse)
def create_customer_route(customer: CustomerCreate, db: Session = Depends(get_db)):
    return create_customer(db, customer)

@protected_router.get("/customers", response_model=list[CustomerResponse])
def list_customers(db: Session = Depends(get_db)):
    return get_customers(db)

@protected_router.delete("/customers/{customer_id}")
def delete_customer_route(customer_id: int, db: Session = Depends(get_db)):
    deleted = delete_customer(db, customer_id)

    if not deleted:
        return {"error": "Cliente no encontrado"}

    return {"message": "Cliente eliminado"}

@protected_router.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer_route(customer_id: int, customer: CustomerCreate, db: Session = Depends(get_db)):
    updated = update_customer(db, customer_id, customer)
    
    if not updated:
        return {"error": "Cliente no encontrado"}
    
    return updated  

@protected_router.post("/sales", response_model=SaleResponse)
def create_new_sale(sale: SaleCreate, db: Session = Depends(get_db)):
    try:
        return create_sale(db, sale)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/sales/pending-debts")
def get_pending_debts_endpoint(db: Session = Depends(get_db)):
    """Obtiene todas las facturas con deuda pendiente"""
    return get_pending_debts(db)

@protected_router.get("/sales/{sale_id}")
def get_sale(sale_id: int, db: Session = Depends(get_db)):
    try:
        return get_sale_details(db, sale_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/sales")
def list_sales(db: Session = Depends(get_db)) -> list:
    """Obtiene todas las ventas"""
    try:
        sales = get_all_sales(db)
        # Asegurar que siempre retorna un array
        if not isinstance(sales, list):
            sales = []
        return sales
    except Exception as e:
        import traceback
        print(f"Error en /api/sales: {str(e)}")
        traceback.print_exc()
        # En caso de error, retornar array vacío en lugar de excepción
        # para que el frontend no se rompa
        return []


# RUTAS PARA COMPRAS
@protected_router.post("/purchases", response_model=PurchaseResponse)
def create_new_purchase(purchase: PurchaseCreate, db: Session = Depends(get_db)):
    try:
        return create_purchase(db, purchase)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/purchases/{purchase_id}")
def get_purchase(purchase_id: int, db: Session = Depends(get_db)):
    try:
        return get_purchase_details(db, purchase_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/purchases")
def list_purchases(db: Session = Depends(get_db)):
    try:
        return get_all_purchases(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@protected_router.get("/purchases/supplier/{supplier_id}")
def get_supplier_purchases(supplier_id: int, db: Session = Depends(get_db)):
    try:
        return get_purchases_by_supplier(db, supplier_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


# RUTAS PARA CAJA DIARIA
@protected_router.post("/daily-box/open", response_model=DailyBoxResponse)
def open_box(box: DailyBoxCreate, db: Session = Depends(get_db)):
    try:
        return open_daily_box(db, box.opening_balance, user_id=None)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.post("/daily-box/close", response_model=DailyBoxResponse)
def close_box(box: DailyBoxClose, db: Session = Depends(get_db)):
    try:
        return close_daily_box(db, box.closing_balance)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/daily-box/current")
def get_current_box(db: Session = Depends(get_db)):
    try:
        box = get_current_daily_box(db)
        if not box:
            # No hay caja abierta hoy
            return {
                "id": None,
                "date": None,
                "opened_at": None,
                "closed_at": None,
                "opening_balance": 0.0,
                "closing_balance": None,
                "status": "closed",
                "total_sales": 0.0,
                "total_profit": 0.0,
                "sale_count": 0
            }
        
        # Obtener detalles usando el ID de la caja (filtra ventas asociadas)
        try:
            box_detail = get_daily_box_details_by_id(db, box.id)
            return box_detail
        except Exception as e:
            # Si hay error al obtener detalles, devolver al menos el status del modelo
            print(f"Error getting box details: {str(e)}")
            return {
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
            }
    except Exception as e:
        print(f"Error in get_current_box: {str(e)}")
        return {
            "id": None,
            "date": None,
            "opened_at": None,
            "closed_at": None,
            "opening_balance": 0.0,
            "closing_balance": None,
            "status": "closed",
            "total_sales": 0.0,
            "total_profit": 0.0,
            "sale_count": 0
        }

@protected_router.get("/daily-box/{box_date}")
def get_box_by_date(box_date: str, db: Session = Depends(get_db)):
    try:
        return get_daily_box_by_date(db, box_date)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/daily-box")
def list_boxes(db: Session = Depends(get_db)):
    try:
        return get_all_daily_boxes(db)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# RUTAS PARA ESTADÍSTICAS
from app.crud.statistics import (
    get_sales_by_period,
    get_top_products,
    get_bottom_products,
    get_low_stock_products,
    get_total_products,
    get_total_customers,
    get_total_sales,
    get_total_sales_count,
    get_total_profit,
    get_total_cost_invested,
    get_dashboard_stats,
    get_most_used_payment_method,
    get_pending_debts
)

@protected_router.get("/statistics/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    """Obtiene todas las estadísticas del dashboard"""
    return get_dashboard_stats(db)

@protected_router.get("/statistics/sales/{period}")
def get_sales_stats(period: str = "day", db: Session = Depends(get_db)):
    """Obtiene estadísticas de ventas por período (day, month, year)"""
    return get_sales_by_period(db, period)

@protected_router.get("/statistics/top-products")
def get_top_sold(limit: int = 5, db: Session = Depends(get_db)):
    """Obtiene los productos más vendidos"""
    return get_top_products(db, limit)

@protected_router.get("/statistics/bottom-products")
def get_bottom_sold(limit: int = 5, db: Session = Depends(get_db)):
    """Obtiene los productos menos vendidos"""
    return get_bottom_products(db, limit)

@protected_router.get("/statistics/low-stock")
def get_low_stock(threshold: int = 3, db: Session = Depends(get_db)):
    """Obtiene los productos con stock bajo"""
    return get_low_stock_products(db, threshold)

@protected_router.get("/statistics/payment-methods")
def get_payment_methods_stats(db: Session = Depends(get_db)):
    """Obtiene el método de pago más utilizado"""
    return get_most_used_payment_method(db)


# ================================
# RUTAS PARA PAGOS (NEW)
# ================================

from app.schemas.payment import PaymentCreate, PaymentResponse
from app.crud.payment import create_payment, get_payment, get_sale_payments, get_all_payments

@protected_router.post("/payments", response_model=PaymentResponse)
def create_payment_endpoint(payment: PaymentCreate, db: Session = Depends(get_db)):
    """Registra un pago para una venta"""
    try:
        return create_payment(db, payment)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/payments/{payment_id}", response_model=PaymentResponse)
def get_payment_endpoint(payment_id: int, db: Session = Depends(get_db)):
    """Obtiene detalles de un pago"""
    try:
        return get_payment(db, payment_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/sales/{sale_id}/payments")
def get_sale_payments_endpoint(sale_id: int, db: Session = Depends(get_db)):
    """Obtiene todos los pagos de una venta"""
    try:
        return get_sale_payments(db, sale_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/payments")
def list_all_payments(limit: int = 100, db: Session = Depends(get_db)):
    """Lista todos los pagos registrados"""
    try:
        return get_all_payments(db, limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================================
# RUTAS PARA REPORTES (NEW)
# ================================

from fastapi.responses import FileResponse, StreamingResponse
from app.services.report_generator import (
    generate_sales_excel,
    generate_daily_report_pdf,
    generate_weekly_report_pdf,
    generate_monthly_report_pdf
)
from datetime import datetime

@protected_router.get("/reports/sales/excel")
def export_sales_excel(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Exporta reporte de ventas en Excel"""
    try:
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None
        
        excel_file = generate_sales_excel(db, start, end)
        
        return StreamingResponse(
            iter([excel_file.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=reporte_ventas.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/reports/daily")
def get_daily_report(date: Optional[str] = None, db: Session = Depends(get_db)):
    """Reporte PDF del día (caja diaria)"""
    try:
        box_date = datetime.fromisoformat(date).date() if date else None
        pdf_file = generate_daily_report_pdf(db, box_date)
        
        return StreamingResponse(
            iter([pdf_file.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_diario.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/reports/weekly")
def get_weekly_report(db: Session = Depends(get_db)):
    """Reporte PDF semanal"""
    try:
        pdf_file = generate_weekly_report_pdf(db)
        
        return StreamingResponse(
            iter([pdf_file.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_semanal.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/reports/monthly")
def get_monthly_report(db: Session = Depends(get_db)):
    """Reporte PDF mensual"""
    try:
        pdf_file = generate_monthly_report_pdf(db)
        
        return StreamingResponse(
            iter([pdf_file.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_mensual.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")
