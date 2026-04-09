# 💰 Documentación de Pagos y Reportes - CastZone API

## 📊 Nuevas Funcionalidades Implementadas

### 1. **Sistema de Pagos y Deuda**

#### Cambios en Modelo de Ventas
El modelo `Sale` ahora incluye:
- `total_amount`: Monto total de la venta
- `paid_amount`: Monto pagado hasta ahora
- `debt_amount`: Monto pendiente
- `status`: Estado de la venta ("pagado", "parcial", "pendiente")

#### Endpoints de Pagos

##### **POST /api/payments** - Registrar Pago
```json
{
  "sale_id": 1,
  "amount": 250.00,
  "payment_method": "efectivo|transferencia|tarjeta"
}
```
**Respuesta**: Detalles del pago registrado
**Comportamiento**:
- Valida que la venta exista
- Verifica que el pago no exceda la deuda
- Actualiza automáticamente: `paid_amount`, `debt_amount`, `status`

##### **GET /api/payments/{payment_id}** - Ver Detalles del Pago
Retorna información completa de un pago específico

##### **GET /api/sales/{sale_id}/payments** - Ver Pagos de una Venta
Retorna toda la Lista de pagos realizados para una venta

##### **GET /api/payments** - Listar Todos los Pagos
Parámetros:
- `limit`: Cantidad máxima de resultados (default: 100)

#### Crear Venta con Pago Inicial
**POST /api/sales** ahora acepta:
```json
{
  "customer_id": 1,
  "items": [
    {"product_id": 1, "quantity": 2}
  ],
  "initial_payment": 100.00
}
```
- `initial_payment` es opcional (default: 0)
- Si se proporciona, se crea automáticamente el pago inicial
- El estado se calcula automáticamente

**Estados posibles**:
- `"pagado"`: paid_amount == total_amount
- `"parcial"`: paid_amount > 0 AND paid_amount < total_amount
- `"pendiente"`: paid_amount == 0

---

### 2. **Cálculo de Ganancia Real**

#### Método: Promedio Ponderado
Se utiliza el método FIFO ponderado para calcular la ganancia real basada en costos históricos.

**Formula**:
```
average_cost = Σ(cantidad * costo_unitario) / Σ(cantidad)
ganancia = (precio_venta - average_cost) * cantidad_vendida
```

#### Servicio de Cálculo (`app/services/profit_calculator.py`)

**Funciones disponibles**:

1. **get_product_average_cost(db, product_id)**
   - Calcula el costo promedio de un producto
   - Basado en todas las compras históricas
   - Retorna: float (costo promedio)

2. **calculate_sale_profit(db, sale_id)**
   - Calcula la ganancia real de una venta
   - Por cada ítem incluye: revenue, cost, profit, margin
   - Retorna: dict con desglose completo

3. **calculate_period_stats(db, start_date, end_date)**
   - Estadísticas de ganancias para un período
   - Incluye: total ventas, costo, ganancia, deuda
   - Retorna: dict con métricas

4. **get_top_products_profit(db, start_date, end_date, limit)**
   - Productos con mayor ganancia real
   - Ordenados por ganancia descendente

---

### 3. **Reportes Exportables**

#### Excel - Reporte de Ventas

**GET /api/reports/sales/excel**

Parámetros (opcionales):
- `start_date`: Fecha inicio (ISO format: YYYY-MM-DD)
- `end_date`: Fecha fin (ISO format: YYYY-MM-DD)

**Contenido**:
- Tabla con todas las ventas del período
- Columnas: ID, Cliente, Fecha, Total, Pagado, Deuda, Estado, Productos
- Resumen de período con totales e índices

**Descargador como**: `reporte_ventas.xlsx`

#### PDF - Reporte Diario

**GET /api/reports/daily**

Parámetros:
- `date`: Fecha específica (ISO format, default: hoy)

**Contenido**:
- Total de ventas y pagos del día
- Desglose de pagado vs pendiente
- Ingresos totales y costos
- Ganancia REAL con margen %
- Top 5 productos por ganancia
- (Si existe) Estado de caja diaria

#### PDF - Reporte Semanal

**GET /api/reports/weekly**

**Contenido**:
- Estadísticas de los últimos 7 días
- Top 10 productos por ganancia
- Análisis de deuda generada
- Margen de ganancia promedio

#### PDF - Reporte Mensual

**GET /api/reports/monthly**

**Contenido**:
- Estadísticas de los últimos 30 días
- Top 10 productos por ganancia
- Análisis completo de deuda
- Tendencias y métricas de desempeño

---

## 🔗 Integración con Módulo de Compras

El sistema de **ganancia real** está completamente integrado con el módulo de compras:

1. **Cada compra actualiza el costo promedio** de los productos
2. **Al vender**, se calcula automáticamente la ganancia basada en el costo histórico
3. **Los reportes muestran ganancias REALES**, no teóricas

**Flujo**:
```
Compra Producto → Actualiza costo promedio
        ↓
Vende Producto → Calcula ganancia (precio - costo promedio)
        ↓
Reporte → Muestra ganancia REAL basada en histórico
```

---

## 📦 Dependencias Nuevas

Se han agregado al `requirements.txt`:

```
pandas>=2.0.0          # Procesamiento de datos para Excel
openpyxl>=3.1.0       # Generación de archivos Excel
reportlab>=4.0.0      # Generación de PDF
```

**Para instalar**:
```bash
pip install -r requirements.txt
```

---

## 🗄️ Nuevas Tablas en Base de Datos

### Tabla: `payments`
```sql
CREATE TABLE payments (
  id INTEGER PRIMARY KEY,
  sale_id INTEGER NOT NULL (FK → sales),
  amount FLOAT NOT NULL,
  payment_method VARCHAR (50),
  created_at DATETIME
);
```

### Cambios en Tabla: `sales`
Se agregaron columnas:
- `paid_amount FLOAT DEFAULT 0`
- `debt_amount FLOAT DEFAULT 0`
- `status VARCHAR DEFAULT 'pendiente'`

Y se renombró:
- `total` → `total_amount`

---

## 🔐 Autenticación

Todos los endpoints nuevos requieren JWT:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:8000/api/payments
```

---

## 📝 Ejemplo de Flujo Completo

```bash
# 1. Crear venta con pago inicial
POST /api/sales
{
  "customer_id": 1,
  "items": [{"product_id": 1, "quantity": 2}],
  "initial_payment": 500.00
}
Response: {"id": 1, "status": "parcial", ...}

# 2. Registrar pago adicional
POST /api/payments
{
  "sale_id": 1,
  "amount": 300.00,
  "payment_method": "transferencia"
}
Response: {...}

# 3. Verificar estado
GET /api/sales/1
Response: {"status": "pagado", "paid_amount": 800, ...}

# 4. Generar reporte
GET /api/reports/sales/excel?start_date=2024-01-01
Downloads: reporte_ventas.xlsx
```

---

## ⚠️ Notas Importantes

1. **Compatibilidad**: El sistema mantiene 100% compatibilidad con funcionalidades existentes
2. **Seguridad**: All endpoints proteidos con JWT
3. **Cálculo**: La ganancia es REAL, basada en costos históricos de compras
4. **Reportes**: Se generan bajo demanda, no se almacenan
5. **BD**: Crear nuevas tablas ejecutando la app (automático)

---

## 🐛 Troubleshooting

### Error: "pandas no instalado"
```bash
pip install pandas openpyxl reportlab
```

### Error: "Venta no existe"
Verifica que sale_id sea correcto

### Pago rechazado por exceder deuda
El pago no puede ser mayor a debt_amount. Verifica estado actual de la venta.

---

**Última actualización**: Abril 2026
**Estado**: ✅ Producción
