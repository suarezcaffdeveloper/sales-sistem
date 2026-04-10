describe('Proveedores', () => {

  it('Debería crear un proveedor correctamente', () => {
    cy.login()
    cy.visit('/proveedores.html')

    cy.get('#supplier-name').type('Proveedor Test')
    cy.get('#supplier-email').type('test@proveedor.com')
    cy.get('#supplier-phone').type('3411234567')
    cy.get('#supplier-address').type('Calle Falsa 123')

    cy.get('#save-supplier-btn').click()

    cy.contains('Proveedor Test').should('exist')
  })

  it('No debería permitir proveedor sin nombre', () => {
    cy.login()
    cy.visit('/proveedores.html')

    cy.get('#supplier-email').type('test@proveedor.com')
    cy.get('#save-supplier-btn').click()

    cy.contains('error').should('exist')
  })

  it('No debería aceptar email inválido', () => {
    cy.login()
    cy.visit('/proveedores.html')

    cy.get('#supplier-name').type('Proveedor Test')
    cy.get('#supplier-email').type('email-invalido')
    cy.get('#save-supplier-btn').click()

    cy.contains('error').should('exist')
  })

})

