# 🛍️ CastZone - Dashboard Administrativo

## ✅ Instalación Completada

Se ha creado un **dashboard visual completo** con los siguientes componentes:

### 📋 Paneles Implementados

#### 1. **Panel de Ventas** (Página Principal)
- **URL**: `http://localhost:8000/`
- **Funcionalidades**:
  - ✅ Seleccionar cliente
  - ✅ Buscar productos por nombre
  - ✅ Ingresar cantidad
  - ✅ Ver carrito de compras en tiempo real
  - ✅ Cálculo automático de totales
  - ✅ Guardar venta en base de datos
  - ✅ Actualización automática de stock

#### 2. **Gestión de Productos**
- **URL**: `http://localhost:8000/productos.html`
- **Funcionalidades**:
  - ✅ Crear nuevo producto
  - ✅ Ver lista completa
  - ✅ Editar productos
  - ✅ Eliminar productos
  - ✅ Asociar proveedor

#### 3. **Gestión de Clientes**
- **URL**: `http://localhost:8000/clientes.html`
- **Funcionalidades**:
  - ✅ Crear nuevo cliente
  - ✅ Ver lista completa
  - ✅ Editar clientes
  - ✅ Eliminar clientes
  - ✅ Guardar email, teléfono y dirección

#### 4. **Gestión de Proveedores**
- **URL**: `http://localhost:8000/proveedores.html`
- **Funcionalidades**:
  - ✅ Crear nuevo proveedor
  - ✅ Ver lista completa
  - ✅ Editar proveedores
  - ✅ Eliminar proveedores

### 🏗️ Estructura de Archivos Creada

```
static/
├── index.html                 # Panel principal de ventas
├── productos.html             # CRUD de productos
├── clientes.html              # CRUD de clientes
├── proveedores.html           # CRUD de proveedores
├── css/
│   └── style.css              # Estilos globales
└── js/
    ├── sales.js               # Lógica del panel de ventas
    ├── productos.js           # CRUD de productos
    ├── clientes.js            # CRUD de clientes
    └── proveedores.js         # CRUD de proveedores
```

### 🎨 Características del Diseño

- **Interfaz moderna y responsive**: Se adapta a dispositivos móviles
- **Navegación intuitiva**: Menú superior con botones para cada sección
- **Colores profesionales**: Gradientes y temas coherentes
- **Animaciones suaves**: Transiciones y efectos visuales
- **Validación de datos**: Verificación en tiempo real
- **Modales de confirmación**: Para acciones importantes

### 🔧 Tecnologías Utilizadas

**Backend:**
- FastAPI (Framework web rápido)
- SQLAlchemy (ORM para base de datos)
- SQLite (Base de datos)
- Pydantic (Validación de datos)

**Frontend:**
- HTML5 (Estructura)
- CSS3 (Estilos y responsive design)
- JavaScript vanilla (Sin dependencias externas)
- Fetch API (Comunicación con el backend)

### 📖 Cómo Usar el Sistema

#### **Crear una Venta**:
1. Abre `http://localhost:8000/` en tu navegador
2. Selecciona un cliente del dropdown
3. Escribe el nombre del producto en la búsqueda
4. Selecciona el producto de los resultados
5. Ingresa la cantidad deseada
6. Haz clic en "➕ Agregar Producto"
7. Repite para otros productos
8. Haz clic en "✅ Completar Venta"

#### **Gestionar Productos**:
1. Abre `http://localhost:8000/productos.html`
2. Completa el formulario con nombre, precio, stock y proveedor
3. Haz clic en "💾 Guardar Producto"
4. Para editar: Haz clic en el botón "✏️ Editar" en la tabla
5. Para eliminar: Haz clic en "🗑️ Eliminar"

#### **Gestionar Clientes**:
1. Abre `http://localhost:8000/clientes.html`
2. Completa el formulario con nombre, email, teléfono y dirección
3. Haz clic en "💾 Guardar Cliente"
4. A partir de ahí funciona igual que productos

#### **Gestionar Proveedores**:
1. Abre `http://localhost:8000/proveedores.html`
2. Sigue el mismo procedimiento que clientes

### 🚀 Iniciar el Servidor

En PowerShell desde la carpeta del proyecto:

```powershell
.\venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

Luego abre tu navegador en:
- **Dashboard**: `http://localhost:8000/`
- **API Docs**: `http://localhost:8000/docs`

### ⚙️ Rutas de API Disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/products` | Obtener todos los productos |
| POST | `/api/products` | Crear nuevo producto |
| PUT | `/api/products/{id}` | Actualizar producto |
| DELETE | `/api/products/{id}` | Eliminar producto |
| GET | `/api/customers` | Obtener todos los clientes |
| POST | `/api/customers` | Crear nuevo cliente |
| PUT | `/api/customers/{id}` | Actualizar cliente |
| DELETE | `/api/customers/{id}` | Eliminar cliente |
| GET | `/api/suppliers` | Obtener todos los proveedores |
| POST | `/api/suppliers` | Crear nuevo proveedor |
| PUT | `/api/suppliers/{id}` | Actualizar proveedor |
| DELETE | `/api/suppliers/{id}` | Eliminar proveedor |
| POST | `/api/sales` | Crear nueva venta |

### 📝 Notas Importantes

- Las ventas se guardan automáticamente en la base de datos
- El stock de los productos se actualiza automáticamente al realizar una venta
- Todos los cambios se reflejan en tiempo real sin recargar la página
- El sistema valida que haya suficiente stock antes de completar una venta
- Los datos se persisten en una base de datos SQLite (db.sqlite)

### 🎯 Próximas Mejoras Sugeridas

- [ ] Agregar autenticación de usuarios vendedores
- [ ] Implementar escaneo de códigos de barras
- [ ] Agregar reportes de ventas
- [ ] Implementar descuentos y promociones
- [ ] Agregar historial de ventas por cliente
- [ ] Exportar reportes a PDF o Excel
- [ ] Agregar gráficos de estadísticas

---

**¡El sistema está listo para usar! 🚀**

Si tienes algún problema, revisa la consola del navegador (F12) para ver los mensajes de error.
