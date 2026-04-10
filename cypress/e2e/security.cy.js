describe('Seguridad básica', () => {

  it('No debería acceder sin login', () => {
    cy.visit('/productos.html')

    // Verifica que redirige al login si no está autenticado
    cy.url().should('include', 'login')
  })

  it('Inputs no deberían aceptar scripts (XSS)', () => {
    cy.login()

    cy.visit('/productos.html')

    // Asegura que realmente cargó la página correcta
    cy.url().should('include', 'productos')

    // Espera a que el input exista y sea visible
    cy.get('#product-name', { timeout: 10000 })
      .should('be.visible')
      .type('<script>alert(1)</script>')

    cy.get('#save-product-btn').should('be.visible').click()

    // Acá después podemos validar:
    // - si aparece un error
    // - o si el valor fue sanitizado
  })

})

