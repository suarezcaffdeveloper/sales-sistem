const API_BASE = '/api';
let allProducts = [];
let allCustomers = [];
let cartItems = [];
let selectedCustomer = null;
let selectedCustomerId = null;
let currentDailyBox = null;  // Estado actual de la caja
let paymentMethodDiscounts = {};  // { efectivo: 5, transferencia: 0, ... } — solo métodos con descuento activo

// DOM Elements - Se inicializarán en DOMContentLoaded
let customerSearch;
let customerSearchResults;
let selectedCustomerDiv;
let selectedCustomerName;
let productSearch;
let productQuantity;
let addProductBtn;
let clearCartBtn;
let completeSaleBtn;
let searchResults;
let cartItemsContainer;
let subtotalSpan;
let itemCountSpan;
let totalPriceSpan;
let successModal;
let errorModal;
let loader;
let paymentMethod;
let initialPayment;
let saleDueDate;
let discountType;
let discountValue;
let discountRow;
let discountLabel;
let discountDisplay;
let discountHint;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // === INICIALIZAR ELEMENTOS DEL DOM ===
    customerSearch = document.getElementById('customer-search');
    customerSearchResults = document.getElementById('customer-search-results');
    selectedCustomerDiv = document.getElementById('selected-customer');
    selectedCustomerName = document.getElementById('selected-customer-name');
    productSearch = document.getElementById('product-search');
    productQuantity = document.getElementById('product-quantity');
    addProductBtn = document.getElementById('add-product-btn');
    clearCartBtn = document.getElementById('clear-cart-btn');
    completeSaleBtn = document.getElementById('complete-sale-btn');
    searchResults = document.getElementById('search-results');
    cartItemsContainer = document.getElementById('cart-items');
    subtotalSpan = document.getElementById('subtotal');
    itemCountSpan = document.getElementById('item-count');
    totalPriceSpan = document.getElementById('total-price');
    successModal = document.getElementById('success-modal');
    errorModal = document.getElementById('error-modal');
    loader = document.getElementById('loader');
    paymentMethod = document.getElementById('payment-method');
    initialPayment = document.getElementById('initial-payment');
    saleDueDate = document.getElementById('sale-due-date');
    discountType = document.getElementById('discount-type');
    discountValue = document.getElementById('discount-value');
    discountRow = document.getElementById('discount-row');
    discountLabel = document.getElementById('discount-label');
    discountDisplay = document.getElementById('discount-display');
    discountHint = document.getElementById('discount-hint');
    setupDiscountHint();

    console.log('✅ DOM Elements initialized successfully');
    console.log('   completeSaleBtn:', completeSaleBtn);
    
    // === CARGAR DATOS Y CONFIGURAR ===
    displayUsername();
    loadCustomers();
    loadProducts();
    loadPaymentMethodDiscounts();
    setupEventListeners();
    checkDailyBoxStatus();  // Verificar estado de caja
    setupBoxRefresh();      // Configurar refrescado automático de caja cada 5 segundos
    
    // Inicializar valores después del setup de event listeners
    updateCompleteButton();
    loadSalesHistory();
    setupSalesHistoryFilters();
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
    customerSearch.addEventListener('input', handleCustomerSearch);
    productSearch.addEventListener('input', handleProductSearch);
    addProductBtn.addEventListener('click', addProductToCart);
    clearCartBtn.addEventListener('click', clearCart);
    completeSaleBtn.addEventListener('click', completeSale);

    // Descuento
    discountType.addEventListener('change', () => {
        discountValue.disabled = discountType.value === 'none';
        if (discountType.value === 'none') {
            discountValue.value = '';
        }
        updateTotals();
    });
    discountValue.addEventListener('input', updateTotals);
    paymentMethod.addEventListener('change', updateTotals);

    // Tecla Enter en cantidad
    productQuantity.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProductToCart();
    });

    // Stepper +/- de cantidad
    document.getElementById('qty-decrease')?.addEventListener('click', () => {
        const current = parseInt(productQuantity.value) || 1;
        productQuantity.value = Math.max(1, current - 1);
    });
    document.getElementById('qty-increase')?.addEventListener('click', () => {
        const current = parseInt(productQuantity.value) || 1;
        productQuantity.value = current + 1;
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

    // Modal de anular venta
    document.getElementById('cancel-sale-close-btn')?.addEventListener('click', closeCancelSaleModal);
    document.getElementById('cancel-sale-confirm-btn')?.addEventListener('click', submitCancelSale);

    // Modal de devolución parcial
    document.getElementById('return-cancel-btn')?.addEventListener('click', closeReturnModal);
    document.getElementById('return-confirm-btn')?.addEventListener('click', submitReturn);
}

// CARGAR CLIENTES
async function loadCustomers() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/customers`);
        allCustomers = await response.json();
    } catch (error) {
        console.error('Error cargando clientes:', error);
        showError('Error al cargar los clientes');
    }
}

// BUSCAR CLIENTES
function handleCustomerSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    customerSearchResults.innerHTML = '';

    if (searchTerm.length === 0) {
        customerSearchResults.innerHTML = '';
        return;
    }

    const filtered = allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm)
    );

    if (filtered.length === 0) {
        customerSearchResults.innerHTML = '<div class="search-result-item" style="pointer-events: none; cursor: default; color: #999;">No se encontraron clientes</div>';
        return;
    }

    filtered.slice(0, 5).forEach(customer => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        
        const highlightName = customer.name.replace(
            new RegExp(`(${searchTerm})`, 'gi'),
            '<strong>$1</strong>'
        );
        
        div.innerHTML = `
            <div>
                <div class="search-result-name">${highlightName}</div>
                <div class="search-result-stock">${customer.email}</div>
            </div>
        `;
        div.addEventListener('click', () => selectCustomer(customer));
        customerSearchResults.appendChild(div);
    });
}

// SELECCIONAR CLIENTE
function selectCustomer(customer) {
    console.log('🔍 selectCustomer() called with:', customer);
    selectedCustomerId = customer.id;
    selectedCustomer = customer.name;
    customerSearch.value = customer.name;
    customerSearchResults.innerHTML = '';
    
    // Mostrar cliente seleccionado
    selectedCustomerDiv.style.display = 'block';
    selectedCustomerName.textContent = `${customer.name} (${customer.email})`;
    
    console.log('✅ Cliente seleccionado - ID:', selectedCustomerId);
    updateCompleteButton();
}

// CARGAR DESCUENTOS AUTOMÁTICOS POR MÉTODO DE PAGO (configurados por el admin)
async function loadPaymentMethodDiscounts() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/payment-method-discounts`);
        if (!response.ok) return;
        const data = await response.json();
        paymentMethodDiscounts = {};
        (data || []).forEach(d => {
            if (d.active && d.discount_percent > 0) {
                paymentMethodDiscounts[d.payment_method] = d.discount_percent;
            }
        });
        updateTotals();
    } catch (error) {
        console.error('Error cargando descuentos por método de pago:', error);
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

// BUSCAR PRODUCTOS
function handleProductSearch(e) {
    const searchTerm = e.target.value.toLowerCase().trim();
    searchResults.innerHTML = '';

    if (searchTerm.length === 0) {
        return;
    }

    // Filtrar productos que coincidan con la búsqueda
    const filtered = allProducts.filter(product =>
        product.name.toLowerCase().includes(searchTerm) && product.stock > 0
    );

    if (filtered.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item" style="pointer-events: none; cursor: default; color: #999;">No se encontraron productos</div>';
        return;
    }

    // Mostrar máximo 8 resultados
    filtered.slice(0, 8).forEach(product => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        
        // Resaltar el texto que coincide con la búsqueda
        const highlightName = product.name.replace(
            new RegExp(`(${searchTerm})`, 'gi'),
            '<strong>$1</strong>'
        );
        
        div.innerHTML = `
            <div>
                <div class="search-result-name">${highlightName}</div>
                <div class="search-result-stock">Stock disponible: ${product.stock}</div>
            </div>
            <div class="search-result-price">$${product.price.toFixed(2)}</div>
        `;
        div.addEventListener('click', () => selectProduct(product));
        searchResults.appendChild(div);
    });
}

// SELECCIONAR PRODUCTO
function selectProduct(product) {
    productSearch.value = product.name;
    productSearch.dataset.productId = product.id;
    productSearch.dataset.productName = product.name;
    productSearch.dataset.productPrice = product.price;
    productSearch.dataset.productStock = product.stock;
    searchResults.innerHTML = '';
    productQuantity.focus();
}

// AGREGAR PRODUCTO AL CARRITO
function addProductToCart() {
    console.log('🛒 addProductToCart() called');
    console.log('   productSearch.dataset:', productSearch.dataset);
    
    if (!productSearch.dataset.productId) {
        showError('Selecciona un producto válido');
        return;
    }

    const productId = parseInt(productSearch.dataset.productId);
    const quantity = parseInt(productQuantity.value);

    if (quantity <= 0) {
        showError('La cantidad debe ser mayor a 0');
        return;
    }

    if (quantity > parseInt(productSearch.dataset.productStock)) {
        showError('Cantidad insuficiente en stock');
        return;
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = cartItems.find(item => item.product_id === productId);

    if (existingItem) {
        if (existingItem.quantity + quantity > parseInt(productSearch.dataset.productStock)) {
            showError('Cantidad total excede el stock disponible');
            return;
        }
        existingItem.quantity += quantity;
    } else {
        cartItems.push({
            product_id: productId,
            product_name: productSearch.dataset.productName,
            product_price: parseFloat(productSearch.dataset.productPrice),
            quantity: quantity
        });
    }

    // Limpiar formulario
    productSearch.value = '';
    productSearch.dataset.productId = '';
    productQuantity.value = '1';
    searchResults.innerHTML = '';

    console.log('✅ Producto agregado - carrito ahora tiene:', cartItems);
    renderCart();
    updateCompleteButton();
}

// RENDERIZAR CARRITO
function renderCart() {
    cartItemsContainer.innerHTML = '';

    if (cartItems.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-message">No hay productos agregados</p>';
        updateTotals();
        return;
    }

    cartItems.forEach((item, index) => {
        const itemTotal = item.product_price * item.quantity;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-name">${item.product_name}</div>
                <div class="cart-item-details">
                    ×${item.quantity} · $${item.product_price.toFixed(2)} c/u
                </div>
            </div>
            <div class="cart-item-total">$${itemTotal.toFixed(2)}</div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})" aria-label="Quitar producto">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
        `;
        cartItemsContainer.appendChild(div);
    });

    updateTotals();
}

// REMOVER DEL CARRITO
function removeFromCart(index) {
    cartItems.splice(index, 1);
    renderCart();
    updateCompleteButton();
}

// TOPE DE DESCUENTO PARA CAJERO (debe coincidir con CAJERO_MAX_DISCOUNT_PERCENT en el backend)
const CAJERO_MAX_DISCOUNT_PERCENT = 15.0;

function setupDiscountHint() {
    if (!discountHint) return;
    const isCajero = localStorage.getItem('user_role') === 'cajero';
    discountHint.textContent = isCajero
        ? `Como cajero podés aplicar hasta ${CAJERO_MAX_DISCOUNT_PERCENT}% de descuento`
        : '';
}

// Descuento automático activo para el método de pago seleccionado (0 si no hay ninguno)
function getActivePaymentMethodDiscountPercent() {
    const method = paymentMethod ? paymentMethod.value : null;
    if (!method) return 0;
    return paymentMethodDiscounts[method] || 0;
}

// Calcula el monto de descuento a partir del tipo/valor cargados y el subtotal.
// El descuento manual (si se cargó uno) siempre tiene prioridad sobre el
// automático por método de pago — igual que hace el backend.
function getDiscountAmount(subtotal) {
    if (subtotal <= 0) return 0;

    const type = discountType ? discountType.value : 'none';
    const value = parseFloat(discountValue ? discountValue.value : 0) || 0;

    if (type !== 'none' && value > 0) {
        if (type === 'percent') {
            return subtotal * Math.min(value, 100) / 100;
        }
        // Monto fijo, nunca más que el subtotal
        return Math.min(value, subtotal);
    }

    const autoPercent = getActivePaymentMethodDiscountPercent();
    if (autoPercent > 0) {
        return subtotal * autoPercent / 100;
    }

    return 0;
}

// ACTUALIZAR TOTALES
function updateTotals() {
    let subtotal = 0;
    let itemCount = 0;

    cartItems.forEach(item => {
        subtotal += item.product_price * item.quantity;
        itemCount += item.quantity;
    });

    const discountAmount = getDiscountAmount(subtotal);
    const total = subtotal - discountAmount;

    subtotalSpan.textContent = `$${subtotal.toFixed(2)}`;
    itemCountSpan.textContent = itemCount;
    totalPriceSpan.textContent = `$${total.toFixed(2)}`;

    if (discountRow) {
        if (discountAmount > 0) {
            discountRow.style.display = 'flex';
            const type = discountType ? discountType.value : 'none';
            if (type === 'percent') {
                discountLabel.textContent = `Descuento (${discountValue.value}%)`;
            } else if (type === 'fixed') {
                discountLabel.textContent = 'Descuento';
            } else {
                discountLabel.textContent = `Descuento por método de pago (${getActivePaymentMethodDiscountPercent()}%)`;
            }
            discountDisplay.textContent = `-$${discountAmount.toFixed(2)}`;
        } else {
            discountRow.style.display = 'none';
        }
    }
}

// LIMPIAR CARRITO
function clearCart() {
    if (cartItems.length === 0) {
        return;
    }

    showConfirm('¿Estás seguro de que deseas limpiar el carrito?', () => {
        cartItems = [];
        renderCart();
        updateCompleteButton();
    }, 'Limpiar');
}

// COMPLETAR VENTA
async function completeSale() {
    if (!selectedCustomerId) {
        showError('Debes seleccionar un cliente');
        return;
    }

    if (cartItems.length === 0) {
        showError('El carrito está vacío');
        return;
    }

    // Validar pago inicial
    const initialPaymentAmount = parseFloat(initialPayment.value) || 0;
    const totalAmount = parseFloat(totalPriceSpan.textContent.replace('$', ''));
    
    if (initialPaymentAmount > totalAmount) {
        showError('El pago inicial no puede exceder el total');
        return;
    }

    const saleData = {
        customer_id: selectedCustomerId,
        items: cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        })),
        initial_payment: initialPaymentAmount,
        payment_method: paymentMethod ? paymentMethod.value : 'efectivo'
    };

    if (saleDueDate && saleDueDate.value) {
        saleData.due_date = saleDueDate.value;
    }

    const discAmount = parseFloat(discountValue ? discountValue.value : 0) || 0;
    if (discountType && discountType.value === 'percent' && discAmount > 0) {
        saleData.discount_percent = discAmount;
    } else if (discountType && discountType.value === 'fixed' && discAmount > 0) {
        saleData.discount_amount = discAmount;
    }

    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/sales`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(saleData)
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.detail || 'Error al procesar la venta');
            return;
        }

        // Si hay pago inicial, registrarlo PRIMERO para que el ticket refleje el estado correcto
        const saleId = data.id;
        if (initialPaymentAmount > 0) {
            await registerPayment(saleId, initialPaymentAmount);
        }

        // Obtener detalles completos de la venta para el ticket (ya con el pago reflejado)
        await fetchAndShowTicket(saleId);

        resetSaleForm();
        loadProducts(); // Recargar productos para actualizar stock
        loadSalesHistory(); // Actualizar la tabla de ventas sin recargar la página

    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión al procesar la venta');
    } finally {
        showLoader(false);
    }
}

// REGISTRAR PAGO
async function registerPayment(saleId, amount) {
    try {
        console.log(`💳 Registrando pago: Venta ${saleId}, Monto ${amount}`);
        
        const paymentData = {
            sale_id: saleId,
            amount: parseFloat(amount),
            payment_method: paymentMethod?.value || "efectivo"
        };

        console.log('📤 Datos del pago:', paymentData);

        const response = await fetchWithAuth(`${API_BASE}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.warn('⚠️ Error al registrar pago:', errorData.detail || 'Error desconocido');
            return false;
        }

        console.log('✅ Pago registrado correctamente');
        return true;
    } catch (error) {
        console.warn('⚠️ Aviso: Error registrando pago:', error);
        return false;
    }
}

// OBTENER DETALLES DE LA VENTA Y MOSTRAR TICKET
async function fetchAndShowTicket(saleId) {
    try {
        console.log(`📥 Obteniendo detalles de venta ${saleId}...`);
        
        const response = await fetchWithAuth(`${API_BASE}/sales/${saleId}`);
        
        if (!response.ok) {
            console.error('❌ Error HTTP:', response.status, response.statusText);
            const errorData = await response.json();
            showError('Error al obtener detalles de la venta: ' + (errorData.detail || response.statusText));
            return;
        }
        
        const saleDetails = await response.json();
        console.log('✅ Detalles recibidos:', saleDetails);
        
        if (!saleDetails) {
            showError('No se recibieron detalles de la venta');
            return;
        }
        
        showTicketModal(saleDetails);
    } catch (error) {
        console.error('❌ Error obteniendo ticket:', error);
        showError('Error al obtener los detalles de la venta: ' + error.message);
    }
}

// MOSTRAR MODAL CON TICKET
function showTicketModal(saleDetails) {
    const ticketHTML = generateTicketHTML(saleDetails);
    document.getElementById('ticket-content').innerHTML = ticketHTML;
    document.getElementById('ticket-modal').classList.remove('hidden');

    // Guardar detalles para usar en impresión, PDF y devoluciones
    window.currentSaleDetails = saleDetails;

    const hasReturnableItems = (saleDetails.items || []).some(item => (item.remaining_quantity || 0) > 0);
    const returnBtn = document.getElementById('open-return-modal-btn');
    if (returnBtn) {
        returnBtn.style.display = (!saleDetails.cancelled && hasReturnableItems) ? '' : 'none';
    }
}

// CERRAR MODAL DE TICKET
function closeTicketModal() {
    document.getElementById('ticket-modal').classList.add('hidden');
}

// CONTINUAR DESPUÉS DE COMPLETAR LA VENTA (cierra el ticket y deja todo listo para la siguiente venta)
function continueAfterSale() {
    closeTicketModal();
    customerSearch.focus();
}

// GENERAR HTML DEL TICKET
function generateTicketHTML(saleDetails) {
    console.log('🎫 Generando ticket para venta:', saleDetails);
    
    // Validar que saleDetails es válido
    if (!saleDetails) {
        console.error('❌ saleDetails es undefined');
        return '<p style="color: red;">Error: No se encontraron detalles de la venta</p>';
    }
    
    const date = new Date(saleDetails.created_at);
    const formattedDate = date.toLocaleDateString('es-ES');
    const formattedTime = date.toLocaleTimeString('es-ES');
    
    let itemsHTML = '';
    
    // Validar que items existe y es un array
    if (saleDetails.items && Array.isArray(saleDetails.items) && saleDetails.items.length > 0) {
        saleDetails.items.forEach(item => {
            console.log('  Item:', item);
            const returnedNote = (item.returned_quantity || 0) > 0
                ? `<br><span style="font-size: 0.75rem; color: #dc2626;">${item.returned_quantity} devuelta${item.returned_quantity !== 1 ? 's' : ''}</span>`
                : '';
            itemsHTML += `
                <tr>
                    <td>${item.product_name || 'Producto desconocido'}${returnedNote}</td>
                    <td style="text-align: center;">x${item.quantity || 0}</td>
                    <td style="text-align: right;">$${(item.price || 0).toFixed(2)}</td>
                    <td style="text-align: right;">$${(item.subtotal || 0).toFixed(2)}</td>
                </tr>
            `;
        });
    } else {
        console.warn('⚠️ No hay items en saleDetails');
        itemsHTML = '<tr><td colspan="4" style="text-align: center; color: #999;">Sin detalles de productos</td></tr>';
    }
    
    const cancelledBanner = saleDetails.cancelled ? `
        <div style="text-align: center; margin-bottom: 1rem; padding: 0.6rem; background: rgba(220,38,38,0.12); border: 1px solid #dc2626; border-radius: 4px;">
            <p style="margin: 0; color: #dc2626; font-weight: 700; letter-spacing: 0.05em;">VENTA ANULADA</p>
            ${saleDetails.cancel_reason ? `<p style="margin: 0.25rem 0 0; font-size: 0.8rem; color: #dc2626;">Motivo: ${saleDetails.cancel_reason}</p>` : ''}
        </div>
    ` : '';

    const returnsBanner = (!saleDetails.cancelled && saleDetails.has_returns) ? `
        <div style="text-align: center; margin-bottom: 1rem; padding: 0.6rem; background: rgba(217,119,6,0.12); border: 1px solid #d97706; border-radius: 4px;">
            <p style="margin: 0; color: #d97706; font-weight: 700; letter-spacing: 0.05em;">DEVOLUCIÓN PARCIAL REGISTRADA</p>
        </div>
    ` : '';

    return `
        ${cancelledBanner}
        ${returnsBanner}
        <div style="text-align: center; padding-bottom: 1rem; border-bottom: 2px dashed #333;">
            <h2 style="margin: 0 0 0.5rem 0; font-size: 1.8rem;">CASTZONE</h2>
            <p style="margin: 0.25rem 0;">Tienda de productos</p>
            <p style="margin: 0.25rem 0; font-size: 0.85rem; color: #666;">─────────────────────</p>
        </div>
        
        <div style="margin: 1rem 0; padding: 0.5rem; background: #f5f5f5; border-radius: 4px;">
            <p style="margin: 0.25rem 0;"><strong>Fecha:</strong> ${formattedDate}</p>
            <p style="margin: 0.25rem 0;"><strong>Hora:</strong> ${formattedTime}</p>
            <p style="margin: 0.25rem 0;"><strong>Comprobante #:</strong> ${String(saleDetails.id).padStart(6, '0')}</p>
        </div>
        
        <div style="margin: 1rem 0; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px;">
            <p style="margin: 0.25rem 0;"><strong>Clientes:</strong> ${saleDetails.customer_name}</p>
            ${saleDetails.customer_email ? `<p style="margin: 0.25rem 0;"><strong>Email:</strong> ${saleDetails.customer_email}</p>` : ''}
            ${saleDetails.customer_phone ? `<p style="margin: 0.25rem 0;"><strong>Teléfono:</strong> ${saleDetails.customer_phone}</p>` : ''}
        </div>
        
        <div style="margin: 1.5rem 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 2px solid #333;">
                        <th style="text-align: left; padding-bottom: 0.5rem;">Producto</th>
                        <th style="text-align: center; padding-bottom: 0.5rem;">Cantidad</th>
                        <th style="text-align: right; padding-bottom: 0.5rem;">Precio</th>
                        <th style="text-align: right; padding-bottom: 0.5rem;">Subtotal</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>
        
        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px dashed #333;">
            ${(saleDetails.discount_amount || 0) > 0 ? `
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.95rem; color: #666;">
                <span>Subtotal:</span>
                <span>$${(saleDetails.subtotal_amount || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.25rem 0; font-size: 0.95rem; color: #059669;">
                <span>Descuento${saleDetails.discount_percent ? ` (${saleDetails.discount_percent}%)` : ''}:</span>
                <span>-$${(saleDetails.discount_amount || 0).toFixed(2)}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 1.2rem; font-weight: bold;">
                <span>TOTAL:</span>
                <span>$${(saleDetails.total_amount || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 1rem;">
                <span>Pagado:</span>
                <span>$${(saleDetails.paid_amount || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 1rem;">
                <span>Deuda:</span>
                <span>$${(saleDetails.debt_amount || 0).toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; font-size: 1rem;">
                <span>Estado:</span>
                <span style="font-weight: bold; color: ${saleDetails.status === 'pagado' ? '#059669' : saleDetails.status === 'parcial' ? '#d97706' : '#dc2626'};">
                    ${(saleDetails.status || 'PENDIENTE').toUpperCase()}
                </span>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed #999; font-size: 0.85rem; color: #666;">
            <p style="margin: 0.25rem 0;">¡Gracias por su compra!</p>
            <p style="margin: 0.25rem 0;">Vuelva pronto - castZONE</p>
        </div>
    `;
}

// RESETEAR FORMULARIO
function resetSaleForm() {
    cartItems = [];
    customerSearch.value = '';
    selectedCustomerId = null;
    selectedCustomer = null;
    customerSearchResults.innerHTML = '';
    selectedCustomerDiv.style.display = 'none';
    productSearch.value = '';
    productQuantity.value = '1';
    initialPayment.value = '0';
    paymentMethod.value = 'efectivo';
    if (saleDueDate) saleDueDate.value = '';
    if (discountType) discountType.value = 'none';
    if (discountValue) {
        discountValue.value = '';
        discountValue.disabled = true;
    }
    renderCart();
    updateCompleteButton();
}

// ACTUALIZAR BOTÓN COMPLETAR
function updateCompleteButton() {
    console.log('🔘 updateCompleteButton() called');
    
    if (!completeSaleBtn) {
        console.error('❌ Complete sale button NOT FOUND in DOM!');
        console.log('   Trying to find it again...');
        const btn = document.getElementById('complete-sale-btn');
        if (btn) {
            console.log('   ✅ Found button via getElementById');
            // Reasignar la variable global
            window.completeSaleBtn = btn;
        } else {
            console.error('   ❌ Button still not found!');
            return;
        }
    }
    
    // Validar el estado actual
    const hasCustomer = Boolean(selectedCustomerId);
    const cartLength = cartItems ? cartItems.length : 0;
    const hasProducts = cartLength > 0;
    const shouldEnable = hasCustomer && hasProducts;
    
    console.log('   → selectedCustomerId:', selectedCustomerId, 'hasCustomer:', hasCustomer);
    console.log('   → cartItems.length:', cartLength, 'hasProducts:', hasProducts);
    console.log('   → shouldEnable:', shouldEnable);
    
    // Actualizar estado
    const currentDisabled = completeSaleBtn.disabled;
    completeSaleBtn.disabled = !shouldEnable;
    
    console.log('   → Button was disabled:', currentDisabled);
    console.log('   → Button now disabled:', completeSaleBtn.disabled);
    console.log('   → Button is NOW:', shouldEnable ? '✅ ENABLED' : '❌ DISABLED');
}

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

function showConfirm(message, onConfirm, acceptLabel = 'Confirmar') {
    document.getElementById('confirm-message').textContent = message;
    document.getElementById('confirm-accept-btn').textContent = acceptLabel;
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

// IMPRIMIR TICKET
function printTicket() {
    const ticketContent = document.getElementById('ticket-content').innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ticket de Venta - castZONE</title>
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
            ${ticketContent}
        </body>
        </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// DESCARGAR TICKET COMO PDF
async function downloadTicketPDF() {
    if (!window.currentSaleDetails) {
        showError('No hay datos de venta para generar el PDF');
        return;
    }
    
    const ticketContent = document.getElementById('ticket-content');
    const saleDetails = window.currentSaleDetails;
    const filename = `Ticket_${String(saleDetails.id).padStart(6, '0')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    const options = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };
    
    html2pdf().set(options).from(ticketContent).save();
}

// VENTAS PASADAS - VARIABLES GLOBALES
let allSalesHistory = [];

// CARGAR HISTORIAL DE VENTAS
async function loadSalesHistory() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/sales`);
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Validar que es un array
        if (Array.isArray(data)) {
            allSalesHistory = data;
        } else if (data && typeof data === 'object' && data.sales && Array.isArray(data.sales)) {
            allSalesHistory = data.sales;
        } else {
            // Si la respuesta no es un array válido, mostrar mensaje
            console.warn('Sales endpoint returned invalid format:', data);
            allSalesHistory = [];
        }
        
        renderSalesHistory(allSalesHistory);
    } catch (error) {
        console.error('Error cargando historial de ventas:', error);
        allSalesHistory = [];
        document.getElementById('sales-history-table').innerHTML = 
            '<p class="empty-message" style="color: #d32f2f;">Error al cargar el historial de ventas</p>';
    }
}

// RENDERIZAR TABLA DE VENTAS PASADAS
function renderSalesHistory(sales) {
    const container = document.getElementById('sales-history-table');
    
    if (!sales || !Array.isArray(sales) || sales.length === 0) {
        container.innerHTML = '<p class="empty-message">No hay ventas registradas</p>';
        return;
    }
    
    let tableHTML = `
        <div class="table-wrapper" style="max-height: 310px; overflow-y: auto;">
            <table>
                <thead>
                    <tr>
                        <th style="text-align: left;">ID Venta</th>
                        <th style="text-align: left;">Cliente</th>
                        <th style="text-align: left;">Fecha</th>
                        <th style="text-align: left;">Productos</th>
                        <th style="text-align: right;">Total</th>
                        <th style="text-align: center;">Acción</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sales.forEach(sale => {
        const date = new Date(sale.created_at);
        const formattedDate = date.toLocaleDateString('es-ES');
        const formattedTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const isCancelled = Boolean(sale.cancelled);
        const rowStyle = isCancelled ? ' style="opacity: 0.55;"' : '';

        const isAdmin = localStorage.getItem('user_role') !== 'cajero';
        const returnsBadge = (!isCancelled && sale.has_returns)
            ? `<span style="display: inline-block; margin-left: 0.5rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(217,119,6,0.15); color: #d97706; font-size: 0.75rem; font-weight: 700;">DEVOLUCIÓN</span>`
            : '';
        const actionButtons = isCancelled
            ? `<button class="btn btn-view" onclick="viewSaleTicket(${sale.id})">Ver</button>
               <span style="display: inline-block; margin-left: 0.5rem; padding: 0.2rem 0.5rem; border-radius: 4px; background: rgba(220,38,38,0.15); color: #dc2626; font-size: 0.75rem; font-weight: 700;">ANULADA</span>`
            : `<button class="btn btn-view" onclick="viewSaleTicket(${sale.id})">Ver</button>
               ${returnsBadge}
               ${isAdmin ? `<button class="btn-danger" onclick="openCancelSaleModal(${sale.id})" style="margin-left: 0.4rem;">Anular</button>` : ''}`;

        tableHTML += `
            <tr${rowStyle}>
                <td>#${String(sale.id).padStart(6, '0')}</td>
                <td style="color: var(--text-1); font-weight: 500; ${isCancelled ? 'text-decoration: line-through;' : ''}">${sale.customer_name}</td>
                <td style="font-size: 0.85rem;">${formattedDate} ${formattedTime}</td>
                <td style="font-size: 0.85rem; text-align: center;">${sale.item_count} producto${sale.item_count !== 1 ? 's' : ''}</td>
                <td style="text-align: right; font-weight: 600; color: var(--text-1); font-family: var(--mono); ${isCancelled ? 'text-decoration: line-through;' : ''}">$${(sale.total_amount || 0).toFixed(2)}</td>
                <td style="text-align: center; white-space: nowrap;">
                    ${actionButtons}
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

// VER TICKET DE UNA VENTA PASADA
async function viewSaleTicket(saleId) {
    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/sales/${saleId}`);
        const saleDetails = await response.json();
        
        if (!response.ok) {
            showError('Error al obtener detalles de la venta');
            return;
        }
        
        showTicketModal(saleDetails);
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar el ticket');
    } finally {
        showLoader(false);
    }
}

// ========== ANULAR VENTA ==========

let saleToCancelId = null;

// ABRIR MODAL DE ANULAR VENTA
function openCancelSaleModal(saleId) {
    saleToCancelId = saleId;
    document.getElementById('cancel-sale-reason').value = '';
    document.getElementById('cancel-sale-modal').classList.remove('hidden');
}

// CERRAR MODAL DE ANULAR VENTA
function closeCancelSaleModal() {
    document.getElementById('cancel-sale-modal').classList.add('hidden');
    saleToCancelId = null;
}

// CONFIRMAR ANULACIÓN DE VENTA
async function submitCancelSale() {
    if (!saleToCancelId) return;

    const reason = document.getElementById('cancel-sale-reason').value.trim();
    const saleId = saleToCancelId;

    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/sales/${saleId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason: reason || null })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.detail || 'Error al anular la venta');
            return;
        }

        closeCancelSaleModal();

        const refund = data.refund_due || 0;
        const refundMsg = refund > 0
            ? ` Recordá reembolsar $${refund.toFixed(2)} al cliente.`
            : '';
        showSuccess(`✓ Venta #${String(saleId).padStart(6, '0')} anulada. Se repuso el stock.${refundMsg}`);

        loadSalesHistory();
        loadProducts();
        checkDailyBoxStatus();
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión al anular la venta');
    } finally {
        showLoader(false);
    }
}

// ========== DEVOLUCIÓN PARCIAL ==========

// ABRIR MODAL DE DEVOLUCIÓN (usa la venta actualmente mostrada en el ticket)
function openReturnModal() {
    const saleDetails = window.currentSaleDetails;
    if (!saleDetails) {
        showError('No hay una venta cargada para devolver productos');
        return;
    }

    if (saleDetails.cancelled) {
        showError('No se puede devolver productos de una venta anulada');
        return;
    }

    const returnableItems = (saleDetails.items || []).filter(item => (item.remaining_quantity || 0) > 0);

    if (returnableItems.length === 0) {
        showError('No quedan productos disponibles para devolver en esta venta');
        return;
    }

    const listContainer = document.getElementById('return-items-list');
    listContainer.innerHTML = returnableItems.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border);">
            <div>
                <div style="font-weight: 600;">${item.product_name}</div>
                <div style="font-size: 0.8rem; color: var(--text-3);">Disponibles para devolver: ${item.remaining_quantity}</div>
            </div>
            <input type="number" class="return-qty-input" data-sale-item-id="${item.sale_item_id}" data-max="${item.remaining_quantity}"
                   min="0" max="${item.remaining_quantity}" value="0" step="1"
                   style="width: 80px; background: var(--navy-3); color: var(--text-1); border: 1px solid var(--border-2); border-radius: 6px; padding: 0.4rem 0.5rem; text-align: center;">
        </div>
    `).join('');

    document.getElementById('return-sale-id').textContent = String(saleDetails.id).padStart(6, '0');
    document.getElementById('return-reason').value = '';
    document.getElementById('return-modal').classList.remove('hidden');
}

function closeReturnModal() {
    document.getElementById('return-modal').classList.add('hidden');
}

// CONFIRMAR DEVOLUCIÓN
async function submitReturn() {
    const saleDetails = window.currentSaleDetails;
    if (!saleDetails) return;

    const inputs = document.querySelectorAll('.return-qty-input');
    const items = [];
    for (const input of inputs) {
        const quantity = parseInt(input.value) || 0;
        const max = parseInt(input.dataset.max) || 0;
        if (quantity < 0 || quantity > max) {
            showError('Revisá las cantidades: no pueden ser negativas ni superar lo disponible');
            return;
        }
        if (quantity > 0) {
            items.push({ sale_item_id: parseInt(input.dataset.saleItemId), quantity });
        }
    }

    if (items.length === 0) {
        showError('Ingresá al menos una cantidad a devolver');
        return;
    }

    const reason = document.getElementById('return-reason').value.trim();

    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/sales/${saleDetails.id}/returns`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, reason: reason || null })
        });

        const data = await response.json();

        if (!response.ok) {
            showError(data.detail || 'Error al registrar la devolución');
            return;
        }

        closeReturnModal();

        const refundMsg = data.refund_due > 0
            ? ` Recordá reembolsar $${data.refund_due.toFixed(2)} al cliente.`
            : '';
        showSuccess(`✓ Devolución registrada. Se repuso el stock.${refundMsg}`);

        // Refrescar ticket con los montos actualizados
        await fetchAndShowTicket(saleDetails.id);
        loadProducts();
        loadSalesHistory();
    } catch (error) {
        console.error('Error:', error);
        showError('Error de conexión al registrar la devolución');
    } finally {
        showLoader(false);
    }
}

// FILTRAR VENTAS
function filterSalesHistory() {
    const customerFilter = document.getElementById('sales-filter-customer').value.toLowerCase();
    const dateFilter = document.getElementById('sales-filter-date').value;
    
    const filtered = allSalesHistory.filter(sale => {
        // Filtro por nombre de cliente
        const customerMatch = sale.customer_name.toLowerCase().includes(customerFilter);
        
        // Filtro por fecha
        let dateMatch = true;
        if (dateFilter) {
            const saleDate = new Date(sale.created_at).toISOString().split('T')[0];
            dateMatch = saleDate === dateFilter;
        }
        
        return customerMatch && dateMatch;
    });
    
    renderSalesHistory(filtered);
}

// LIMPIAR FILTROS
function clearSalesFilters() {
    document.getElementById('sales-filter-customer').value = '';
    document.getElementById('sales-filter-date').value = '';
    renderSalesHistory(allSalesHistory);
}

// EVENT LISTENERS PARA FILTROS
function setupSalesHistoryFilters() {
    const customerInput = document.getElementById('sales-filter-customer');
    const dateInput = document.getElementById('sales-filter-date');
    
    if (customerInput) {
        customerInput.addEventListener('input', filterSalesHistory);
    }
    if (dateInput) {
        dateInput.addEventListener('change', filterSalesHistory);
    }
}

// ========== CAJA DIARIA ==========

// VERIFICAR ESTADO DE CAJA
async function checkDailyBoxStatus() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/daily-box/current`);
        const data = await response.json();
        
        if (!response.ok) {
            updateBoxStatusUI(null);
            return;
        }
        
        currentDailyBox = data;
        updateBoxStatusUI(data);
    } catch (error) {
        console.error('Error verificando estado de caja:', error);
        updateBoxStatusUI(null);
    }
}

// REFRESCAR ESTADO DE CAJA AUTOMÁTICAMENTE CADA 5 SEGUNDOS
function setupBoxRefresh() {
    setInterval(checkDailyBoxStatus, 5000);
}

// ACTUALIZAR INTERFAZ DE ESTADO DE CAJA
function updateBoxStatusUI(boxData) {
    const statusIndicator = document.getElementById('box-status-indicator');
    const toggleBtn = document.getElementById('box-toggle-btn');
    
    if (boxData && boxData.status === 'open') {
        statusIndicator.textContent = 'Caja Abierta';
        statusIndicator.className = 'box-status-value open';
        statusIndicator.style.color = '#059669';
        toggleBtn.textContent = 'Desactivar Caja Diaria';
        toggleBtn.className = 'btn btn-danger';
        toggleBtn.onclick = function() { closeBoxModal(); };
    } else {
        statusIndicator.textContent = 'Caja Cerrada';
        statusIndicator.className = 'box-status-value';
        statusIndicator.style.color = '#dc2626';
        toggleBtn.textContent = 'Activar Caja Diaria';
        toggleBtn.className = 'btn btn-success';
        toggleBtn.onclick = function() { openBoxModal(); };
    }
}

// ABRIR MODAL DE ABRIR CAJA
function openBoxModal() {
    document.getElementById('open-box-modal').classList.remove('hidden');
    document.getElementById('opening-balance').value = '0';
}

// CERRAR MODAL DE ABRIR CAJA
function closeOpenBoxModal() {
    document.getElementById('open-box-modal').classList.add('hidden');
}

// ABRIR CAJA
async function openBox() {
    const openingBalance = parseFloat(document.getElementById('opening-balance').value) || 0;
    
    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/daily-box/open`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ opening_balance: openingBalance })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.detail || 'Error al abrir la caja');
            return;
        }
        
        currentDailyBox = data;
        updateBoxStatusUI(data);
        closeOpenBoxModal();
        showSuccess('✓ Caja abierta correctamente');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al abrir la caja');
    } finally {
        showLoader(false);
    }
}

// CERRAR MODAL DE CERRAR CAJA
function closeCloseBoxModal() {
    document.getElementById('close-box-modal').classList.add('hidden');
}

// ABRIR MODAL DE CERRAR CAJA
async function closeBoxModal() {
    try {
        // Verificar si hay caja abierta
        const response = await fetchWithAuth(`${API_BASE}/daily-box/current`);
        const boxData = await response.json();
        
        if (!boxData || boxData.status !== 'open') {
            showError('No hay caja abierta');
            return;
        }
        
        // Mostrar resumen
        document.getElementById('close-total-sales').textContent = `$${boxData.total_sales.toFixed(2)}`;
        document.getElementById('close-total-profit').textContent = `$${boxData.total_profit.toFixed(2)}`;
        
        document.getElementById('closing-balance').value = boxData.total_sales.toFixed(2);
        document.getElementById('close-box-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al obtener datos de la caja');
    }
}

// CERRAR CAJA
async function closeBox() {
    const closingBalance = parseFloat(document.getElementById('closing-balance').value);
    
    if (isNaN(closingBalance)) {
        showError('Ingresa un monto válido');
        return;
    }
    
    try {
        showLoader(true);
        const response = await fetchWithAuth(`${API_BASE}/daily-box/close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ closing_balance: closingBalance })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showError(data.detail || 'Error al cerrar la caja');
            return;
        }
        
        currentDailyBox = null;
        updateBoxStatusUI(null);
        closeCloseBoxModal();
        showSuccess('✓ Caja cerrada correctamente');
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cerrar la caja');
    } finally {
        showLoader(false);
    }
}
