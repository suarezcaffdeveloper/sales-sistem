describe('Clientes', () => {

  it('Debería crear un cliente correctamente', () => {
    cy.login()
    cy.visit('/clientes.html')

    cy.get('#customer-name').type('Juan Perez')
    cy.get('#customer-email').type('juan@test.com')
    cy.get('#customer-phone').type('3415555555')
    cy.get('#customer-address').type('Rosario')

    cy.get('#save-customer-btn').click()

    cy.contains('Juan Perez').should('exist')
  })

  it('No debería permitir cliente sin nombre', () => {
    cy.login()
    cy.visit('/clientes.html')

    cy.get('#customer-email').type('test@test.com')
    cy.get('#save-customer-btn').click()

    cy.contains('error').should('exist')
  })

  it('No debería aceptar números como nombre', () => {
    cy.login()
    cy.visit('/clientes.html')

    cy.get('#customer-name').type('123456')
    cy.get('#save-customer-btn').click()

    cy.contains('error').should('exist')
  })

})

