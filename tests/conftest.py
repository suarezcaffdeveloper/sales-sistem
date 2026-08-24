import os
import sys
import uuid
import tempfile
from pathlib import Path

import pytest

# Base de datos de test totalmente aislada (nunca castZone.db). Se crea en
# un archivo temporal fuera del repo y se borra al terminar la sesión.
_TEST_DB_PATH = Path(tempfile.gettempdir()) / f"castzone_test_{uuid.uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{_TEST_DB_PATH.as_posix()}"
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c
    try:
        _TEST_DB_PATH.unlink()
    except Exception:
        pass  # el archivo puede seguir en uso en Windows; no es crítico


def _unique(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:10]}"


def _token_for(username: str) -> str:
    """
    Genera el token igual que /api/login, pero sin pasar por ese endpoint:
    está limitado a 5/min (slowapi) y esta suite loguea decenas de veces
    por corrida. Lo que se testea acá es autorización y reglas de negocio,
    no el rate-limit del login en sí.
    """
    from app.core.security import create_access_token
    return create_access_token({"sub": username})


def _register_company(client):
    username = _unique("admin")
    password = "TestPass123!"
    resp = client.post("/api/register", json={
        "company_name": _unique("Empresa"),
        "username": username,
        "password": password,
    })
    assert resp.status_code == 200, resp.text
    data = resp.json()

    admin_token = _token_for(username)
    cajero_token = _token_for(data["employee_username"])

    return {
        "company_id": data["company_id"],
        "admin_username": username,
        "admin_headers": {"Authorization": f"Bearer {admin_token}"},
        "cajero_username": data["employee_username"],
        "cajero_headers": {"Authorization": f"Bearer {cajero_token}"},
    }


@pytest.fixture
def company(client):
    """
    Registra una compañía nueva (con su admin y su cajero por defecto) para
    este test puntual. Cada test trabaja con su propia compañía, así los
    datos nunca se pisan entre tests aunque compartan la misma base de
    datos de test (la app ya es multi-tenant por company_id).
    """
    return _register_company(client)


@pytest.fixture
def other_company(client):
    """Una segunda compañía independiente, para tests de aislamiento multi-tenant."""
    return _register_company(client)


@pytest.fixture
def customer(client, company):
    resp = client.post("/api/customers", json={
        "name": "Cliente Test",
        "email": "cliente@test.com",
        "phone": "1234567890"
    }, headers=company["admin_headers"])
    assert resp.status_code == 200, resp.text
    return resp.json()


@pytest.fixture
def product(client, company):
    resp = client.post("/api/products", json={
        "name": "Producto Test",
        "price": 100.0,
        "cost_price": 60.0,
        "stock": 100
    }, headers=company["admin_headers"])
    assert resp.status_code == 200, resp.text
    return resp.json()
