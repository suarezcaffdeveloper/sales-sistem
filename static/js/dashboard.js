const API_BASE = '/api';

// DOM Elements (lazy — se acceden dentro de funciones, nunca en el nivel raíz)
const el = id => document.getElementById(id);

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    displayUsername();
    loadDashboardStats();
    loadDailyBoxInfo();
    loadPaymentMethodStats();
    loadPendingDebts();
    loadPendingSupplierDebts();
    setupDailyBoxAutoRefresh();
    loadTopProfitableProducts();
    loadStaleProducts();
    loadInactiveCustomers();
    loadBusinessInsights();

    // Cerrar modal de gráfico al hacer click fuera
    const chartModal = document.getElementById('sales-chart-modal');
    if (chartModal) {
        chartModal.addEventListener('click', function(e) {
            if (e.target === this) closeSalesChart();
        });
    }

    const debtModal = document.getElementById('debt-chart-modal');
    if (debtModal) {
        debtModal.addEventListener('click', function(e) {
            if (e.target === this) closeDebtChart();
        });
    }
});

// MOSTRAR USERNAME EN NAVBAR
function displayUsername() {
    const username = getUsername();
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && username) {
        usernameDisplay.textContent = username;
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
        el('total-sales').textContent = `$${parseFloat(data.total_sales).toFixed(2)}`;
        el('sales-count').textContent = data.sales_count;
        el('total-profit').textContent = `$${parseFloat(data.total_profit).toFixed(2)}`;
        el('total-cost-invested').textContent = `$${parseFloat(data.total_cost_invested).toFixed(2)}`;
        el('total-products').textContent = data.total_products;
        el('total-customers').textContent = data.total_customers;
        el('low-stock-count').textContent = data.low_stock_products.length;
        
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
    const tbody = el('top-products-tbody');
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-3);">No hay datos de ventas</td></tr>';
        return;
    }

    products.forEach((product, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${product.name}</strong></td>
            <td>$${product.price.toFixed(2)}</td>
            <td><span style="background: var(--success-dim); color: var(--success); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">${product.quantity_sold}</span></td>
            <td><strong style="color: var(--success);">$${product.revenue.toFixed(2)}</strong></td>
            <td><strong style="color: var(--accent);">$${product.profit.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// RENDERIZAR PRODUCTOS MENOS VENDIDOS
function renderBottomProducts(products) {
    const tbody = el('bottom-products-tbody');
    tbody.innerHTML = '';
    
    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-3);">No hay datos</td></tr>';
        return;
    }

    products.forEach((product, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${product.name}</strong></td>
            <td>$${product.price.toFixed(2)}</td>
            <td><span style="background: var(--danger-dim); color: var(--danger); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">${product.quantity_sold}</span></td>
            <td><strong style="color: var(--danger);">$${product.revenue.toFixed(2)}</strong></td>
            <td><strong style="color: var(--accent);">$${product.profit.toFixed(2)}</strong></td>
        `;
        tbody.appendChild(tr);
    });
}

// RENDERIZAR ALERTAS DE STOCK BAJO
function renderLowStockAlerts(products) {
    const lowStockAlertsEl = el('low-stock-alerts');
    lowStockAlertsEl.innerHTML = '';
    
    if (products.length === 0) {
        return;
    }
    
    // Alerta general
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert-box warning';
    alertDiv.innerHTML = `
        <div class="alert-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
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
    listDiv.innerHTML = '<h3>Productos con stock bajo</h3>';

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
                const statusColor = product.stock === 0 ? 'var(--danger)' : 'var(--warning)';
                const statusBg = product.stock === 0 ? 'var(--danger-dim)' : 'var(--warning-dim)';
                const statusText = product.stock === 0 ? 'SIN STOCK' : 'STOCK BAJO';
                const costPriceText = product.cost_price ? `$${product.cost_price.toFixed(2)}` : 'No definido';
                return `
                    <tr>
                        <td><strong>${product.name}</strong></td>
                        <td><span style="font-size: 1.2rem; font-weight: 700; color: ${statusColor};">${product.stock}</span></td>
                        <td>$${product.price.toFixed(2)}</td>
                        <td>${costPriceText}</td>
                        <td><span style="background: ${statusBg}; color: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">${statusText}</span></td>
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
    const errorModal = el('error-modal');
    if (errorModal) {
        el('error-message').textContent = message;
        errorModal.classList.remove('hidden');
    }
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

    // Actualizar la stat card de deuda total
    const totalDebtEl = document.getElementById('total-debt');
    const debtCountEl = document.getElementById('debt-count');
    if (totalDebtEl) totalDebtEl.textContent = `$${totalDebt.toFixed(2)}`;
    if (debtCountEl) debtCountEl.textContent = pendingCount;
    
    let tableHTML = `
        <div class="form-section mt-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3>Facturas Adeudadas</h3>
                <span style="background: var(--danger-dim); color: var(--danger); padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;">
                    ${pendingCount} factura${pendingCount !== 1 ? 's'  : ''} • Deuda Total: $${totalDebt.toFixed(2)}
                </span>
            </div>
    `;

    if (debts.length === 0) {
        tableHTML += '<p style="color: var(--success); text-align: center; padding: 2rem;">No hay facturas adeudadas</p>';
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
                            <th style="text-align: right;">Deuda</th>
                            <th style="text-align: center;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        debts.forEach(debt => {
            tableHTML += `
                <tr>
                    <td style="font-weight: 600; color: var(--accent);">#${String(debt.sale_id).padStart(6, '0')}</td>
                    <td><strong>${debt.customer_name}</strong></td>
                    <td style="font-size: 0.9rem;">${debt.customer_phone}</td>
                    <td style="text-align: center;">${debt.item_count}</td>
                    <td style="text-align: right; font-weight: 600;">$${debt.total_amount.toFixed(2)}</td>
                    <td style="text-align: right; color: var(--success);">$${debt.paid_amount.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 600; color: var(--danger);">$${debt.debt_amount.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-primary" onclick="openPaymentModal(${debt.sale_id}, '${debt.customer_name}', ${debt.total_amount}, ${debt.paid_amount}, ${debt.debt_amount})"
                                style="padding: 0.5rem 1rem; font-size: 0.875rem;">
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

// ========== DEUDAS A PROVEEDORES (CUENTAS A PAGAR) ==========

// CARGAR DEUDAS A PROVEEDORES
async function loadPendingSupplierDebts() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/purchases/pending-debts`);

        if (!response.ok) {
            console.warn('No se pudo cargar deudas a proveedores');
            return;
        }

        const data = await response.json();
        renderPendingSupplierDebtsPanel(data);
    } catch (error) {
        console.error('Error cargando deudas a proveedores:', error);
    }
}

// RENDERIZAR PANEL DE DEUDAS A PROVEEDORES
function renderPendingSupplierDebtsPanel(data) {
    const debtsContainer = document.getElementById('pending-supplier-debts-container');

    if (!debtsContainer) {
        console.warn('Contenedor de deudas a proveedores no encontrado');
        return;
    }

    const pendingCount = data.pending_count || 0;
    const totalDebt = data.total_debt || 0;
    const debts = data.debts || [];

    // Actualizar la stat card de deuda a proveedores
    const totalDebtEl = document.getElementById('total-supplier-debt');
    const debtCountEl = document.getElementById('supplier-debt-count');
    if (totalDebtEl) totalDebtEl.textContent = `$${totalDebt.toFixed(2)}`;
    if (debtCountEl) debtCountEl.textContent = pendingCount;

    let tableHTML = `
        <div class="form-section mt-section">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3>Cuentas a Pagar a Proveedores</h3>
                <span style="background: var(--danger-dim); color: var(--danger); padding: 0.5rem 1rem; border-radius: var(--radius-sm); font-weight: 600;">
                    ${pendingCount} compra${pendingCount !== 1 ? 's' : ''} • Deuda Total: $${totalDebt.toFixed(2)}
                </span>
            </div>
    `;

    if (debts.length === 0) {
        tableHTML += '<p style="color: var(--success); text-align: center; padding: 2rem;">No hay deudas pendientes con proveedores</p>';
    } else {
        tableHTML += `
            <div class="table-wrapper" style="max-height: 310px; overflow-y: auto;">
                <table>
                    <thead>
                        <tr>
                            <th style="text-align: left;">Compra</th>
                            <th style="text-align: left;">Proveedor</th>
                            <th style="text-align: left;">Contacto</th>
                            <th style="text-align: center;">Productos</th>
                            <th style="text-align: right;">Total</th>
                            <th style="text-align: right;">Pagado</th>
                            <th style="text-align: right;">Deuda</th>
                            <th style="text-align: center;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        debts.forEach(debt => {
            tableHTML += `
                <tr>
                    <td style="font-weight: 600; color: var(--accent);">#${String(debt.purchase_id).padStart(6, '0')}</td>
                    <td><strong>${debt.supplier_name}</strong></td>
                    <td style="font-size: 0.9rem;">${debt.supplier_phone}</td>
                    <td style="text-align: center;">${debt.item_count}</td>
                    <td style="text-align: right; font-weight: 600;">$${debt.total_amount.toFixed(2)}</td>
                    <td style="text-align: right; color: var(--success);">$${debt.paid_amount.toFixed(2)}</td>
                    <td style="text-align: right; font-weight: 600; color: var(--danger);">$${debt.debt_amount.toFixed(2)}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-primary" onclick="openSupplierPaymentModal(${debt.purchase_id}, '${debt.supplier_name}', ${debt.total_amount}, ${debt.paid_amount}, ${debt.debt_amount})"
                                style="padding: 0.5rem 1rem; font-size: 0.875rem;">
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

// ABRIR MODAL DE PAGO A PROVEEDOR
function openSupplierPaymentModal(purchaseId, supplierName, totalAmount, paidAmount, debtAmount) {
    const modal = document.getElementById('supplier-payment-debt-modal');
    if (!modal) {
        console.error('Modal de pago a proveedor no encontrado');
        return;
    }

    document.getElementById('supplier-payment-purchase-id').textContent = String(purchaseId).padStart(6, '0');
    document.getElementById('supplier-payment-supplier-name').textContent = supplierName;
    document.getElementById('supplier-payment-total-amount').textContent = `$${totalAmount.toFixed(2)}`;
    document.getElementById('supplier-payment-paid-amount').textContent = `$${paidAmount.toFixed(2)}`;
    document.getElementById('supplier-payment-debt-amount').textContent = `$${debtAmount.toFixed(2)}`;

    const paymentInput = document.getElementById('supplier-payment-new-amount');
    paymentInput.value = debtAmount.toFixed(2);
    paymentInput.max = debtAmount;

    modal.dataset.purchaseId = purchaseId;
    modal.dataset.totalDebt = debtAmount;

    modal.classList.remove('hidden');
}

// CERRAR MODAL DE PAGO A PROVEEDOR
function closeSupplierPaymentModal() {
    const modal = document.getElementById('supplier-payment-debt-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// PROCESAR PAGO A PROVEEDOR
async function processSupplierDebtPayment() {
    const modal = document.getElementById('supplier-payment-debt-modal');
    const purchaseId = parseInt(modal.dataset.purchaseId);
    const totalDebt = parseFloat(modal.dataset.totalDebt);
    const paymentAmount = parseFloat(document.getElementById('supplier-payment-new-amount').value);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
        showErrorDashboard('Ingresa un monto válido mayor a 0');
        return;
    }

    if (paymentAmount > totalDebt) {
        showErrorDashboard('El monto no puede exceder la deuda pendiente');
        return;
    }

    try {
        const payBtn = document.getElementById('confirm-supplier-debt-payment-btn');
        payBtn.disabled = true;
        payBtn.textContent = 'Procesando...';

        const response = await fetchWithAuth(`${API_BASE}/supplier-payments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                purchase_id: purchaseId,
                amount: paymentAmount,
                payment_method: 'efectivo'
            })
        });

        const data = await response.json();

        if (!response.ok) {
            showErrorDashboard(data.detail || 'Error al procesar el pago');
            return;
        }

        closeSupplierPaymentModal();
        showSuccessDashboard('Pago a proveedor registrado correctamente');

        await new Promise(resolve => setTimeout(resolve, 500));
        loadPendingSupplierDebts();

    } catch (error) {
        console.error('Error procesando pago a proveedor:', error);
        showErrorDashboard('Error de conexión al procesar el pago');
    } finally {
        const payBtn = document.getElementById('confirm-supplier-debt-payment-btn');
        payBtn.disabled = false;
        payBtn.textContent = 'Confirmar Pago';
    }
}

// ========== CAJA DIARIA ==========

// CARGAR INFORMACION DE CAJA DIARIA
async function loadDailyBoxInfo() {
    try {
        // Cargar caja actual
        const currentResponse = await fetchWithAuth(`${API_BASE}/daily-box/current`);
        
        if (!currentResponse.ok) {
            // Si hay error, mostrar caja cerrada
            document.getElementById('dashboard-box-status').textContent = 'Caja Cerrada';
            document.getElementById('dashboard-box-status').style.color = '#dc2626';
            document.getElementById('dashboard-today-sales').textContent = '$0.00';
            document.getElementById('dashboard-today-profit').textContent = '$0.00';
            document.getElementById('dashboard-today-count').textContent = '0';
            renderDailyBoxesTable([]);
            return;
        }

        const currentBox = await currentResponse.json();

        if (currentBox && currentBox.status === 'open') {
            document.getElementById('dashboard-box-status').textContent = 'Caja Abierta';
            document.getElementById('dashboard-box-status').style.color = '#059669';
            document.getElementById('dashboard-today-sales').textContent = `$${(currentBox.total_sales || 0).toFixed(2)}`;
            document.getElementById('dashboard-today-profit').textContent = `$${(currentBox.total_profit || 0).toFixed(2)}`;
            document.getElementById('dashboard-today-count').textContent = currentBox.sale_count || 0;
        } else {
            document.getElementById('dashboard-box-status').textContent = 'Caja Cerrada';
            document.getElementById('dashboard-box-status').style.color = '#dc2626';
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
        document.getElementById('dashboard-box-status').textContent = 'Error';
        document.getElementById('dashboard-box-status').style.color = '#dc2626';
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
                document.getElementById('dashboard-box-status').textContent = 'Caja Abierta';
                document.getElementById('dashboard-box-status').style.color = '#059669';
                document.getElementById('dashboard-today-sales').textContent = `$${(currentBox.total_sales || 0).toFixed(2)}`;
                document.getElementById('dashboard-today-profit').textContent = `$${(currentBox.total_profit || 0).toFixed(2)}`;
                document.getElementById('dashboard-today-count').textContent = currentBox.sale_count || 0;
            } else {
                document.getElementById('dashboard-box-status').textContent = 'Caja Cerrada';
                document.getElementById('dashboard-box-status').style.color = '#dc2626';
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
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 1rem; color: var(--text-3);">No hay cajas registradas</td></tr>';
        return;
    }

    tableBody.innerHTML = boxes.map(box => {
        const date = new Date(box.date);
        const formattedDate = date.toLocaleDateString('es-ES');
        const isoDate = box.date;
        const statusBadge = box.status === 'open'
            ? '<span style="background: var(--success-dim); color: var(--success); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">Abierta</span>'
            : '<span style="background: var(--danger-dim); color: var(--danger); padding: 0.25rem 0.75rem; border-radius: 999px; font-weight: 600;">Cerrada</span>';

        return `
            <tr>
                <td><strong>${formattedDate}</strong></td>
                <td>${statusBadge}</td>
                <td style="color: var(--success); font-weight: 600;">$${(box.total_sales || 0).toFixed(2)}</td>
                <td style="color: var(--warning); font-weight: 600;">$${(box.total_profit || 0).toFixed(2)}</td>
                <td>$${(box.opening_balance || 0).toFixed(2)}</td>
                <td>${box.closing_balance ? `$${box.closing_balance.toFixed(2)}` : '-'}</td>
                <td style="white-space:nowrap;">
                    <button class="btn btn-view" onclick="exportDailyBoxExcel('${isoDate}')" title="Exportar Excel"
                        style="padding:0.3rem 0.65rem;font-size:0.78rem;margin-right:0.25rem;">
                        XLS
                    </button>
                    <button class="btn btn-view" onclick="exportDailyBoxPDF('${isoDate}')" title="Exportar PDF"
                        style="padding:0.3rem 0.65rem;font-size:0.78rem;">
                        PDF
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

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
        showSuccessDashboard('Pago registrado correctamente');
        
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

// ========== GRÁFICO DE VENTAS ==========

let salesChartInstance = null;

function openSalesChart() {
    const modal = document.getElementById('sales-chart-modal');
    modal.style.display = 'flex';

    // Valores por defecto: últimos 30 días
    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);

    const toISO = d => d.toISOString().split('T')[0];
    document.getElementById('chart-start-date').value = toISO(start);
    document.getElementById('chart-end-date').value = toISO(today);
    document.getElementById('chart-group-by').value = 'day';

    refreshSalesChart();
}

// Cerrar modal al hacer click fuera (registrado en DOMContentLoaded)
function closeSalesChart() {
    document.getElementById('sales-chart-modal').style.display = 'none';
}

async function refreshSalesChart() {
    const startDate = document.getElementById('chart-start-date').value;
    const endDate = document.getElementById('chart-end-date').value;
    const groupBy = document.getElementById('chart-group-by').value;

    if (!startDate || !endDate) return;

    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate + 'T23:59:59', group_by: groupBy });
        const response = await fetchWithAuth(`${API_BASE}/statistics/sales-chart-v2?${params}`);
        if (!response.ok) return;

        const result = await response.json();
        const chartData = result.data || [];
        const summary = result.summary || {};

        renderSalesChart(chartData, groupBy);
        renderChartSummary(chartData, summary);
    } catch (e) {
        console.error('Error cargando gráfico:', e);
    }
}

function renderSalesChart(data, groupBy) {
    const canvas = document.getElementById('sales-chart-canvas');
    const ctx = canvas.getContext('2d');

    if (salesChartInstance) {
        salesChartInstance.destroy();
    }

    if (!data || data.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#8b8b95';
        ctx.textAlign = 'center';
        ctx.font = '14px Manrope, sans-serif';
        ctx.fillText('Sin datos para el período seleccionado', canvas.width / 2, canvas.height / 2);
        return;
    }

    salesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [
                {
                    label: 'Ventas ($)',
                    data: data.map(d => d.total_sales),
                    backgroundColor: 'rgba(5, 150, 105, 0.55)',
                    borderColor: '#059669',
                    borderWidth: 2,
                    borderRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: 'Ganancia ($)',
                    data: data.map(d => d.profit || 0),
                    backgroundColor: 'rgba(8, 145, 178, 0.4)',
                    borderColor: '#0891b2',
                    borderWidth: 2,
                    borderRadius: 5,
                    yAxisID: 'y'
                },
                {
                    label: 'Transacciones',
                    data: data.map(d => d.count),
                    type: 'line',
                    backgroundColor: 'rgba(217, 119, 6, 0.12)',
                    borderColor: '#d97706',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: '#d97706',
                    tension: 0.3,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#55555f', font: { family: 'Manrope, sans-serif' } } },
                tooltip: {
                    backgroundColor: '#17171a',
                    titleColor: '#ffffff',
                    bodyColor: '#d4d4d9',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderWidth: 1,
                    callbacks: {
                        label: ctx => {
                            if (ctx.dataset.label === 'Transacciones') return `Transacciones: ${ctx.parsed.y}`;
                            return `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#8b8b95' }, grid: { color: 'rgba(17,17,17,0.05)' } },
                y: {
                    position: 'left',
                    ticks: { color: '#8b8b95', callback: v => '$' + v.toFixed(0) },
                    grid: { color: 'rgba(17,17,17,0.05)' }
                },
                y2: {
                    position: 'right',
                    ticks: { color: '#d97706' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

function renderChartSummary(data, summary = {}) {
    const summaryEl = document.getElementById('chart-summary');
    if (!data || data.length === 0) { summaryEl.innerHTML = ''; return; }

    const totalSales = summary.total_sales ?? data.reduce((s, d) => s + d.total_sales, 0);
    const totalProfit = summary.total_profit ?? data.reduce((s, d) => s + (d.profit || 0), 0);
    const totalTx = summary.transaction_count ?? data.reduce((s, d) => s + d.count, 0);
    const avg = totalTx > 0 ? totalSales / totalTx : 0;
    const salesGrowth = summary.sales_growth;
    const profitGrowth = summary.profit_growth;
    const periodLabel = summary.period_label || 'período anterior';

    function growthBadge(pct) {
        if (pct === null || pct === undefined) return '';
        const color = pct >= 0 ? '#059669' : '#dc2626';
        const arrow = pct >= 0 ? '▲' : '▼';
        return `<div style="font-size:0.72rem;color:${color};font-weight:600;margin-top:2px;">${arrow} ${Math.abs(pct)}% vs ${periodLabel}</div>`;
    }

    summaryEl.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">Ventas del período</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--accent);">$${totalSales.toFixed(2)}</div>
            ${growthBadge(salesGrowth)}
        </div>
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">Ganancia del período</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--success);">$${totalProfit.toFixed(2)}</div>
            ${growthBadge(profitGrowth)}
        </div>
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">Transacciones</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--text-1);">${totalTx}</div>
        </div>
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">Ticket promedio</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--text-1);">$${avg.toFixed(2)}</div>
        </div>
    `;
}

// ========== PRODUCTOS MÁS RENTABLES ==========

async function loadTopProfitableProducts() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/statistics/top-profitable?limit=10`);
        if (!response.ok) return;
        const data = await response.json();
        renderTopProfitableProducts(data);
    } catch (e) {
        console.error('Error cargando productos rentables:', e);
    }
}

function renderTopProfitableProducts(products) {
    const tbody = document.getElementById('top-profitable-tbody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--text-3);">No hay datos de ventas</td></tr>';
        return;
    }

    tbody.innerHTML = products.map((p, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${p.name}</strong></td>
            <td>$${(p.price || 0).toFixed(2)}</td>
            <td style="color:var(--text-2);">$${(p.cost_price || 0).toFixed(2)}</td>
            <td><span style="background:var(--accent-dim);color:var(--accent);padding:0.2rem 0.6rem;border-radius:999px;font-weight:600;">${p.quantity_sold}</span></td>
            <td>$${(p.revenue || 0).toFixed(2)}</td>
            <td><strong style="color:var(--success);">$${(p.profit || 0).toFixed(2)}</strong></td>
        </tr>
    `).join('');
}

// ========== PRODUCTOS SIN VENTAS RECIENTES ==========

async function loadStaleProducts() {
    const days = document.getElementById('stale-days-select')?.value || 30;
    try {
        const response = await fetchWithAuth(`${API_BASE}/statistics/stale-products?days=${days}`);
        if (!response.ok) return;
        const data = await response.json();
        renderStaleProducts(data);
    } catch (e) {
        console.error('Error cargando productos estancados:', e);
    }
}

function renderStaleProducts(products) {
    const tbody = document.getElementById('stale-products-tbody');
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--success);">Todos los productos tienen ventas recientes</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(p => {
        const lastSold = p.last_sold
            ? new Date(p.last_sold).toLocaleDateString('es-ES')
            : '—';
        const daysSince = p.days_since_sold !== null && p.days_since_sold !== undefined
            ? `${p.days_since_sold} días`
            : 'Nunca vendido';
        const badge = p.last_sold === null
            ? `<span style="background:var(--danger-dim);color:var(--danger);padding:0.2rem 0.6rem;border-radius:999px;font-size:0.8rem;font-weight:600;">Nunca vendido</span>`
            : `<span style="background:var(--warning-dim);color:var(--warning);padding:0.2rem 0.6rem;border-radius:999px;font-size:0.8rem;font-weight:600;">${daysSince}</span>`;
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td>${p.stock ?? 0}</td>
                <td>$${(p.price || 0).toFixed(2)}</td>
                <td style="color:var(--text-2);">${lastSold}</td>
                <td>${badge}</td>
            </tr>
        `;
    }).join('');
}

// ========== CLIENTES INACTIVOS ==========

async function loadInactiveCustomers() {
    const days = document.getElementById('inactive-days-select')?.value || 30;
    try {
        const response = await fetchWithAuth(`${API_BASE}/statistics/inactive-customers?days=${days}`);
        if (!response.ok) return;
        const data = await response.json();
        renderInactiveCustomers(data);
    } catch (e) {
        console.error('Error cargando clientes inactivos:', e);
    }
}

function renderInactiveCustomers(customers) {
    const tbody = document.getElementById('inactive-customers-tbody');
    if (!tbody) return;

    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--success);">Todos los clientes compraron recientemente</td></tr>';
        return;
    }

    tbody.innerHTML = customers.map(c => {
        const lastPurchase = c.last_purchase
            ? new Date(c.last_purchase).toLocaleDateString('es-ES')
            : '—';
        const badge = c.last_purchase === null
            ? `<span style="background:var(--danger-dim);color:var(--danger);padding:0.2rem 0.6rem;border-radius:999px;font-size:0.8rem;font-weight:600;">Sin compras</span>`
            : `<span style="background:var(--warning-dim);color:var(--warning);padding:0.2rem 0.6rem;border-radius:999px;font-size:0.8rem;font-weight:600;">${c.days_inactive} días</span>`;
        return `
            <tr>
                <td><strong>${c.name}</strong></td>
                <td style="color:var(--text-2);">${c.phone || '—'}</td>
                <td style="color:var(--text-2);">${c.email || '—'}</td>
                <td style="color:var(--text-2);">${lastPurchase}</td>
                <td>${badge}</td>
            </tr>
        `;
    }).join('');
}

// ========== GRÁFICO DE DEUDAS ==========

let debtChartInstance = null;

function openDebtChart() {
    const modal = document.getElementById('debt-chart-modal');
    modal.style.display = 'flex';

    const today = new Date();
    const start = new Date();
    start.setDate(today.getDate() - 30);
    const toISO = d => d.toISOString().split('T')[0];

    document.getElementById('debt-chart-start-date').value = toISO(start);
    document.getElementById('debt-chart-end-date').value = toISO(today);
    document.getElementById('debt-chart-group-by').value = 'day';

    refreshDebtChart();
}

function closeDebtChart() {
    document.getElementById('debt-chart-modal').style.display = 'none';
}

async function refreshDebtChart() {
    const startDate = document.getElementById('debt-chart-start-date').value;
    const endDate = document.getElementById('debt-chart-end-date').value;
    const groupBy = document.getElementById('debt-chart-group-by').value;

    if (!startDate || !endDate) return;

    try {
        const params = new URLSearchParams({ start_date: startDate, end_date: endDate + 'T23:59:59', group_by: groupBy });
        const response = await fetchWithAuth(`${API_BASE}/statistics/debt-chart?${params}`);
        if (!response.ok) return;

        const data = await response.json();
        renderDebtChart(data);
        renderDebtChartSummary(data);
    } catch (e) {
        console.error('Error cargando gráfico de deudas:', e);
    }
}

function renderDebtChart(data) {
    const canvas = document.getElementById('debt-chart-canvas');
    if (!canvas) return;

    if (debtChartInstance) {
        debtChartInstance.destroy();
        debtChartInstance = null;
    }

    if (!data || data.length === 0) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    const labels = data.map(d => d.label);
    const debtValues = data.map(d => d.total_debt);
    const salesValues = data.map(d => d.total_sales);

    debtChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Deuda generada ($)',
                    data: debtValues,
                    backgroundColor: 'rgba(220,38,38,0.5)',
                    borderColor: 'rgba(220,38,38,1)',
                    borderWidth: 2,
                    borderRadius: 4,
                    order: 2
                },
                {
                    label: 'Ventas totales ($)',
                    data: salesValues,
                    type: 'line',
                    borderColor: 'rgba(5,150,105,0.9)',
                    backgroundColor: 'rgba(5,150,105,0.1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointBackgroundColor: 'rgba(5,150,105,1)',
                    tension: 0.3,
                    fill: false,
                    order: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: '#55555f', font: { size: 12 } } },
                tooltip: {
                    backgroundColor: '#17171a',
                    titleColor: '#ffffff',
                    bodyColor: '#d4d4d9',
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}`
                    }
                }
            },
            scales: {
                x: { ticks: { color: '#8b8b95' }, grid: { color: 'rgba(17,17,17,0.05)' } },
                y: {
                    ticks: { color: '#8b8b95', callback: v => `$${v.toFixed(0)}` },
                    grid: { color: 'rgba(17,17,17,0.05)' }
                }
            }
        }
    });
}

function renderDebtChartSummary(data) {
    const summary = document.getElementById('debt-chart-summary');
    if (!data || data.length === 0) { summary.innerHTML = ''; return; }

    const totalDebt = data.reduce((s, d) => s + d.total_debt, 0);
    const totalSales = data.reduce((s, d) => s + d.total_sales, 0);
    const debtCount = data.reduce((s, d) => s + d.debt_count, 0);
    const debtPct = totalSales > 0 ? (totalDebt / totalSales * 100) : 0;

    summary.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">Deuda del período</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--danger);">$${totalDebt.toFixed(2)}</div>
        </div>
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">Facturas adeudadas</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--warning);">${debtCount}</div>
        </div>
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">% sobre ventas</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--text-1);">${debtPct.toFixed(1)}%</div>
        </div>
        <div style="text-align:center;">
            <div style="font-size:0.8rem;color:var(--text-3);margin-bottom:0.25rem;">Ventas del período</div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--accent);">$${totalSales.toFixed(2)}</div>
        </div>
    `;
}

// ========== INSIGHTS DE NEGOCIO ==========

async function loadBusinessInsights() {
    try {
        const response = await fetchWithAuth(`${API_BASE}/statistics/insights`);
        if (!response.ok) return;
        const data = await response.json();
        renderBusinessInsights(data);
    } catch (e) {
        console.error('Error cargando insights:', e);
    }
}

function renderBusinessInsights(insights) {
    const container = document.getElementById('business-insights-container');
    if (!container) return;

    if (!insights || insights.length === 0) {
        container.innerHTML = '<p style="color:var(--text-3);text-align:center;padding:1.5rem;">Genera más ventas para ver insights de tu negocio</p>';
        return;
    }

    const typeColors = {
        success: { bg: 'var(--success-dim)', color: 'var(--success)' },
        warning: { bg: 'var(--warning-dim)', color: 'var(--warning)' },
        danger:  { bg: 'var(--danger-dim)',  color: 'var(--danger)'  },
        info:    { bg: 'var(--accent-dim)',   color: 'var(--accent)'  },
    };

    container.innerHTML = insights.map(ins => {
        const style = typeColors[ins.type] || typeColors.info;
        return `
            <div style="display:flex;gap:0.75rem;align-items:flex-start;padding:1rem 1.25rem;
                        background:${style.bg};border-radius:var(--radius);margin-bottom:0.75rem;
                        border-left:3px solid ${style.color};">
                <div>
                    <div style="font-weight:600;color:${style.color};font-size:0.9rem;">${ins.title}</div>
                    <div style="color:var(--text-2);font-size:0.82rem;margin-top:0.2rem;">${ins.detail}</div>
                </div>
            </div>
        `;
    }).join('');
}

// ========== DESCARGA DE REPORTES (helper genérico) ==========

// Descarga el resultado de un endpoint protegido como archivo, usando el
// mismo token que el resto de la app (fetchWithAuth), en vez de una key de
// localStorage que nunca se usa en ningún otro lado.
async function downloadReport(url, filename, errorMessage) {
    try {
        const response = await fetchWithAuth(url);
        if (!response || !response.ok) {
            showErrorDashboard(errorMessage);
            return;
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
    } catch (e) {
        console.error('Error descargando reporte:', e);
        showErrorDashboard(errorMessage);
    }
}

// ========== EXPORTACIÓN CAJA DIARIA ==========

async function exportDailyBoxExcel(date) {
    const boxDate = date || new Date().toISOString().split('T')[0];
    await downloadReport(
        `${API_BASE}/reports/daily-box/excel?date=${boxDate}`,
        `caja-${boxDate}.xlsx`,
        'Error al generar el Excel. Intente de nuevo.'
    );
}

async function exportDailyBoxPDF(date) {
    const boxDate = date || new Date().toISOString().split('T')[0];
    await downloadReport(
        `${API_BASE}/reports/daily-box/pdf?date=${boxDate}`,
        `caja-${boxDate}.pdf`,
        'Error al generar el PDF. Intente de nuevo.'
    );
}

// ========== REPORTES DIARIO / SEMANAL / MENSUAL / VENTAS ==========

async function exportTodayReport() {
    const today = new Date().toISOString().split('T')[0];
    await downloadReport(
        `${API_BASE}/reports/daily?date=${today}`,
        `reporte-diario-${today}.pdf`,
        'Error al generar el reporte diario.'
    );
}

async function exportWeeklyReport() {
    const today = new Date().toISOString().split('T')[0];
    await downloadReport(
        `${API_BASE}/reports/weekly`,
        `reporte-semanal-${today}.pdf`,
        'Error al generar el reporte semanal.'
    );
}

async function exportMonthlyReport() {
    const today = new Date().toISOString().split('T')[0];
    await downloadReport(
        `${API_BASE}/reports/monthly`,
        `reporte-mensual-${today}.pdf`,
        'Error al generar el reporte mensual.'
    );
}

async function exportSalesExcelReport() {
    const today = new Date().toISOString().split('T')[0];
    await downloadReport(
        `${API_BASE}/reports/sales/excel`,
        `ventas-${today}.xlsx`,
        'Error al generar el Excel de ventas.'
    );
}
