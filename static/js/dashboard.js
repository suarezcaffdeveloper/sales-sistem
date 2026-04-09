const API_BASE = '/api';

// DOM Elements
const totalSalesEl = document.getElementById('total-sales');
const salesCountEl = document.getElementById('sales-count');
const totalProfitEl = document.getElementById('total-profit');
const totalCostInvestedEl = document.getElementById('total-cost-invested');
const totalProductsEl = document.getElementById('total-products');
const totalCustomersEl = document.getElementById('total-customers');
const lowStockCountEl = document.getElementById('low-stock-count');
const topProductsTbody = document.getElementById('top-products-tbody');
const bottomProductsTbody = document.getElementById('bottom-products-tbody');
const lowStockAlertsEl = document.getElementById('low-stock-alerts');
const errorModal = document.getElementById('error-modal');

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    loadDashboardStats();
    loadDailyBoxInfo();
    loadPaymentMethodStats();  // Nueva línea
    loadPendingDebts();        // Nueva línea
    setupDailyBoxAutoRefresh(); // Auto-refresh de caja diaria
});

// MOSTRAR USERNAME EN NAVBAR
function displayUsername() {
    const username = getUsername();
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && username) {
        usernameDisplay.textContent = `👤 ${username}`;
    }
}

// CARGAR ESTADÍSTICAS DEL DASHBOARD
async function loadDashboardStats() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/statistics/dashboard`);
        if (!response.ok) {
            throw new Error('Error al cargar estadísticas');
        }
        
        const data = await response.json();
        
        // Actualizar estadísticas principales
        totalSalesEl.textContent = `$${parseFloat(data.total_sales).toFixed(2)}`;
        salesCountEl.textContent = data.sales_count;
        totalProfitEl.textContent = `$${parseFloat(data.total_profit).toFixed(2)}`;
        totalCostInvestedEl.textContent = `$${parseFloat(data.total_cost_invested).toFixed(2)}`;
        totalProductsEl.textContent = data.total_products;
        totalCustomersEl.textContent = data.total_customers;
        lowStockCountEl.textContent = data.low_stock_products.length;
        
        // Renderizar productos más vendidos
        renderTopProducts(data.top_products);
        
        // Renderizar productos menos vendidos
        renderBottomProducts(data.bottom_products);
        
        // Mostrar alertas de stock bajo
        renderLowStockAlerts(data.low_stock_products);
        
    } catch (error) {
        console.error('Error:', error);
        showError('Error al cargar las estadísticas: ' + error.message);
    }
}

// RENDERIZAR PRODUCTOS MÁS VENDIDOS
function renderTopProducts(products) {
    topProductsTbody.innerHTML = '';
    
    if (products.length === 0) {
        topProductsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #999;">No hay datos de ventas</td></tr>';
        return;
    }
    
    products.forEach((product, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${product.name}</strong></td>
            <td>$${product.price.toFixed(2)}</td>
            <td><span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">${product.quantity_sold}</span></td>
            <td><strong style="color: #10b981;">$${product.revenue.toFixed(2)}</strong></td>
            <td><strong style="color: #0084ff;">$${product.profit.toFixed(2)}</strong></td>
        `;
        topProductsTbody.appendChild(tr);
    });
}

// RENDERIZAR PRODUCTOS MENOS VENDIDOS
function renderBottomProducts(products) {
    bottomProductsTbody.innerHTML = '';
    
    if (products.length === 0) {
        bottomProductsTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #999;">No hay datos</td></tr>';
        return;
    }
    
    products.forEach((product, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${product.name}</strong></td>
            <td>$${product.price.toFixed(2)}</td>
            <td><span style="background: #fee2e2; color: #7f1d1d; padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">${product.quantity_sold}</span></td>
            <td><strong style="color: #ef4444;">$${product.revenue.toFixed(2)}</strong></td>
            <td><strong style="color: #0084ff;">$${product.profit.toFixed(2)}</strong></td>
        `;
        bottomProductsTbody.appendChild(tr);
    });
}

// RENDERIZAR ALERTAS DE STOCK BAJO
function renderLowStockAlerts(products) {
    lowStockAlertsEl.innerHTML = '';
    
    if (products.length === 0) {
        return;
    }
    
    // Alerta general
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-box warning';
    alertDiv.innerHTML = `
        <div class="alert-icon">⚠️</div>
        <div class="alert-content">
            <h4>¡Atención! Stock bajo detectado</h4>
            <p>${products.length} producto(s) tienen menos de 3 unidades en stock.</p>
        </div>
    `;
    lowStockAlertsEl.appendChild(alertDiv);
    
    // Lista de productos con stock bajo
    const listDiv = document.createElement('div');
    listDiv.className = 'form-section';
    listDiv.style.marginBottom = '2rem';
    listDiv.innerHTML = '<h3>🔔 Productos con Stock Bajo</h3>';
    
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Producto</th>
                <th>Stock Actual</th>
                <th>Precio</th>
                <th>Costo</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            ${products.map(product => {
                const statusColor = product.stock === 0 ? '#ef4444' : '#f59e0b';
                const statusText = product.stock === 0 ? 'SIN STOCK' : 'STOCK BAJO';
                const costPriceText = product.cost_price ? `$${product.cost_price.toFixed(2)}` : 'No definido';
                return `
                    <tr>
                        <td><strong>${product.name}</strong></td>
                        <td><span style="font-size: 1.2rem; font-weight: 700; color: ${statusColor};">${product.stock}</span></td>
                        <td>$${product.price.toFixed(2)}</td>
                        <td>${costPriceText}</td>
                        <td><span style="background: ${statusColor}22; color: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">${statusText}</span></td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    `;
    listDiv.appendChild(table);
    lowStockAlertsEl.appendChild(listDiv);
}

// MOSTRAR ERROR
function showError(message) {
    document.getElementById('error-message').textContent = message;
    errorModal.classList.remove('hidden');
}

// ========== MÉTODOS DE PAGO ==========

// CARGAR ESTADÍSTICAS DE MÉTODOS DE PAGO
async function loadPaymentMethodStats() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/statistics/payment-methods`);
        
        if (!response.ok) {
            console.warn('No se pudo cargar estadísticas de métodos de pago');
            return;
        }
        
        const data = await response.json();
        renderPaymentMethodCard(data);
    } catch (error) {
        console.error('Error cargando métodos de pago:', error);
    }
}

// RENDERIZAR CARD DE MÉTODO DE PAGO
function renderPaymentMethodCard(data) {
    const methodsContainer = document.getElementById('payment-methods-container');
    
    if (!methodsContainer) {
        console.warn('Contenedor de métodos de pago no encontrado');
        return;
    }
    
    const method = data.payment_method || 'Sin datos';
    const count = data.count || 0;
    const total = data.total_amount || 0;
    
    // Agregar solo la tarjeta, sin crear un grid nuevo
    methodsContainer.innerHTML = `
        <div class="stat-card primary">
            <h3>Método de Pago Más Usado</h3>
            <div class="value" style="font-size: 1.5rem; text-transform: capitalize;">${method}</div>
            <div class="subtitle">${count} transacciones • $${total.toFixed(2)}</div>
        </div>
    `;
}

// ========== DEUDAS PENDIENTES ==========

// CARGAR DEUDAS PENDIENTES
async function loadPendingDebts() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/sales/pending-debts`);
        
        if (!response.ok) {
            console.warn('No se pudo cargar deudas pendientes');
            return;
        }
        
        const data = await response.json();
        renderPendingDebtsPanel(data);
    } catch (error) {
        console.error('Error cargando deudas pendientes:', error);
    }
}

// RENDERIZAR PANEL DE DEUDAS
function renderPendingDebtsPanel(data) {
    const debtsContainer = document.getElementById('pending-debts-container');
    
    if (!debtsContainer) {
        console.warn('Contenedor de deudas no encontrado');
        return;
    }
    
    const pendingCount = data.pending_count || 0;
    const totalDebt = data.total_debt || 0;
    const debts = data.debts || [];
    
    let tableHTML = `
        <div class="form-section mt-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3>Facturas Adeudadas</h3>
                <span style="background: #fee2e2; color: #991b1b; padding: 0.5rem 1rem; border-radius: 4px; font-weight: 600;">
                    ${pendingCount} factura${pendingCount !== 1 ? 's'  : ''} • Deuda Total: $${totalDebt.toFixed(2)}
                </span>
            </div>
    `;
    
    if (debts.length === 0) {
        tableHTML += '<p style="color: #4caf50; text-align: center; padding: 2rem;">✓ No hay facturas adeudadas</p>';
    } else {
        tableHTML += `
            <div class="table-wrapper" style="max-height: 310px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Factura</th>
                            <th style="text-align: left;">Cliente</th>
                            <th style="text-align: left;">Contacto</th>
                            <th style="text-align: center;">Productos</th>
                            <th style="text-align: right;">Total</th>
                            <th style="text-align: right;">Pagado</th>
                            <th style="text-align: right; color: #dc3545;">Deuda</th>
                            <th style="text-align: center;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        debts.forEach(debt => {
            tableHTML += `
                <tr>
                    <td style="font-weight: 600; color: #1976d2;">#${String(debt.sale_id).padStart(6, '0')}</td>
                    <td><strong>${debt.customer_name}</strong></td>
                    <td style="color: #666; font-size: 0.9rem;">${debt.customer_phone}</td>
                    <td style="text-align: center; color: #666;">${debt.item_count}</td>
                    <td style="text-align: right; font-weight: 600;">$${debt.total_amount.toFixed(2)}</td>
                    <td style="text-align: right; color: #4caf50;">$${debt.paid_amount.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 600; color: #dc3545;">$${debt.debt_amount.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button onclick="openPaymentModal(${debt.sale_id}, '${debt.customer_name}', ${debt.total_amount}, ${debt.paid_amount}, ${debt.debt_amount})" 
                                style="background: #1976d2; color: white; border: none; padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; font-size: 0.875rem; font-weight: 600;">
                            Pagar
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
    }
    
    tableHTML += `</div>`;
    debtsContainer.innerHTML = tableHTML;
}

// ========== CAJA DIARIA ==========

// CARGAR INFORMACION DE CAJA DIARIA
async function loadDailyBoxInfo() {
    try {
        // Cargar caja actual
        const currentResponse = await fetchWithAuth(`${API_BASE}/daily-box/current`);
        
        if (!currentResponse.ok) {
            // Si hay error, mostrar caja cerrada
            document.getElementById('dashboard-box-status').textContent = '✗ Caja Cerrada';
            document.getElementById('dashboard-box-status').style.color = '#d32f2f';
            document.getElementById('dashboard-today-sales').textContent = '$0.00';
            document.getElementById('dashboard-today-profit').textContent = '$0.00';
            document.getElementById('dashboard-today-count').textContent = '0';
            renderDailyBoxesTable([]);
            return;
        }
        
        const currentBox = await currentResponse.json();
        
        if (currentBox && currentBox.status === 'open') {
            document.getElementById('dashboard-box-status').textContent = '✓ Caja Abierta';
            document.getElementById('dashboard-box-status').style.color = '#4caf50';
            document.getElementById('dashboard-today-sales').textContent = `$${(currentBox.total_sales || 0).toFixed(2)}`;
            document.getElementById('dashboard-today-profit').textContent = `$${(currentBox.total_profit || 0).toFixed(2)}`;
            document.getElementById('dashboard-today-count').textContent = currentBox.sale_count || 0;
        } else {
            document.getElementById('dashboard-box-status').textContent = '✗ Caja Cerrada';
            document.getElementById('dashboard-box-status').style.color = '#d32f2f';
            document.getElementById('dashboard-today-sales').textContent = '$0.00';
            document.getElementById('dashboard-today-profit').textContent = '$0.00';
            document.getElementById('dashboard-today-count').textContent = '0';
        }
        
        // Cargar historial de cajas
        try {
            const historyResponse = await fetchWithAuth(`${API_BASE}/daily-box`);
            
            if (historyResponse.ok) {
                const boxes = await historyResponse.json();
                renderDailyBoxesTable(Array.isArray(boxes) ? boxes : []);
            } else {
                renderDailyBoxesTable([]);
            }
        } catch (error) {
            console.error('Error cargando historial de cajas:', error);
            renderDailyBoxesTable([]);
        }
    } catch (error) {
        console.error('Error cargando información de caja:', error);
        // Mostrar interfaz con valores por defecto
        document.getElementById('dashboard-box-status').textContent = '✗ Error';
        document.getElementById('dashboard-box-status').style.color = '#d32f2f';
        renderDailyBoxesTable([]);
    }
}

// REFRESCAR ESTADO DE CAJA CADA 5 SEGUNDOS
function setupDailyBoxRefresh() {
    // Refrescar datos de caja periódicamente
    setInterval(checkDailyBoxRefresh, 5000); // cada 5 segundos
}

async function checkDailyBoxRefresh() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/daily-box/current`);
        if (response.ok) {
            const currentBox = await response.json();
            
            // Actualizar solo los valores (no renderizar tabla completa)
            if (currentBox && currentBox.status === 'open') {
                document.getElementById('dashboard-box-status').textContent = '✓ Caja Abierta';
                document.getElementById('dashboard-box-status').style.color = '#4caf50';
                document.getElementById('dashboard-today-sales').textContent = `$${(currentBox.total_sales || 0).toFixed(2)}`;
                document.getElementById('dashboard-today-profit').textContent = `$${(currentBox.total_profit || 0).toFixed(2)}`;
                document.getElementById('dashboard-today-count').textContent = currentBox.sale_count || 0;
            } else {
                document.getElementById('dashboard-box-status').textContent = '✗ Caja Cerrada';
                document.getElementById('dashboard-box-status').style.color = '#d32f2f';
            }
        }
    } catch (error) {
        // Error silencioso en refresh periódico
        console.debug('Refresh background failed:', error);
    }
}

// CONFIGURAR AUTO-REFRESH DE CAJA DIARIA
function setupDailyBoxAutoRefresh() {
    setInterval(loadDailyBoxInfo, 5000); // Refrescar cada 5 segundos
}

// RENDERIZAR TABLA DE CAJAS DIARIAS
function renderDailyBoxesTable(boxes) {
    const tableBody = document.getElementById('daily-boxes-table');
    
    if (!Array.isArray(boxes) || boxes.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1rem; color: #999;">No hay cajas registradas</td></tr>';
        return;
    }
    
    tableBody.innerHTML = boxes.map(box => {
        const date = new Date(box.date);
        const formattedDate = date.toLocaleDateString('es-ES');
        const statusBadge = box.status === 'open' 
            ? '<span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">Abierta</span>'
            : '<span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">Cerrada</span>';
        
        return `
            <tr>
                <td><strong>${formattedDate}</strong></td>
                <td>${statusBadge}</td>
                <td style="color: #4caf50; font-weight: 600;">$${(box.total_sales || 0).toFixed(2)}</td>
                <td style="color: #ff9800; font-weight: 600;">$${(box.total_profit || 0).toFixed(2)}</td>
                <td>$${(box.opening_balance || 0).toFixed(2)}</td>
                <td>${box.closing_balance ? `$${box.closing_balance.toFixed(2)}` : '-'}</td>
            </tr>
        `;
    }).join('');
}

// Actualizar inicialización
loadDailyBoxInfo();
setupDailyBoxRefresh();

// ========== SISTEMA DE PAGOS DE DEUDAS ==========

// ABRIR MODAL DE PAGO
function openPaymentModal(saleId, customerName, totalAmount, paidAmount, debtAmount) {
    const modal = document.getElementById('payment-debt-modal');
    if (!modal) {
        console.error('Modal de pago no encontrado');
        return;
    }
    
    // Llenar datos del modal
    document.getElementById('payment-sale-id').textContent = String(saleId).padStart(6, '0');
    document.getElementById('payment-customer-name').textContent = customerName;
    document.getElementById('payment-total-amount').textContent = `$${totalAmount.toFixed(2)}`;
    document.getElementById('payment-paid-amount').textContent = `$${paidAmount.toFixed(2)}`;
    document.getElementById('payment-debt-amount').textContent = `$${debtAmount.toFixed(2)}`;
    
    // Campo de pago
    const paymentInput = document.getElementById('payment-new-amount');
    paymentInput.value = debtAmount.toFixed(2);
    paymentInput.max = debtAmount;
    
    // Guardar datos para procesamiento
    modal.dataset.saleId = saleId;
    modal.dataset.totalDebt = debtAmount;
    
    // Mostrar modal
    modal.classList.remove('hidden');
}

// CERRAR MODAL DE PAGO
function closePaymentModal() {
    const modal = document.getElementById('payment-debt-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// PROCESAR PAGO DE DEUDA
async function processDebtPayment() {
    const modal = document.getElementById('payment-debt-modal');
    const saleId = parseInt(modal.dataset.saleId);
    const totalDebt = parseFloat(modal.dataset.totalDebt);
    const paymentAmount = parseFloat(document.getElementById('payment-new-amount').value);
    
    // Validaciones
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        showErrorDashboard('Ingresa un monto válido mayor a 0');
        return;
    }
    
    if (paymentAmount > totalDebt) {
        showErrorDashboard('El monto no puede exceder la deuda pendiente');
        return;
    }
    
    try {
        // Mostrar cargando
        const payBtn = document.getElementById('confirm-debt-payment-btn');
        payBtn.disabled = true;
        payBtn.textContent = 'Procesando...';
        
        // Hacer request de pago
        const response = await fetchWithAuth(`${API_BASE}/payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sale_id: saleId,
                amount: paymentAmount,
                payment_method: 'efectivo'
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showErrorDashboard(data.detail || 'Error al procesar el pago');
            return;
        }
        
        // Éxito
        closePaymentModal();
        showSuccessDashboard('✓ Pago registrado correctamente');
        
        // Refrescar datos
        await new Promise(resolve => setTimeout(resolve, 500));
        loadPendingDebts();
        
    } catch (error) {
        console.error('Error procesando pago:', error);
        showErrorDashboard('Error de conexión al procesar el pago');
    } finally {
        const payBtn = document.getElementById('confirm-debt-payment-btn');
        payBtn.disabled = false;
        payBtn.textContent = 'Confirmar Pago';
    }
}

// MOSTRAR MODAL DE ERROR (Dashboard)
function showErrorDashboard(message) {
    const errorModal = document.getElementById('error-modal');
    if (errorModal) {
        document.getElementById('error-message').textContent = message;
        errorModal.classList.remove('hidden');
    }
}

// MOSTRAR MODAL DE ÉXITO (Dashboard)
function showSuccessDashboard(message) {
    alert(message);
}
