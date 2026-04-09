# ⚡ CHEAT SHEET - CastZone Multi-Tenant API

## 🔐 Autenticación

### Registrarse (CON nueva compañía - Recomendado) ✨
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john",
    "password": "SecurePass123",
    "company_name": "John's Store"
  }'
```
→ Retorna: `{"id": 1, "username": "john", "company_id": 1}`

### Registrarse (EN compañía existente)
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane",
    "password": "SecurePass456",
    "company_id": 1
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "password": "SecurePass123"}'
```
→ Retorna: `{"access_token": "eyJ...", "token_type": "bearer"}`

### Obtener Token
```bash
TOKEN="eyJ..."  # De la respuesta de /api/login
```

---

## 🏢 Compañías

### Crear compañía
```bash
curl -X POST http://localhost:8000/api/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Business Inc"}'
```

### Listar todas las compañías
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/companies
```

### Obtener compañía específica
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/companies/1
```

### Actualizar compañía
```bash
curl -X PUT http://localhost:8000/api/companies/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name"}'
```

### Eliminar compañía ⚠️
```bash
curl -X DELETE http://localhost:8000/api/companies/1 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 👤 Usuario Actual

### Ver info del usuario actual (CON company_id)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/me
```
→ Retorna: `{"user_id": 1, "username": "john", "company_id": 1}`

### Validar token
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/validate
```
→ Retorna: `{"status": "valid", "username": "john"}`

---

## 📦 Productos (Filtrados por Company)

### Crear producto
```bash
curl -X POST http://localhost:8000/api/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Engine Part",
    "cost": 100,
    "price": 250,
    "stock": 10,
    "category": "Parts"
  }'
```

### Listar productos (solo de tu compañía)
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/products
```

### Obtener producto específico
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/products/1
```

### Actualizar producto
```bash
curl -X PUT http://localhost:8000/api/products/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "New Name", "price": 300}'
```

### Eliminar producto
```bash
curl -X DELETE http://localhost:8000/api/products/1 \
  -H "Authorization: Bearer $TOKEN"
```

### Buscar productos
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/products/search?category=Parts&max_price=300"
```

---

## 👥 Clientes

### Crear cliente
```bash
curl -X POST http://localhost:8000/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Auto Repair",
    "phone": "555-1234",
    "email": "john@autorepair.com",
    "address": "123 Main St"
  }'
```

### Listar clientes
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/customers
```

### Ver deudas de cliente
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/customers/1/debts"
```

---

## 💰 Ventas

### Crear venta
```bash
curl -X POST http://localhost:8000/api/sales \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 1,
    "items": [
      {"product_id": 1, "quantity": 2}
    ],
    "payment_method": "cash",
    "initial_payment": 300
  }'
```

### Listar ventas
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/sales
```

### Ver detalles de venta
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/sales/1
```

---

## 💳 Pagos

### Registrar pago (para venta con deuda)
```bash
curl -X POST http://localhost:8000/api/payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sale_id": 1,
    "amount": 200,
    "payment_method": "transfer"
  }'
```

### Ver pagos de una venta
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/sales/1/payments
```

### Listar todos los pagos
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/payments
```

---

## 📊 Reportes

### Excel de ventas
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/reports/sales/excel > ventas.xlsx
```

### Reporte PDF diario
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/reports/daily > reporte_diario.pdf
```

### Reporte PDF semanal
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/reports/weekly > reporte_semanal.pdf
```

### Reporte PDF mensual
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/reports/monthly > reporte_mensual.pdf
```

---

## 📊 Estadísticas

### Ganancia del día
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/statistics/daily-profit
```

### Productos con bajo stock
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8000/api/statistics/low-stock?threshold=5"
```

### Método de pago más usado
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/statistics/payment-methods
```

---

## 📦 Caja Diaria

### Abrir caja
```bash
curl -X POST http://localhost:8000/api/daily-box/open \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"initial_amount": 500}'
```

### Cerrar caja
```bash
curl -X POST http://localhost:8000/api/daily-box/close \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"final_amount": 1500}'
```

### Ver caja actual
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/daily-box
```

---

## 📝 Proveedores

### Crear proveedor
```bash
curl -X POST http://localhost:8000/api/suppliers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Auto Parts Supplier",
    "phone": "555-5678",
    "email": "supplier@parts.com"
  }'
```

### Listar proveedores
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/suppliers
```

---

## 🔧 Utility

### Health check
```bash
curl http://localhost:8000/api/validate
```

### Ver docs de API
```
http://localhost:8000/api/docs
```

---

## ⚠️ Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `401 Unauthorized` | Token inválido/expirado | Hacer nuevo login |
| `400 Token inválido` | JWT malformed | Verificar TOKEN variable |
| `404 Not found` | Resource no existe | Verificar ID |
| `400 Debe proporcionar company_name` | Registro sin especificar company | Agregar `company_name` al registro |
| `403 Forbidden` | Acceso denegado | Verificar que seas de la company correcta |

---

## 💡 Tips

1. **Guardar TOKEN en variable**: `TOKEN=$(curl ... | jq -r '.access_token')`
2. **Usar jq para formatted output**: `curl ... | jq .`
3. **Verificar token**: `curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/me`
4. **Listar todo**: Cada GET sin ID lista todos los recursos de tu company
5. **Datos aislados**: No ves datos de otras companies automáticamente

---

**Última actualización:** Session 10g  
**API Version:** v2.0 (Multi-tenant)  
**Base URL:** http://localhost:8000/api
