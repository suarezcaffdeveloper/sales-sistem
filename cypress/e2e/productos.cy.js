describe('Productos', () => {

  beforeEach(() => {
    cy.login()
    cy.visit('/productos.html')
  })

  it('No permite guardar producto vacío', () => {
    cy.get('#save-product-btn').click()
    cy.contains('error')
  })

  it('Nombre no debería aceptar números', () => {
    cy.get('#product-name').type('123456')
    cy.get('#save-product-btn').click()
  })

  it('Precio no puede ser negativo', () => {
    cy.get('#product-price').type('-100')
    cy.get('#save-product-btn').click()
  })

  it('Stock no puede ser negativo', () => {
    cy.get('#product-stock').type('-10')
    cy.get('#save-product-btn').click()
  })

  it('Filtro funciona', () => {
    cy.get('#filter-products').type('test')
  })

})