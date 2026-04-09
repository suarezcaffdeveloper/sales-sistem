# 🏭 CastZONE - Panel Administrativo

Un sistema de gestión administrativo moderno para Castzone con CRUD completo de productos.

## 🚀 Inicio Rápido

### 1. Instalar Dependencias

Si aún no has instalado las dependencias, ejecuta:

```bash
pip install -r requirements.txt
```

### 2. Ejecutar el Servidor

Desde la carpeta raíz del proyecto:

```bash
uvicorn app.main:app --reload
```

El servidor se ejecutará en: **http://localhost:8000**

### 3. Acceder al Dashboard

Una vez que el servidor esté ejecutándose, abre tu navegador en:

```
http://localhost:8000
```

## 📋 Funcionalidades

### ✅ CRUD de Productos

- **Crear** ➕ Agregar nuevos productos
- **Leer** 📖 Ver listado completo de productos
- **Actualizar** ✏️ Editar información de productos existentes
- **Eliminar** 🗑️ Remover productos del sistema

### 🔍 Búsqueda y Filtros

- Buscar por nombre o categoría
- Filtrar por categoría específica
- Filtrar por precio máximo
- Búsqueda en tiempo real

### 📊 Estadísticas

- Total de productos registrados
- Stock total disponible
- Valor total del inventario

### 📱 Características

- **Diseño Responsivo**: Funciona en desktop, tablet y móvil
- **Interfaz Intuitiva**: Fácil de usar para administradores
- **Validaciones**: Verificación de datos antes de enviar
- **Alertas**: Retroalimentación inmediata de acciones
- **Modal de Confirmación**: Antes de eliminar productos

## 🛠️ Estructura del Proyecto

```
castZone/
├── app/
│   ├── api/
│   │   └── routes.py          # Rutas de la API
│   ├── crud/
│   │   ├── product.py         # Operaciones de BD de productos
│   │   └── ...
│   ├── db/
│   │   └── database.py        # Configuración de BD
│   ├── models/
│   │   ├── product.py         # Modelo de DB de productos
│   │   └── ...
│   ├── schemas/
│   │   ├── product.py         # Esquemas de validación
│   │   └── ...
│   └── main.py                # Punto de entrada de la aplicación
├── static/
│   └── index.html             # Panel Administrativo
├── requirements.txt           # Dependencias del proyecto
└── README.md                  # Este archivo
```

## 📡 API Endpoints

### Productos

- `GET /products` - Obtener todos los productos
- `POST /products` - Crear un nuevo producto
- `PUT /products/{product_id}` - Actualizar un producto
- `DELETE /products/{product_id}` - Eliminar un producto
- `GET /products/search` - Buscar productos con filtros

## 🔧 Configuración

### CORS

El servidor está configurado para aceptar solicitudes de cualquier origen. En **producción**, modifica este archivo:

```python
# app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://tusitio.com"],  # Especifica dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📝 Ejemplo de Uso

### Crear un Producto

1. Completa el formulario en la sección "📦 Agregar/Editar Producto"
2. Ingresa:
   - Nombre del producto
   - Marca
   - Categoría
   - Descripción
   - Precio
   - Stock
   - ID del proveedor (opcional)
3. Haz clic en "💾 Guardar Producto"

### Editar un Producto

1. En la tabla de productos, haz clic en el botón "✏️ Editar"
2. El formulario se rellenará automáticamente
3. Realiza los cambios necesarios
4. Haz clic en "💾 Guardar Producto"

### Eliminar un Producto

1. En la tabla, haz clic en "🗑️ Eliminar"
2. Confirma en el modal de confirmación
3. El producto será eliminado

## 🐛 Solución de Problemas

### Error: "No puede conectarse a http://localhost:8000"

- Asegúrate de que el servidor FastAPI está en ejecución
- Verifica que el puerto 8000 no esté siendo utilizado por otra aplicación

### Error: CORS bloqueado

- Si ves errores de CORS, verifica que el middleware CORS está habilitado en main.py

### La base de datos parece vacía

- La base de datos SQLite se crea automáticamente en la primera ejecución
- Para reiniciar, simplemente elimina `castZone.db` y reinicia el servidor

## 🚀 Siguientes Pasos

Pronto se agregarán:
- ✅ CRUD para Proveedores
- ✅ CRUD para Clientes
- ✅ CRUD para Ventas
- ✅ Sistema de autenticación mejorado
- ✅ Reportes y análisis
- ✅ Exportar datos a CSV/Excel

## 📧 Soporte

Para reportar errores o sugerencias, contacta al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: 2026-04-07
