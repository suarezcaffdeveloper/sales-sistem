# Guía: Sistema Multi-Tenant de CastZone (Por Compañía)

## 🏢 Resumen de la Arquitectura

CastZone ahora es un sistema **multi-tenant por compañía**. Esto significa:

- **Cada usuario pertenece a exactamente 1 compañía**
- **Cada compañía tiene sus propios datos**: productos, clientes, ventas, etc.
- **Los datos están completamente aislados por compañía**
- **Un usuario no puede ver datos de otras compañías**

---

## 📋 Opciones de Configuración para Nuevos Usuarios

Hay **2 formas de registrar un nuevo usuario**:

### **Opción 1: Crear Usuario CON Nueva Compañía** ✅ Recomendado para primer usuario

```json
POST /api/register
{
    "username": "gerente1",
    "password": "MiPassword123",
    "company_name": "Mi Tienda de Repuestos"
}
```

**Respuesta exitosa (201):**
```json
{
    "id": 1,
    "username": "gerente1",
    "company_id": 1
}
```

**Que sucede:**
1. ✅ Se crea automáticamente una nueva compañía: "Mi Tienda de Repuestos"
2. ✅ Se crea el usuario con `company_id = 1`
3. ✅ El usuario está listo para usar la aplicación

**Cuándo usarla:**
- Primera vez configurando el sistema
- Nuevo usuario pertenece a una compañía nueva

---

### **Opción 2: Crear Usuario en Compañía Existente**

```json
POST /api/register
{
    "username": "vendedor1",
    "password": "MiPassword456",
    "company_id": 1
}
```

**Respuesta exitosa (201):**
```json
{
    "id": 2,
    "username": "vendedor1",
    "company_id": 1
}
```

**Que sucede:**
1. ✅ Se crea el usuario asignado a compañía ID=1
2. ✅ Puede ver/editar datos de la compañía 1
3. ✅ Listo para usar la aplicación

**Cuándo usarla:**
- Agregar más empleados a una compañía existente
- Necesitas que usen una compañía ya creada

---

## ⚠️ Errores Comunes

### Error 1: "Debe proporcionar company_name o company_id"

```json
POST /api/register
{
    "username": "usuario",
    "password": "password"
}
```

**❌ INCORRECTO**: Falta especificar compañía

**✅ SOLUCIÓN**: Agregar `company_name` O `company_id`:

```json
{
    "username": "usuario",
    "password": "password",
    "company_name": "Mi Compañía"
}
```

---

### Error 2: "Usuario ya existe"

```json
POST /api/register
{
    "username": "gerente1",  ← Usuario duplicado
    "password": "NewPassword"
}
```

**❌ INCORRECTO**: El usuario `gerente1` ya fue registrado

**✅ SOLUCIÓN**: Usar un nombre de usuario diferente:

```json
{
    "username": "gerente2",
    "password": "MyPassword123",
    "company_name": "Otra Tienda"
}
```

---

### Error 3: "Compañía no encontrada" (al usar company_id inexistente)

```json
POST /api/register
{
    "username": "newuser",
    "password": "password",
    "company_id": 9999  ← Compañía no existe
}
```

**❌ INCORRECTO**: El ID de compañía no existe

**✅ SOLUCIÓN**: Verificar company_id con GET /api/companies:

```bash
# Primero, obtener lista de compañías válidas
curl -H "Authorization: Bearer TOKEN" http://localhost:8000/api/companies

# Luego usar un company_id válido
{
    "username": "newuser",
    "password": "password",
    "company_id": 1
}
```

---

## 🔑 Login y Autenticación

### Login Normal (igual que antes)

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"gerente1", "password":"MiPassword123"}'
```

**Respuesta (200):**
```json
{
    "access_token": "eyJhbGc...",
    "token_type": "bearer"
}
```

### Importante ⚠️

- El login funciona igual que siempre
- Pero **internamente, el usuario DEBE tener un `company_id`**
- Si intentas login con usuario sin compañía → **Error 400**

---

## 📊 Gestión de Compañías

### Crear Nueva Compañía

```bash
curl -X POST http://localhost:8000/api/companies \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Nueva Tienda S.A."}'
```

**Respuesta:**
```json
{
    "id": 2,
    "name": "Nueva Tienda S.A."
}
```

---

### Listar Todas las Compañías

```bash
curl -X GET http://localhost:8000/api/companies \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta:**
```json
[
    {"id": 1, "name": "Mi Tienda de Repuestos"},
    {"id": 2, "name": "Nueva Tienda S.A."}
]
```

---

### Obtener Detalles de Compañía

```bash
curl -X GET http://localhost:8000/api/companies/1 \
  -H "Authorization: Bearer TOKEN"
```

---

### Actualizar Nombre de Compañía

```bash
curl -X PUT http://localhost:8000/api/companies/1 \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Tienda Actualizada"}'
```

---

### Eliminar Compañía

```bash
curl -X DELETE http://localhost:8000/api/companies/1 \
  -H "Authorization: Bearer TOKEN"
```

⚠️ **Precaución**: Esto eliminará la compañía y TODOS sus datos.

---

## 👤 Obtener Información del Usuario Actual

### Endpoint para verificar tu usuario actual

```bash
curl -X GET http://localhost:8000/api/me \
  -H "Authorization: Bearer TOKEN"
```

**Respuesta:**
```json
{
    "user_id": 1,
    "username": "gerente1",
    "company_id": 1
}
```

Esto es útil para que el frontend sepa a qué compañía pertenece el usuario.

---

## 🚀 Resumen Paso a Paso para Primer Uso

### 1️⃣ **Registrar Primer Usuario (con nueva compañía)**

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "AdminPassword123",
    "company_name": "Mi Negocio"
  }'
```

**Respuesta:** `{"id": 1, "username": "admin", "company_id": 1}`

---

### 2️⃣ **Hacer Login**

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "AdminPassword123"}'
```

**Respuesta:** `{"access_token": "eyJhbGc...", "token_type": "bearer"}`

---

### 3️⃣ **Guardar el Token y usarlo en requests protegidos**

```bash
TOKEN="eyJhbGc..."

# Ahora puedes usar la aplicación
curl -X GET http://localhost:8000/api/products \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4️⃣ **Agregar más usuarios a la misma compañía (opcional)**

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "vendedor1",
    "password": "VendedorPassword123",
    "company_id": 1
  }'
```

---

## 🔍 Troubleshooting

| Error | Causa | Solución |
|-------|-------|----------|
| 500 Internal Server Error en login | Usuario sin company_id | Asegurar que el usuario tenga company_id durante registro |
| 400 Bad Request | Falta company_name O company_id | Proporcionar uno de los dos |
| 401 Credenciales Inválidas | Username/password incorrecto | Verificar credenciales |
| 404 Compañía no encontrada | Usar un company_id que no existe | Verificar IDs válidos con GET /api/companies |
| Frontend ve datos vacíos | Usuario loggeado pero sin company_id | Verificar que el usuario tenga company_id con GET /api/me |

---

## 📝 Notas Importantes

1. **Aislamiento de datos**: Cada compañía solo ve sus productos, ventas, clientes, etc.
2. **Cada usuario = 1 compañía**: Un usuario no puede cambiar de compañía después de creado
3. **Si necesitas múltiples compañías**: Crea usuarios diferentes para cada una
4. **Backup recomendado**: Hacer backup antes de eliminar compañías
5. **Migraciones**: El sistema ejecuta migraciones automáticas al iniciar

---

## 📞 Preguntas Frecuentes

**P: ¿Puedo tener un usuario en múltiples compañías?**
R: No, actualmente cada usuario pertenece a exactamente 1 compañía. Es por diseño.

**P: ¿Qué pasa si intento acceder a datos de otra compañía?**
R: El sistema rechaza todas las solicitudes - verás un 403 Forbidden o datos filtrados.

**P: ¿Cómo migro datos de una compañía a otra?**
R: Actualmente debe hacerse manualmente. Consulta con desarrollo si necesitas esta funcionalidad.

**P: ¿Se puede cambiar el company_id de un usuario?**
R: Sí, pero solo a través de migraciones en la base de datos. No hay endpoint Web para esto todavía.

---

**Última actualización:** Session 10g  
**Versión del sistema:** CastZone v2.0 (Multi-tenant)
