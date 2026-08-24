"""Vencimiento de deuda de clientes: se puede cargar al vender o definir
después, y las deudas pendientes se clasifican en vencida/por vencer/al día."""


def test_vencimiento_pasado_se_marca_como_vencida(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo",
        "due_date": "2020-01-01"
    }, headers=company["admin_headers"]).json()

    r = client.get("/api/sales/pending-debts", headers=company["admin_headers"])
    debts = r.json()["debts"]
    debt = next(d for d in debts if d["sale_id"] == sale["id"])
    assert debt["due_status"] == "vencida"
    assert debt["days_overdue"] > 0
    assert r.json()["overdue_count"] >= 1


def test_sin_vencimiento_definido(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    r = client.get("/api/sales/pending-debts", headers=company["admin_headers"])
    debt = next(d for d in r.json()["debts"] if d["sale_id"] == sale["id"])
    assert debt["due_status"] == "sin_vencimiento"
    assert debt["due_date"] is None


def test_actualizar_vencimiento_de_una_venta_existente(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    r = client.put(f"/api/sales/{sale['id']}/due-date", json={"due_date": "2030-01-01"}, headers=company["admin_headers"])
    assert r.status_code == 200
    assert r.json()["due_date"] == "2030-01-01"

    debt = next(
        d for d in client.get("/api/sales/pending-debts", headers=company["admin_headers"]).json()["debts"]
        if d["sale_id"] == sale["id"]
    )
    assert debt["due_status"] == "al_dia"


def test_cajero_no_puede_cambiar_vencimiento(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    r = client.put(f"/api/sales/{sale['id']}/due-date", json={"due_date": "2030-01-01"}, headers=company["cajero_headers"])
    assert r.status_code == 403


def test_venta_pagada_no_aparece_en_deudas_pendientes(client, company, product, customer):
    # initial_payment en POST /sales solo valida el monto; el pago en sí
    # se registra aparte con /api/payments (así lo hace también el frontend).
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 100,
        "payment_method": "efectivo",
        "due_date": "2020-01-01"
    }, headers=company["admin_headers"]).json()

    client.post("/api/payments", json={
        "sale_id": sale["id"], "amount": 100, "payment_method": "efectivo"
    }, headers=company["admin_headers"])

    r = client.get("/api/sales/pending-debts", headers=company["admin_headers"])
    assert all(d["sale_id"] != sale["id"] for d in r.json()["debts"])
