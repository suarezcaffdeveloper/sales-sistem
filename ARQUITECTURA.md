# 🏗️ ARQUITECTURA DEL SISTEMA - Visión General

## 📐 Diagrama de Flujo (Alto Nivel)

```
FRONTEND                     API                          DATABASE
┌─────────────────┐    ┌──────────────┐    ┌──────────────────┐
│                 │    │              │    │                  │
│  index.html     │───▶│ POST /sales  │───▶│  Sales Table     │
│  Ventas         │    │              │    │  Payments Table  │
│                 │    │              │    │  SaleItems       │
│ (New Payment    │    │              │    │                  │
│  Fields)        │    │              │    │                  │
│                 │    ├──────────────┤    │                  │
│                 │    │              │    │                  │
│                 │───▶│ POST /       │───▶│  Products        │
│                 │    │ payments     │    │  Customers       │
│                 │    │              │    │  Purchases       │
│                 │    │              │    │                  │
│                 │    ├──────────────┤    │                  │
│                 │    │              │    │                  │
│  Reportes       │───▶│ GET /        │───▶│ (Analytics)      │
│  (Nearby)       │    │ reports/*    │───→│ Calculate profit │
│                 │    │              │    │ Generate reports │
│                 │    │              │    │                  │
└─────────────────┘    └──────────────┘    └──────────────────┘
```

---

## 🔄 Flujo de Una Venta Completa

### 1. CREAR VENTA CON PAGO INICIAL

```
User Browser
    ↓
index.html (Ventas)
    ├─ Seleccionar Cliente
    ├─ Agregar Productos
    ├─ (NEW) Seleccionar Método Pago
    ├─ (NEW) Ingresar Pago Inicial
    ↓
sales.js >> completeSale()
    ├─ Validar campos
    ├─ Calcular total
    ├─ Validar pago ≤ total
    ↓
POST /api/sales
{
  "customer_id": 1,
  "items": [{...}],
  "initial_payment": 500
}
    ↓
Backend: app/crud/sale.py >> create_sale()
    ├─ Validar stock
    ├─ Calcular totales
    ├─ Crear Sale:
    │  ├─ total_amount = $1000
    │  ├─ paid_amount = 500
    │  ├─ debt_amount = 500
    │  └─ status = "parcial"
    ├─ Crear SaleItems (actualizar stock)
    ├─ Crear Payment (si initial_payment > 0)
    ↓
Response
{
  "id": 1,
  "status": "parcial",
  "paid_amount": 500,
  "debt_amount": 500
}
    ↓
Frontend muestra ticket/confirmación
```

---

### 2. REGISTRAR PAGO ADICIONAL (API)

```
Backend Admin / System
    ↓
POST /api/payments
{
  "sale_id": 1,
  "amount": 500,
  "payment_method": "transferencia"
}
    ↓
Backend: app/crud/payment.py >> create_payment()
    ├─ Validar Sale existe
    ├─ Validar pago ≤ debt
    ├─ Crear Payment record
    ├─ Actualizar Sale:
    │  ├─ paid_amount += 500 (ahora = 1000)
    │  ├─ debt_amount -= 500 (ahora = 0)
    │  └─ status = "pagado"
    ↓
Response
{
  "id": 2,
  "sale_id": 1,
  "amount": 500,
  "payment_method": "transferencia"
}
```

---

### 3. GENERAR REPORTE

```
Admin Dashboard / UI
    ↓
GET /api/reports/sales/excel
(o /daily, /weekly, /monthly)
    ↓
Backend: app/services/report_generator.py
    ├─ get_sales_by_period()
    ├─ FOR EACH SALE:
    │  └─ calculate_sale_profit() {
    │     ├─ get items from SaleItem
    │     ├─ FOR EACH ITEM:
    │     │  ├─ average_cost = get_product_average_cost()
    │     │  │  (from all Purchases históricamente)
    │     │  └─ profit = (price - avg_cost) × qty
    │     └─ return profit breakdown
    │     }
    ├─ Agregar a reporte
    ├─ Generar Excel/PDF con:
    │  ├─ Tabla de ventas
    │  ├─ Resumen período
    │  ├─ Top productos por ganancia
    │  └─ Índices de rentabilidad
    ↓
Stream bytes (.xlsx o .pdf)
    ↓
Browser descarga archivo
```

---

## 💾 Relaciones de Base de Datos

```
CUSTOMERS
    │
    ├─── (1:N) ──▶ SALES
    │             │
    │             ├─── (1:N) ──▶ SALE_ITEMS
    │             │             │
    │             │             └─── (N:1) ──▶ PRODUCTS
    │             │
    │             └─── (1:N) ──▶ PAYMENTS (NEW)

SUPPLIERS
    │
    └─── (1:N) ──▶ PURCHASES
                   │
                   ├─── (1:N) ──▶ PURCHASE_ITEMS
                   │              │
                   │              └─── (N:1) ──▶ PRODUCTS
                   │
                   └─▶ (Updates average cost of PRODUCTS)

PRODUCTS
    │
    ├─ price_venta
    ├─ cost_price (updated by Purchases)
    ├─ stock
    └─▶ Used in SALES & PURCHASES calculations
```

---

## 🧮 Cálculo de Ganancia Real

### Paso 1: Obtener Costo Promedio

```python
# app/services/profit_calculator.py
def get_product_average_cost(db, product_id):
    # SELECT ALL purchases of product_id
    purchases = db.query(PurchaseItem).filter(
        PurchaseItem.product_id == product_id
    ).all()
    
    total_cost = sum(item.subtotal)       # $500
    total_qty = sum(item.quantity)        # 100
    
    avg_cost = total_cost / total_qty     # $5/unit
    return avg_cost
```

### Paso 2: Calcular Ganancia de Venta

```python
def calculate_sale_profit(db, sale_id):
    sale = db.query(Sale).filter(Sale.id == sale_id).first()
    
    for item in sale.items:
        average_cost = get_product_average_cost(db, item.product_id)
        # e.g., average_cost = $5/unit
        
        item_price = product.price  # e.g., $8
        item_qty = item.quantity    # e.g., 10
        
        item_profit = (item_price - average_cost) * item_qty
        # ($8 - $5) * 10 = $30
        
        total_profit += item_profit
```

### Paso 3: Incluir en Reportes

```python
# report_generator.py
def generate_monthly_report_pdf(db):
    stats = calculate_period_stats(db, start, end)
    
    # stats["total_profit"] = sum of ALL item profits
    # (basado en costo promedio, no fijo)
    
    top_products = get_top_products_profit(db, start, end)
    # Ordenado por ganancia REAL
    
    # Generar PDF con estos datos
```

---

## 🔐 Autenticación & Autorización

```
Browser >> Input Credentials
    ↓
POST /api/login
    ↓
verify_password() >> generate JWT
    ↓
Response: {"access_token": "eyJ0...", "token_type": "bearer"}
    ↓
Browser >> Header Almacena Token (localStorage)
    ↓
Todas las solicitudes incluyen:
Authorization: Bearer eyJ0...
    ↓
Backend: get_current_user() valida token
    ├─ Si válido ✓: continúa
    └─ Si inválido ✗: 401 Unauthorized
```

---

## 📦 Estructura de Carpetas

```
castZone/
├── app/
│   ├── api/
│   │   └── routes.py                ← 8 endpoints nuevos
│   │
│   ├── crud/
│   │   ├── sale.py                  ← create_sale() modificado
│   │   ├── payment.py               ← NEW: CRUD pagos
│   │   └── ...
│   │
│   ├── models/
│   │   ├── sale.py                  ← Modificado (3 campos nuevos)
│   │   ├── payment.py               ← NEW
│   │   └── ...
│   │
│   ├── schemas/
│   │   ├── sale.py                  ← Modificado (initial_payment)
│   │   ├── payment.py               ← NEW
│   │   └── ...
│   │
│   ├── services/                    ← NEW FOLDER
│   │   ├── __init__.py
│   │   ├── profit_calculator.py      ← Cálculo ganancia real
│   │   ├── report_generator.py       ← Genera Excel/PDF
│   │   └── __init__.py
│   │
│   ├── db/
│   │   └── database.py
│   │
│   ├── core/
│   │   └── security.py
│   │
│   └── main.py                      ← Importa Payment
│
├── static/
│   ├── index.html                   ← Payment fields nuevos
│   ├── compras.html
│   ├── css/style.css
│   ├── js/
│   │   ├── sales.js                 ← Soporte inicial_payment
│   │   ├── purchases.js
│   │   └── ...
│   └── ...
│
├── castzone.db                      ← Base de datos
├── requirements.txt                 ← pandas, openpyxl, reportlab
├── reset_database.py                ← NEW: Script migración
│
└── Documentación/
    ├── LEEME_PRIMERO.md
    ├── INSTALACION_NUEVO_SISTEMA.md
    ├── GUIA_PAGOS_REPORTES.md
    ├── IMPLEMENTACION_COMPLETADA.md
    └── ...
```

---

## 🚀 Flujo de Despliegue

```
Desarrollador ejecuta:

1. pip install -r requirements.txt
   └─ Instala pandas, openpyxl, reportlab

2. python reset_database.py
   └─ Backup BD actual
   └─ Elimina BD vieja
   └─ FastAPI creará nueva con nuevo schema

3. uvicorn app.main:app --reload
   └─ main.py importa Payment model
   └─ SQLAlchemy crea tablas automáticamente:
      ├─ payments (NEW)
      ├─ sales (MODIFIED)
      └─ (todas las demás sin cambios)

4. Navegador: http://localhost:8000/api/docs
   └─ Swagger UI muestra 8 endpoints nuevos
   └─ Todos funcionan con JWT
```

---

## 🧪 Testing

### Caso 1: Venta sin pago (deuda total)
```bash
POST /api/sales
{
  "customer_id": 1,
  "items": [{"product_id": 1, "quantity": 1}],
  "initial_payment": 0
}

RESULT:
status = "pendiente"
debt_amount = total_amount
paid_amount = 0
```

### Caso 2: Venta con pago parcial
```bash
POST /api/sales
{
  "customer_id": 1,
  "items": [{"product_id": 1, "quantity": 1}],
  "initial_payment": 500
}
# Asumiendo total = 1000

RESULT:
status = "parcial"
paid_amount = 500
debt_amount = 500
```

### Caso 3: Registrar pago para completar venta
```bash
POST /api/payments
{
  "sale_id": 1,
  "amount": 500,
  "payment_method": "transferencia"
}

RESULT:
Sale actualizada automáticamente:
status = "pagado"
paid_amount = 1000
debt_amount = 0
```

### Caso 4: Generar reporte
```bash
GET /api/reports/monthly

RESULT:
PDF descargado con:
- Total ventas período
- Ganancia REAL (basada en costo promedio)
- Top 10 productos
- Análisis de deuda
```

---

## ⚡ Performance

### Optimizaciones Implementadas

1. **Cálculo lazy de ganancia**
   - Se calcula bajo demanda, no almacenado
   - Usa índices de BD para compra rápida

2. **Reportes en streaming**
   - Se generan en memoria
   - No se guardan en disco
   - Cada descarga es fresco

3. **Pagos increméntales**
   - En lugar de recargar, suma
   - No requiere recalcular historial

4. **Queries optimizadas**
   - Usa JOIN para minimizar queries
   - Limita resultados con `limit`

---

## 🎯 Resumen Técnico

| Componente | Tipo | Descripción |
|-----------|------|-------------|
| **Sale** | Model | Modificado: +3 campos |
| **Payment** | Model | Nuevo: registro de pagos |
| **profit_calculator** | Service | Promedio ponderado |
| **report_generator** | Service | Excel/PDF |
| **payment CRUD** | Logic | Create, Read, List |
| **sale CRUD** | Logic | Create actualizado |
| **8 Endpoints** | API | Integrados en routes.py |
| **Frontend** | HTML/JS | index.html + sales.js modificado |
| **Dependencies** | Python | pandas, openpyxl, reportlab |

---

**Arquitectura Completamente Integrada y Lista para Producción** ✅
