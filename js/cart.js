/**
 * CHE COSMETICS - Complete Shopping Cart System
 * With mandatory invoice download and payment proof verification
 * Updated with special pricing for bulk purchases
 */

// Cart data structure
let cart = JSON.parse(localStorage.getItem('cheCosmeticsCart')) || [];
let invoiceDownloaded = false;
const STANDARD_SHIPPING_FEE = 103.50;

// Special pricing configurations
const SPECIAL_PRICING = {
    'lipgloss': {
        singlePrice: 125.00,
        bulkQuantity: 2,
        bulkPrice: 200.00
    },
    'lipscrub': {
        singlePrice: 150.00,
        bulkQuantity: 2,
        bulkPrice: 250.00
    },
    'bodyscrub': {
        singlePrice: 180.00,
        bulkQuantity: 2,
        bulkPrice: 300.00
    },
    'face-cream': {
        singlePrice: 140.00,
        bulkQuantity: 2,
        bulkPrice: 250.00
    }
};

// DOM Elements
const cartCountElements = document.querySelectorAll('.cart-count');
const cartLinkElements = document.querySelectorAll('.cart-link');
const cartItemsContainer = document.querySelector('.cart-items');
const emptyCartMessage = document.querySelector('.empty-cart-message');
const cartSummary = document.querySelector('.cart-summary');
const subtotalElement = document.querySelector('.subtotal');
const totalElement = document.querySelector('.total-amount');
const checkoutBtn = document.querySelector('.checkout-btn');
const checkoutModal = document.querySelector('.checkout-modal');
const closeModalBtn = document.querySelector('.close-modal');
const modalCloseBtn = document.querySelector('.close-modal-btn');
const checkoutSteps = document.querySelectorAll('.checkout-step');
const nextStepBtns = document.querySelectorAll('.next-step');
const prevStepBtns = document.querySelectorAll('.prev-step');
const orderReference = document.querySelector('.order-reference');
const confirmationEmail = document.querySelector('.confirmation-email');
const orderNumber = document.querySelector('.order-number');
const downloadInvoiceBtn = document.querySelector('.download-invoice');

// Initialize cart when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    updateCartCount();
    renderCartItems();
    setupEventListeners();
    generateOrderReference();
    addInvoiceDownloadButton();
});

// Generate random order reference
function generateOrderReference() {
    if (orderReference) {
        orderReference.textContent = 'CHE-' + Math.floor(1000 + Math.random() * 9000);
        if (orderNumber) {
            orderNumber.textContent = orderReference.textContent;
        }
    }
}

// Calculate price for an item considering special pricing
function calculateItemPrice(productId, quantity) {
    const specialPricing = SPECIAL_PRICING[productId];
    
    if (!specialPricing) {
        // If no special pricing, use the product's price from the cart
        const item = cart.find(item => item.id === productId);
        return item ? parseFloat(item.price.replace('R', '')) * quantity : 0;
    }

    const { singlePrice, bulkQuantity, bulkPrice } = specialPricing;
    
    if (quantity >= bulkQuantity) {
        const bulkSets = Math.floor(quantity / bulkQuantity);
        const remainingItems = quantity % bulkQuantity;
        return (bulkSets * bulkPrice) + (remainingItems * singlePrice);
    }
    
    return quantity * singlePrice;
}

// Set up all event listeners
function setupEventListeners() {
    // Checkout button
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckoutModal);
    }

    // Modal close buttons
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeCheckoutModal);
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeCheckoutModal);
    }

    // Next step buttons in checkout
    nextStepBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const nextStep = this.getAttribute('data-next');
            validateStepTransition(this, nextStep);
        });
    });

    // Previous step buttons in checkout
    prevStepBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const prevStep = this.getAttribute('data-prev');
            goToStep(prevStep);
        });
    });

    // Download invoice button
    if (downloadInvoiceBtn) {
        downloadInvoiceBtn.addEventListener('click', generatePDFInvoice);
    }

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
        if (event.target === checkoutModal) {
            closeCheckoutModal();
        }
    });

    // Payment proof upload handler
    const proofInput = document.getElementById('proof-payment');
    if (proofInput) {
        proofInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                showCartNotification('Payment proof selected', 'success');
            }
        });
    }
}

// Add invoice download button to step 2
function addInvoiceDownloadButton() {
    const step2 = document.querySelector('.step-2 .step-content');
    if (!step2) return;

    const existingBtn = step2.querySelector('.invoice-download-btn');
    if (existingBtn) return;

    const downloadContainer = document.createElement('div');
    downloadContainer.className = 'invoice-download-container';

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'cta-button invoice-download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-file-download"></i> Download Invoice';
    downloadBtn.addEventListener('click', generatePDFInvoice);

    const instructions = document.createElement('p');
    instructions.className = 'invoice-instructions';
    instructions.innerHTML = '<i class="fas fa-info-circle"></i> Invoice will download automatically. If it doesn\'t, click the button below.';

    downloadContainer.appendChild(instructions);
    downloadContainer.appendChild(downloadBtn);

    const firstStep = step2.querySelector('.payment-step');
    if (firstStep) {
        firstStep.insertBefore(downloadContainer, firstStep.firstChild);
    }

    // Add event listener for when step 2 becomes active
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.attributeName === 'class') {
                const currentClass = mutation.target.className;
                if (currentClass.includes('active') && currentClass.includes('step-2')) {
                    // Only download if not already downloaded
                    if (!invoiceDownloaded) {
                        generatePDFInvoice();
                    }
                }
            }
        });
    });

    // Start observing step-2 for class changes
    const step2Element = document.querySelector('.step-2');
    if (step2Element) {
        observer.observe(step2Element, { attributes: true });
    }
}

// Validate step transition with requirements
function validateStepTransition(button, nextStep) {
    const currentStep = button.closest('.checkout-step').classList[1].split('-')[1];

    // Step 1 to Step 2: Validate shipping info
    if (currentStep === '1' && nextStep === '2') {
        if (validateShippingForm()) {
            goToStep(nextStep);
        }
    }
    // Step 2 to Step 3: Validate invoice download and payment proof
    else if (currentStep === '2' && nextStep === '3') {
        const proofInput = document.getElementById('proof-payment');

        if (!invoiceDownloaded) {
            showCartNotification('Please download the invoice first', 'error');
            return;
        }

        if (!proofInput || proofInput.files.length === 0) {
            showCartNotification('Please upload proof of payment', 'error');
            return;
        }

        // Show processing spinner
        const spinner = document.querySelector('.upload-spinner');
        if (spinner) spinner.style.display = 'flex';

        // Process payment proof
        processPaymentProof(proofInput.files[0])
            .then(success => {
                if (success) {
                    goToStep(nextStep);
                }
            });
    }
    // Other transitions
    else {
        goToStep(nextStep);
    }
}

// Validate shipping form
function validateShippingForm() {
    const requiredFields = ['full-name', 'email', 'phone', 'address', 'city', 'postal-code', 'province'];
    let isValid = true;

    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field || !field.value.trim()) {
            showCartNotification(`Please fill in ${fieldId.replace('-', ' ')}`, 'error');
            isValid = false;
        }
    });

    return isValid;
}

// Process payment proof upload
async function processPaymentProof(file) {
    try {
        const spinner = document.querySelector('.upload-spinner');
        if (spinner) spinner.style.display = 'flex';

        // Get customer details from the form
        const customerName = document.getElementById('full-name')?.value || 'Customer';
        const customerEmail = document.getElementById('email')?.value || 'No email provided';
        const customerPhone = document.getElementById('phone')?.value || 'No phone provided';
        const customerAddress = document.getElementById('address')?.value || 'No address provided';
        const customerCity = document.getElementById('city')?.value || 'No city provided';
        const customerPostalCode = document.getElementById('postal-code')?.value || 'No postal code provided';
        const customerProvince = document.getElementById('province')?.value || 'No province provided';

        // Prepare order details with special pricing applied
        let orderDetails = cart.map(item => {
            const price = calculateItemPrice(item.id, item.quantity);
            return `${item.name} (Qty: ${item.quantity}) - R${price.toFixed(2)}`;
        }).join('\n');

        const subtotal = cart.reduce((total, item) => {
            return total + calculateItemPrice(item.id, item.quantity);
        }, 0);
        
        const total = subtotal + STANDARD_SHIPPING_FEE;

        // Create FormData for order submission
        const orderFormData = new FormData();
        orderFormData.append('_cc', 'cheyliasingh3@gmail.com');
        orderFormData.append('_subject', `New Order: ${orderReference.textContent}`);
        orderFormData.append('Order Reference', orderReference.textContent);
        orderFormData.append('Customer Name', customerName);
        orderFormData.append('Customer Email', customerEmail);
        orderFormData.append('Customer Phone', customerPhone);
        orderFormData.append('Shipping Address', `${customerAddress}, ${customerCity}, ${customerPostalCode}, ${customerProvince}`);
        orderFormData.append('Order Details', orderDetails);
        orderFormData.append('Subtotal', `R${subtotal.toFixed(2)}`);
        orderFormData.append('Shipping Fee', `R${STANDARD_SHIPPING_FEE.toFixed(2)}`);
        orderFormData.append('Total Amount', `R${total.toFixed(2)}`);

        // Send order details first
        const orderResponse = await fetch('https://formsubmit.co/ajax/cheyliasingh3@gmail.com', {
            method: 'POST',
            body: orderFormData
        });

        if (!orderResponse.ok) {
            throw new Error('Failed to submit order details');
        }

        // Then send payment proof if file exists
        if (file) {
            const paymentFormData = new FormData();
            paymentFormData.append('_cc', 'cheyliasingh3@gmail.com');
            paymentFormData.append('_subject', `Payment Proof for Order ${orderReference.textContent}`);
            paymentFormData.append('Order Reference', orderReference.textContent);
            paymentFormData.append('Customer Name', customerName);
            paymentFormData.append('Customer Email', customerEmail);
            paymentFormData.append('proof', file);

            const paymentResponse = await fetch('https://formsubmit.co/ajax/cheyliasingh3@gmail.com', {
                method: 'POST',
                body: paymentFormData
            });

            if (!paymentResponse.ok) {
                throw new Error('Failed to submit payment proof');
            }
        }

        showCartNotification('Order and payment proof successfully submitted', 'success');
        return true;

    } catch (error) {
        console.error('Submission error:', error);
        showCartNotification('Failed to complete submission. Please try again or contact support.', 'error');
        return false;
    } finally {
        const spinner = document.querySelector('.upload-spinner');
        if (spinner) spinner.style.display = 'none';
    }
}

// Navigate between checkout steps
function goToStep(stepNumber) {
    // Update step indicators
    document.querySelectorAll('.step').forEach(step => {
        if (parseInt(step.getAttribute('data-step')) <= parseInt(stepNumber)) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    // Show/hide steps
    checkoutSteps.forEach(step => {
        if (step.classList.contains(`step-${stepNumber}`)) {
            step.classList.add('active');

            // Automatically download invoice when step 2 becomes active
            if (stepNumber === '2' && !invoiceDownloaded) {
                generatePDFInvoice();
            }
        } else {
            step.classList.remove('active');
        }
    });

    // Scroll to top of modal
    document.querySelector('.modal-content').scrollTop = 0;
}

// Generate professional PDF invoice
function generatePDFInvoice() {
    // Check if jsPDF is already loaded
    if (window.jspdf) {
        createPDF();
    } else {
        // Load jsPDF library dynamically
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = createPDF;
        script.onerror = function () {
            showCartNotification('Failed to load PDF generator. Please try again.', 'error');
        };
        document.head.appendChild(script);
    }

    function createPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Invoice header
            doc.setFontSize(22);
            doc.setTextColor(239, 93, 168); // CHE pink color
            doc.text('CHE COSMETICS', 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('Tel: +27 66 207 4523 | Email: cheyliasingh3@gmail.com', 105, 32, { align: 'center' });

            // Invoice title
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.text('INVOICE', 105, 45, { align: 'center' });

            // Invoice details
            doc.setFontSize(10);
            doc.text(`Invoice #: ${orderReference.textContent}`, 15, 55);
            doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 60);

            // Customer details
            const customerName = document.getElementById('full-name')?.value || 'Customer Name';
            const customerEmail = document.getElementById('email')?.value || 'customer@email.com';
            const customerAddress = document.getElementById('address')?.value || 'Customer Address';

            doc.text(`Bill To:`, 15, 70);
            doc.text(customerName, 15, 75);
            doc.text(customerEmail, 15, 80);
            doc.text(customerAddress, 15, 85);

            // Table header
            doc.setFillColor(239, 93, 168);
            doc.setTextColor(255, 255, 255);
            doc.rect(15, 95, 180, 8, 'F');
            doc.text('Item', 20, 100);
            doc.text('Price', 100, 100);
            doc.text('Qty', 140, 100);
            doc.text('Total', 170, 100);

            // Table rows with special pricing applied
            doc.setTextColor(0, 0, 0);
            let y = 110;
            let subtotal = 0;

            cart.forEach(item => {
                const itemTotal = calculateItemPrice(item.id, item.quantity);
                subtotal += itemTotal;

                // Check if this item has special pricing
                const specialPricing = SPECIAL_PRICING[item.id];
                let priceText = `R${(itemTotal / item.quantity).toFixed(2)}`;
                
                if (specialPricing && item.quantity >= specialPricing.bulkQuantity) {
                    const bulkSets = Math.floor(item.quantity / specialPricing.bulkQuantity);
                    const remainingItems = item.quantity % specialPricing.bulkQuantity;
                    
                    if (remainingItems > 0) {
                        priceText = `${bulkSets} × R${specialPricing.bulkPrice.toFixed(2)} + ${remainingItems} × R${specialPricing.singlePrice.toFixed(2)}`;
                    } else {
                        priceText = `${bulkSets} × R${specialPricing.bulkPrice.toFixed(2)}`;
                    }
                }

                doc.text(item.name, 20, y);
                doc.text(priceText, 100, y);
                doc.text(item.quantity.toString(), 140, y);
                doc.text(`R${itemTotal.toFixed(2)}`, 170, y);
                y += 7;
            });

            // Totals
            y += 10;
            doc.setFontSize(12);
            doc.text(`Subtotal: R${subtotal.toFixed(2)}`, 150, y);
            y += 7;

            doc.text(`Shipping: R${STANDARD_SHIPPING_FEE.toFixed(2)}`, 150, y);
            y += 7;

            const total = subtotal + STANDARD_SHIPPING_FEE;
            doc.setFont('helvetica', 'bold');
            doc.text(`Total: R${total.toFixed(2)}`, 150, y);
            doc.setFont('helvetica', 'normal');

            // Payment instructions
            y += 15;
            doc.setFontSize(10);
            doc.setTextColor(239, 93, 168);
            doc.text('PAYMENT INSTRUCTIONS', 105, y, { align: 'center' });
            y += 7;
            doc.setTextColor(0, 0, 0);
            doc.text('Please make payment to:', 15, y);
            y += 7;
            doc.text('Bank: Capitec Bank', 20, y);
            y += 7;
            doc.text('Account Name: MISS C SINGH', 20, y);
            y += 7;
            doc.text('Account Number: 2247161800', 20, y);
            y += 7;
            doc.text('Branch Code: 470010', 20, y);
            y += 7;
            doc.text(`Reference: ${orderReference.textContent}`, 20, y);

            // Thank you message
            y += 15;
            doc.setFontSize(12);
            doc.setTextColor(239, 93, 168);
            doc.text('Thank you for your purchase!', 105, y, { align: 'center' });

            // Save the PDF
            doc.save(`CHE_Cosmetics_Invoice_${orderReference.textContent}.pdf`);

            // Mark invoice as downloaded
            invoiceDownloaded = true;
            showCartNotification('Invoice downloaded. Please proceed with payment.', 'success');

            // Update download button
            const downloadBtn = document.querySelector('.invoice-download-btn');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-check-circle"></i> Invoice Downloaded';
                downloadBtn.classList.add('downloaded');
                downloadBtn.disabled = true;
            }
        } catch (error) {
            console.error('PDF generation error:', error);
            showCartNotification('Failed to generate invoice. Please try again.', 'error');
        }
    }
}

// Open checkout modal
function openCheckoutModal() {
    if (cart.length === 0) {
        showCartNotification('Your cart is empty', 'error');
        return;
    }

    checkoutModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    goToStep('1');
    generateOrderReference();
}

// Close checkout modal
function closeCheckoutModal() {
    checkoutModal.style.display = 'none';
    document.body.style.overflow = '';
}

// Complete order and clear cart
function completeOrder() {
    const email = document.getElementById('email')?.value || 'your@email.com';
    if (confirmationEmail) confirmationEmail.textContent = email;

    // Generate invoice before clearing cart
    generatePDFInvoice();

    // Clear cart
    cart = [];
    saveCart();
    updateCartCount();

    // Show confirmation
    goToStep('3');
}

// Add item to cart
function addToCart(product) {
    // Check if product already exists in cart
    const existingItem = cart.find(item => item.id === product.id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart();
    updateCartCount();
    showCartNotification(`${product.name} added to cart`);
}

// Remove item from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCartItems();
}

// Update item quantity in cart
function updateCartItemQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);

    if (item) {
        if (newQuantity > 0) {
            item.quantity = newQuantity;
        } else {
            removeFromCart(productId);
        }
    }

    saveCart();
    renderCartItems();
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cheCosmeticsCart', JSON.stringify(cart));
}

// Update cart count in header
function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });

    // Always link to the cart page, even when empty
    cartLinkElements.forEach(link => {
        link.setAttribute('href', 'shopping-cart.html');
    });
}

// Render cart items on cart page with special pricing
function renderCartItems() {
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';

    if (cart.length === 0) {
        cartItemsContainer.appendChild(emptyCartMessage.cloneNode(true));
        if (cartSummary) cartSummary.style.display = 'none';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    if (cartSummary) cartSummary.style.display = 'block';
    if (checkoutBtn) checkoutBtn.disabled = false;

    let subtotal = 0;

    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';

        const itemTotal = calculateItemPrice(item.id, item.quantity);
        subtotal += itemTotal;

        // Check if this item has special pricing
        const specialPricing = SPECIAL_PRICING[item.id];
        let priceText = `R${(itemTotal / item.quantity).toFixed(2)} each`;
        let specialPriceText = '';
        
        if (specialPricing && item.quantity >= specialPricing.bulkQuantity) {
            const bulkSets = Math.floor(item.quantity / specialPricing.bulkQuantity);
            const remainingItems = item.quantity % specialPricing.bulkQuantity;
            
            if (remainingItems > 0) {
                priceText = `${bulkSets} × R${specialPricing.bulkPrice.toFixed(2)} (${specialPricing.bulkQuantity} items) + ${remainingItems} × R${specialPricing.singlePrice.toFixed(2)}`;
            } else {
                priceText = `${bulkSets} × R${specialPricing.bulkPrice.toFixed(2)} (${specialPricing.bulkQuantity} items)`;
            }
            
            specialPriceText = `<p class="special-price-notice"><i class="fas fa-tag"></i> Special: Buy ${specialPricing.bulkQuantity} for R${specialPricing.bulkPrice.toFixed(2)}</p>`;
        }

        itemElement.innerHTML = `
            <div class="cart-item-image">
                <img src="images/${item.image}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h4 class="cart-item-title">${item.name}</h4>
                <p class="cart-item-price">${priceText}</p>
                ${specialPriceText}
                <div class="cart-item-actions">
                    <div class="quantity-selector">
                        <button class="quantity-btn minus" data-id="${item.id}">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity}" min="1" data-id="${item.id}">
                        <button class="quantity-btn plus" data-id="${item.id}">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i> Remove
                    </button>
                </div>
            </div>
            <div class="cart-item-total">
                R${itemTotal.toFixed(2)}
            </div>
        `;

        cartItemsContainer.appendChild(itemElement);
    });

    if (subtotalElement) subtotalElement.textContent = `R${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `R${(subtotal + STANDARD_SHIPPING_FEE).toFixed(2)}`;

    // Add event listeners to quantity controls
    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const productId = this.getAttribute('data-id');
            const input = this.parentElement.querySelector('.quantity-input');
            let quantity = parseInt(input.value);

            if (this.classList.contains('plus')) {
                quantity += 1;
            } else {
                quantity = Math.max(1, quantity - 1);
            }

            input.value = quantity;
            updateCartItemQuantity(productId, quantity);
        });
    });

    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', function () {
            const productId = this.getAttribute('data-id');
            const quantity = Math.max(1, parseInt(this.value) || 1);
            this.value = quantity;
            updateCartItemQuantity(productId, quantity);
        });
    });

    document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', function () {
            const productId = this.getAttribute('data-id');
            removeFromCart(productId);
        });
    });
}

// Show cart notification
function showCartNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `cart-notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add styles for notifications and new elements
const style = document.createElement('style');
style.textContent = `
    .cart-notification {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .cart-notification.show {
        transform: translateY(0);
        opacity: 1;
    }
    .cart-notification.success {
        background-color: #4CAF50;
    }
    .cart-notification.error {
        background-color: #f44336;
    }
    .cart-notification.warning {
        background-color: #ff9800;
    }
    .invoice-download-container {
        margin-bottom: 20px;
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px dashed #ddd;
    }
    .invoice-download-btn {
        width: 100%;
        margin-top: 10px;
    }
    .invoice-download-btn.downloaded {
        background-color: #4CAF50 !important;
    }
    .invoice-instructions {
        color: #666;
        font-size: 0.9em;
        margin-bottom: 5px;
    }
    .invoice-instructions i {
        margin-right: 5px;
        color: #2396d8;
    }
    .upload-spinner {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255,255,255,0.9);
        z-index: 1000;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }
    .upload-spinner .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #ef5da8;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 15px;
    }
    .special-price-notice {
        color: #ef5da8;
        font-size: 0.9em;
        margin: 5px 0;
    }
    .cart-item-total {
        font-weight: bold;
        color: #ef5da8;
        margin-left: auto;
        padding-left: 20px;
        min-width: 80px;
        text-align: right;
    }
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);
