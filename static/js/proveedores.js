const API_BASE = '/api';
let suppliers = [];
let editingId = null;

// DOM Elements
const supplierNameInput = document.getElementById('supplier-name');
const supplierEmailInput = document.getElementById('supplier-email');
const supplierPhoneInput = document.getElementById('supplier-phone');
const supplierAddressInput = document.getElementById('supplier-address');
const saveSupplierBtn = document.getElementById('save-supplier-btn');
const cancelSupplierBtn = document.getElementById('cancel-supplier-btn');
const suppliersTbody = document.getElementById('suppliers-tbody');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    loadSuppliers();
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
    saveSupplierBtn.addEventListener('click', saveSupplier);
    cancelSupplierBtn.addEventListener('click', cancelEdit);

    // Filtro de búsqueda
    const filterInput = document.getElementById('filter-suppliers');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterSuppliers(searchTerm);
        });
    }

    document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeConfirmModal);
    document.getElementById('confirm-accept-btn')?.addEventListener('click', () => {
        const callback = confirmActionCallback;
        closeConfirmModal();
        if (callback) callback();
    });
}

// ========== MODAL DE CONFIRMACIÓN (reemplaza confirm() nativo) ==========

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

// CARGAR PROVEEDORES
async function loadSuppliers() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/suppliers`);
        if (!response.ok) {
            throw new Error('Error al cargar proveedores');
        }
        suppliers = await response.json();
        renderSuppliers();
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        suppliersTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--danger);">Error al cargar los proveedores</td></tr>';
        showError('Error al cargar los proveedores: ' + error.message);
    }
}

// RENDERIZAR PROVEEDORES
function renderSuppliers() {
    suppliersTbody.innerHTML = '';

    if (suppliers.length === 0) {
        suppliersTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No hay proveedores</td></tr>';
        return;
    }

    suppliers.forEach(supplier => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${supplier.id}</td>
            <td>${supplier.name}</td>
            <td>${supplier.email}</td>
            <td>${supplier.phone}</td>
            <td>${supplier.address}</td>
            <td style="white-space: nowrap;">
                <button class="btn btn-view" onclick="editSupplier(${supplier.id})" style="margin-right: 0.4rem;">Editar</button>
                <button class="btn-danger" onclick="deleteSupplier(${supplier.id})">Eliminar</button>
            </td>
        `;
        suppliersTbody.appendChild(tr);
    });
}

// GUARDAR PROVEEDOR
async function saveSupplier() {
    const name = supplierNameInput.value.trim();
    const email = supplierEmailInput.value.trim();
    const phone = supplierPhoneInput.value.trim();
    const address = supplierAddressInput.value.trim();

    // Validar campos obligatorios
    if (!name) {
        showError('El nombre del proveedor es obligatorio');
        return;
    }

    // Email es opcional pero si se ingresa debe ser válido
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showError('El email no tiene un formato válido');
            return;
        }
    }

    const supplierData = {
        name,
        email: email || null,
        phone: phone || null,
        address: address || null
    };

    try {
        const url = editingId ? `${API_BASE}/suppliers/${editingId}` : `${API_BASE}/suppliers`;
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(supplierData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            // Intentar extraer mensaje de error detallado
            let errorMessage = 'Error al guardar el proveedor';
            if (errorData.detail) {
                if (Array.isArray(errorData.detail)) {
                    // Errores de validación de Pydantic
                    errorMessage = errorData.detail.map(e => 
                        `${e.loc?.[1] || 'Campo'}: ${e.msg}`
                    ).join('\n');
                } else if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                }
            }
            
            showError(errorMessage);
            return;
        }

        clearForm();
        loadSuppliers();
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión: ' + error.message);
    }
}

// EDITAR PROVEEDOR
function editSupplier(id) {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;

    supplierNameInput.value = supplier.name;
    supplierEmailInput.value = supplier.email;
    supplierPhoneInput.value = supplier.phone;
    supplierAddressInput.value = supplier.address;
    editingId = id;

    saveSupplierBtn.textContent = 'Actualizar proveedor';
    cancelSupplierBtn.style.display = 'block';
    supplierNameInput.focus();
}

// CANCELAR EDICIÓN
function cancelEdit() {
    clearForm();
}

// ELIMINAR PROVEEDOR
function deleteSupplier(id) {
    showConfirm('¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer.', async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE}/suppliers/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                showError(errorData.detail || 'Error al eliminar el proveedor');
                return;
            }

            loadSuppliers();
        } catch (error) {
            console.error('Error:', error);
            showError('Error de conexión: ' + error.message);
        }
    }, 'Eliminar');
}

// LIMPIAR FORMULARIO
function clearForm() {
    supplierNameInput.value = '';
    supplierEmailInput.value = '';
    supplierPhoneInput.value = '';
    supplierAddressInput.value = '';
    editingId = null;
    saveSupplierBtn.textContent = 'Guardar proveedor';
    cancelSupplierBtn.style.display = 'none';
}

// MOSTRAR ERROR
function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').classList.remove('hidden');
}

// FILTRAR PROVEEDORES
function filterSuppliers(searchTerm) {
    // Eliminar fila "sin resultados" previa si existe
    const existing = suppliersTbody.querySelector('.no-results-row');
    if (existing) existing.remove();

    const rows = suppliersTbody.querySelectorAll('tr');

    if (rows.length === 0) {
        if (searchTerm === '') loadSuppliers();
        return;
    }

    rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        let text = '';
        for (let i = 0; i < cells.length - 1; i++) {
            text += cells[i].textContent.toLowerCase() + ' ';
        }
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });

    const visibleRows = Array.from(rows).some(row => row.style.display !== 'none');
    if (!visibleRows && searchTerm !== '') {
        const tr = document.createElement('tr');
        tr.className = 'no-results-row';
        tr.innerHTML = '<td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-3);">No se encontraron proveedores con "' + searchTerm.toUpperCase() + '"</td>';
        suppliersTbody.appendChild(tr);
    }
}

// LIMPIAR FILTRO DE PROVEEDORES
function clearFilterSuppliers() {
    const filterInput = document.getElementById('filter-suppliers');
    if (filterInput) {
        filterInput.value = '';
        filterSuppliers('');
        loadSuppliers(); // Recargar la lista completa
    }
}
