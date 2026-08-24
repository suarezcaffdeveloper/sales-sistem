import os
import sys

# En Windows la consola suele usar cp1252, que no puede codificar los emojis
# que usan los print() de depuración del backend (ver app/crud/sale.py, etc.).
# Sin esto, cualquier print() con un emoji lanza UnicodeEncodeError y esa
# excepción termina reportándose como un error 400/500 genérico al frontend,
# aunque la operación (venta, compra, etc.) sea válida.
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.routes import protected_router, public_router
from app.db.database import engine, Base, migrate_add_daily_box_id_if_missing
from app.db.migrations import run_all_migrations
from pathlib import Path
from app.models import Product, Customer, Supplier, Sale, SaleItem, User, DailyBox, Purchase, PurchaseItem, Payment, SupplierPayment, PaymentMethodDiscount, SaleReturn, SaleReturnItem
from seed_demo import seed_demo

# Cargar variables de entorno desde .env si existe
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Configuración de base de datos local por defecto
if not os.getenv("DATABASE_URL"):
    os.environ["DATABASE_URL"] = "sqlite:///./castZone.db"

app = FastAPI(title="CastZONE API")

@app.on_event("startup")
def startup_event():
    seed_demo()

@app.post("/seed-demo")
def create_demo():
    seed_demo()
    return {"message": "Demo creado"}

class CSPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)

        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "img-src 'self' data:; "
            "font-src 'self' https://fonts.gstatic.com"
        )

        # No cachear JS/CSS para que los cambios sean inmediatos
        if request.url.path.endswith(('.js', '.css')):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"

        return response


# Configuración de CORS desde variable de entorno
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost,http://127.0.0.1").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(CSPMiddleware)

Base.metadata.create_all(bind=engine)

# Ejecutar migraciones automáticas
migrate_add_daily_box_id_if_missing()
run_all_migrations()

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

