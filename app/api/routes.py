from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.product import ProductResponse, ProductCreate
from app.crud.product import create_product, get_products, update_product, delete_product, get_products_filtered
from app.schemas.sale import SaleCreate, SaleResponse, SaleCancelRequest
from app.crud.sale import create_sale, get_sale_details, get_all_sales, get_pending_debts, cancel_sale
from app.schemas.purchase import PurchaseCreate, PurchaseResponse
from app.crud.purchase import create_purchase, get_purchase_details, get_all_purchases, get_purchases_by_supplier, get_pending_supplier_debts
from app.schemas.supplier_payment import SupplierPaymentCreate, SupplierPaymentResponse
from app.crud.supplier_payment import create_supplier_payment, get_purchase_payments, get_all_supplier_payments
from app.schemas.daily_box import DailyBoxCreate, DailyBoxClose, DailyBoxResponse
from app.crud.daily_box import open_daily_box, close_daily_box, get_current_daily_box, get_daily_box_by_date, get_all_daily_boxes, get_daily_box_details_by_id
from app.schemas.user import UserLogin, Token, UserRegister, UserResponse, TeammateCreate, UserRoleUpdate, RegisterResponse, ResetPasswordResponse
from app.crud.user import (
    create_user, get_user_by_username, get_users_by_company,
    update_user_role, delete_user as delete_user_crud,
    create_default_employee, reset_user_password
)
from app.core.security import verify_password, create_access_token
from app.core.deps import get_current_user, get_current_user_with_company, require_admin
from typing import Optional
from app.crud.company import create_company
from app.schemas.company import CompanyCreate, CompanyResponse
from slowapi import Limiter
from slowapi.util import get_remote_address
from fastapi import Request
limiter = Limiter(key_func=get_remote_address)

# Router para rutas PROTEGIDAS (requieren autenticación)
protected_router = APIRouter(
    dependencies=[Depends(get_current_user)]
)

# Router para rutas PÚBLICAS (sin autenticación)
public_router = APIRouter()

@public_router.post("/register", response_model=RegisterResponse)
def register(user: UserRegister, db: Session = Depends(get_db)):
    existing = get_user_by_username(db, user.username)

    if existing:
        raise HTTPException(status_code=400, detail="Usuario ya existe")

    # /register siempre crea una compañía nueva y a este usuario como su
    # admin. No existe forma de autounirse a una compañía existente desde
    # acá — eso solo lo puede hacer un admin ya logueado, desde el panel de
    # Usuarios (evita que cualquiera se autoasigne un lugar en una empresa
    # ajena adivinando su ID).
    if user.company_name and user.company_name.strip():
        company = create_company(db, user.company_name)
    else:
        company = create_company(db, f"{user.username}'s Company")

    new_user = create_user(db, user.username, user.password, company_id=company.id, role="admin")

    response = RegisterResponse(
        id=new_user.id,
        username=new_user.username,
        company_id=new_user.company_id,
        role=new_user.role
    )

    # Se crea también un cajero por defecto, para que el dueño tenga de
    # entrada un acceso listo para dar a su primer empleado.
    employee, employee_password = create_default_employee(db, new_user.username, company.id)
    response.employee_username = employee.username
    response.employee_password = employee_password

    return response

@public_router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(request: Request, user: UserLogin, db: Session = Depends(get_db)):
    db_user = get_user_by_username(db, user.username)

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

@protected_router.get("/me", response_model=dict)
def get_current_user_info(user_info: dict = Depends(get_current_user_with_company)):
    """Obtiene la información del usuario actual con su compañía asignada"""
    return {
        "user_id": user_info["user_id"],
        "username": user_info["username"],
        "company_id": user_info["company_id"],
        "role": user_info["role"]
    }

# ================================
# RUTAS PARA GESTIÓN DE USUARIOS (equipo de la empresa)
# ================================

@protected_router.get("/users", response_model=list[UserResponse])
def list_users(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Lista los usuarios de la empresa (solo admin)"""
    return get_users_by_company(db, user_info["company_id"])

@protected_router.post("/users", response_model=UserResponse)
def create_teammate(teammate: TeammateCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Crea un usuario dentro de la misma empresa (solo admin)"""
    if get_user_by_username(db, teammate.username):
        raise HTTPException(status_code=400, detail="Usuario ya existe")
    return create_user(db, teammate.username, teammate.password, company_id=user_info["company_id"], role=teammate.role)

@protected_router.put("/users/{user_id}/role", response_model=UserResponse)
def update_teammate_role(user_id: int, body: UserRoleUpdate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Cambia el rol de un usuario de la empresa (solo admin)"""
    try:
        return update_user_role(db, user_id, user_info["company_id"], body.role)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@protected_router.delete("/users/{user_id}")
def remove_teammate(user_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Elimina un usuario de la empresa (solo admin)"""
    try:
        delete_user_crud(db, user_id, user_info["company_id"])
        return {"message": "Usuario eliminado"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@protected_router.post("/users/{user_id}/reset-password", response_model=ResetPasswordResponse)
def reset_teammate_password(user_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Genera una nueva contraseña temporal para un usuario de la empresa (solo admin)"""
    try:
        username, new_password = reset_user_password(db, user_id, user_info["company_id"])
        return ResetPasswordResponse(username=username, password=new_password)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ================================
# RUTAS PROTEGIDAS (requieren JWT)
# ================================

@protected_router.post("/products", response_model=ProductResponse)
def create(product: ProductCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    return create_product(db, product, user_info["company_id"])

@protected_router.get("/products", response_model=list[ProductResponse])
def list_products(user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    return get_products(db, user_info["company_id"])

@protected_router.put("/products/{product_id}", response_model=ProductResponse)
def update(product_id: int, product: ProductCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    updated = update_product(db, product_id, product, user_info["company_id"])

    if not updated:
        return {"error": "Producto no encontrado"}

    return updated

@protected_router.delete("/products/{product_id}")
def delete(product_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    deleted = delete_product(db, product_id, user_info["company_id"])

    if not deleted:
        return {"error": "Producto no encontrado"}

    return {"message": "Producto eliminado"}

@protected_router.get("/products/search", response_model=list[ProductResponse])
def search_products(
    category: Optional[str] = None,
    max_price: Optional[float] = None,
    user_info: dict = Depends(get_current_user_with_company),
    db: Session = Depends(get_db)
):
    return get_products_filtered(db, user_info["company_id"], category, max_price)

#----------RUTAS PARA PROVEEDORES----------#
from app.schemas.supplier import SupplierCreate, SupplierResponse
from app.crud.supplier import create_supplier, delete_supplier, get_suppliers, update_supplier

@protected_router.post("/suppliers", response_model=SupplierResponse)
def create_supplier_route(supplier: SupplierCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    return create_supplier(db, supplier, user_info["company_id"])

@protected_router.get("/suppliers", response_model=list[SupplierResponse])
def list_suppliers(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    return get_suppliers(db, user_info["company_id"])

@protected_router.delete("/suppliers/{supplier_id}")
def delete_supplier_route(supplier_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    deleted = delete_supplier(db, supplier_id, user_info["company_id"])

    if not deleted:
        return {"error": "Proveedor no encontrado"}

    return {"message": "Proveedor eliminado"}

@protected_router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier_route(supplier_id: int, supplier: SupplierCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    updated = update_supplier(db, supplier_id, supplier, user_info["company_id"])
    
    if not updated:
        return {"error": "Proveedor no encontrado"}
    
    return updated

#----------RUTAS PARA CLIENTES----------#
from app.schemas.customer import CustomerCreate, CustomerResponse
from app.crud.customer import create_customer, delete_customer, get_customers, update_customer

@protected_router.post("/customers", response_model=CustomerResponse)
def create_customer_route(customer: CustomerCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    return create_customer(db, customer, user_info["company_id"])

@protected_router.get("/customers", response_model=list[CustomerResponse])
def list_customers(user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    return get_customers(db, user_info["company_id"])

@protected_router.delete("/customers/{customer_id}")
def delete_customer_route(customer_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    deleted = delete_customer(db, customer_id, user_info["company_id"])

    if not deleted:
        return {"error": "Cliente no encontrado"}

    return {"message": "Cliente eliminado"}

@protected_router.put("/customers/{customer_id}", response_model=CustomerResponse)
def update_customer_route(customer_id: int, customer: CustomerCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    updated = update_customer(db, customer_id, customer, user_info["company_id"])
    
    if not updated:
        return {"error": "Cliente no encontrado"}
    
    return updated

@protected_router.post("/sales", response_model=SaleResponse)
def create_new_sale(sale: SaleCreate, user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    try:
        return create_sale(db, sale, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

# NOTA: Esta ruta DEBE ir antes de /sales/{sale_id} para que FastAPI no intente interpretar
# "pending-debts" como un ID numérico
@protected_router.get("/sales/pending-debts")
def get_pending_debts_endpoint(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene todas las facturas con deuda pendiente filtradas por compañía del usuario"""
    try:
        result = get_pending_debts(db, user_info["company_id"])
        return result
    except Exception as e:
        print(f"❌ Error en endpoint pending-debts: {str(e)}")
        import traceback
        traceback.print_exc()
        # Retornar estructura vacía pero válida en lugar de error 500
        return {
            "pending_count": 0,
            "total_debt": 0,
            "debts": []
        }

@protected_router.get("/sales/{sale_id}")
def get_sale(sale_id: int, user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    try:
        return get_sale_details(db, sale_id, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.post("/sales/{sale_id}/cancel")
def cancel_sale_endpoint(sale_id: int, body: SaleCancelRequest = SaleCancelRequest(), user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Anula una venta: repone el stock y la excluye de estadísticas/caja."""
    try:
        return cancel_sale(db, sale_id, user_info["company_id"], body.reason)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@protected_router.get("/sales")
def list_sales(user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)) -> list:
    """Obtiene todas las ventas"""
    try:
        sales = get_all_sales(db, user_info["company_id"])
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


# RUTAS PARA COMPRAS (solo admin: comprar a proveedores es una decisión de negocio,
# no una tarea de punto de venta)
@protected_router.post("/purchases", response_model=PurchaseResponse)
def create_new_purchase(purchase: PurchaseCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return create_purchase(db, purchase, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

# NOTA: Esta ruta DEBE ir antes de /purchases/{purchase_id} para que FastAPI no intente
# interpretar "pending-debts" como un ID numérico
@protected_router.get("/purchases/pending-debts")
def get_pending_supplier_debts_endpoint(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene todas las compras con deuda pendiente a proveedores"""
    try:
        return get_pending_supplier_debts(db, user_info["company_id"])
    except Exception as e:
        return {"pending_count": 0, "total_debt": 0, "debts": []}

@protected_router.get("/purchases/{purchase_id}")
def get_purchase(purchase_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return get_purchase_details(db, purchase_id, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/purchases")
def list_purchases(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return get_all_purchases(db, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@protected_router.get("/purchases/supplier/{supplier_id}")
def get_supplier_purchases(supplier_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return get_purchases_by_supplier(db, supplier_id, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.post("/supplier-payments", response_model=SupplierPaymentResponse)
def create_supplier_payment_endpoint(payment: SupplierPaymentCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Registra un pago a un proveedor por una compra"""
    try:
        return create_supplier_payment(db, payment, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@protected_router.get("/purchases/{purchase_id}/payments")
def get_purchase_payments_endpoint(purchase_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene todos los pagos de una compra"""
    try:
        return get_purchase_payments(db, purchase_id, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/supplier-payments")
def list_all_supplier_payments(limit: int = 100, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Lista todos los pagos a proveedores registrados"""
    try:
        return get_all_supplier_payments(db, user_info["company_id"], limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# RUTAS PARA CAJA DIARIA
@protected_router.post("/daily-box/open", response_model=DailyBoxResponse)
def open_box(box: DailyBoxCreate, user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    try:
        return open_daily_box(db, user_info["company_id"], box.opening_balance, user_id=user_info["user_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.post("/daily-box/close", response_model=DailyBoxResponse)
def close_box(box: DailyBoxClose, user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    try:
        return close_daily_box(db, user_info["company_id"], box.closing_balance)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/daily-box/current")
def get_current_box(user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    try:
        box = get_current_daily_box(db, user_info["company_id"])
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
            box_detail = get_daily_box_details_by_id(db, box.id, user_info["company_id"])
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
def get_box_by_date(box_date: str, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return get_daily_box_by_date(db, box_date, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/daily-box")
def list_boxes(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    try:
        return get_all_daily_boxes(db, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# RUTAS PARA ESTADÍSTICAS
from app.crud.statistics import (
    get_sales_by_period,
    get_low_stock_products,
    get_total_products,
    get_total_customers,
    get_total_sales,
    get_total_sales_count
)
from app.analytics.dashboard_analytics import get_dashboard_stats_pandas, get_top_products, get_bottom_products, get_total_profit_pandas_fast, get_most_used_payment_method_pandas

@protected_router.get("/statistics/dashboard")
def get_dashboard(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene todas las estadísticas del dashboard"""
    return get_dashboard_stats_pandas(db, user_info["company_id"])

@protected_router.get("/statistics/total-profit")
def get_total_profit(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene el total de ganancias"""
    return get_total_profit_pandas_fast(db, user_info["company_id"])

@protected_router.get("/statistics/sales/{period}")
def get_sales_stats(period: str = "day", user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene estadísticas de ventas por período (day, month, year)"""
    return get_sales_by_period(db, user_info["company_id"], period)

@protected_router.get("/statistics/top-products")
def get_top_sold(limit: int = 5, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene los productos más vendidos"""
    return get_top_products(db, user_info["company_id"], limit)

@protected_router.get("/statistics/bottom-products")
def get_bottom_sold(limit: int = 5, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene los productos menos vendidos"""
    return get_bottom_products(db, user_info["company_id"], limit)

@protected_router.get("/statistics/low-stock")
def get_low_stock(threshold: int = 3, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene los productos con stock bajo"""
    return get_low_stock_products(db, user_info["company_id"], threshold)

@protected_router.get("/statistics/payment-methods")
def get_payment_methods_stats(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Obtiene el método de pago más utilizado"""
    return get_most_used_payment_method_pandas(db, user_info["company_id"])

@protected_router.get("/statistics/sales-chart")
def get_sales_chart(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = "day",
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtiene datos de ventas agrupados por período para graficar"""
    from datetime import datetime, timedelta
    from app.analytics.dashboard_analytics import get_sales_chart_data
    try:
        end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
        start = datetime.fromisoformat(start_date) if start_date else end - timedelta(days=30)
        return get_sales_chart_data(db, user_info["company_id"], start, end, group_by)
    except Exception as e:
        print(f"Error sales-chart: {e}")
        return []

@protected_router.get("/statistics/debt-chart")
def get_debt_chart(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = "day",
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtiene datos de deudas agrupados por período para graficar"""
    from datetime import datetime, timedelta
    from app.analytics.dashboard_analytics import get_debt_chart_data
    try:
        end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
        start = datetime.fromisoformat(start_date) if start_date else end - timedelta(days=30)
        return get_debt_chart_data(db, user_info["company_id"], start, end, group_by)
    except Exception as e:
        print(f"Error debt-chart: {e}")
        return []

@protected_router.get("/statistics/top-profitable")
def get_top_profitable(
    limit: int = 5,
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtiene los productos más rentables"""
    from app.analytics.dashboard_analytics import get_top_profitable_products
    try:
        return get_top_profitable_products(db, user_info["company_id"], limit)
    except Exception as e:
        return []

@protected_router.get("/statistics/stale-products")
def get_stale_products_endpoint(
    days: int = 30,
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtiene productos que no se han vendido en los últimos N días"""
    from app.analytics.dashboard_analytics import get_stale_products
    try:
        return get_stale_products(db, user_info["company_id"], days)
    except Exception as e:
        return []

@protected_router.get("/statistics/inactive-customers")
def get_inactive_customers_endpoint(
    days: int = 30,
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Obtiene clientes que no han comprado en los últimos N días"""
    from app.analytics.dashboard_analytics import get_inactive_customers
    try:
        return get_inactive_customers(db, user_info["company_id"], days)
    except Exception as e:
        return []

@protected_router.get("/statistics/sales-chart-v2")
def get_sales_chart_v2(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    group_by: str = "day",
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Gráfico de ventas con crecimiento vs período anterior y ganancia por período"""
    from datetime import datetime, timedelta
    from app.analytics.dashboard_analytics import get_sales_chart_with_growth
    try:
        end = datetime.fromisoformat(end_date) if end_date else datetime.utcnow()
        start = datetime.fromisoformat(start_date) if start_date else end - timedelta(days=30)
        return get_sales_chart_with_growth(db, user_info["company_id"], start, end, group_by)
    except Exception as e:
        print(f"Error sales-chart-v2: {e}")
        return {"data": [], "summary": {}}

@protected_router.get("/statistics/insights")
def get_insights(
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Insights de negocio accionables"""
    from app.analytics.dashboard_analytics import get_business_insights
    try:
        return get_business_insights(db, user_info["company_id"])
    except Exception as e:
        print(f"Error insights: {e}")
        return []

# ── EXPORTACIÓN ──────────────────────────────────────────────────────────────

from fastapi.responses import StreamingResponse

@protected_router.get("/reports/daily-box/excel")
def export_daily_box_excel(
    date: Optional[str] = None,
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Exporta la caja diaria a Excel. date=YYYY-MM-DD (default: hoy)"""
    from datetime import datetime
    from app.services.report_generator import generate_daily_box_excel
    try:
        box_date = date or datetime.utcnow().strftime("%Y-%m-%d")
        output = generate_daily_box_excel(db, box_date, user_info["company_id"])
        filename = f"caja_{box_date}.xlsx"
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        print(f"Error export excel: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando Excel: {str(e)}")

@protected_router.get("/reports/daily-box/pdf")
def export_daily_box_pdf(
    date: Optional[str] = None,
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Exporta la caja diaria a PDF. date=YYYY-MM-DD (default: hoy)"""
    from datetime import datetime
    from app.services.report_generator import generate_daily_box_pdf
    try:
        box_date = date or datetime.utcnow().strftime("%Y-%m-%d")
        output = generate_daily_box_pdf(db, box_date, user_info["company_id"])
        filename = f"caja_{box_date}.pdf"
        return StreamingResponse(
            output,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        print(f"Error export pdf: {e}")
        raise HTTPException(status_code=500, detail=f"Error generando PDF: {str(e)}")


# ================================
# RUTAS PARA PAGOS (NEW)
# ================================

from app.schemas.payment import PaymentCreate, PaymentResponse
from app.crud.payment import create_payment, get_payment, get_sale_payments, get_all_payments

@protected_router.post("/payments", response_model=PaymentResponse)
def create_payment_endpoint(payment: PaymentCreate, user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    """Registra un pago para una venta"""
    try:
        return create_payment(db, payment, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/sales/{sale_id}/payments")
def get_sale_payments_endpoint(sale_id: int, user_info: dict = Depends(get_current_user_with_company), db: Session = Depends(get_db)):
    """Obtiene todos los pagos de una venta"""
    try:
        return get_sale_payments(db, sale_id, user_info["company_id"])
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@protected_router.get("/payments")
def list_all_payments(limit: int = 100, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Lista todos los pagos registrados"""
    try:
        return get_all_payments(db, user_info["company_id"], limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ================================
# RUTAS PARA COMPAÑÍAS (NEW)
# ================================

from app.crud.company import (
    create_company, get_companies, get_company_by_id, 
    update_company, delete_company
)

@protected_router.post("/companies", response_model=CompanyResponse)
def create_company_endpoint(company: CompanyCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    return create_company(db, company.name)

@protected_router.get("/companies", response_model=list[CompanyResponse])
def list_companies(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Devuelve la propia compañía del admin (no la de otras empresas)"""
    company = get_company_by_id(db, user_info["company_id"])
    return [company] if company else []

@protected_router.get("/companies/{company_id}", response_model=CompanyResponse)
def get_company_endpoint(company_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    if company_id != user_info["company_id"]:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    return company

@protected_router.put("/companies/{company_id}", response_model=CompanyResponse)
def update_company_endpoint(company_id: int, company: CompanyCreate, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    if company_id != user_info["company_id"]:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    updated = update_company(db, company_id, company.name)
    if not updated:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    return updated

@protected_router.delete("/companies/{company_id}")
def delete_company_endpoint(company_id: int, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    if company_id != user_info["company_id"]:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    deleted = delete_company(db, company_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Compañía no encontrada")
    return {"message": "Compañía eliminada"}


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
    user_info: dict = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Exporta reporte de ventas en Excel"""
    try:
        start = datetime.fromisoformat(start_date) if start_date else None
        end = datetime.fromisoformat(end_date) if end_date else None

        excel_file = generate_sales_excel(db, user_info["company_id"], start, end)

        return StreamingResponse(
            iter([excel_file.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename=reporte_ventas.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/reports/daily")
def get_daily_report(date: Optional[str] = None, user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Reporte PDF del día (caja diaria)"""
    try:
        box_date = datetime.fromisoformat(date).date() if date else None
        pdf_file = generate_daily_report_pdf(db, user_info["company_id"], box_date)

        return StreamingResponse(
            iter([pdf_file.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_diario.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/reports/weekly")
def get_weekly_report(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Reporte PDF semanal"""
    try:
        pdf_file = generate_weekly_report_pdf(db, user_info["company_id"])

        return StreamingResponse(
            iter([pdf_file.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_semanal.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

@protected_router.get("/reports/monthly")
def get_monthly_report(user_info: dict = Depends(require_admin), db: Session = Depends(get_db)):
    """Reporte PDF mensual"""
    try:
        pdf_file = generate_monthly_report_pdf(db, user_info["company_id"])

        return StreamingResponse(
            iter([pdf_file.getvalue()]),
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=reporte_mensual.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail="Error al procesar la solicitud")

