# 🎯 RESUMEN: Cómo Crear Compañía y Vincular Usuario (Session 10g)

## TL;DR - Tres Pasos Simples

### 1️⃣ **Registrar Usuario CON Nueva Compañía** (Opción Recomendada)

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d {
    "username": "mi_usuario",
    "password": "MiPassword123",
    "company_name": "Mi Compañía"    ← Se crea automáticamente
  }
```

**Resultado:**
```json
{
  "id": 1,
  "username": "mi_usuario",
  "company_id": 1
}
```

**Ventajas:**
- ✅ Todo en un solo paso
- ✅ Compañía y usuario se crean juntos
- ✅ El usuario está listo para usar la app

---

### 2️⃣ **Hacer Login (Igual que siempre)**

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d {
    "username": "mi_usuario",
    "password": "MiPassword123"
  }
```

**Resultado:**
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

---

### 3️⃣ **Usar la Aplicación**

```bash
TOKEN="eyJhbGc..."

# Obtener tus datos
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/products
```

---

## 📊 Alternativa: Usar Compañía Existente

Si ya tienes una compañía creada (ID=1) y quieres agregar otro usuario:

```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -d {
    "username": "otro_usuario",
    "password": "OtraPassword123",
    "company_id": 1    ← Usa compañía existente
  }
```

---

## 🔑 API Endpoints Nuevos

### Compañías
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/companies | Crear compañía |
| GET | /api/companies | Listar todas |
| GET | /api/companies/{id} | Ver detalle |
| PUT | /api/companies/{id} | Actualizar |
| DELETE | /api/companies/{id} | Eliminar |

**Ejemplo: Crear nueva compañía directamente**
```bash
curl -X POST http://localhost:8000/api/companies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d {"name": "Nueva Tienda S.A."}
```

### Usuario Actual
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/me | Ver tu info (user_id, company_id) |

**Ejemplo:**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/api/me
```

---

## ⚠️ Lo Que Cambió (Para Desarrolladores)

### Base de Datos
- ✅ Tabla `companies` nueva
- ✅ Column `company_id` agregada a: users, customers, products, suppliers, purchases, sales, payments, daily_boxes

### Schemas
- ✅ `UserRegister` - Nuevo para registro (company_name O company_id)
- ✅ `UserCreate` - Actualizado (ahora con company_id)
- ✅ `CompanyCreate`, `CompanyResponse` - Nuevos

### CRUD
- ✅ `app/crud/company.py` - Nuevo archivo
- ✅ 9 archivos CRUD actualizados (company_id filtering)
- ✅ `app/crud/user.py` - Actualizado (company_id support)

### Routes (app/api/routes.py)
- ✅ `/register` - Actualizado (soporta company_name)
- ✅ `/companies/*` - Nuevas rutas
- ✅ `/me` - Nuevo endpoint
- ✅ 40+ rutas protegidas - Actualizadas a multi-tenant

### Migraciones
- ✅ `app/db/migrations.py` - Nuevo archivo
- ✅ Auto-ejecutadas en startup

---

## 🧪 Pruebas

Ejecuta el script de tests:

```bash
python test_multitenant.py
```

Hará:
1. ✅ Crear usuario + compañía
2. ✅ Crear segundo usuario
3. ✅ Hacer login
4. ✅ Validar token
5. ✅ Obtener info del usuario
6. ✅ Listar compañías
7. ✅ Verificar casos de error

---

## 🚨 Errores Comunes & Soluciones

| Error | Causa | Solución |
|-------|-------|----------|
| `400: Debe proporcionar company_name o company_id` | Registro sin especificar compañía | Agregar `"company_name": "..."` |
| `401: Token inválido` | Token expirado o malformeado | Hacer nuevo login |
| `400: Usuario no está asociado a compañía` | Usuario sin company_id | Usar registro nuevo / agregar company_id manual |
| `404: Compañía no encontrada` | company_id no existe | Verificar con GET /api/companies |

---

## 📞 Preguntas Frecuentes Rápidas

**P: ¿Un usuario puede estar en múltiples compañías?**
R: No, cada usuario = 1 compañía (por diseño).

**P: ¿Cómo agrego más empleados a mi compañía?**
R: Registra con el mismo `company_id`.

**P: ¿Qué pasa si elimino una compañía?**
R: Se eliminan todos sus datos (usuarios, productos, ventas, etc).

**P: ¿Puedo cambiar company_id de un usuario?**
R: Mostrado en migraciones manuales - no hay UI para esto.

**P: ¿El login sigue siendo igual?**
R: Sí, `/api/login` funciona igual. Lo nuevo es el registro.

---

## 📁 Archivos Clave

| Archivo | Cambios |
|---------|---------|
| `app/models/company.py` | ✨ Nuevo model |
| `app/crud/company.py` | ✨ Nuevas funciones |
| `app/schemas/company.py` | ✨ Nuevos schemas |
| `app/schemas/user.py` | ✏️ UserRegister agregado |
| `app/crud/user.py` | ✏️ company_id support |
| `app/api/routes.py` | ✏️ 50+ endpoints actualizados |
| `app/db/database.py` | ✏️ get_db() movida aquí |
| `app/db/migrations.py` | ✨ Nuevo archivo |

---

## 🚀 Para Empezar Ahora

1. **Inicia el servidor**
   ```bash
   python -m uvicorn app.main:app --reload
   ```

2. **Abre terminal/Postman/curl** e intenta:
   ```bash
   curl -X POST http://localhost:8000/api/register \
     -H "Content-Type: application/json" \
     -d '{
       "username": "test",
       "password": "Test123",
       "company_name": "Mi Empresa"
     }'
   ```

3. **Haz login con la respuesta**
   ```bash
   curl -X POST http://localhost:8000/api/login \
     -H "Content-Type: application/json" \
     -d '{"username": "test", "password": "Test123"}'
   ```

4. **Usa el token en otros endpoints**
   ```bash
   curl -H "Authorization: Bearer TOKEN_AQUI" \
     http://localhost:8000/api/me
   ```

---

## 📖 Documentación Completa

Ver: **GUIA_MULTITENANT.md** para guía extendida

---

**¡Listo para usar! 🎉**
