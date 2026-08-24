"""
Devoluciones parciales: reponen stock, prorratean el descuento de la venta
sobre lo devuelto, y no deben pisarse con la anulación total (bug real
encontrado en esta sesión: anular después de una devolución parcial
reponía el stock devuelto dos veces).
"""


def _get_sale_item_id(client, headers, sale_id):
    detail = client.get(f"/api/sales/{sale_id}", headers=headers).json()
    return detail["items"][0]["sale_item_id"]


def test_devolucion_parcial_prorratea_el_descuento(client, company, product, customer):
    # 3 unidades a $100 con 10% de descuento: subtotal 300, descuento 30, total 270
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 3}],
        "initial_payment": 0,
        "payment_method": "efectivo",
        "discount_percent": 10
    }, headers=company["admin_headers"]).json()
    assert sale["total_amount"] == 270.0

    client.post("/api/payments", json={
        "sale_id": sale["id"], "amount": 270, "payment_method": "efectivo"
    }, headers=company["admin_headers"])

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])

    # Devolver 1 de 3 unidades: valor de lista $100, con 10% de desc -> reembolso $90
    r = client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 1}],
        "reason": "talle equivocado"
    }, headers=company["admin_headers"])
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["refund_amount"] == 90.0
    assert data["refund_due"] == 90.0
    assert data["new_subtotal_amount"] == 200.0
    assert data["new_discount_amount"] == 20.0
    assert data["new_total_amount"] == 180.0
    assert data["new_debt_amount"] == 0.0


def test_devolucion_repone_stock(client, company, product, customer):
    stock_inicial = product["stock"]

    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 5}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])
    client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 2}]
    }, headers=company["admin_headers"])

    r = client.get("/api/products", headers=company["admin_headers"])
    stock_final = next(p["stock"] for p in r.json() if p["id"] == product["id"])
    assert stock_final == stock_inicial - 5 + 2


def test_no_se_puede_devolver_mas_de_lo_disponible(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 2}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])
    r = client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 3}]
    }, headers=company["admin_headers"])
    assert r.status_code == 400


def test_no_se_puede_devolver_un_item_de_otra_venta(client, company, product, customer):
    sale_a = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    sale_b = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    item_b = _get_sale_item_id(client, company["admin_headers"], sale_b["id"])

    r = client.post(f"/api/sales/{sale_a['id']}/returns", json={
        "items": [{"sale_item_id": item_b, "quantity": 1}]
    }, headers=company["admin_headers"])
    assert r.status_code == 400


def test_devolucion_total_via_multiples_llamadas(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 3}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    client.post("/api/payments", json={
        "sale_id": sale["id"], "amount": 300, "payment_method": "efectivo"
    }, headers=company["admin_headers"])

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])

    client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 1}]
    }, headers=company["admin_headers"])
    r = client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 2}]
    }, headers=company["admin_headers"])

    assert r.json()["new_total_amount"] == 0.0
    assert r.json()["refund_due"] == 300.0

    detail = client.get(f"/api/sales/{sale['id']}", headers=company["admin_headers"]).json()
    assert detail["has_returns"] is True
    assert detail["items"][0]["remaining_quantity"] == 0.0

    history = client.get(f"/api/sales/{sale['id']}/returns", headers=company["admin_headers"]).json()
    assert len(history) == 2


def test_cajero_no_puede_hacer_devoluciones(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])
    r = client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 1}]
    }, headers=company["cajero_headers"])
    assert r.status_code == 403


def test_anular_despues_de_devolucion_parcial_no_duplica_reposicion_de_stock(client, company, product, customer):
    """
    Regresión: antes de esta sesión, cancel_sale reponía item.quantity
    completo sin restar lo que ya se había devuelto parcialmente, así que
    esas unidades quedaban repuestas dos veces.
    """
    stock_inicial = product["stock"]

    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 5}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])

    # Devolver 2 de 5
    client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 2}]
    }, headers=company["admin_headers"])

    # Anular la venta completa (quedaban 3 unidades en poder del cliente)
    r = client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=company["admin_headers"])
    assert r.status_code == 200, r.text

    r = client.get("/api/products", headers=company["admin_headers"])
    stock_final = next(p["stock"] for p in r.json() if p["id"] == product["id"])
    assert stock_final == stock_inicial, (
        f"Se esperaba que el stock volviera exactamente a {stock_inicial}, "
        f"quedó en {stock_final} (indica doble reposición)"
    )


def test_no_se_puede_devolver_de_una_venta_anulada(client, company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])
    client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=company["admin_headers"])

    r = client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 1}]
    }, headers=company["admin_headers"])
    assert r.status_code == 400


def test_ganancia_total_no_cuenta_costo_de_unidades_devueltas(client, company, product, customer):
    # cost_price=60, price=100 -> margen 40 por unidad
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 4}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    profit_antes = client.get("/api/statistics/total-profit", headers=company["admin_headers"]).json()
    assert profit_antes == 160.0  # 4 * 40

    sale_item_id = _get_sale_item_id(client, company["admin_headers"], sale["id"])
    client.post(f"/api/sales/{sale['id']}/returns", json={
        "items": [{"sale_item_id": sale_item_id, "quantity": 1}]
    }, headers=company["admin_headers"])

    profit_despues = client.get("/api/statistics/total-profit", headers=company["admin_headers"]).json()
    assert profit_despues == 120.0  # 3 * 40, no 160 - 100 (que ignoraría el costo evitado)
