/**
 * Protección de acceso para páginas autenticadas
 * Incluir en HEAD de páginas protegidas: <script src="/js/checkAuth.js"></script>
 */

function checkAuthentication() {
    const token = localStorage.getItem('auth_token');
    
    console.log('🔐 Verificando autenticación...');
    
    // Si no hay token, redirigir a login
    if (!token) {
        console.log('❌ No hay token, redirigiendo a login');
        window.location.href = '/login.html';
        return;
    }

    console.log('✓ Token encontrado:', token.substring(0, 20) + '...');

    // Validar que el token sea válido haciendo una llamada al servidor
    validateToken(token)
        .then(() => {
            console.log('✅ Sesión validada correctamente');
            return loadUserRole(token);
        })
        .then(() => {
            applyRoleBasedUI();
        })
        .catch((error) => {
            console.error('🚨 Sesión inválida:', error);
            // Si el token es inválido, limpiar y redirigir a login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('username');
            localStorage.removeItem('user_role');
            window.location.href = '/login.html';
        });
}

/**
 * Obtiene el rol del usuario actual (admin o cajero) y lo guarda para
 * poder armar la interfaz sin tener que pedirlo de nuevo en cada acción.
 */
async function loadUserRole(token) {
    try {
        const response = await fetch('/api/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('user_role', data.role || 'admin');
        }
    } catch (error) {
        console.error('Error obteniendo el rol del usuario:', error);
    }
}

/**
 * Páginas a las que un cajero (empleado que solo vende) tiene acceso.
 * Todo lo que no esté en esta lista es exclusivo de admin: se oculta del
 * menú y, si el cajero entra por URL directa, se lo redirige a Ventas.
 * El backend igual rechaza esas acciones aunque alguien fuerce la UI.
 */
const CAJERO_ALLOWED_PAGES = ['sales'];

function applyRoleBasedUI() {
    const role = localStorage.getItem('user_role') || 'admin';
    const isCajero = role === 'cajero';

    document.querySelectorAll('.nav-link[data-page]').forEach(link => {
        const page = link.dataset.page;
        if (isCajero && !CAJERO_ALLOWED_PAGES.includes(page)) {
            link.style.display = 'none';
        }
    });

    if (isCajero) {
        const currentPage = document.body.dataset.page;
        if (currentPage && !CAJERO_ALLOWED_PAGES.includes(currentPage)) {
            window.location.href = '/';
        }
    }

    document.body.classList.add(isCajero ? 'role-cajero' : 'role-admin');
}

/**
 * Validar que el token sea válido
 */
async function validateToken(token) {
    try {
        console.log('🔍 Validando token con /api/validate...', token.substring(0, 20) + '...');
        
        const response = await fetch('/api/validate', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('📊 Respuesta del validador:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Error en validación:', {
                status: response.status,
                statusText: response.statusText,
                error: errorText
            });
            throw new Error(`Token inválido: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ Token válido, usuario:', data.username);
        return true;
    } catch (error) {
        console.error('❌ Error en validateToken:', error.message);
        throw error;
    }
}

/**
 * Obtener el token de autenticación
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

/**
 * Obtener el nombre de usuario
 */
function getUsername() {
    return localStorage.getItem('username');
}

/**
 * Hacer logout
 */
function logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('username');
    localStorage.removeItem('user_role');
    window.location.href = '/login.html';
}

/**
 * Helper para hacer fetch con autenticación
 */
async function fetchWithAuth(url, options = {}) {
    const token = getAuthToken();
    
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Agregar header de autorización
    if (!options.headers) {
        options.headers = {};
    }
    options.headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(url, options);

    // Si recibimos 401, el token es inválido
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('username');
        localStorage.removeItem('user_role');
        window.location.href = '/login.html';
        return;
    }

    return response;
}

/**
 * Ejecutar verificación de autenticación cuando se carga la página
 */
document.addEventListener('DOMContentLoaded', checkAuthentication);
