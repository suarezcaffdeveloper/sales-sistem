from sqlalchemy import Column, Integer, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)

    sale_id = Column(Integer, ForeignKey("sales.id"))
    product_id = Column(Integer, ForeignKey("products.id"))

    quantity = Column(Integer)
    returned_quantity = Column(Integer, default=0)  # Unidades devueltas (devolución parcial)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product")