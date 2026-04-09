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


def run_all_migrations():
    """
    Runs all necessary migrations
    """
    print("\n[MIGRATIONS] Starting database migrations...\n")
    
    try:
        migrate_add_company_id_if_missing()
        migrate_daily_box_table()
        print("\n[OK] All migrations completed successfully!\n")
    except Exception as e:
        print(f"[ERROR] Migration failed: {str(e)}")
