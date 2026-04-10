describe('Dashboard', () => {

  it('Debería cargar correctamente el dashboard', () => {
    cy.login()
    cy.visit('/dashboard.html')

    cy.get('#total-sales').should('be.visible')
    cy.get('#sales-count').should('be.visible')
    cy.get('#total-profit').should('be.visible')
    cy.get('#total-products').should('be.visible')
  })

  it('Debería mostrar datos (no null o vacío)', () => {
    cy.login()
    cy.visit('/dashboard.html')

    cy.get('#total-sales').invoke('text').should('not.be.empty')
    cy.get('#sales-count').invoke('text').should('not.be.empty')
  })

  it('No debería permitir acceder sin login', () => {
    cy.visit('/dashboard.html')
    cy.url().should('include', 'login')
  })

})

