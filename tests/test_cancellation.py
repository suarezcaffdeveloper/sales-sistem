"""Anulación total de una venta: repone stock, salda la deuda y es admin-only."""


def test_anular_venta_repone_stock_y_salda_deuda(client, company, product, customer):
    stock_inicial = product["stock"]

    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 3}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    r = client.get("/api/products", headers=company["admin_headers"])
    stock_tras_venta = next(p["stock"] for p in r.json() if p["id"] == product["id"])
    assert stock_tras_venta == stock_inicial - 3

    r = client.post(f"/api/sales/{sale['id']}/cancel", json={"reason": "test"}, headers=company["admin_headers"])
    assert r.status_code == 200, r.text
    assert r.json()["refund_due"] == 0.0  # no se había cobrado nada

    r = client.get("/api/products", headers=company["admin_headers"])
    stock_final = next(p["stock"] for p in r.json() if p["id"] == product["id"])
    assert stock_final == stock_inicial

    r = client.get(f"/api/sales/{sale['id']}", headers=company["admin_headers"])
    detail = r.json()
    assert detail["cancelled"] is True
    assert detail["debt_amount"] == 0.0


def test_anular_venta_pagada_devuelve_refund_due(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    client.post("/api/payments", json={
        "sale_id": sale["id"], "amount": 100, "payment_method": "efectivo"
    }, headers=company["admin_headers"])

    r = client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=company["admin_headers"])
    assert r.json()["refund_due"] == 100.0


def test_no_se_puede_anular_dos_veces(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=company["admin_headers"])
    r = client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=company["admin_headers"])
    assert r.status_code == 400


def test_cajero_no_puede_anular(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    r = client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=company["cajero_headers"])
    assert r.status_code == 403
