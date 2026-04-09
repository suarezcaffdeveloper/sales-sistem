# 🚀 Guía de Instalación - Nuevas Funcionalidades

## 📦 Paso 1: Instalar Dependencias

Las nuevas funcionalidades requieren librerías adicionales:

```bash
pip install -r requirements.txt
```

**Librerías agregadas**:
- `pandas>=2.0.0` - Procesamiento de datos
- `openpyxl>=3.1.0` - Generación de Excel
- `reportlab>=4.0.0` - Generación de PDF

## 🗄️ Paso 2: Resetear Base de Datos

El modelo de `Sale` ha cambiado (se agregaron campos de payos y deuda).

### Opción A: Automático (Recomendado)
```bash
python reset_database.py
```

Este script:
- ✅ Crea backup de tu BD actual en `backups/`
- ✅ Elimina la BD antigua
- ✅ FastAPI la recreará con el nuevo schema automáticamente

### Opción B: Manual
```bash
# Simplemente elimina castzone.db (si existe)
rm castzone.db
```

## 🔄 Paso 3: Reiniciar Aplicación

```bash
uvicorn app.main:app --reload
```

FastAPI creará automáticamente:
- Tabla `sales` actualizada con nuevos campos
- Tabla `payments` para registrar pagos
- Todas las relaciones necesarias

## ✅ Paso 4: Verificar Instalación

Abre en tu navegador:
```
http://localhost:8000/api/docs
```

Deberías ver nuevos endpoints:
- **POST /payments** - Registrar pago
- **GET /reports/sales/excel** - Exportar a Excel
- **GET /reports/daily** - Reporte diario
- **GET /reports/weekly** - Reporte semanal
- **GET /reports/monthly** - Reporte mensual

## 📋 Cambios Principales

### Ventas (Sale)
```python
# Antes
total: float

# Ahora
total_amount: float    # Total de la venta
paid_amount: float     # Monto pagado
debt_amount: float     # Monto pendiente
status: str            # "pagado", "parcial", "pendiente"
```

### Nuevo: Pagos (Payment)
```python
id: int
sale_id: int           # FK a ventas
amount: float          # Monto del pago
payment_method: str    # "efectivo", "transferencia", "tarjeta"
created_at: datetime
```

### Crear Venta con Pago Inicial
```json
{
  "customer_id": 1,
  "items": [{"product_id": 1, "quantity": 2}],
  "initial_payment": 100.00  // ← NUEVO (opcional)
}
```

## 🎯 Flujo Rápido

### 1. Registrar Venta con Deuda
```bash
POST /api/sales
{
  "customer_id": 1,
  "items": [{"product_id": 1, "quantity": 1}],
  "initial_payment": 0      // Sin pago = deuda total
}
```
Respuesta: `{"status": "pendiente", "debt_amount": 500}`

### 2. Registrar Pago Parcial
```bash
POST /api/payments
{
  "sale_id": 1,
  "amount": 200,
  "payment_method": "efectivo"
}
```
Automáticamente actualiza: `paid_amount=200`, `debt_amount=300`, `status="parcial"`

### 3. Registrar Pago Final
```bash
POST /api/payments
{
  "sale_id": 1,
  "amount": 300,
  "payment_method": "transferencia"
}
```
Automáticamente: `paid_amount=500`, `debt_amount=0`, `status="pagado"`

### 4. Exportar Reportes
```bash
# Excel con todas las ventas
GET /api/reports/sales/excel

# PDF reporte diario
GET /api/reports/daily

# PDF reporte semanal
GET /api/reports/weekly

# PDF reporte mensual
GET /api/reports/monthly
```

## 🔍 Ganancia REAL

El sistema ahora calcula ganancia **basada en costos históricos de compra**:

**Método**: Promedio Ponderado

```
costo_promedio = total_invertido_en_compras / total_unidades_compradas

ganancia = (precio_venta - costo_promedio) × cantidad_vendida
```

**Ejemplo**:
- Compraste 100 unidades a $5 c/u = $500 costo total
- Costo promedio = $5/unidad
- Vendes 10 unidades a $8 c/u
- Ganancia = ($8 - $5) × 10 = $30

Los reportes muestran esta ganancia REAL, no teórica.

## ⚠️ Importante

1. **Datos existentes**: 
   - Si reseteas BD, se pierden datos anteriores
   - El backup se gurda en `backups/`

2. **Compatibilidad**:
   - Todas las funcionalidades existentes siguen funcionando
   - El módulo de compras se integra automáticamente

3. **Token JWT**:
   - Todos los endpoints nuevos requieren autenticación

4. **Errores comúnes**:
   - "pandas not found" → `pip install pandas openpyxl reportlab`
   - "Sale id not found" → Verifica que exista la venta
   - "Payment exceeds debt" → El pago supera la deuda

## 📚 Documentación Completa

Ver: `GUIA_PAGOS_REPORTES.md`

---

**¡Listo para usar! 🎉**
