// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
Cypress.Commands.add('login', () => {
  cy.visit('/login.html')

  cy.intercept('POST', '/api/login').as('loginRequest')

  // Antes esto tenía hardcodeadas las credenciales reales del dueño del
  // negocio (Santipesca/santipesca) directo en el repo. Ahora usa por
  // defecto la cuenta demo (creada por seed_demo.py, sin datos reales) y
  // se puede pisar con cypress.env.json (gitignored, ver
  // cypress.env.json.example) o las variables CYPRESS_username/CYPRESS_password.
  const username = Cypress.env('username') || 'demo'
  const password = Cypress.env('password') || 'demo123'

  cy.get('#username').type(username)
  cy.get('#password').type(password)
  cy.get('#login-btn').click()

  cy.wait('@loginRequest')

  cy.url().should('not.include', 'login')
})
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })