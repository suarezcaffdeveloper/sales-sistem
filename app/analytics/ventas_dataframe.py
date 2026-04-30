import pandas as pd
from app.crud.sale import get_all_sales

def build_sales_dashboard_dataframe(db, company_id):
    """
    Construye un DataFrame de ventas para el dashboard, incluyendo los campos relevantes.
    """
    sales = get_all_sales(db, company_id)
    if not sales:
        return pd.DataFrame()

    # Asegurarse de que cada venta tenga los campos esperados
    df = pd.DataFrame(sales)
    return df