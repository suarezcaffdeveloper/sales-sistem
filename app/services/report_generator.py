"""
Generador de reportes en Excel y PDF
"""

from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.product import Product
from app.models.daily_box import DailyBox
from app.services.profit_calculator import (
    calculate_period_stats,
    get_top_products_profit,
    get_product_average_cost
)
import io

try:
    import pandas as pd
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
    from reportlab.lib.units import inch
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


def generate_sales_excel(db: Session, start_date: datetime = None, end_date: datetime = None):
    """
    Genera un reporte en Excel con todas las ventas
    """
    if not PANDAS_AVAILABLE:
        raise Exception("pandas y openpyxl no están instalados")
    
    if not start_date:
        start_date = datetime.utcnow() - timedelta(days=30)
    if not end_date:
        end_date = datetime.utcnow()
    
    # Obtener ventas
    sales = db.query(Sale).filter(
        Sale.created_at >= start_date,
        Sale.created_at <= end_date
    ).order_by(Sale.created_at.desc()).all()
    
    # Preparar datos
    data = []
    for sale in sales:
        data.append({
            "ID Venta": sale.id,
            "Cliente": sale.customer.name,
            "Fecha": sale.created_at.strftime("%Y-%m-%d %H:%M"),
            "Total": sale.total_amount,
            "Pagado": sale.paid_amount,
            "Deuda": sale.debt_amount,
            "Estado": sale.status,
            "Productos": len(sale.items)
        })
    
    # Crear DataFrame
    df = pd.DataFrame(data)
    
    # Crear workbook con estilos
    wb = Workbook()
    ws = wb.active
    ws.title = "Ventas"
    
    # Headers
    headers = ["ID Venta", "Cliente", "Fecha", "Total", "Pagado", "Deuda", "Estado", "Productos"]
    ws.append(headers)
    
    # Estilos
    header_fill = PatternFill(start_color="1976D2", end_color="1976D2", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    
    for cell in ws[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="center", vertical="center")
    
    # Datos
    for _, row in df.iterrows():
        ws.append([
            row["ID Venta"],
            row["Cliente"],
            row["Fecha"],
            f"${row['Total']:.2f}",
            f"${row['Pagado']:.2f}",
            f"${row['Deuda']:.2f}",
            row["Estado"],
            row["Productos"]
        ])
    
    # Ajustar ancho de columnas
    ws.column_dimensions['A'].width = 10
    ws.column_dimensions['B'].width = 20
    ws.column_dimensions['C'].width = 18
    ws.column_dimensions['D'].width = 12
    ws.column_dimensions['E'].width = 12
    ws.column_dimensions['F'].width = 12
    ws.column_dimensions['G'].width = 12
    ws.column_dimensions['H'].width = 12
    
    # Agregar resumen
    stats = calculate_period_stats(db, start_date, end_date)
    
    ws.append([])
    ws.append(["RESUMEN"])
    ws.append(["Total Ventas", stats["total_sales"]])
    ws.append(["Ventas Pagadas", stats["paid_sales"]])
    ws.append(["Ventas Pendientes", stats["pending_sales"]])
    ws.append(["Total Ingresos", f"${stats['total_sales_amount']:.2f}"])
    ws.append(["Costo Total", f"${stats['total_cost_amount']:.2f}"])
    ws.append(["Ganancia Total", f"${stats['total_profit']:.2f}"])
    ws.append(["Margen de Ganancia", f"{stats['profit_margin']:.1f}%"])
    ws.append(["Deuda Total", f"${stats['total_debt']:.2f}"])
    
    # Guardar a bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    
    return output


def generate_daily_report_pdf(db: Session, box_date: datetime = None):
    """
    Genera un reporte PDF del día (caja diaria)
    """
    if not REPORTLAB_AVAILABLE:
        raise Exception("reportlab no está instalado")
    
    if not box_date:
        box_date = datetime.utcnow().date()
    
    # Obtener caja del día
    daily_box = db.query(DailyBox).filter(
        DailyBox.date == box_date
    ).first()
    
    # Obtener ventas del día
    start_of_day = datetime.combine(box_date, datetime.min.time())
    end_of_day = datetime.combine(box_date, datetime.max.time())
    
    sales = db.query(Sale).filter(
        Sale.created_at >= start_of_day,
        Sale.created_at <= end_of_day
    ).all()
    
    stats = calculate_period_stats(db, start_of_day, end_of_day)
    
    # Crear PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1976D2'),
        spaceAfter=30,
        alignment=1  # Center
    )
    
    # Título
    elements.append(Paragraph("REPORTE DIARIO - CAJA", title_style))
    elements.append(Paragraph(f"Fecha: {box_date.strftime('%d/%m/%Y')}", styles['Normal']))
    elements.append(Spacer(1, 0.5*inch))
    
    # Tabla de resumen
    summary_data = [
        ["CONCEPTO", "VALOR"],
        ["Total Ventas", str(stats["total_sales"])],
        ["Ventas Pagadas", str(stats["paid_sales"])],
        ["Ventas Pendientes", str(stats["pending_sales"])],
        ["Total Ingresos", f"${stats['total_sales_amount']:.2f}"],
        ["Costo Total", f"${stats['total_cost_amount']:.2f}"],
        ["Ganancia Total", f"${stats['total_profit']:.2f}"],
        ["Margen de Ganancia", f"{stats['profit_margin']:.1f}%"],
        ["Deuda Generada", f"${stats['total_debt']:.2f}"],
    ]
    
    if daily_box:
        summary_data.append(["Efectivo en Caja", f"${daily_box.cash_amount:.2f}"])
    
    table = Table(summary_data, colWidths=[3*inch, 2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.5*inch))
    
    # Productos más vendidos
    elements.append(Paragraph("Productos Más Vendidos", styles['Heading2']))
    
    top_products = get_top_products_profit(db, start_of_day, end_of_day, limit=5)
    
    if top_products:
        products_data = [["PRODUCTO", "CANTIDAD", "GANANCIA"]]
        for product in top_products:
            products_data.append([
                product["product_name"],
                str(product["total_quantity_sold"]),
                f"${product['total_profit']:.2f}"
            ])
        
        products_table = Table(products_data, colWidths=[3*inch, 1.5*inch, 1.5*inch])
        products_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(products_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    return buffer


def generate_weekly_report_pdf(db: Session):
    """Reporte semanal"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=7)
    
    return _generate_period_report_pdf(db, start_date, end_date, "SEMANAL")


def generate_monthly_report_pdf(db: Session):
    """Reporte mensual"""
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    return _generate_period_report_pdf(db, start_date, end_date, "MENSUAL")


def _generate_period_report_pdf(db: Session, start_date: datetime, end_date: datetime, period_type: str):
    """Genera PDF para un período"""
    if not REPORTLAB_AVAILABLE:
        raise Exception("reportlab no está instalado")
    
    stats = calculate_period_stats(db, start_date, end_date)
    top_products = get_top_products_profit(db, start_date, end_date, limit=10)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1976D2'),
        spaceAfter=30,
        alignment=1
    )
    
    # Título
    elements.append(Paragraph(f"REPORTE {period_type}", title_style))
    elements.append(Paragraph(
        f"Del {start_date.strftime('%d/%m/%Y')} al {end_date.strftime('%d/%m/%Y')}",
        styles['Normal']
    ))
    elements.append(Spacer(1, 0.5*inch))
    
    # Tabla principal
    summary_data = [
        ["CONCEPTO", "VALOR"],
        ["Total de Ventas", str(stats["total_sales"])],
        ["Ventas Pagadas", str(stats["paid_sales"])],
        ["Ventas Pendientes", str(stats["pending_sales"])],
        ["Total Ingresos", f"${stats['total_sales_amount']:.2f}"],
        ["Costo Total", f"${stats['total_cost_amount']:.2f}"],
        ["Ganancia REAL", f"${stats['total_profit']:.2f}"],
        ["Margen de Ganancia", f"{stats['profit_margin']:.1f}%"],
        ["Deuda Total", f"${stats['total_debt']:.2f}"],
        ["Ganancia Promedio/Venta", f"${stats['average_profit_per_sale']:.2f}"],
    ]
    
    table = Table(summary_data, colWidths=[3*inch, 2*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1976D2')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    elements.append(PageBreak())
    
    # Productos con mayor ganancia
    elements.append(Paragraph("Top 10 Productos por Ganancia", styles['Heading2']))
    elements.append(Spacer(1, 0.3*inch))
    
    if top_products:
        products_data = [["PRODUCTO", "VENDIDAS", "GANANCIA", "MARGEN"]]
        for product in top_products:
            margin = (product["total_profit"] / (product["sale_price"] * product["total_quantity_sold"]) * 100) if product["total_quantity_sold"] > 0 else 0
            products_data.append([
                product["product_name"],
                str(product["total_quantity_sold"]),
                f"${product['total_profit']:.2f}",
                f"{margin:.1f}%"
            ])
        
        products_table = Table(products_data, colWidths=[2.5*inch, 1*inch, 1.5*inch, 1*inch])
        products_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4CAF50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
        ]))
        
        elements.append(products_table)
    
    doc.build(elements)
    buffer.seek(0)
    
    return buffer
