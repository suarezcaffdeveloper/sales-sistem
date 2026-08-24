"""
Login real end-to-end (el resto de la suite genera tokens directamente
para no chocar con el rate-limit de 5/min de /api/login). Estos dos casos
alcanzan para cubrir el endpoint en sí sin acercarse al límite.
"""


def test_login_correcto_devuelve_token_valido(client, company):
    resp = client.post("/api/login", json={
        "username": company["admin_username"],
        "password": "TestPass123!"
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]

    r = client.get("/api/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == company["admin_username"]


def test_login_con_password_incorrecta_es_rechazado(client, company):
    resp = client.post("/api/login", json={
        "username": company["admin_username"],
        "password": "password-incorrecta"
    })
    assert resp.status_code == 401
