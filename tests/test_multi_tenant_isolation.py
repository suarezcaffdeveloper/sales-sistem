"""
Aislamiento multi-tenant: una empresa nunca debe poder ver ni modificar
datos de otra, ni por listado ni por ID directo (IDOR). Este es el tipo de
falla que ya causó un hallazgo de seguridad real en este proyecto (el
hueco de /register que permitía autounirse a una empresa ajena, corregido
en una sesión anterior) — de ahí que tenga su propio archivo de tests en
vez de vivir mezclado con los de roles.
"""


def test_no_se_ven_clientes_ni_productos_de_otra_empresa_en_los_listados(client, company, other_company, customer, product):
    # `customer`/`product` pertenecen a `company`. `other_company` no debería verlos.
    r = client.get("/api/customers", headers=other_company["admin_headers"])
    assert all(c["id"] != customer["id"] for c in r.json())

    r = client.get("/api/products", headers=other_company["admin_headers"])
    assert all(p["id"] != product["id"] for p in r.json())


def test_no_se_puede_editar_ni_borrar_cliente_de_otra_empresa(client, company, other_company, customer):
    r = client.put(f"/api/customers/{customer['id']}", json={
        "name": "Hackeado", "email": "h@h.com", "phone": "1"
    }, headers=other_company["admin_headers"])
    assert r.status_code == 404

    r = client.delete(f"/api/customers/{customer['id']}", headers=other_company["admin_headers"])
    assert r.status_code == 404

    # Y el cliente original sigue intacto para su empresa real
    r = client.get("/api/customers", headers=company["admin_headers"])
    assert any(c["id"] == customer["id"] and c["name"] == "Cliente Test" for c in r.json())


def test_no_se_puede_editar_ni_borrar_producto_de_otra_empresa(client, company, other_company, product):
    r = client.put(f"/api/products/{product['id']}", json={
        "name": "Hackeado", "price": 1, "cost_price": 1, "stock": 1
    }, headers=other_company["admin_headers"])
    assert r.status_code == 404

    r = client.delete(f"/api/products/{product['id']}", headers=other_company["admin_headers"])
    assert r.status_code == 404

    r = client.get("/api/products", headers=company["admin_headers"])
    assert any(p["id"] == product["id"] and p["name"] == "Producto Test" for p in r.json())


def test_no_se_puede_leer_ni_operar_sobre_una_venta_de_otra_empresa(client, company, other_company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    # Estas rutas de venta no usan response_model + 404 como
    # productos/clientes: ante un error (incluyendo "no existe para esta
    # empresa") devuelven 400 con el mensaje de la excepción.
    r = client.get(f"/api/sales/{sale['id']}", headers=other_company["admin_headers"])
    assert r.status_code == 400

    r = client.post(f"/api/sales/{sale['id']}/cancel", json={}, headers=other_company["admin_headers"])
    assert r.status_code == 400

    r = client.put(f"/api/sales/{sale['id']}/due-date", json={"due_date": "2030-01-01"}, headers=other_company["admin_headers"])
    assert r.status_code == 400

    r = client.post(f"/api/sales/{sale['id']}/returns", json={"items": [{"sale_item_id": 1, "quantity": 1}]}, headers=other_company["admin_headers"])
    assert r.status_code == 400

    # La venta real sigue intacta para su empresa
    r = client.get(f"/api/sales/{sale['id']}", headers=company["admin_headers"])
    assert r.status_code == 200
    assert r.json()["cancelled"] is False


def test_no_se_puede_pagar_una_venta_de_otra_empresa(client, company, other_company, product, customer):
    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()

    r = client.post("/api/payments", json={
        "sale_id": sale["id"], "amount": 50, "payment_method": "efectivo"
    }, headers=other_company["admin_headers"])
    assert r.status_code == 400

    detail = client.get(f"/api/sales/{sale['id']}", headers=company["admin_headers"]).json()
    assert detail["paid_amount"] == 0.0


def test_estadisticas_y_deudas_pendientes_no_mezclan_empresas(client, company, other_company, product, customer):
    client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"])

    stats_other = client.get("/api/statistics/dashboard", headers=other_company["admin_headers"]).json()
    assert stats_other["total_sales"] == 0.0
    assert stats_other["sales_count"] == 0

    debts_other = client.get("/api/sales/pending-debts", headers=other_company["admin_headers"]).json()
    assert debts_other["pending_count"] == 0


def test_no_se_ven_ni_gestionan_usuarios_de_otra_empresa(client, company, other_company):
    r = client.get("/api/users", headers=other_company["admin_headers"])
    usernames = [u["username"] for u in r.json()]
    assert company["admin_username"] not in usernames
    assert company["cajero_username"] not in usernames

    # Buscar el id real del admin de `company` para intentar tocarlo desde `other_company`
    own_users = client.get("/api/users", headers=company["admin_headers"]).json()
    target_id = next(u["id"] for u in own_users if u["username"] == company["cajero_username"])

    r = client.put(f"/api/users/{target_id}/role", json={"role": "admin"}, headers=other_company["admin_headers"])
    assert r.status_code == 400

    r = client.delete(f"/api/users/{target_id}", headers=other_company["admin_headers"])
    assert r.status_code == 400


def test_no_se_puede_ver_ni_editar_la_compania_ajena(client, company, other_company):
    r = client.get(f"/api/companies/{company['company_id']}", headers=other_company["admin_headers"])
    assert r.status_code == 404

    r = client.put(f"/api/companies/{company['company_id']}", json={"name": "Hackeada"}, headers=other_company["admin_headers"])
    assert r.status_code == 404

    r = client.get("/api/companies", headers=other_company["admin_headers"])
    ids = [c["id"] for c in r.json()]
    assert company["company_id"] not in ids


def test_descuento_por_metodo_de_pago_es_por_empresa(client, company, other_company, product, customer):
    client.put("/api/payment-method-discounts/efectivo", json={
        "discount_percent": 50, "active": True
    }, headers=company["admin_headers"])

    # other_company nunca configuró nada: debe seguir en 0% / inactivo
    r = client.get("/api/payment-method-discounts", headers=other_company["admin_headers"])
    efectivo = next(d for d in r.json() if d["payment_method"] == "efectivo")
    assert efectivo["active"] is False
    assert efectivo["discount_percent"] == 0.0

    sale = client.post("/api/sales", json={
        "customer_id": customer["id"],
        "items": [{"product_id": product["id"], "quantity": 1}],
        "initial_payment": 0,
        "payment_method": "efectivo"
    }, headers=company["admin_headers"]).json()
    assert sale["total_amount"] == 50.0  # sí le aplica el 50% a su propia empresa
