"""
El cajero puede vender y consultar productos/clientes, pero no mutarlos ni
ver estadísticas/reportes/compras. El admin puede todo. Estos tests
protegen ese contrato de permisos ante cambios futuros en las rutas.
"""


def test_cajero_puede_leer_productos_y_clientes(client, company, product, customer):
    r = client.get("/api/products", headers=company["cajero_headers"])
    assert r.status_code == 200
    assert any(p["id"] == product["id"] for p in r.json())

    r = client.get("/api/customers", headers=company["cajero_headers"])
    assert r.status_code == 200
    assert any(c["id"] == customer["id"] for c in r.json())


def test_cajero_no_puede_crear_ni_editar_ni_borrar_productos(client, company, product):
    r = client.post("/api/products", json={
        "name": "Hack", "price": 1, "cost_price": 1, "stock": 1
    }, headers=company["cajero_headers"])
    assert r.status_code == 403

    r = client.put(f"/api/products/{product['id']}", json={
        "name": "Hackeado", "price": 1, "cost_price": 1, "stock": 1
    }, headers=company["cajero_headers"])
    assert r.status_code == 403

    r = client.delete(f"/api/products/{product['id']}", headers=company["cajero_headers"])
    assert r.status_code == 403


def test_cajero_no_puede_crear_ni_editar_ni_borrar_clientes(client, company, customer):
    r = client.post("/api/customers", json={
        "name": "Hack", "email": "h@h.com", "phone": "1"
    }, headers=company["cajero_headers"])
    assert r.status_code == 403

    r = client.put(f"/api/customers/{customer['id']}", json={
        "name": "Hackeado", "email": "h@h.com", "phone": "1"
    }, headers=company["cajero_headers"])
    assert r.status_code == 403

    r = client.delete(f"/api/customers/{customer['id']}", headers=company["cajero_headers"])
    assert r.status_code == 403


def test_cajero_puede_vender(client, company, product, customer):
    r = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["cajero_headers"])
    assert r.status_code == 200, r.text


def test_cajero_no_accede_a_estadisticas_ni_reportes_ni_compras(client, company):
    for endpoint in [
        "/api/statistics/dashboard",
        "/api/statistics/top-products",
        "/api/statistics/reorder-alerts",
        "/api/purchases",
        "/api/purchases/pending-debts",
        "/api/sales/pending-debts",
        "/api/daily-box",
        "/api/users",
    ]:
        r = client.get(endpoint, headers=company["cajero_headers"])
        assert r.status_code == 403, f"{endpoint} debería ser 403 para cajero, fue {r.status_code}"


def test_cajero_no_puede_anular_ni_devolver_ni_cambiar_vencimiento(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    r = client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=company["cajero_headers"])
    assert r.status_code == 403

    r = client.put(f"/api/sales/{sale['id']}/due-date", json={"due_date": "2030-01-01"}, headers=company["cajero_headers"])
    assert r.status_code == 403

    r = client.post(f"/api/sales/{sale['id']}/returns", json={"items": [{"sale_item_id": 1, "quantity": 1}]}, headers=company["cajero_headers"])
    assert r.status_code == 403


def test_admin_puede_todo_lo_anterior(client, company, product, customer):
    r = client.post("/api/products", json={
        "name": "Producto Admin", "price": 10, "cost_price": 5, "stock": 5
    }, headers=company["admin_headers"])
    assert r.status_code == 200

    r = client.get("/api/statistics/dashboard", headers=company["admin_headers"])
    assert r.status_code == 200
