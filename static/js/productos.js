const API_BASE = '/api';
let products = [];
let editingId = null;
let suppliers = [];

// DOM Elements
const productNameInput = document.getElementById('product-name');
const productPriceInput = document.getElementById('product-price');
const productCostPriceInput = document.getElementById('product-cost-price');
const productStockInput = document.getElementById('product-stock');
const productSupplierSelect = document.getElementById('product-supplier');
const saveProductBtn = document.getElementById('save-product-btn');
const cancelProductBtn = document.getElementById('cancel-product-btn');
const productsTbody = document.getElementById('products-tbody');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    loadSuppliers();
    loadProducts();
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
    saveProductBtn.addEventListener('click', saveProduct);
    cancelProductBtn.addEventListener('click', cancelEdit);

    // Filtro de búsqueda
    const filterInput = document.getElementById('filter-products');
    if (filterInput) {
        filterInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            filterProducts(searchTerm);
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
        productSupplierSelect.innerHTML = '<option value="">-- Sin proveedor --</option>';
        suppliers.forEach(supplier => {
            const option = document.createElement('option');
            option.value = supplier.id;
            option.textContent = supplier.name;
            productSupplierSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        showError('Error al cargar los proveedores: ' + error.message);
    }
}

// CARGAR PRODUCTOS
async function loadProducts() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/products`);
        if (!response.ok) {
            throw new Error('Error al cargar productos');
        }
        products = await response.json();
        renderProducts();
    } catch (error) {
        console.error('Error cargando productos:', error);
        productsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--danger);">Error al cargar los productos</td></tr>';
        showError('Error al cargar los productos: ' + error.message);
    }
}

// RENDERIZAR PRODUCTOS
function renderProducts() {
    productsTbody.innerHTML = '';

    if (products.length === 0) {
        productsTbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem;">No hay productos</td></tr>';
        return;
    }

    products.forEach(product => {
        const supplier = suppliers.find(s => s.id === product.supplier_id);
        const costPriceText = product.cost_price ? `$${product.cost_price.toFixed(2)}` : '-';
        const margin = product.cost_price ? (((product.price - product.cost_price) / product.price) * 100).toFixed(1) : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${product.id}</td>
            <td>${product.name}</td>
            <td>$${product.price.toFixed(2)}</td>
            <td>${costPriceText}</td>
            <td>${margin}%</td>
            <td>${product.stock}</td>
            <td>${supplier ? supplier.name : '-'}</td>
            <td class="admin-only" style="white-space: nowrap;">
                <button class="btn btn-view" onclick="editProduct(${product.id})" style="margin-right: 0.4rem;">Editar</button>
                <button class="btn-danger" onclick="deleteProduct(${product.id})">Eliminar</button>
            </td>
        `;
        productsTbody.appendChild(tr);
    });
}

// GUARDAR PRODUCTO
async function saveProduct() {
    const name = productNameInput.value.trim();
    const price = parseFloat(productPriceInput.value);
    const costPrice = productCostPriceInput.value ? parseFloat(productCostPriceInput.value) : null;
    const stock = parseInt(productStockInput.value);
    const supplierValue = productSupplierSelect.value;
    const supplier_id = supplierValue ? parseInt(supplierValue) : null;

    // Validar campos
    if (!name) {
        showError('El nombre del producto es obligatorio');
        return;
    }

    if (!price || price < 0 || isNaN(price)) {
        showError('Ingresa un precio de venta válido');
        return;
    }

    if (costPrice && costPrice < 0) {
        showError('El precio de costo no puede ser negativo');
        return;
    }

    if (isNaN(stock) || stock < 0) {
        showError('Ingresa una cantidad de stock válida');
        return;
    }

    const productData = {
        name,
        price,
        cost_price: costPrice,
        stock,
        supplier_id: supplier_id,
        description: null,
        brand: null,
        category: null
    };

    try {
        const url = editingId ? `${API_BASE}/products/${editingId}` : `${API_BASE}/products`;
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetchWithAuth(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            
            // Intentar extraer mensaje de error detallado
            let errorMessage = 'Error al guardar el producto';
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
        loadProducts();
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión: ' + error.message);
    }
}

// EDITAR PRODUCTO
function editProduct(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;

    productNameInput.value = product.name;
    productPriceInput.value = product.price;
    productCostPriceInput.value = product.cost_price || '';
    productStockInput.value = product.stock;
    productSupplierSelect.value = product.supplier_id || '';
    editingId = id;

    saveProductBtn.textContent = 'Actualizar producto';
    cancelProductBtn.style.display = 'block';
    productNameInput.focus();
}

// CANCELAR EDICIÓN
function cancelEdit() {
    clearForm();
}

// ELIMINAR PRODUCTO
function deleteProduct(id) {
    showConfirm('¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.', async () => {
        try {
            const response = await fetchWithAuth(`${API_BASE}/products/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const errorData = await response.json();
                showError(errorData.detail || 'Error al eliminar el producto');
                return;
            }

            loadProducts();
        } catch (error) {
            console.error('Error:', error);
            showError('Error de conexión: ' + error.message);
        }
    }, 'Eliminar');
}

// LIMPIAR FORMULARIO
function clearForm() {
    productNameInput.value = '';
    productPriceInput.value = '';
    productStockInput.value = '';
    productSupplierSelect.value = '';
    editingId = null;
    saveProductBtn.textContent = 'Guardar producto';
    cancelProductBtn.style.display = 'none';
}

// MOSTRAR ERROR
function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-modal').classList.remove('hidden');
}

// FILTRAR PRODUCTOS
function filterProducts(searchTerm) {
    // Eliminar fila "sin resultados" previa si existe
    const existing = productsTbody.querySelector('.no-results-row');
    if (existing) existing.remove();

    const rows = productsTbody.querySelectorAll('tr');

    if (rows.length === 0) {
        if (searchTerm === '') loadProducts();
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
        tr.innerHTML = '<td colspan="8" style="text-align: center; padding: 2rem; color: var(--text-3);">No se encontraron productos con "' + searchTerm.toUpperCase() + '"</td>';
        productsTbody.appendChild(tr);
    }
}

// LIMPIAR FILTRO DE PRODUCTOS
function clearFilterProducts() {
    const filterInput = document.getElementById('filter-products');
    if (filterInput) {
        filterInput.value = '';
        filterProducts('');
        loadProducts(); // Recargar la lista completa
    }
}
