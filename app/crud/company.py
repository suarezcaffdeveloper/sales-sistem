from sqlalchemy.orm import Session
from app.models.company import Company
from app.schemas.company import CompanyCreate
from typing import Union


def create_company(db: Session, company_data: Union[CompanyCreate, str]):
    """
    Crear una nueva compañía
    Acepta CompanyCreate o un string con el nombre de la compañía
    """
    if isinstance(company_data, str):
        # Si es un string, crear Company directly
        db_company = Company(name=company_data)
    else:
        # Si es CompanyCreate, usar model_dump()
        db_company = Company(**company_data.model_dump())
    
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def get_companies(db: Session):
    """Obtener todas las compañías"""
    return db.query(Company).all()


def get_company_by_id(db: Session, company_id: int):
    """Obtener una compañía por ID"""
    return db.query(Company).filter(Company.id == company_id).first()


def get_company_by_name(db: Session, name: str):
    """Obtener una compañía por nombre"""
    return db.query(Company).filter(Company.name == name).first()


def update_company(db: Session, company_id: int, company_data: Union[CompanyCreate, str]):
    """
    Actualizar una compañía
    Acepta CompanyCreate o un string con el nombre
    """
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        return None
    
    if isinstance(company_data, str):
        company.name = company_data
    else:
        for key, value in company_data.model_dump().items():
            setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, company_id: int):
    """Eliminar una compañía"""
    company = db.query(Company).filter(Company.id == company_id).first()
    
    if not company:
        return None
    
    db.delete(company)
    db.commit()
    return company
