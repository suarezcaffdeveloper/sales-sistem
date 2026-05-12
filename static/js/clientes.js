const API_BASE = '/api';
let customers = [];
let editingId = null;

// DOM Elements
const customerNameInput = document.getElementById('customer-name');
const customerEmailInput = document.getElementById('customer-email');
const customerPhoneInput = document.getElementById('customer-phone');
const customerAddressInput = document.getElementById('customer-address');
const saveCustomerBtn = document.getElementById('save-customer-btn');
const cancelCustomerBtn = document.getElementById('cancel-customer-btn');
const customersTbody = document.getElementById('customers-tbody');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    loadCustomers();
    setupEventListeners();
});

function displayUsername() {
    const username = getUsername();
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && username) {
        usernameDisplay.textContent = `👤 ${username}`;
    }
}

function setupEventListeners() {
    saveCustomerBtn.addEventListener('click', saveCustomer);
    cancelCustomerBtn.addEventListener('click', cancelEdit);
    
    // Filtro de búsqueda
    const filterInput = document.getElementById('filter-customers');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterCustomers(searchTerm);
        });
    }
}

// CARGAR CLIENTES
async function loadCustomers() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers`);
        if (!response.ok) {
            throw new Error('Error al cargar clientes');
        }
        customers = await response.json();
        renderCustomers();
    } catch (error) {
        console.error('Error cargando clientes:', error);
        customersTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: red;">Error al cargar los clientes</td></tr>';
        showError('Error al cargar los clientes: ' + error.message);
    }
}

// RENDERIZAR CLIENTES
function renderCustomers() {
    customersTbody.innerHTML = '';

    if (customers.length === 0) {
        customersTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No hay clientes</td></tr>';
        return;
    }

    customers.forEach(customer => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${customer.id}</td>
            <td>${customer.name}</td>
            <td>${customer.email}</td>
            <td>${customer.phone}</td>
            <td>${customer.address}</td>
            <td>
                <button class="btn-danger" onclick="editCustomer(${customer.id})">✏️ Editar</button>
                <button class="btn-danger" onclick="deleteCustomer(${customer.id})">🗑️ Eliminar</button>
            </td>
        `;
        customersTbody.appendChild(tr);
    });
}

// GUARDAR CLIENTE
async function saveCustomer() {
    const name = customerNameInput.value.trim();
    const email = customerEmailInput.value.trim();
    const phone = customerPhoneInput.value.trim();
    const address = customerAddressInput.value.trim();

    // Validar campos obligatorios
    if (!name) {
        showError('El nombre del cliente es obligatorio');
        return;
    }

    if (!email) {
        showError('El email del cliente es obligatorio');
        return;
    }

    // Validar formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showError('El email no tiene un formato válido');
        return;
    }

    // Validar formato del nombre del cliente
    const nameRegex = /^[a-zA-Z\s]+$/;
    if (!nameRegex.test(name)) {
        showError('El nombre del cliente solo puede contener letras y espacios');
        return;
    }

    //Validar formato del teléfono (opcional)
    if (phone) {
        const phoneRegex = /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/;
        if (!phoneRegex.test(phone)) {
            showError('El teléfono no tiene un formato válido');
            return;
        }
    }

    const emailExists = customers.some(c => c.email === email && c.id !== editingId);
    if (emailExists) {
        showError('Ya existe un cliente con ese email');
        return;
    }

    // Validar formato de dirección (opcional)
    if (address) {
        const addressRegex = /^[a-zA-Z0-9\s,.-]+$/;
        if (!addressRegex.test(address)) {
            showError('La dirección no tiene un formato válido');
            return;
        }
    }

    const customerData = {
        name,
        email,
        phone: phone || null,
        address: address || null
    };

    try {
        const url = editingId ? `${API_BASE}/customers/${editingId}` : `${API_BASE}/customers`;
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(customerData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            // Intentar extraer mensaje de error detallado
            let errorMessage = 'Error al guardar el cliente';
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
        loadCustomers();
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión: ' + error.message);
    }
}

// EDITAR CLIENTE
function editCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    customerNameInput.value = customer.name;
    customerEmailInput.value = customer.email;
    customerPhoneInput.value = customer.phone;
    customerAddressInput.value = customer.address;
    editingId = id;

    saveCustomerBtn.textContent = '✏️ Actualizar Cliente';
    cancelCustomerBtn.style.display = 'block';
    customerNameInput.focus();
}

// CANCELAR EDICIÓN
function cancelEdit() {
    clearForm();
}

// ELIMINAR CLIENTE
async function deleteCustomer(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;

    try {
        const response = await fetchWithAuth(`${API_BASE}/customers/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            showError(errorData.detail || 'Error al eliminar el cliente');
            return;
        }

        loadCustomers();
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión: ' + error.message);
    }
}

// LIMPIAR FORMULARIO
function clearForm() {
    customerNameInput.value = '';
    customerEmailInput.value = '';
    customerPhoneInput.value = '';
    customerAddressInput.value = '';
    editingId = null;
    saveCustomerBtn.textContent = '💾 Guardar Cliente';
    cancelCustomerBtn.style.display = 'none';
}

// MOSTRAR ERROR
function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').classList.remove('hidden');
}

// FILTRAR CLIENTES
function filterCustomers(searchTerm) {
    // Eliminar fila "sin resultados" previa si existe
    const existing = customersTbody.querySelector('.no-results-row');
    if (existing) existing.remove();

    const rows = customersTbody.querySelectorAll('tr');

    if (rows.length === 0) {
        if (searchTerm === '') loadCustomers();
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
        tr.innerHTML = '<td colspan="6" style="text-align: center; padding: 2rem; color: #999;">No se encontraron clientes con "' + searchTerm.toUpperCase() + '"</td>';
        customersTbody.appendChild(tr);
    }
}

// LIMPIAR FILTRO DE CLIENTES
function clearFilterCustomers() {
    const filterInput = document.getElementById('filter-customers');
    if (filterInput) {
        filterInput.value = '';
        filterCustomers('');
        loadCustomers(); // Recargar la lista completa
    }
}
