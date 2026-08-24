from sqlalchemy import Column, Integer, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class SaleReturnItem(Base):
    """Detalle de un producto devuelto dentro de una devolución parcial."""
    __tablename__ = "sale_return_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_return_id = Column(Integer, ForeignKey("sale_returns.id"), nullable=False)
    sale_item_id = Column(Integer, ForeignKey("sale_items.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, default=0)  # Precio de lista del producto al momento de la devolución

    sale_return = relationship("SaleReturn", back_populates="items")
    product = relationship("Product")
