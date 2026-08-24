const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    // Antes esto apuntaba directo a producción (sales-sistem.onrender.com):
    // correr la suite mutaba datos reales de negocio. Por defecto corre
    // contra una instancia local (`uvicorn app.main:app --reload`, puerto
    // 8000 por defecto). Para apuntar a otro entorno (staging, etc.),
    // seteá la variable de entorno CYPRESS_BASE_URL en vez de hardcodearlo.
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:8000',
  },
})
