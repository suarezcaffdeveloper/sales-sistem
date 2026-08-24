"""
Descuentos: manuales (% o $ fijo, con tope para cajero) y automáticos por
método de pago (configurados por el admin, sin tope de cajero porque ya
son una política aprobada de antemano). El manual siempre prioriza sobre
el automático.
"""


def _sell(client, headers, customer_id, product_id, quantity=1, **extra):
    body = {
        "customer_id": customer_id,
        "items": [{"product_id": product_id, "quantity": quantity}],
        "initial_payment": 0,
        "payment_method": "efectivo",
        **extra
    }
    return client.post("/api/sales", json=body, headers=headers)


def test_descuento_manual_porcentaje_admin(client, company, product, customer):
    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=2, discount_percent=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["subtotal_amount"] == 200.0
    assert data["discount_amount"] == 40.0
    assert data["total_amount"] == 160.0


def test_descuento_manual_monto_fijo(client, company, product, customer):
    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=1, discount_amount=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_amount"] == 85.0


def test_no_se_puede_mandar_porcentaje_y_monto_juntos(client, company, product, customer):
    r = _sell(client, company["admin_headers"], customer["id"], product["id"], discount_percent=10, discount_amount=5)
    assert r.status_code == 400


def test_descuento_no_puede_superar_el_subtotal(client, company, product, customer):
    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=1, discount_amount=500)
    assert r.status_code == 400


def test_cajero_dentro_del_tope_ok_y_fuera_del_tope_rechazado(client, company, product, customer):
    r = _sell(client, company["cajero_headers"], customer["id"], product["id"], quantity=1, discount_percent=10)
    assert r.status_code == 200, r.text

    r = _sell(client, company["cajero_headers"], customer["id"], product["id"], quantity=1, discount_percent=30)
    assert r.status_code == 400
    assert "tope" in r.json()["detail"].lower() or "cajero" in r.json()["detail"].lower()


def test_descuento_automatico_por_metodo_de_pago(client, company, product, customer):
    # Sin configuración: no hay descuento automático
    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=1)
    assert r.json()["discount_amount"] == 0.0

    # Admin activa 10% para transferencia
    r = client.put("/api/payment-method-discounts/transferencia", json={
        "discount_percent": 10, "active": True
    }, headers=company["admin_headers"])
    assert r.status_code == 200

    # Venta sin descuento manual, con ese método -> se aplica automático
    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=1, payment_method="transferencia")
    data = r.json()
    assert data["discount_percent"] == 10.0
    assert data["total_amount"] == 90.0

    # Otro método sin configurar -> sin descuento
    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=1, payment_method="tarjeta")
    assert r.json()["discount_amount"] == 0.0


def test_descuento_manual_prioriza_sobre_automatico(client, company, product, customer):
    client.put("/api/payment-method-discounts/efectivo", json={
        "discount_percent": 10, "active": True
    }, headers=company["admin_headers"])

    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=1,
              payment_method="efectivo", discount_percent=5)
    data = r.json()
    assert data["discount_percent"] == 5.0
    assert data["total_amount"] == 95.0


def test_automatico_no_respeta_tope_de_cajero_porque_ya_lo_aprobo_el_admin(client, company, product, customer):
    client.put("/api/payment-method-discounts/efectivo", json={
        "discount_percent": 25, "active": True
    }, headers=company["admin_headers"])

    r = _sell(client, company["cajero_headers"], customer["id"], product["id"], quantity=1, payment_method="efectivo")
    assert r.status_code == 200, r.text
    assert r.json()["total_amount"] == 75.0


def test_desactivar_mantiene_el_porcentaje_guardado(client, company, product, customer):
    client.put("/api/payment-method-discounts/tarjeta", json={
        "discount_percent": 15, "active": True
    }, headers=company["admin_headers"])
    client.put("/api/payment-method-discounts/tarjeta", json={
        "discount_percent": 15, "active": False
    }, headers=company["admin_headers"])

    r = client.get("/api/payment-method-discounts", headers=company["admin_headers"])
    tarjeta = next(d for d in r.json() if d["payment_method"] == "tarjeta")
    assert tarjeta["discount_percent"] == 15.0
    assert tarjeta["active"] is False

    r = _sell(client, company["admin_headers"], customer["id"], product["id"], quantity=1, payment_method="tarjeta")
    assert r.json()["discount_amount"] == 0.0


def test_cajero_no_puede_configurar_descuento_por_metodo_de_pago(client, company):
    r = client.put("/api/payment-method-discounts/efectivo", json={
        "discount_percent": 10, "active": True
    }, headers=company["cajero_headers"])
    assert r.status_code == 403
