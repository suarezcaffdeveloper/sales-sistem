const API_BASE = '/api';

// DOM Elements
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const errorMessage = document.getElementById('error-message');
const registerForm = document.getElementById('register-form');
const registerError = document.getElementById('register-error');
const registerModal = document.getElementById('register-modal');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
});

// ============================================
// MANEJO DE LOGIN
// ============================================
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        showError('Por favor completa todos los campos', errorMessage);
        return;
    }

    // Mostrar estado de carga
    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading">⏳</span> Iniciando sesión...';

    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.detail || 'Error al iniciar sesión';
            showError(errorMsg, errorMessage);
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
            return;
        }

        // Guardar token en localStorage
        console.log('📦 Token recibido:', data.access_token.substring(0, 30) + '...');
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('username', username);
        console.log('✅ Datos guardados en localStorage');
        console.log('📍 Redirigiendo a panel de ventas...');

        // Redirigir a la página de ventas
        setTimeout(() => {
            window.location.href = '/';
        }, 500);

    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión: ' + error.message, errorMessage);
        loginBtn.disabled = false;
        loginBtn.textContent = originalText;
    }
}

// ============================================
// MANEJO DE REGISTRO
// ============================================
async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const passwordConfirm = document.getElementById('register-password-confirm').value;

    if (!username || !password || !passwordConfirm) {
        showError('Por favor completa todos los campos', registerError);
        return;
    }

    if (password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres', registerError);
        return;
    }

    if (password !== passwordConfirm) {
        showError('Las contraseñas no coinciden', registerError);
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.detail || 'Error al crear la cuenta';
            showError(errorMsg, registerError);
            return;
        }

        // Mostrar mensaje de éxito
        showSuccess('¡Cuenta creada exitosamente! Ahora inicia sesión.', registerError);
        registerForm.reset();

        // Limpiar y cerrar modal después de 1.5 segundos
        setTimeout(() => {
            hideRegisterForm();
            // Llenar el formulario de login para que sea más fácil
            document.getElementById('username').value = username;
            document.getElementById('password').focus();
        }, 1500);

    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión: ' + error.message, registerError);
    }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================
function showError(message, element) {
    element.textContent = message;
    element.classList.remove('login-success');
    element.classList.add('show');
    
    // Auto-hide después de 5 segundos
    setTimeout(() => {
        element.classList.remove('show');
    }, 5000);
}

function showSuccess(message, element) {
    element.textContent = message;
    element.classList.add('login-success', 'show');
    
    // Auto-hide después de 5 segundos
    setTimeout(() => {
        element.classList.remove('login-success', 'show');
    }, 5000);
}

function showRegisterForm(e) {
    e.preventDefault();
    registerModal.style.display = 'flex';
    document.getElementById('register-username').focus();
}

function hideRegisterForm() {
    registerModal.style.display = 'none';
    registerForm.reset();
    registerError.classList.remove('show', 'login-success');
}

// Cerrar modal si se clica fuera
document.addEventListener('click', (e) => {
    if (e.target === registerModal) {
        hideRegisterForm();
    }
});

// Prevenir que se envíe el formulario con Enter en modo registro
registerForm.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && registerForm.style.display === 'none') {
        e.preventDefault();
    }
});
