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
const purchasePaymentMethod = document.getElementById('purchase-payment-method');
const purchaseInitialPayment = document.getElementById('purchase-initial-payment');
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
        usernameDisplay.textContent = username;
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

    // Stepper +/- de cantidad
    document.getElementById('qty-purchase-decrease')?.addEventListener('click', () => {
        const current = parseInt(productQuantityPurchase.value) || 1;
        productQuantityPurchase.value = Math.max(1, current - 1);
    });
    document.getElementById('qty-purchase-increase')?.addEventListener('click', () => {
        const current = parseInt(productQuantityPurchase.value) || 1;
        productQuantityPurchase.value = current + 1;
    });

    // Cerrar modales
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('close-error-btn')?.addEventListener('click', closeErrorModal);
    document.getElementById('confirm-cancel-btn')?.addEventListener('click', closeConfirmModal);
    document.getElementById('confirm-accept-btn')?.addEventListener('click', () => {
        const callback = confirmActionCallback;
        closeConfirmModal();
        if (callback) callback();
    });

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
            '<p class="empty-message" style="color: var(--danger);">Error al cargar el historial de compras</p>';
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
        supplierSearchResults.innerHTML = '<div class="search-result-item" style="pointer-events: none; cursor: default; color: var(--text-3);">No se encontraron proveedores</div>';
        return;
    }

    filtered.slice(0, 5).forEach(supplier => {
        const div = document.createElement('div');
        div.className = 'search-result-item';

        div.innerHTML = `${supplier.name} <span style="font-size: 0.85rem; color: var(--text-3);">${supplier.email || 'Sin email'}</span>`;
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
        searchResultsPurchase.innerHTML = '<div class="search-result-item" style="pointer-events: none; color: var(--text-3);">No se encontraron productos</div>';
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
                <span style="font-size: 0.85rem; color: var(--text-3);">Stock: ${product.stock} | $${product.price.toFixed(2)}</span>
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
                    ×${item.quantity} · $${item.unit_cost.toFixed(2)} c/u
                </div>
            </div>
            <div class="cart-item-total">$${item.subtotal.toFixed(2)}</div>
            <button class="cart-item-remove" onclick="removeFromPurchaseCart(${index})" aria-label="Quitar producto">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
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

    showConfirm('¿Estás seguro de que deseas limpiar la compra?', () => {
        purchaseItems = [];
        renderPurchaseCart();
        updateCompletePurchaseButton();
    }, 'Limpiar');
}

// ACTUALIZAR BOTÓN COMPLETAR
function updateCompletePurchaseButton() {
    completePurchaseBtn.disabled = !selectedSupplierId || purchaseItems.length === 0;
}

// ========== COMPLETAR COMPRA ==========

function completePurchase() {
    if (!selectedSupplierId) {
        showError('Debes seleccionar un proveedor');
        return;
    }

    if (purchaseItems.length === 0) {
        showError('La compra está vacía');
        return;
    }

    const totalAmount = parseFloat(totalPricePurchaseSpan.textContent.replace('$', ''));
    const initialPaymentAmount = parseFloat(purchaseInitialPayment.value) || 0;

    if (initialPaymentAmount > totalAmount) {
        showError('El pago inicial no puede exceder el total');
        return;
    }

    const total = totalPricePurchaseSpan.textContent;
    showConfirm(
        `¿Confirmás la compra a ${selectedSupplier.name} por un total de ${total}?`,
        submitPurchase,
        'Confirmar compra',
        'success'
    );
}

// ENVIAR LA COMPRA AL SERVIDOR (tras la confirmación del usuario)
async function submitPurchase() {
    const initialPaymentAmount = parseFloat(purchaseInitialPayment.value) || 0;

    const purchaseData = {
        supplier_id: selectedSupplierId,
        items: purchaseItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_cost: item.unit_cost
        })),
        initial_payment: initialPaymentAmount
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

        // Si hay pago inicial, registrarlo
        if (initialPaymentAmount > 0) {
            await registerSupplierPayment(data.id, initialPaymentAmount);
        }

        // Éxito
        const debt = Math.max(0, data.total_amount - initialPaymentAmount);
        const debtMsg = debt > 0 ? ` | Deuda con el proveedor: $${debt.toFixed(2)}` : ' | Pagada por completo';
        showSuccess(`Compra completada. ID: ${data.id} | Total: $${data.total_amount.toFixed(2)}${debtMsg}`);
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

// REGISTRAR PAGO A PROVEEDOR
async function registerSupplierPayment(purchaseId, amount) {
    try {
        const paymentData = {
            purchase_id: purchaseId,
            amount: parseFloat(amount),
            payment_method: purchasePaymentMethod?.value || 'efectivo'
        };

        const response = await fetchWithAuth(`${API_BASE}/supplier-payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.warn('⚠️ Error al registrar pago a proveedor:', errorData.detail || 'Error desconocido');
            return false;
        }

        return true;
    } catch (error) {
        console.warn('⚠️ Aviso: Error registrando pago a proveedor:', error);
        return false;
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
    purchaseInitialPayment.value = '0';
    purchasePaymentMethod.value = 'efectivo';
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
                <td>#${String(purchase.id).padStart(6, '0')}</td>
                <td style="color: var(--text-1); font-weight: 500;">${purchase.supplier_name}</td>
                <td style="font-size: 0.9rem;">${formattedDate} ${formattedTime}</td>
                <td style="font-size: 0.9rem; text-align: center;">${purchase.items_count} producto${purchase.items_count !== 1 ? 's' : ''}</td>
                <td style="text-align: right; font-weight: 600; color: var(--text-1); font-family: var(--mono);">$${purchase.total_amount.toFixed(2)}</td>
                <td style="text-align: center;">
                    <button class="btn btn-view" onclick="viewPurchaseDetail(${purchase.id})">Ver</button>
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
        <div style="background: var(--navy-3); border: 1px solid var(--border); padding: 1rem 1.25rem; border-radius: var(--radius); margin-bottom: 1rem;">
            <p style="margin: 0.5rem 0; color: var(--text-1);"><strong>Proveedor:</strong> ${purchaseDetail.supplier_name}</p>
            ${purchaseDetail.supplier_email ? `<p style="margin: 0.5rem 0; color: var(--text-1);"><strong>Email:</strong> ${purchaseDetail.supplier_email}</p>` : ''}
            ${purchaseDetail.supplier_phone ? `<p style="margin: 0.5rem 0; color: var(--text-1);"><strong>Teléfono:</strong> ${purchaseDetail.supplier_phone}</p>` : ''}
            <p style="margin: 0.5rem 0; color: var(--text-1);"><strong>Fecha:</strong> ${formattedDate} ${formattedTime}</p>
            <p style="margin: 0.5rem 0; color: var(--text-1);"><strong>ID Compra:</strong> ${purchaseDetail.id}</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin: 1rem 0;">
            <thead>
                <tr style="background: var(--navy-3); border-bottom: 1px solid var(--border-2);">
                    <th style="text-align: left; padding: 0.75rem; font-weight: 600; color: var(--text-2);">Producto</th>
                    <th style="text-align: center; padding: 0.75rem; font-weight: 600; color: var(--text-2);">Cantidad</th>
                    <th style="text-align: right; padding: 0.75rem; font-weight: 600; color: var(--text-2);">Costo Unit.</th>
                    <th style="text-align: right; padding: 0.75rem; font-weight: 600; color: var(--text-2);">Subtotal</th>
                </tr>
            </thead>
            <tbody style="color: var(--text-1);">
                ${itemsHTML}
            </tbody>
        </table>

        <div style="padding: 1rem 1.25rem; background: var(--navy-3); border: 1px solid var(--border); border-radius: var(--radius);">
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; font-size: 1.2rem; font-weight: bold; color: var(--text-1);">
                <span>Total:</span>
                <span>$${purchaseDetail.total_amount.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; color: var(--text-1);">
                <span>Pagado:</span>
                <span>$${(purchaseDetail.paid_amount || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; color: var(--text-1);">
                <span>Deuda:</span>
                <span>$${(purchaseDetail.debt_amount || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; color: var(--text-1);">
                <span>Estado:</span>
                <span style="font-weight: bold; color: ${purchaseDetail.status === 'pagado' ? '#059669' : purchaseDetail.status === 'parcial' ? '#d97706' : '#dc2626'};">
                    ${(purchaseDetail.status || 'PENDIENTE').toUpperCase()}
                </span>
            </div>
        </div>
    `;
    
    document.getElementById('purchase-detail-modal').classList.remove('hidden');

    // Guardar detalle para usar en impresión y PDF
    window.currentPurchaseDetail = purchaseDetail;
}

// CERRAR MODAL DE DETALLE
function closePurchaseDetailModal() {
    document.getElementById('purchase-detail-modal').classList.add('hidden');
}

// IMPRIMIR DETALLE DE COMPRA
function printPurchase() {
    const detailContent = document.getElementById('purchase-detail-content').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Detalle de Compra - castZONE</title>
            <style>
                body {
                    font-family: 'Courier New', monospace;
                    padding: 20px;
                    max-width: 600px;
                    margin: 0 auto;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                }
                th, td {
                    padding: 0.5rem;
                }
                tr {
                    border-bottom: 1px solid #eee;
                }
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            ${detailContent}
        </body>
        </html>
    `);

    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// DESCARGAR DETALLE DE COMPRA COMO PDF
function downloadPurchasePDF() {
    if (!window.currentPurchaseDetail) {
        showError('No hay datos de la compra para generar el PDF');
        return;
    }

    const detailContent = document.getElementById('purchase-detail-content');
    const purchaseDetail = window.currentPurchaseDetail;
    const filename = `Compra_${String(purchaseDetail.id).padStart(6, '0')}_${new Date().toISOString().split('T')[0]}.pdf`;

    const options = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(options).from(detailContent).save();
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
        showSuccess(`Producto "${newProduct.name}" creado correctamente`);

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
