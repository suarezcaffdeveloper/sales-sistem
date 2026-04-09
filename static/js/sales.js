const API_BASE = '/api';
let allProducts = [];
let allCustomers = [];
let cartItems = [];
let selectedCustomer = null;
let selectedCustomerId = null;
let currentDailyBox = null;  // Estado actual de la caja

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
    
    console.log('✅ DOM Elements initialized successfully');
    console.log('   completeSaleBtn:', completeSaleBtn);
    
    // === CARGAR DATOS Y CONFIGURAR ===
    displayUsername();
    loadCustomers();
    loadProducts();
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
        usernameDisplay.textContent = `👤 ${username}`;
    }
}

// Event Listeners
function setupEventListeners() {
    customerSearch.addEventListener('input', handleCustomerSearch);
    productSearch.addEventListener('input', handleProductSearch);
    addProductBtn.addEventListener('click', addProductToCart);
    clearCartBtn.addEventListener('click', clearCart);
    completeSaleBtn.addEventListener('click', completeSale);

    // Tecla Enter en cantidad
    productQuantity.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addProductToCart();
    });

    // Cerrar modales
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('close-error-btn')?.addEventListener('click', closeErrorModal);
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
                    $${item.product_price.toFixed(2)} c/u × ${item.quantity} = $${itemTotal.toFixed(2)}
                </div>
            </div>
            <button class="btn-danger" onclick="removeFromCart(${index})">🗑️</button>
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

// ACTUALIZAR TOTALES
function updateTotals() {
    let subtotal = 0;
    let itemCount = 0;

    cartItems.forEach(item => {
        subtotal += item.product_price * item.quantity;
        itemCount += item.quantity;
    });

    subtotalSpan.textContent = `$${subtotal.toFixed(2)}`;
    itemCountSpan.textContent = itemCount;
    totalPriceSpan.textContent = `$${subtotal.toFixed(2)}`;
}

// LIMPIAR CARRITO
function clearCart() {
    if (cartItems.length === 0) {
        return;
    }

    if (confirm('¿Estás seguro de que deseas limpiar el carrito?')) {
        cartItems = [];
        renderCart();
        updateCompleteButton();
    }
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
        initial_payment: initialPaymentAmount
    };

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

        // Obtener detalles completos de la venta para el ticket
        const saleId = data.id;
        await fetchAndShowTicket(saleId);
        
        // Si hay pago inicial, registrarlo también
        if (initialPaymentAmount > 0) {
            await registerPayment(saleId, initialPaymentAmount);
        }
        
        resetSaleForm();
        loadProducts(); // Recargar productos para actualizar stock

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
    
    // Guardar detalles para usar en impresión y PDF
    window.currentSaleDetails = saleDetails;
}

// CERRAR MODAL DE TICKET
function closeTicketModal() {
    document.getElementById('ticket-modal').classList.add('hidden');
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
            itemsHTML += `
                <tr>
                    <td>${item.product_name || 'Producto desconocido'}</td>
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
    
    return `
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
                <span style="font-weight: bold; color: ${saleDetails.status === 'pagado' ? '#28a745' : saleDetails.status === 'parcial' ? '#ffc107' : '#dc3545'};">
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
        
        tableHTML += `
            <tr>
                <td style="color: #666;">#${String(sale.id).padStart(6, '0')}</td>
                <td style="color: #333; font-weight: 500;">${sale.customer_name}</td>
                <td style="color: #666; font-size: 0.9rem;">${formattedDate} ${formattedTime}</td>
                <td style="color: #666; font-size: 0.9rem; text-align: center;">${sale.item_count} producto${sale.item_count !== 1 ? 's' : ''}</td>
                <td style="text-align: right; font-weight: 600; color: #1976d2;">$${(sale.total_amount || 0).toFixed(2)}</td>
                <td style="text-align: center;">
                    <button onclick="viewSaleTicket(${sale.id})" 
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
        statusIndicator.textContent = '✓ Caja Abierta';
        statusIndicator.style.color = '#4caf50';
        toggleBtn.textContent = 'Desactivar Caja Diaria';
        toggleBtn.className = 'btn btn-danger';
        toggleBtn.onclick = function() { closeBoxModal(); };
    } else {
        statusIndicator.textContent = '✗ Caja Cerrada';
        statusIndicator.style.color = '#d32f2f';
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
