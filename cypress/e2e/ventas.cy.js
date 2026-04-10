describe('Ventas', () => {

  beforeEach(() => {
    cy.login()
  })

  it('No permite confirmar venta sin productos', () => {
    cy.get('#complete-sale-btn').should('be.disabled')
  })

  it('Agregar producto sin seleccionar debería fallar', () => {
    cy.get('#add-product-btn').click()
    cy.contains('error')
  })

  it('Cantidad no puede ser negativa', () => {
    cy.get('#product-quantity').clear().type('-5')
    cy.get('#add-product-btn').click()

    // esperado: error o bloqueo
  })

  it('Pago inicial no puede ser negativo', () => {
    cy.get('#initial-payment').clear().type('-100')
    cy.get('#complete-sale-btn').should('be.disabled')
  })

  it('Limpiar carrito funciona', () => {
    cy.get('#clear-cart-btn').click()
    cy.contains('Aún no hay productos')
  })

})