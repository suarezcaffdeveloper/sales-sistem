const API_BASE = '/api';
let allSuppliers = [];
let allProducts = [];
let purchaseItems = [];
let selectedSupplier = null;
let selectedSupplierId = null;
let allPurchasesHistory = [];

// DOM Elements
const supplierSearch = document.getElementById('supplier-search');
const supplierSearchResults = document.getElementById('supplier-search-results');
const selectedSupplierDiv = document.getElementById('selected-supplier');
const selectedSupplierName = document.getElementById('selected-supplier-name');
const productSearchPurchase = document.getElementById('product-search-purchase');
const productQuantityPurchase = document.getElementById('product-quantity-purchase');
const unitCostInput = document.getElementById('unit-cost');
const addProductPurchaseBtn = document.getElementById('add-product-purchase-btn');
const clearCartPurchaseBtn = document.getElementById('clear-cart-purchase-btn');
const completePurchaseBtn = document.getElementById('complete-purchase-btn');
const searchResultsPurchase = document.getElementById('search-results-purchase');
const createNewProductBtn = document.getElementById('create-new-product-btn');
const cartItemsPurchaseContainer = document.getElementById('cart-items-purchase');
const subtotalPurchaseSpan = document.getElementById('subtotal-purchase');
const itemCountPurchaseSpan = document.getElementById('item-count-purchase');
const totalPricePurchaseSpan = document.getElementById('total-price-purchase');
const successModal = document.getElementById('success-modal');
const errorModal = document.getElementById('error-modal');
const loader = document.getElementById('loader');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    loadSuppliers();
    loadProducts();
    loadPurchasesHistory();
    setupEventListeners();
});

function displayUsername() {
    const username = getUsername();
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && username) {
        usernameDisplay.textContent = `👤 ${username}`;
    }
}

// Event Listeners
function setupEventListeners() {
    supplierSearch.addEventListener('input', handleSupplierSearch);
    productSearchPurchase.addEventListener('input', handleProductSearchPurchase);
    addProductPurchaseBtn.addEventListener('click', addProductToPurchase);
    clearCartPurchaseBtn.addEventListener('click', clearPurchaseCart);
    completePurchaseBtn.addEventListener('click', completePurchase);
    createNewProductBtn.addEventListener('click', openCreateProductModal);

    // Tecla Enter en cantidad
    productQuantityPurchase.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProductToPurchase();
    });

    unitCostInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProductToPurchase();
    });

    // Cerrar modales
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('close-error-btn')?.addEventListener('click', closeErrorModal);
    
    // Filtros de búsqueda
    const supplierFilterInput = document.getElementById('purchases-filter-supplier');
    if (supplierFilterInput) {
        supplierFilterInput.addEventListener('input', filterPurchasesHistory);
    }
}

// ========== CARGAR DATOS ==========

// CARGAR PROVEEDORES
async function loadSuppliers() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/suppliers`);
        allSuppliers = await response.json();
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        showError('Error al cargar los proveedores');
    }
}

// CARGAR PRODUCTOS
async function loadProducts() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/products`);
        allProducts = await response.json();
    } catch (error) {
        console.error('Error cargando productos:', error);
        showError('Error al cargar los productos');
    }
}

// CARGAR HISTORIAL DE COMPRAS
async function loadPurchasesHistory() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/purchases`);
        allPurchasesHistory = await response.json();
        renderPurchasesHistory(allPurchasesHistory);
    } catch (error) {
        console.error('Error cargando historial de compras:', error);
        document.getElementById('purchases-history-table').innerHTML = 
            '<p class="empty-message" style="color: #d32f2f;">Error al cargar el historial de compras</p>';
    }
}

// ========== BÚSQUEDA DE PROVEEDORES ==========

function handleSupplierSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    supplierSearchResults.innerHTML = '';

    if (searchTerm.length === 0) {
        supplierSearchResults.innerHTML = '';
        return;
    }

    const filtered = allSuppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        supplierSearchResults.innerHTML = '<div class="search-result-item" style="pointer-events: none; cursor: default; color: #999;">No se encontraron proveedores</div>';
        return;
    }

    filtered.slice(0, 5).forEach(supplier => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        
        const highlightName = supplier.name.replace(
            new RegExp(`(${searchTerm})`, 'gi'),
            '<strong>$1</strong>'
        );
        
        div.innerHTML = `${highlightName} <span style="font-size: 0.85rem; color: #999;">${supplier.email || 'Sin email'}</span>`;
        div.onclick = () => selectSupplier(supplier);
        supplierSearchResults.appendChild(div);
    });
}

// SELECCIONAR PROVEEDOR
function selectSupplier(supplier) {
    selectedSupplierId = supplier.id;
    selectedSupplier = supplier;
    selectedSupplierName.textContent = supplier.name;
    selectedSupplierDiv.style.display = 'block';
    supplierSearch.value = '';
    supplierSearchResults.innerHTML = '';
    updateCompletePurchaseButton();
}

// ========== BÚSQUEDA DE PRODUCTOS ==========

function handleProductSearchPurchase(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    searchResultsPurchase.innerHTML = '';

    if (searchTerm.length === 0) {
        createNewProductBtn.style.display = 'none';
        return;
    }

    const filtered = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm)
    ).slice(0, 5);

    if (filtered.length === 0) {
        searchResultsPurchase.innerHTML = '<div class="search-result-item" style="pointer-events: none; color: #999;">No se encontraron productos</div>';
        createNewProductBtn.style.display = 'block';
        createNewProductBtn.textContent = `+ Crear "${searchTerm}"`;
        createNewProductBtn.dataset.productName = searchTerm;
        return;
    }

    createNewProductBtn.style.display = 'none';

    filtered.forEach(product => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <div>
                <strong>${product.name}</strong><br>
                <span style="font-size: 0.85rem; color: #999;">Stock: ${product.stock} | $${product.price.toFixed(2)}</span>
            </div>
        `;
        div.onclick = () => selectProductForPurchase(product);
        searchResultsPurchase.appendChild(div);
    });
}

// SELECCIONAR PRODUCTO
function selectProductForPurchase(product) {
    productSearchPurchase.value = product.name;
    productSearchPurchase.dataset.productId = product.id;
    productSearchPurchase.dataset.productName = product.name;
    searchResultsPurchase.innerHTML = '';
    createNewProductBtn.style.display = 'none';
}

// ========== AGREGAR PRODUCTO AL CARRITO ==========

function addProductToPurchase() {
    const productId = parseInt(productSearchPurchase.dataset.productId);
    const quantity = parseInt(productQuantityPurchase.value) || 0;
    const unitCost = parseFloat(unitCostInput.value) || 0;

    if (!productId) {
        showError('Debes seleccionar un producto');
        return;
    }

    if (quantity <= 0) {
        showError('La cantidad debe ser mayor a 0');
        return;
    }

    if (unitCost <= 0) {
        showError('El costo unitario debe ser mayor a 0');
        return;
    }

    // Buscar el producto
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showError('Producto no encontrado');
        return;
    }

    // Verificar si el producto ya está en la compra
    const existingItem = purchaseItems.find(item => item.product_id === productId);

    if (existingItem) {
        existingItem.quantity += quantity;
        existingItem.unit_cost = unitCost;
        existingItem.subtotal = existingItem.quantity * unitCost;
    } else {
        purchaseItems.push({
            product_id: productId,
            product_name: product.name,
            quantity: quantity,
            unit_cost: unitCost,
            subtotal: quantity * unitCost
        });
    }

    // Limpiar formulario
    productSearchPurchase.value = '';
    productSearchPurchase.dataset.productId = '';
    productQuantityPurchase.value = '1';
    unitCostInput.value = '';
    searchResultsPurchase.innerHTML = '';

    renderPurchaseCart();
    updateCompletePurchaseButton();
}

// RENDERIZAR CARRITO DE COMPRA
function renderPurchaseCart() {
    cartItemsPurchaseContainer.innerHTML = '';

    if (purchaseItems.length === 0) {
        cartItemsPurchaseContainer.innerHTML = '<p class="empty-message">No hay productos agregados</p>';
        updatePurchaseTotals();
        return;
    }

    purchaseItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                <div class="cart-item-details">
                    $${item.unit_cost.toFixed(2)} c/u × ${item.quantity} = $${item.subtotal.toFixed(2)}
                </div>
            </div>
            <button class="btn-danger" onclick="removeFromPurchaseCart(${index})">🗑️</button>
        `;
        cartItemsPurchaseContainer.appendChild(div);
    });

    updatePurchaseTotals();
}

// REMOVER DEL CARRITO
function removeFromPurchaseCart(index) {
    purchaseItems.splice(index, 1);
    renderPurchaseCart();
    updateCompletePurchaseButton();
}

// ACTUALIZAR TOTALES
function updatePurchaseTotals() {
    let subtotal = 0;
    let itemCount = 0;

    purchaseItems.forEach(item => {
        subtotal += item.subtotal;
        itemCount += item.quantity;
    });

    subtotalPurchaseSpan.textContent = `$${subtotal.toFixed(2)}`;
    itemCountPurchaseSpan.textContent = itemCount;
    totalPricePurchaseSpan.textContent = `$${subtotal.toFixed(2)}`;
}

// LIMPIAR CARRITO
function clearPurchaseCart() {
    if (purchaseItems.length === 0) {
        return;
    }

    if (confirm('¿Estás seguro de que deseas limpiar la compra?')) {
        purchaseItems = [];
        renderPurchaseCart();
        updateCompletePurchaseButton();
    }
}

// ACTUALIZAR BOTÓN COMPLETAR
function updateCompletePurchaseButton() {
    completePurchaseBtn.disabled = !selectedSupplierId || purchaseItems.length === 0;
}

// ========== COMPLETAR COMPRA ==========

async function completePurchase() {
    if (!selectedSupplierId) {
        showError('Debes seleccionar un proveedor');
        return;
    }

    if (purchaseItems.length === 0) {
        showError('La compra está vacía');
        return;
    }

    const purchaseData = {
        supplier_id: selectedSupplierId,
        items: purchaseItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost
        }))
    };

    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/purchases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(purchaseData)
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.detail || 'Error al procesar la compra');
            return;
        }

        // Éxito
        showSuccess(`✓ Compra completada! ID: ${data.id} | Total: $${data.total_amount.toFixed(2)}`);
        resetPurchaseForm();
        loadProducts(); // Recargar productos para actualizar stock
        loadPurchasesHistory(); // Recargar historial

    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión al procesar la compra');
    } finally {
        showLoader(false);
    }
}

// RESETEAR FORMULARIO
function resetPurchaseForm() {
    purchaseItems = [];
    supplierSearch.value = '';
    selectedSupplierId = null;
    selectedSupplier = null;
    supplierSearchResults.innerHTML = '';
    selectedSupplierDiv.style.display = 'none';
    productSearchPurchase.value = '';
    productQuantityPurchase.value = '1';
    unitCostInput.value = '';
    searchResultsPurchase.innerHTML = '';
    createNewProductBtn.style.display = 'none';
    renderPurchaseCart();
    updateCompletePurchaseButton();
}

// ========== HISTORIAL DE COMPRAS ==========

// RENDERIZAR TABLA DE COMPRAS
function renderPurchasesHistory(purchases) {
    const container = document.getElementById('purchases-history-table');
    
    if (!purchases || purchases.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay compras registradas</p>';
        return;
    }
    
    let tableHTML = `
        <div class="table-wrapper" style="max-height: 310px; overflow-y: auto;">
            <table>
                <thead>
                    <tr>
                        <th style="text-align: left;">ID Compra</th>
                        <th style="text-align: left;">Proveedor</th>
                        <th style="text-align: left;">Fecha</th>
                        <th style="text-align: left;">Productos</th>
                        <th style="text-align: right;">Total</th>
                        <th style="text-align: center;">Acción</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    purchases.forEach(purchase => {
        const date = new Date(purchase.date);
        const formattedDate = date.toLocaleDateString('es-ES');
        const formattedTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        tableHTML += `
            <tr>
                <td style="color: #666;">#${String(purchase.id).padStart(6, '0')}</td>
                <td style="color: #333; font-weight: 500;">${purchase.supplier_name}</td>
                <td style="color: #666; font-size: 0.9rem;">${formattedDate} ${formattedTime}</td>
                <td style="color: #666; font-size: 0.9rem; text-align: center;">${purchase.items_count} producto${purchase.items_count !== 1 ? 's' : ''}</td>
                <td style="text-align: right; font-weight: 600; color: #4caf50;">$${purchase.total_amount.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="viewPurchaseDetail(${purchase.id})" 
                            style="background: #1976d2; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: background 0.3s;"
                            onmouseover="this.style.background='#1565c0'" 
                            onmouseout="this.style.background='#1976d2'">
                        👁️ Ver
                    </button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = tableHTML;
}

// VER DETALLE DE UNA COMPRA
async function viewPurchaseDetail(purchaseId) {
    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/purchases/${purchaseId}`);
        const purchaseDetail = await response.json();
        
        if (!response.ok) {
            showError('Error al obtener detalles de la compra');
            return;
        }
        
        showPurchaseDetailModal(purchaseDetail);
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar el detalle de la compra');
    } finally {
        showLoader(false);
    }
}

// MOSTRAR MODAL CON DETALLE
function showPurchaseDetailModal(purchaseDetail) {
    const content = document.getElementById('purchase-detail-content');
    const date = new Date(purchaseDetail.date);
    const formattedDate = date.toLocaleDateString('es-ES');
    const formattedTime = date.toLocaleTimeString('es-ES');
    
    let itemsHTML = '';
    purchaseDetail.items.forEach(item => {
        itemsHTML += `
            <tr>
                <td style="padding: 0.75rem;">${item.product_name}</td>
                <td style="text-align: center; padding: 0.75rem;">x${item.quantity}</td>
                <td style="text-align: right; padding: 0.75rem;">$${item.unit_cost.toFixed(2)}</td>
                <td style="text-align: right; padding: 0.75rem; font-weight: 600;">$${item.subtotal.toFixed(2)}</td>
            </tr>
        `;
    });
    
    content.innerHTML = `
        <div style="background: #f5f5f5; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
            <p style="margin: 0.5rem 0;"><strong>Proveedor:</strong> ${purchaseDetail.supplier_name}</p>
            ${purchaseDetail.supplier_email ? `<p style="margin: 0.5rem 0;"><strong>Email:</strong> ${purchaseDetail.supplier_email}</p>` : ''}
            ${purchaseDetail.supplier_phone ? `<p style="margin: 0.5rem 0;"><strong>Teléfono:</strong> ${purchaseDetail.supplier_phone}</p>` : ''}
            <p style="margin: 0.5rem 0;"><strong>Fecha:</strong> ${formattedDate} ${formattedTime}</p>
            <p style="margin: 0.5rem 0;"><strong>ID Compra:</strong> ${purchaseDetail.id}</p>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
            <thead>
                <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                    <th style="text-align: left; padding: 0.75rem; font-weight: 600;">Producto</th>
                    <th style="text-align: center; padding: 0.75rem; font-weight: 600;">Cantidad</th>
                    <th style="text-align: right; padding: 0.75rem; font-weight: 600;">Costo Unit.</th>
                    <th style="text-align: right; padding: 0.75rem; font-weight: 600;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>
        
        <div style="text-align: right; padding: 1rem; background: #f5f5f5; border-radius: 6px;">
            <p style="margin: 0; font-size: 1.2rem; font-weight: bold;">Total: $${purchaseDetail.total_amount.toFixed(2)}</p>
        </div>
    `;
    
    document.getElementById('purchase-detail-modal').classList.remove('hidden');
}

// CERRAR MODAL DE DETALLE
function closePurchaseDetailModal() {
    document.getElementById('purchase-detail-modal').classList.add('hidden');
}

// ========== CREAR NUEVO PRODUCTO ==========

// ABRIR MODAL PARA CREAR PRODUCTO
function openCreateProductModal() {
    const productName = createNewProductBtn.dataset.productName || productSearchPurchase.value;
    document.getElementById('modal-product-name').value = productName;
    document.getElementById('modal-product-price').value = '';
    document.getElementById('modal-product-cost').value = '';
    document.getElementById('modal-product-stock').value = '0';
    document.getElementById('create-product-modal').classList.remove('hidden');
    document.getElementById('modal-product-name').focus();
}

// CERRAR MODAL DE CREAR PRODUCTO
function closeCreateProductModal() {
    document.getElementById('create-product-modal').classList.add('hidden');
}

// GUARDAR NUEVO PRODUCTO
async function saveNewProduct() {
    const name = document.getElementById('modal-product-name').value.trim();
    const price = parseFloat(document.getElementById('modal-product-price').value) || 0;
    const costPrice = parseFloat(document.getElementById('modal-product-cost').value) || 0;
    const stock = parseInt(document.getElementById('modal-product-stock').value) || 0;

    if (!name) {
        showError('El nombre del producto es obligatorio');
        return;
    }

    if (price <= 0) {
        showError('El precio de venta debe ser mayor a 0');
        return;
    }

    if (costPrice <= 0) {
        showError('El precio de costo debe ser mayor a 0');
        return;
    }

    const productData = {
        name: name,
        price: price,
        cost_price: costPrice,
        stock: stock
    };

    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(productData)
        });

        const newProduct = await response.json();

        if (!response.ok) {
            showError(newProduct.detail || 'Error al crear el producto');
            return;
        }

        // Agregar el nuevo producto a la lista
        allProducts.push(newProduct);

        // Cerrar modal
        closeCreateProductModal();

        // Seleccionar automáticamente el nuevo producto
        selectProductForPurchase(newProduct);

        // Mostrar mensaje de éxito
        showSuccess(`✓ Producto "${newProduct.name}" creado correctamente`);

    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión al crear el producto');
    } finally {
        showLoader(false);
    }
}

// FILTRAR COMPRAS
function filterPurchasesHistory() {
    const supplierFilter = document.getElementById('purchases-filter-supplier').value.toLowerCase();
    
    const filtered = allPurchasesHistory.filter(purchase => {
        return purchase.supplier_name.toLowerCase().includes(supplierFilter);
    });
    
    renderPurchasesHistory(filtered);
}

// LIMPIAR FILTROS
function clearPurchasesFilters() {
    document.getElementById('purchases-filter-supplier').value = '';
    renderPurchasesHistory(allPurchasesHistory);
}

// ========== MODALES ==========

// MOSTRAR MODAL DE ÉXITO
function showSuccess(message) {
    document.getElementById('success-message').textContent = message;
    successModal.classList.remove('hidden');
}

// CERRAR MODAL DE ÉXITO
function closeModal() {
    successModal.classList.add('hidden');
}

// MOSTRAR MODAL DE ERROR
function showError(message) {
    document.getElementById('error-message').textContent = message;
    errorModal.classList.remove('hidden');
}

// CERRAR MODAL DE ERROR
function closeErrorModal() {
    errorModal.classList.add('hidden');
}

// MOSTRAR/OCULTAR LOADER
function showLoader(show) {
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

// Inicializar
updateCompletePurchaseButton();
