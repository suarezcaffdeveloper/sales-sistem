describe('Compras', () => {

  beforeEach(() => {
    cy.login()
    cy.visit('https://sales-sistem.onrender.com/compras.html')
  })

  it('No permite confirmar compra vacía', () => {
    cy.get('#complete-purchase-btn').should('be.disabled')
  })

  it('Costo unitario no puede ser negativo', () => {
    cy.get('#unit-cost').type('-50')
    cy.get('#add-product-purchase-btn').click()
  })

  it('Cantidad inválida', () => {
    cy.get('#product-quantity-purchase').clear().type('0')
    cy.get('#add-product-purchase-btn').click()
  })

  it('Limpiar lista funciona', () => {
    cy.get('#clear-cart-purchase-btn').click()
  })

})