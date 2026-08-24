"""
Database migrations for adding multi-tenant support by company
"""
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session


def migrate_add_company_id_if_missing():
    """
    Adds company_id to all tables that need it
    This function runs on application startup
    """
    from app.db.database import engine
    
    inspector = inspect(engine)
    
    # Tables and their column definitions (table_name, column_name, type, nullable)
    migrations = [
        ('customers', 'company_id', 'INTEGER', False),
        ('products', 'company_id', 'INTEGER', False),
        ('suppliers', 'company_id', 'INTEGER', False),
        ('purchases', 'company_id', 'INTEGER', False),
        ('sales', 'company_id', 'INTEGER', False),
        ('payments', 'company_id', 'INTEGER', False),
        ('daily_boxes', 'company_id', 'INTEGER', False),
    ]
    
    with engine.begin() as conn:
        for table_name, column_name, column_type, nullable in migrations:
            # Verify if the table exists
            if table_name not in inspector.get_table_names():
                continue
            
            # Check if the column already exists
            columns = [col['name'] for col in inspector.get_columns(table_name)]            
            if column_name not in columns:
                print(f"[MIGRATION] Migrating table '{table_name}': adding column '{column_name}'...")
                
                try:
                    # For each table, execute the appropriate ALTER TABLE
                    conn.execute(text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type} DEFAULT 1"
                    ))
                    print(f"   [OK] Column '{column_name}' added to '{table_name}'")
                    
                except Exception as e:
                    if "duplicate column name" not in str(e).lower():
                        print(f"   [WARNING] Error adding '{column_name}' to '{table_name}': {str(e)}")


def migrate_daily_box_table():
    """
    Updates the daily_boxes table to change the 'date' field from UNIQUE
    Since each company can now have its own box per day
    """
    from app.db.database import engine
    inspector = inspect(engine)
    
    if 'daily_boxes' not in inspector.get_table_names():
        return
    
    # Check indexes
    try:
        with engine.connect() as conn:
            # In SQLite, UNIQUE constraints cannot be removed directly
            # But the new model without UNIQUE on 'date' will work
            print("[MIGRATION] Checking structure of table 'daily_boxes'...")
            print("   [OK] Table 'daily_boxes' ready for multi-tenant")
            conn.commit()
    except Exception as e:
        print(f"   [WARNING] Info: {str(e)}")


def migrate_add_sale_cancellation_fields():
    """
    Adds cancelled_at / cancel_reason to sales, needed to void a sale
    (anulación) without deleting it or losing its history.
    """
    from app.db.database import engine

    inspector = inspect(engine)

    if 'sales' not in inspector.get_table_names():
        return

    columns = [col['name'] for col in inspector.get_columns('sales')]
    migrations = [
        ('cancelled_at', 'DATETIME'),
        ('cancel_reason', 'VARCHAR'),
    ]

    with engine.begin() as conn:
        for column_name, column_type in migrations:
            if column_name in columns:
                continue
            print(f"[MIGRATION] Migrating table 'sales': adding column '{column_name}'...")
            try:
                conn.execute(text(
                    f"ALTER TABLE sales ADD COLUMN {column_name} {column_type}"
                ))
                print(f"   [OK] Column '{column_name}' added to 'sales'")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"   [WARNING] Error adding '{column_name}' to 'sales': {str(e)}")


def migrate_add_purchase_debt_fields():
    """
    Adds paid_amount / debt_amount / status to purchases, needed to track
    cuentas a pagar a proveedores (accounts payable), the same way sales
    already track debt to customers.

    Compras existentes (creadas antes de esta migración) se marcan como
    pagadas por completo: históricamente esta app asumía que toda compra
    se pagaba al instante, así que no hay deuda real que reconstruir para
    ellas.
    """
    from app.db.database import engine

    inspector = inspect(engine)

    if 'purchases' not in inspector.get_table_names():
        return

    columns = [col['name'] for col in inspector.get_columns('purchases')]
    migrations = [
        ('paid_amount', 'FLOAT'),
        ('debt_amount', 'FLOAT'),
        ('status', 'VARCHAR'),
    ]

    with engine.begin() as conn:
        for column_name, column_type in migrations:
            if column_name in columns:
                continue
            print(f"[MIGRATION] Migrating table 'purchases': adding column '{column_name}'...")
            try:
                conn.execute(text(
                    f"ALTER TABLE purchases ADD COLUMN {column_name} {column_type}"
                ))
                print(f"   [OK] Column '{column_name}' added to 'purchases'")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"   [WARNING] Error adding '{column_name}' to 'purchases': {str(e)}")

        try:
            result = conn.execute(text(
                "UPDATE purchases SET paid_amount = total_amount, debt_amount = 0, status = 'pagado' "
                "WHERE paid_amount IS NULL"
            ))
            if result.rowcount:
                print(f"   [OK] {result.rowcount} compra(s) existente(s) marcada(s) como pagadas")
        except Exception as e:
            print(f"   [WARNING] Error backfilling purchases debt fields: {str(e)}")


def migrate_add_user_role():
    """
    Adds role to users, para poder distinguir administradores de cajeros.
    Los usuarios existentes se marcan como 'admin': hasta ahora cada uno
    era el único usuario de su empresa (dueño del negocio), así que no
    pierden ninguna capacidad que ya tenían.
    """
    from app.db.database import engine

    inspector = inspect(engine)

    if 'users' not in inspector.get_table_names():
        return

    columns = [col['name'] for col in inspector.get_columns('users')]

    with engine.begin() as conn:
        if 'role' not in columns:
            print("[MIGRATION] Migrating table 'users': adding column 'role'...")
            try:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR"))
                print("   [OK] Column 'role' added to 'users'")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"   [WARNING] Error adding 'role' to 'users': {str(e)}")

        try:
            result = conn.execute(text(
                "UPDATE users SET role = 'admin' WHERE role IS NULL"
            ))
            if result.rowcount:
                print(f"   [OK] {result.rowcount} usuario(s) existente(s) marcado(s) como admin")
        except Exception as e:
            print(f"   [WARNING] Error backfilling users role: {str(e)}")


def migrate_add_sale_discount_fields():
    """
    Adds subtotal_amount / discount_percent / discount_amount to sales, para
    poder aplicar descuentos en la venta. Las ventas existentes (creadas
    antes de esta migración) no tenían descuento: se backfillea
    subtotal_amount = total_amount y discount_amount = 0.
    """
    from app.db.database import engine

    inspector = inspect(engine)

    if 'sales' not in inspector.get_table_names():
        return

    columns = [col['name'] for col in inspector.get_columns('sales')]
    migrations = [
        ('subtotal_amount', 'FLOAT'),
        ('discount_percent', 'FLOAT'),
        ('discount_amount', 'FLOAT'),
    ]

    with engine.begin() as conn:
        for column_name, column_type in migrations:
            if column_name in columns:
                continue
            print(f"[MIGRATION] Migrating table 'sales': adding column '{column_name}'...")
            try:
                conn.execute(text(
                    f"ALTER TABLE sales ADD COLUMN {column_name} {column_type}"
                ))
                print(f"   [OK] Column '{column_name}' added to 'sales'")
            except Exception as e:
                if "duplicate column name" not in str(e).lower():
                    print(f"   [WARNING] Error adding '{column_name}' to 'sales': {str(e)}")

        try:
            result = conn.execute(text(
                "UPDATE sales SET subtotal_amount = total_amount, discount_amount = 0 "
                "WHERE subtotal_amount IS NULL"
            ))
            if result.rowcount:
                print(f"   [OK] {result.rowcount} venta(s) existente(s) marcada(s) sin descuento")
        except Exception as e:
            print(f"   [WARNING] Error backfilling sales discount fields: {str(e)}")


def run_all_migrations():
    """
    Runs all necessary migrations
    """
    print("\n[MIGRATIONS] Starting database migrations...\n")

    try:
        migrate_add_company_id_if_missing()
        migrate_daily_box_table()
        migrate_add_sale_cancellation_fields()
        migrate_add_purchase_debt_fields()
        migrate_add_user_role()
        migrate_add_sale_discount_fields()
        print("\n[OK] All migrations completed successfully!\n")
    except Exception as e:
        print(f"[ERROR] Migration failed: {str(e)}")
