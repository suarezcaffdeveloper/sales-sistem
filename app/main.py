from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import protected_router, public_router
from app.db.database import engine, Base, migrate_add_daily_box_id_if_missing
from pathlib import Path

from app.models import Product, Customer, Supplier, Sale, SaleItem, User, DailyBox, Purchase, PurchaseItem, Payment

app = FastAPI(title="CastZONE API")

# CORS - Permitir solicitudes desde cualquier origen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://sales-sistem.onrender.com"],  # En producción, especificar dominios permitidos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# Ejecutar migración automática para daily_box_id
migrate_add_daily_box_id_if_missing()

# Incluir PRIMERO el router de API
# Router público (sin autenticación)
app.include_router(public_router, prefix="/api")
# Router protegido (requiere JWT)
app.include_router(protected_router, prefix="/api")

@app.get("/api")
def api_root():
    return {"message": "API funcionando 🚀"}

# Servir archivos estáticos (dashboard) - DESPUÉS para que no sobrescriba las rutas de API
static_path = Path(__file__).parent.parent / "static"
if static_path.exists():
    # Incluir una fallback para servir index.html en archivos que no tienen extensión
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=str(static_path), html=True), name="static")

