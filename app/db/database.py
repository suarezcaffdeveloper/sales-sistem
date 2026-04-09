from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./castZone.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()

def get_db():
    """Dependencia para obtener la sesión de base de datos"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def migrate_add_daily_box_id_if_missing():
    """Verifica si la columna daily_box_id existe en la tabla sales, y la agrega si no existe"""
    try:
        with engine.connect() as connection:
            # Verificar si la columna existe
            result = connection.execute(text("PRAGMA table_info(sales)"))
            columns = [row[1] for row in result.fetchall()]
            
            if 'daily_box_id' not in columns:
                print("⚠️  Agregando columna daily_box_id a la tabla sales...")
                connection.execute(text(
                    "ALTER TABLE sales ADD COLUMN daily_box_id INTEGER"
                ))
                connection.commit()
                print("✅ Columna daily_box_id agregada exitosamente")
            else:
                print("✅ Columna daily_box_id ya existe")
    except Exception as e:
        print(f"Nota: No se pudo verificar/actualizar la columna daily_box_id: {str(e)}")
        # No es un error crítico, continuar de todas formas