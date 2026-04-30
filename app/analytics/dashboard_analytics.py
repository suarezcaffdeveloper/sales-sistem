import pandas as pd
from datetime import datetime

def get_dashboard_stats(df):
    if df.empty:
        return {
            "total_sales": 0,
            "sales_count": 0,
            "total_profit": 0,
            "top_products": [],        
        }
    # Si el DataFrame tiene ventas, calcular métricas
    total_sales = df["total_amount"].sum() if "total_amount" in df else 0
    sales_count = len(df)
    # La ganancia total requiere sumar los profits de los items, si están disponibles
    total_profit = df["total_profit"].sum() if "total_profit" in df else 0
    top_products = get_top_products(df) if "product_name" in df else []
    return {
        "total_sales": float(total_sales),
        "sales_count": int(sales_count),
        "total_profit": float(total_profit),
        "top_products": top_products,
    }

# Wrapper para el endpoint: construye el DataFrame y llama a get_dashboard_stats
from app.analytics.ventas_dataframe import build_sales_dashboard_dataframe
def get_dashboard_stats_pandas(db, company_id):
    from app.crud.product import get_products
    from app.crud.customer import get_customers
    from app.crud.payment import get_all_payments
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from sqlalchemy.orm import joinedload
    import pandas as pd

    # Productos y clientes
    products = get_products(db, company_id)
    total_products = len(products)
    customers = get_customers(db, company_id)
    total_customers = len(customers)
    low_stock_products = [
        {
            "id": p.id,
            "name": p.name,
            "stock": p.stock,
            "price": p.price,
            "cost_price": p.cost_price
        }
        for p in products if p.stock is not None and p.stock < 3
    ]

    # Ítems de venta (productos vendidos)
    sale_items = db.query(SaleItem).join(Product).filter(Product.company_id == company_id).options(joinedload(SaleItem.product)).all()
    items_data = []
    for item in sale_items:
        items_data.append({
            "product_id": item.product_id,
            "product_name": item.product.name if item.product else None,
            "price": item.product.price if item.product else 0,
            "cost_price": item.product.cost_price if item.product else 0,
            "quantity": item.quantity
        })
    items_df = pd.DataFrame(items_data)

    # Costo invertido y ganancia total
    if not items_df.empty:
        items_df["revenue"] = items_df["price"] * items_df["quantity"]
        items_df["cost"] = items_df["cost_price"].fillna(0) * items_df["quantity"]
        items_df["profit"] = (items_df["price"] - items_df["cost_price"].fillna(0)) * items_df["quantity"]
        total_cost_invested = float(items_df["cost"].sum())
        total_profit = float(items_df["profit"].sum())
    else:
        total_cost_invested = 0.0
        total_profit = 0.0

    # Productos más y menos vendidos
    if not items_df.empty:
        prod_stats = items_df.groupby(["product_id", "product_name", "price", "cost_price"]).agg(quantity_sold=("quantity", "sum"), revenue=("revenue", "sum"), profit=("profit", "sum"), cost=("cost", "sum")).reset_index()
        prod_stats_top = prod_stats.sort_values("quantity_sold", ascending=False)
        prod_stats_bottom = prod_stats.sort_values("quantity_sold", ascending=True)
        def format_product(prod):
            return {
                "id": prod["product_id"],
                "name": prod["product_name"],
                "price": prod["price"],
                "cost_price": prod["cost_price"],
                "quantity_sold": int(prod["quantity_sold"]),
                "revenue": float(prod["revenue"]),
                "profit": float(prod["profit"])
            }
        top_products = [format_product(p) for _, p in prod_stats_top.head(5).iterrows()]
        bottom_products = [format_product(p) for _, p in prod_stats_bottom.head(5).iterrows()]
    else:
        top_products = []
        bottom_products = []

    # Método de pago más usado
    payments = get_all_payments(db, company_id, limit=1000)
    if payments:
        payments_df = pd.DataFrame([{ "id": p.id, "company_id": p.company_id, "amount": p.amount, "payment_method": p.payment_method } for p in payments])
        if not payments_df.empty:
            payment_method_stats = payments_df.groupby("payment_method").agg(count=("id", "count"), total_amount=("amount", "sum")).reset_index().sort_values("count", ascending=False)
            if not payment_method_stats.empty:
                top = payment_method_stats.iloc[0]
                payment_method = top["payment_method"]
                payment_method_count = int(top["count"])
                payment_method_total = float(top["total_amount"])
            else:
                payment_method = "Sin datos"
                payment_method_count = 0
                payment_method_total = 0.0
        else:
            payment_method = "Sin datos"
            payment_method_count = 0
            payment_method_total = 0.0
    else:
        payment_method = "Sin datos"
        payment_method_count = 0
        payment_method_total = 0.0

    # Facturas adeudadas (debt_amount > 0, incluye facturas parcialmente pagadas)
    from app.crud.sale import get_all_sales
    sales = get_all_sales(db, company_id)
    pending_debts = []
    for sale in sales:
        debt = sale.get("debt_amount", 0)
        total = sale.get("total_amount", 0)
        paid = sale.get("paid_amount", 0)
        if debt > 0 and total > 0:
            pending_debts.append({
                "sale_id": sale["id"],
                "customer_name": sale.get("customer_name", "Desconocido"),
                "customer_phone": sale.get("customer_phone", "-"),
                "item_count": sale.get("item_count", 0),
                "total_amount": total,
                "paid_amount": paid,
                "debt_amount": debt
            })

    # Total ventas
    total_sales = float(sum([s.get("total_amount", 0) for s in sales])) if sales else 0.0

    return {
        "total_sales": total_sales,
        "sales_count": len(sales),
        "total_profit": total_profit,
        "top_products": top_products,
        "bottom_products": bottom_products,
        "low_stock_products": low_stock_products,
        "total_products": total_products,
        "total_customers": total_customers,
        "total_cost_invested": total_cost_invested,
        "payment_method": payment_method,
        "payment_method_count": payment_method_count,
        "payment_method_total": payment_method_total,
        "pending_debts": pending_debts
    }

def get_top_products(db, company_id: int, limit: int = 5):
    """Obtiene los productos más vendidos por cantidad."""
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from sqlalchemy.orm import joinedload
    import pandas as pd

    sale_items = (
        db.query(SaleItem)
        .join(Product)
        .filter(Product.company_id == company_id)
        .options(joinedload(SaleItem.product))
        .all()
    )
    if not sale_items:
        return []

    data = []
    for item in sale_items:
        p = item.product
        if not p:
            continue
        qty = item.quantity or 0
        price = p.price or 0
        cost = p.cost_price or 0
        data.append({
            "product_id": p.id,
            "product_name": p.name,
            "price": price,
            "cost_price": cost,
            "quantity": qty,
            "revenue": price * qty,
            "cost": cost * qty,
            "profit": (price - cost) * qty
        })

    df = pd.DataFrame(data)
    grouped = (
        df.groupby(["product_id", "product_name", "price", "cost_price"])
        .agg(quantity_sold=("quantity", "sum"), revenue=("revenue", "sum"),
             cost=("cost", "sum"), profit=("profit", "sum"))
        .reset_index()
        .sort_values("quantity_sold", ascending=False)
        .head(limit)
    )
    return [
        {
            "id": int(r["product_id"]),
            "name": r["product_name"],
            "price": float(r["price"]),
            "cost_price": float(r["cost_price"]),
            "quantity_sold": int(r["quantity_sold"]),
            "revenue": float(r["revenue"]),
            "profit": float(r["profit"])
        }
        for _, r in grouped.iterrows()
    ]


def get_bottom_products(db, company_id: int, limit: int = 5):
    """Obtiene los productos menos vendidos por cantidad."""
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from sqlalchemy.orm import joinedload
    import pandas as pd

    sale_items = (
        db.query(SaleItem)
        .join(Product)
        .filter(Product.company_id == company_id)
        .options(joinedload(SaleItem.product))
        .all()
    )
    if not sale_items:
        return []

    data = []
    for item in sale_items:
        p = item.product
        if not p:
            continue
        qty = item.quantity or 0
        price = p.price or 0
        cost = p.cost_price or 0
        data.append({
            "product_id": p.id,
            "product_name": p.name,
            "price": price,
            "cost_price": cost,
            "quantity": qty,
            "revenue": price * qty,
            "cost": cost * qty,
            "profit": (price - cost) * qty
        })

    df = pd.DataFrame(data)
    grouped = (
        df.groupby(["product_id", "product_name", "price", "cost_price"])
        .agg(quantity_sold=("quantity", "sum"), revenue=("revenue", "sum"),
             cost=("cost", "sum"), profit=("profit", "sum"))
        .reset_index()
        .sort_values("quantity_sold", ascending=True)
        .head(limit)
    )
    return [
        {
            "id": int(r["product_id"]),
            "name": r["product_name"],
            "price": float(r["price"]),
            "cost_price": float(r["cost_price"]),
            "quantity_sold": int(r["quantity_sold"]),
            "revenue": float(r["revenue"]),
            "profit": float(r["profit"])
        }
        for _, r in grouped.iterrows()
    ]

def get_total_cost_invested_pandas(db, company_id: int):
    try:
        query = """
            SELECT 
                si.quantity,
                p.cost_price
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE p.company_id = :company_id
        """

        df = pd.read_sql(query, db.bind, params={"company_id": company_id})

        if df.empty:
            return 0

        # Calcular costo total
        df["cost"] = df["quantity"] * df["cost_price"]

        total_cost = df["cost"].sum()

        return float(total_cost)

    except Exception as e:
        print(f"Error: {e}")
        return 0
    


def get_sales_by_period_pandas(sales_df: pd.DataFrame, company_id: int, period: str = "day"):
    """
    Obtiene las ventas totales y las ventas del período (day, month, year)
    """

    # Asegurar datetime
    sales_df["created_at"] = pd.to_datetime(sales_df["created_at"])

    today = pd.Timestamp.now()

    if period == "day":
        start_date = today.normalize()
    elif period == "month":
        start_date = today.replace(day=1).normalize()
    elif period == "year":
        start_date = today.replace(month=1, day=1).normalize()
    else:
        start_date = today.normalize()

    # Filtrar por empresa
    df_company = sales_df[sales_df["company_id"] == company_id]

    # Total histórico
    total = df_company["total_amount"].sum()

    # Total del período
    df_period = df_company[df_company["created_at"] >= start_date]
    period_total = df_period["total_amount"].sum()

    return {
        "period": period,
        "total": float(total),
        "period_total": float(period_total)
    }

def get_most_used_payment_method_pandas(db, company_id: int):
    """
    Obtiene el método de pago más utilizado.
    Acepta db + company_id y consulta los pagos internamente.
    """
    from app.crud.payment import get_all_payments
    import pandas as pd
    try:
        payments = get_all_payments(db, company_id, limit=10000)
        if not payments:
            return {"payment_method": "Sin datos", "count": 0, "total_amount": 0}

        df = pd.DataFrame([
            {"id": p.id, "payment_method": p.payment_method, "amount": p.amount}
            for p in payments
        ])
        if df.empty:
            return {"payment_method": "Sin datos", "count": 0, "total_amount": 0}

        grouped = (
            df.groupby("payment_method", dropna=False)
            .agg(count=("id", "count"), total_amount=("amount", "sum"))
            .reset_index()
            .sort_values("count", ascending=False)
        )
        top = grouped.iloc[0]
        return {
            "payment_method": top["payment_method"] if pd.notna(top["payment_method"]) else "Sin especificar",
            "count": int(top["count"]),
            "total_amount": float(top["total_amount"]) if pd.notna(top["total_amount"]) else 0
        }
    except Exception:
        return {"payment_method": "Error", "count": 0, "total_amount": 0}
    
def get_pending_debts_pandas(
    sales_df: pd.DataFrame,
    sale_items_df: pd.DataFrame,
    customers_df: pd.DataFrame,
    company_id: int
):
    """
    Obtiene todas las facturas con deuda pendiente
    """

    try:
        # Filtrar ventas con deuda
        df = sales_df.loc[
            (sales_df["company_id"] == company_id) &
            (sales_df["debt_amount"] > 0)
        ].copy()

        if df.empty:
            return {
                "pending_count": 0,
                "total_debt": 0,
                "debts": []
            }

        # -------------------------
        # Contar items por venta
        # -------------------------
        item_counts = (
            sale_items_df.groupby("sale_id")
            .size()
            .reset_index(name="item_count")
        )

        df = df.merge(item_counts, left_on="id", right_on="sale_id", how="left")
        df["item_count"] = df["item_count"].fillna(0).astype(int)

        # -------------------------
        # Merge con clientes
        # -------------------------
        if customers_df is not None:
            df = df.merge(
                customers_df[["id", "name", "phone"]],
                left_on="customer_id",
                right_on="id",
                how="left",
                suffixes=("", "_customer")
            )

            df["customer_name"] = df["name"].fillna("Desconocido")
            df["customer_phone"] = df["phone"].fillna("-")
        else:
            df["customer_name"] = "Desconocido"
            df["customer_phone"] = "-"

        # -------------------------
        # Limpieza de datos
        # -------------------------
        df["total_amount"] = df["total_amount"].fillna(0).astype(float)
        df["paid_amount"] = df["paid_amount"].fillna(0).astype(float)
        df["debt_amount"] = df["debt_amount"].fillna(0).astype(float)

        df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")

        # Ordenar por fecha DESC
        df = df.sort_values(by="created_at", ascending=False)

        # -------------------------
        # Armar resultado
        # -------------------------
        debts = df[[
            "id",
            "customer_name",
            "customer_phone",
            "created_at",
            "item_count",
            "total_amount",
            "paid_amount",
            "debt_amount"
        ]].copy()

        debts.rename(columns={"id": "sale_id"}, inplace=True)

        debts["created_at"] = debts["created_at"].astype(str)

        result = {
            "pending_count": len(debts),
            "total_debt": float(df["debt_amount"].sum()),
            "debts": debts.to_dict(orient="records")
        }

        return result

    except Exception:
        return {
            "pending_count": 0,
            "total_debt": 0,
            "debts": []
        }
    
def get_total_profit_pandas_fast(db, company_id: int):
    """Calcula la ganancia total usando ORM + pandas."""
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from sqlalchemy.orm import joinedload
    import pandas as pd
    try:
        sale_items = (
            db.query(SaleItem)
            .join(Product)
            .filter(Product.company_id == company_id)
            .options(joinedload(SaleItem.product))
            .all()
        )
        if not sale_items:
            return 0.0
        total = sum(
            (item.product.price or 0) * (item.quantity or 0)
            - (item.product.cost_price or 0) * (item.quantity or 0)
            for item in sale_items if item.product
        )
        return float(total)
    except Exception:
        return 0.0


# ─── NUEVAS MÉTRICAS AVANZADAS ────────────────────────────────────────────────

def get_debt_chart_data(db, company_id: int, start_date, end_date, group_by: str = "day"):
    """
    Retorna datos de deudas (facturas con debt_amount > 0) agrupados por período.
    Cada punto muestra el monto adeudado originado en ese período.
    """
    from app.models.sale import Sale
    try:
        sales = db.query(Sale).filter(
            Sale.company_id == company_id,
            Sale.created_at >= start_date,
            Sale.created_at <= end_date,
            Sale.debt_amount > 0
        ).all()

        all_sales = db.query(Sale).filter(
            Sale.company_id == company_id,
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        ).all()

        if not all_sales:
            return []

        df_debts = pd.DataFrame([{
            "created_at": s.created_at,
            "debt_amount": float(s.debt_amount or 0),
            "total_amount": float(s.total_amount or 0),
            "id": s.id
        } for s in sales]) if sales else pd.DataFrame(columns=["created_at", "debt_amount", "total_amount", "id"])

        df_all = pd.DataFrame([{
            "created_at": s.created_at,
            "total_amount": float(s.total_amount or 0),
            "id": s.id
        } for s in all_sales])

        for df in [df_debts, df_all]:
            if not df.empty:
                df["created_at"] = pd.to_datetime(df["created_at"])

        def assign_period(df, group_by):
            if df.empty:
                return df
            if group_by == "day":
                df["period"] = df["created_at"].dt.strftime("%Y-%m-%d")
                df["label"] = df["created_at"].dt.strftime("%d/%m")
            elif group_by == "week":
                df["period"] = df["created_at"].dt.to_period("W").dt.start_time.dt.strftime("%Y-%m-%d")
                df["label"] = "Sem " + df["created_at"].dt.isocalendar().week.astype(str)
            elif group_by == "month":
                df["period"] = df["created_at"].dt.strftime("%Y-%m")
                df["label"] = df["created_at"].dt.strftime("%b %Y")
            else:
                df["period"] = df["created_at"].dt.strftime("%Y-%m-%d")
                df["label"] = df["created_at"].dt.strftime("%d/%m")
            return df

        df_all = assign_period(df_all, group_by)

        periods = (
            df_all.groupby(["period", "label"])
            .agg(total_sales=("total_amount", "sum"), count=("id", "count"))
            .reset_index()
        )

        if not df_debts.empty:
            df_debts = assign_period(df_debts, group_by)
            debt_grouped = (
                df_debts.groupby("period")
                .agg(total_debt=("debt_amount", "sum"), debt_count=("id", "count"))
                .reset_index()
            )
            periods = periods.merge(debt_grouped, on="period", how="left")
        else:
            periods["total_debt"] = 0.0
            periods["debt_count"] = 0

        periods["total_debt"] = periods["total_debt"].fillna(0.0)
        periods["debt_count"] = periods["debt_count"].fillna(0).astype(int)
        periods = periods.sort_values("period")

        return [
            {
                "period": r["period"],
                "label": r["label"],
                "total_sales": float(r["total_sales"]),
                "total_debt": float(r["total_debt"]),
                "debt_count": int(r["debt_count"]),
                "count": int(r["count"])
            }
            for _, r in periods.iterrows()
        ]
    except Exception as e:
        print(f"Error get_debt_chart_data: {e}")
        return []


def get_sales_chart_data(db, company_id: int, start_date, end_date, group_by: str = "day"):
    """
    Retorna datos de ventas agrupados por día/semana/mes para graficar.
    start_date / end_date: objetos datetime
    group_by: 'day' | 'week' | 'month'
    """
    from app.models.sale import Sale
    from datetime import datetime
    try:
        sales = db.query(Sale).filter(
            Sale.company_id == company_id,
            Sale.created_at >= start_date,
            Sale.created_at <= end_date
        ).all()

        if not sales:
            return []

        df = pd.DataFrame([{
            "created_at": s.created_at,
            "total_amount": s.total_amount or 0,
            "id": s.id
        } for s in sales])

        df["created_at"] = pd.to_datetime(df["created_at"])

        if group_by == "day":
            df["period"] = df["created_at"].dt.strftime("%Y-%m-%d")
            df["label"] = df["created_at"].dt.strftime("%d/%m")
        elif group_by == "week":
            df["period"] = df["created_at"].dt.to_period("W").dt.start_time.dt.strftime("%Y-%m-%d")
            df["label"] = "Sem " + df["created_at"].dt.isocalendar().week.astype(str)
        elif group_by == "month":
            df["period"] = df["created_at"].dt.strftime("%Y-%m")
            df["label"] = df["created_at"].dt.strftime("%b %Y")
        else:
            df["period"] = df["created_at"].dt.strftime("%Y-%m-%d")
            df["label"] = df["created_at"].dt.strftime("%d/%m")

        grouped = (
            df.groupby(["period", "label"])
            .agg(total_sales=("total_amount", "sum"), count=("id", "count"))
            .reset_index()
            .sort_values("period")
        )

        return [
            {
                "period": r["period"],
                "label": r["label"],
                "total_sales": float(r["total_sales"]),
                "count": int(r["count"])
            }
            for _, r in grouped.iterrows()
        ]
    except Exception as e:
        print(f"Error get_sales_chart_data: {e}")
        return []


def get_top_profitable_products(db, company_id: int, limit: int = 5):
    """
    Retorna los productos con mayor ganancia acumulada (precio - costo) * cantidad.
    """
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from sqlalchemy.orm import joinedload
    try:
        sale_items = (
            db.query(SaleItem)
            .join(Product)
            .filter(Product.company_id == company_id)
            .options(joinedload(SaleItem.product))
            .all()
        )

        if not sale_items:
            return []

        data = []
        for item in sale_items:
            p = item.product
            if not p:
                continue
            price = p.price or 0
            cost = p.cost_price or 0
            qty = item.quantity or 0
            data.append({
                "product_id": p.id,
                "name": p.name,
                "price": price,
                "cost_price": cost,
                "quantity": qty,
                "revenue": price * qty,
                "cost": cost * qty,
                "profit": (price - cost) * qty
            })

        df = pd.DataFrame(data)
        grouped = (
            df.groupby(["product_id", "name", "price", "cost_price"])
            .agg(quantity_sold=("quantity", "sum"), revenue=("revenue", "sum"),
                 cost=("cost", "sum"), profit=("profit", "sum"))
            .reset_index()
            .sort_values("profit", ascending=False)
            .head(limit)
        )

        return [
            {
                "id": int(r["product_id"]),
                "name": r["name"],
                "price": float(r["price"]),
                "cost_price": float(r["cost_price"]),
                "quantity_sold": int(r["quantity_sold"]),
                "revenue": float(r["revenue"]),
                "profit": float(r["profit"])
            }
            for _, r in grouped.iterrows()
        ]
    except Exception as e:
        print(f"Error get_top_profitable_products: {e}")
        return []


def get_stale_products(db, company_id: int, days: int = 30):
    """
    Retorna productos que no se han vendido en los últimos 'days' días,
    o que nunca se han vendido.
    """
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from app.models.sale import Sale
    from sqlalchemy import func
    from datetime import datetime, timedelta
    try:
        cutoff = datetime.utcnow() - timedelta(days=days)

        products = db.query(Product).filter(Product.company_id == company_id).all()

        last_sales = (
            db.query(SaleItem.product_id, func.max(Sale.created_at).label("last_sold"))
            .join(Sale, Sale.id == SaleItem.sale_id)
            .filter(Sale.company_id == company_id)
            .group_by(SaleItem.product_id)
            .all()
        )
        last_sold_map = {ls.product_id: ls.last_sold for ls in last_sales}

        result = []
        for p in products:
            last_sold = last_sold_map.get(p.id)
            if last_sold is None or last_sold < cutoff:
                days_since = (datetime.utcnow() - last_sold).days if last_sold else None
                result.append({
                    "id": p.id,
                    "name": p.name,
                    "stock": p.stock,
                    "price": p.price,
                    "cost_price": p.cost_price,
                    "last_sold": last_sold.isoformat() if last_sold else None,
                    "days_since_sold": days_since
                })

        result.sort(key=lambda x: (x["last_sold"] is not None, x["last_sold"] or ""))
        return result
    except Exception as e:
        print(f"Error get_stale_products: {e}")
        return []


def get_inactive_customers(db, company_id: int, days: int = 30):
    """
    Retorna clientes que no han comprado en los últimos 'days' días.
    """
    from app.models.sale import Sale
    from app.models.customer import Customer
    from sqlalchemy import func
    from datetime import datetime, timedelta
    try:
        cutoff = datetime.utcnow() - timedelta(days=days)

        customers = db.query(Customer).filter(Customer.company_id == company_id).all()

        last_purchases = (
            db.query(Sale.customer_id, func.max(Sale.created_at).label("last_purchase"))
            .filter(Sale.company_id == company_id)
            .group_by(Sale.customer_id)
            .all()
        )
        last_purchase_map = {lp.customer_id: lp.last_purchase for lp in last_purchases}

        result = []
        for c in customers:
            last_purchase = last_purchase_map.get(c.id)
            if last_purchase is None or last_purchase < cutoff:
                days_inactive = (datetime.utcnow() - last_purchase).days if last_purchase else None
                result.append({
                    "id": c.id,
                    "name": c.name,
                    "email": c.email,
                    "phone": c.phone,
                    "last_purchase": last_purchase.isoformat() if last_purchase else None,
                    "days_inactive": days_inactive
                })

        result.sort(key=lambda x: (x["last_purchase"] is not None, x["last_purchase"] or ""))
        return result
    except Exception as e:
        print(f"Error get_inactive_customers: {e}")
        return []


def get_sales_chart_with_growth(db, company_id: int, start_date, end_date, group_by: str = "day"):
    """
    Extiende get_sales_chart_data con métricas de crecimiento vs período anterior equivalente.
    También retorna total_profit por período usando los ítems de venta.
    """
    from app.models.sale import Sale
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from sqlalchemy.orm import joinedload
    from datetime import timedelta

    try:
        span = end_date - start_date

        # Período anterior equivalente
        prev_end = start_date
        prev_start = start_date - span

        def fetch_period(s, e):
            sales = db.query(Sale).filter(
                Sale.company_id == company_id,
                Sale.created_at >= s,
                Sale.created_at <= e
            ).options(joinedload(Sale.items).joinedload(SaleItem.product)).all()
            return sales

        current_sales = fetch_period(start_date, end_date)
        prev_sales = fetch_period(prev_start, prev_end)

        def calc_totals(sales):
            total = sum(s.total_amount or 0 for s in sales)
            profit = 0.0
            for sale in sales:
                for item in sale.items:
                    p = item.product
                    if p:
                        profit += (p.price - (p.cost_price or 0)) * (item.quantity or 0)
            return total, profit

        curr_sales_total, curr_profit = calc_totals(current_sales)
        prev_sales_total, prev_profit = calc_totals(prev_sales)

        def pct_change(curr, prev):
            if prev == 0:
                return None
            return round((curr - prev) / prev * 100, 1)

        sales_growth = pct_change(curr_sales_total, prev_sales_total)
        profit_growth = pct_change(curr_profit, prev_profit)

        # Datos agrupados para el gráfico (igual que get_sales_chart_data pero incluye profit)
        if not current_sales:
            return {
                "data": [],
                "summary": {
                    "total_sales": 0, "total_profit": 0,
                    "prev_total_sales": prev_sales_total, "prev_total_profit": prev_profit,
                    "sales_growth": sales_growth, "profit_growth": profit_growth,
                    "transaction_count": 0
                }
            }

        # Construir DataFrame por período
        rows = []
        for sale in current_sales:
            profit_sale = sum(
                (item.product.price - (item.product.cost_price or 0)) * (item.quantity or 0)
                for item in sale.items if item.product
            )
            rows.append({
                "created_at": sale.created_at,
                "total_amount": sale.total_amount or 0,
                "profit": profit_sale,
                "id": sale.id
            })

        df = pd.DataFrame(rows)
        df["created_at"] = pd.to_datetime(df["created_at"])

        if group_by == "day":
            df["period"] = df["created_at"].dt.strftime("%Y-%m-%d")
            df["label"] = df["created_at"].dt.strftime("%d/%m")
        elif group_by == "week":
            df["period"] = df["created_at"].dt.to_period("W").dt.start_time.dt.strftime("%Y-%m-%d")
            df["label"] = "Sem " + df["created_at"].dt.isocalendar().week.astype(str)
        elif group_by == "month":
            df["period"] = df["created_at"].dt.strftime("%Y-%m")
            df["label"] = df["created_at"].dt.strftime("%b %Y")
        else:
            df["period"] = df["created_at"].dt.strftime("%Y-%m-%d")
            df["label"] = df["created_at"].dt.strftime("%d/%m")

        grouped = (
            df.groupby(["period", "label"])
            .agg(total_sales=("total_amount", "sum"), profit=("profit", "sum"), count=("id", "count"))
            .reset_index()
            .sort_values("period")
        )

        chart_data = [
            {
                "period": r["period"],
                "label": r["label"],
                "total_sales": float(r["total_sales"]),
                "profit": float(r["profit"]),
                "count": int(r["count"])
            }
            for _, r in grouped.iterrows()
        ]

        group_label_map = {"day": "día anterior", "week": "semana anterior", "month": "mes anterior"}
        period_label = group_label_map.get(group_by, "período anterior")

        return {
            "data": chart_data,
            "summary": {
                "total_sales": round(curr_sales_total, 2),
                "total_profit": round(curr_profit, 2),
                "prev_total_sales": round(prev_sales_total, 2),
                "prev_total_profit": round(prev_profit, 2),
                "sales_growth": sales_growth,
                "profit_growth": profit_growth,
                "transaction_count": len(current_sales),
                "period_label": period_label
            }
        }
    except Exception as e:
        print(f"Error get_sales_chart_with_growth: {e}")
        return {"data": [], "summary": {}}


def get_business_insights(db, company_id: int):
    """
    Genera insights de negocio accionables: participación de productos,
    mejor día de la semana, cliente más frecuente, ticket promedio, etc.
    """
    from app.models.sale import Sale
    from app.models.sale_item import SaleItem
    from app.models.product import Product
    from app.models.customer import Customer
    from sqlalchemy.orm import joinedload
    from datetime import datetime, timedelta

    try:
        insights = []

        # Cargar ventas con ítems
        sales = db.query(Sale).filter(
            Sale.company_id == company_id
        ).options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.customer)
        ).all()

        if not sales:
            return []

        # ── Participación de productos en ganancias ──
        product_profits = {}
        product_revenues = {}
        total_profit = 0.0
        total_revenue = 0.0
        for sale in sales:
            for item in sale.items:
                p = item.product
                if not p:
                    continue
                qty = item.quantity or 0
                price = p.price or 0
                cost = p.cost_price or 0
                profit = (price - cost) * qty
                revenue = price * qty
                product_profits[p.name] = product_profits.get(p.name, 0) + profit
                product_revenues[p.name] = product_revenues.get(p.name, 0) + revenue
                total_profit += profit
                total_revenue += revenue

        if product_profits and total_profit > 0:
            top_name = max(product_profits, key=product_profits.get)
            top_pct = round(product_profits[top_name] / total_profit * 100, 1)
            top_rev_pct = round(product_revenues[top_name] / total_revenue * 100, 1) if total_revenue > 0 else 0
            insights.append({
                "icon": "🏆",
                "title": f"«{top_name}» es tu producto estrella",
                "detail": f"Genera el {top_pct}% de tus ganancias totales y el {top_rev_pct}% de tus ingresos.",
                "type": "success"
            })

        # ── Mejor día de la semana ──
        day_names = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
        day_sales = {}
        for sale in sales:
            if sale.created_at:
                dow = sale.created_at.weekday()
                day_sales[dow] = day_sales.get(dow, 0) + (sale.total_amount or 0)
        if day_sales:
            best_dow = max(day_sales, key=day_sales.get)
            insights.append({
                "icon": "📅",
                "title": f"Tu mejor día es el {day_names[best_dow]}",
                "detail": f"Acumula ${day_sales[best_dow]:.2f} en ventas históricas, más que cualquier otro día de la semana.",
                "type": "info"
            })

        # ── Cliente más frecuente ──
        customer_counts = {}
        customer_names = {}
        for sale in sales:
            if sale.customer_id:
                customer_counts[sale.customer_id] = customer_counts.get(sale.customer_id, 0) + 1
                if sale.customer:
                    customer_names[sale.customer_id] = sale.customer.name
        if customer_counts:
            top_cid = max(customer_counts, key=customer_counts.get)
            top_cname = customer_names.get(top_cid, f"Cliente #{top_cid}")
            insights.append({
                "icon": "⭐",
                "title": f"«{top_cname}» es tu cliente más fiel",
                "detail": f"Ha realizado {customer_counts[top_cid]} compras. Considera ofrecerle beneficios especiales.",
                "type": "accent"
            })

        # ── Ticket promedio ──
        avg_ticket = total_revenue / len(sales) if sales else 0
        # Comparar últimos 30 días vs anteriores
        now = datetime.utcnow()
        cutoff = now - timedelta(days=30)
        recent = [s for s in sales if s.created_at and s.created_at >= cutoff]
        older = [s for s in sales if s.created_at and s.created_at < cutoff]
        avg_recent = sum(s.total_amount or 0 for s in recent) / len(recent) if recent else 0
        avg_older = sum(s.total_amount or 0 for s in older) / len(older) if older else 0
        if avg_older > 0 and avg_recent > 0:
            ticket_change = (avg_recent - avg_older) / avg_older * 100
            direction = "subió" if ticket_change > 0 else "bajó"
            badge = "success" if ticket_change > 0 else "warning"
            insights.append({
                "icon": "🧾",
                "title": f"Ticket promedio: ${avg_recent:.2f}",
                "detail": f"El ticket promedio {direction} un {abs(ticket_change):.1f}% vs los 30 días anteriores (era ${avg_older:.2f}).",
                "type": badge
            })
        elif avg_ticket > 0:
            insights.append({
                "icon": "🧾",
                "title": f"Ticket promedio: ${avg_ticket:.2f}",
                "detail": "Valor promedio por venta en el histórico completo.",
                "type": "info"
            })

        # ── Producto con mayor stock sin rotación ──
        products = db.query(Product).filter(Product.company_id == company_id).all()
        sold_ids = set()
        for sale in sales:
            for item in sale.items:
                sold_ids.add(item.product_id)

        never_sold = [p for p in products if p.id not in sold_ids and (p.stock or 0) > 0]
        if never_sold:
            worst = max(never_sold, key=lambda p: (p.stock or 0) * (p.cost_price or p.price or 0))
            capital_frozen = (worst.stock or 0) * (worst.cost_price or worst.price or 0)
            insights.append({
                "icon": "❄️",
                "title": f"«{worst.name}» nunca se ha vendido",
                "detail": f"Tienes {worst.stock} unidades sin vender. Capital inmovilizado: ${capital_frozen:.2f}. Considera promocionarlo.",
                "type": "danger"
            })

        # ── Margen promedio ──
        if total_revenue > 0:
            margin = round(total_profit / total_revenue * 100, 1)
            margin_type = "success" if margin >= 30 else ("warning" if margin >= 15 else "danger")
            insights.append({
                "icon": "📊",
                "title": f"Margen de ganancia promedio: {margin}%",
                "detail": "Por cada $100 vendidos, tu negocio retiene ${:.2f} de ganancia neta.".format(margin),
                "type": margin_type
            })

        return insights

    except Exception as e:
        print(f"Error get_business_insights: {e}")
        return []
