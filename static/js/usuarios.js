const API_BASE = '/api';
let users = [];
let currentUsername = null;

// DOM Elements
const newUserUsernameInput = document.getElementById('new-user-username');
const newUserPasswordInput = document.getElementById('new-user-password');
const newUserRoleSelect = document.getElementById('new-user-role');
const createUserBtn = document.getElementById('create-user-btn');
const usersTbody = document.getElementById('users-tbody');
const loader = document.getElementById('loader');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    currentUsername = getUsername();
    loadUsers();
    setupEventListeners();
});

function displayUsername() {
    const username = getUsername();
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && username) {
        usernameDisplay.textContent = username;
    }
}

function setupEventListeners() {
    createUserBtn.addEventListener('click', createUser);

    document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeConfirmModal);
    document.getElementById('confirm-accept-btn')?.addEventListener('click', () => {
        const callback = confirmActionCallback;
        closeConfirmModal();
        if (callback) callback();
    });
}

// ========== MODAL DE CONFIRMACIÓN ==========

let confirmActionCallback = null;

// Ícono/botón según el tipo de acción: 'danger' (destructiva, irreversible) o
// 'success' (acción positiva que el usuario efectivamente quiere hacer).
const CONFIRM_ICON_SVG = {
    danger: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    success: '✓'
};

function showConfirm(message, onConfirm, acceptLabel = 'Confirmar', variant = 'danger') {
    document.getElementById('confirm-message').textContent = message;
    const acceptBtn = document.getElementById('confirm-accept-btn');
    acceptBtn.textContent = acceptLabel;
    acceptBtn.className = variant === 'success' ? 'btn btn-success' : 'btn btn-danger-solid';
    const icon = document.getElementById('confirm-icon');
    icon.className = variant === 'success' ? 'modal-icon success' : 'modal-icon danger';
    icon.innerHTML = CONFIRM_ICON_SVG[variant] || CONFIRM_ICON_SVG.danger;
    confirmActionCallback = onConfirm;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

function closeConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    confirmActionCallback = null;
}

// ========== CARGAR USUARIOS ==========

async function loadUsers() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/users`);
        if (!response.ok) {
            throw new Error('Error al cargar usuarios');
        }
        users = await response.json();
        renderUsers();
    } catch (error) {
        console.error('Error cargando usuarios:', error);
        usersTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem; color: var(--danger);">Error al cargar los usuarios</td></tr>';
    }
}

function renderUsers() {
    usersTbody.innerHTML = '';

    if (users.length === 0) {
        usersTbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 2rem;">No hay usuarios</td></tr>';
        return;
    }

    users.forEach(user => {
        const isAdmin = user.role === 'admin';
        const isSelf = user.username === currentUsername;
        const roleBadge = isAdmin
            ? '<span style="background: rgba(59,130,246,0.15); color: #3b82f6; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">ADMIN</span>'
            : '<span style="background: rgba(16,185,129,0.15); color: #10b981; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700;">CAJERO</span>';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.username}${isSelf ? ' <span style="color: var(--text-3); font-size: 0.8rem;">(vos)</span>' : ''}</td>
            <td>${roleBadge}</td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="btn btn-view" onclick="toggleRole(${user.id}, '${user.role}')" style="margin-right: 0.4rem;">
                    ${isAdmin ? 'Bajar a cajero' : 'Subir a admin'}
                </button>
                <button class="btn btn-view" onclick="resetPassword(${user.id})" style="margin-right: 0.4rem;">Resetear contraseña</button>
                <button class="btn-danger" onclick="removeUser(${user.id})" ${isSelf ? 'disabled title="No podés eliminar tu propio usuario"' : ''}>Eliminar</button>
            </td>
        `;
        usersTbody.appendChild(tr);
    });
}

// ========== CREAR USUARIO ==========

async function createUser() {
    const username = newUserUsernameInput.value.trim();
    const password = newUserPasswordInput.value;
    const role = newUserRoleSelect.value;

    if (!username || !password) {
        showError('Completá usuario y contraseña');
        return;
    }

    if (password.length < 6) {
        showError('La contraseña debe tener al menos 6 caracteres');
        return;
    }

    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.detail || 'Error al crear el usuario');
            return;
        }

        newUserUsernameInput.value = '';
        newUserPasswordInput.value = '';
        newUserRoleSelect.value = 'cajero';
        loadUsers();
        showSuccess(`Usuario "${data.username}" creado como ${data.role === 'admin' ? 'administrador' : 'cajero'}.`);
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión al crear el usuario');
    } finally {
        showLoader(false);
    }
}

// ========== CAMBIAR ROL ==========

function toggleRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'cajero' : 'admin';
    const label = newRole === 'admin' ? 'administrador' : 'cajero';

    showConfirm(`¿Cambiar este usuario a ${label}?`, async () => {
        try {
            showLoader(true);
            const response = await fetchWithAuth(`${API_BASE}/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.detail || 'Error al cambiar el rol');
                return;
            }

            loadUsers();
        } catch (error) {
            console.error('Error:', error);
            showError('Error de conexión al cambiar el rol');
        } finally {
            showLoader(false);
        }
    }, 'Cambiar rol', 'success');
}

// ========== RESETEAR CONTRASEÑA ==========

function resetPassword(userId) {
    showConfirm('¿Generar una nueva contraseña para este usuario? La contraseña actual dejará de funcionar.', async () => {
        try {
            showLoader(true);
            const response = await fetchWithAuth(`${API_BASE}/users/${userId}/reset-password`, {
                method: 'POST'
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.detail || 'Error al resetear la contraseña');
                return;
            }

            showRevealPassword(data.username, data.password);
        } catch (error) {
            console.error('Error:', error);
            showError('Error de conexión al resetear la contraseña');
        } finally {
            showLoader(false);
        }
    }, 'Resetear', 'success');
}

// ========== ELIMINAR USUARIO ==========

function removeUser(userId) {
    showConfirm('¿Eliminar este usuario? Esta acción no se puede deshacer.', async () => {
        try {
            showLoader(true);
            const response = await fetchWithAuth(`${API_BASE}/users/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                showError(data.detail || 'Error al eliminar el usuario');
                return;
            }

            loadUsers();
        } catch (error) {
            console.error('Error:', error);
            showError('Error de conexión al eliminar el usuario');
        } finally {
            showLoader(false);
        }
    }, 'Eliminar');
}

// ========== MODALES ==========

function showRevealPassword(username, password) {
    document.getElementById('reveal-username').textContent = username;
    document.getElementById('reveal-password').textContent = password;
    document.getElementById('reveal-password-modal').classList.remove('hidden');
}

function showSuccess(message) {
    document.getElementById('success-message').textContent = message;
    document.getElementById('success-modal').classList.remove('hidden');
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').classList.remove('hidden');
}

function showLoader(show) {
    if (!loader) return;
    loader.classList.toggle('hidden', !show);
}
