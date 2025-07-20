/**
 * CHE COSMETICS - Complete Shopping Cart System
 * With mandatory invoice download and payment proof verification
 * Updated with special pricing for bulk purchases and enhanced UX
 * Includes robust return-from-PDF notification system
 * Now with automatic PDF download in new tab and invoice emailing
 * Version 2.4 - Immediate order confirmation emails
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
    checkReturnFromInvoice();

    // Check if we should suppress the empty cart notification
    if (sessionStorage.getItem('suppressCartNotification') === 'true') {
        sessionStorage.removeItem('suppressCartNotification');
    }
});

// Enhanced return from invoice check with invoice number matching
function checkReturnFromInvoice() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromInvoice = urlParams.has('fromInvoice') ||
        localStorage.getItem('returningFromInvoice') === 'true';

    if (fromInvoice) {
        // Clean up markers
        localStorage.removeItem('returningFromInvoice');
        history.replaceState(null, '', window.location.pathname);

        // Restore invoice number from local storage
        const savedInvoiceNumber = localStorage.getItem('currentInvoiceNumber');
        if (savedInvoiceNumber && orderReference) {
            orderReference.textContent = savedInvoiceNumber;
            if (orderNumber) {
                orderNumber.textContent = savedInvoiceNumber;
            }
        }

        // Open checkout modal immediately
        openCheckoutModal(true);

        // Navigate to step 2 and show notification
        setTimeout(() => {
            goToStep('2');
            showCartNotification('Please upload your payment proof to complete your order', 'info');
            document.getElementById('proof-payment')?.focus();
        }, 300);
    }
}

function openCheckoutModal(fromInvoice = false) {
    if (cart.length === 0 && !fromInvoice) {
        showCartNotification('Your cart is empty', 'error');
        return;
    }

    checkoutModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    if (!fromInvoice) {
        goToStep('1');
    }
    generateOrderReference();
}

function generateOrderReference() {
    const orderRefElements = document.querySelectorAll('.order-reference');
    if (!orderRefElements.length) return;

    // Generate a new number only if one doesn't exist
    if (!orderRefElements[0].textContent || orderRefElements[0].textContent === '1234') {
        const timestamp = Date.now().toString().slice(-4);
        const randomNum = Math.floor(100 + Math.random() * 900);
        const invoiceNumber = `CHE-${timestamp}${randomNum}`;

        // Update ALL elements with class 'order-reference'
        orderRefElements.forEach(el => {
            el.textContent = invoiceNumber;
        });

        if (orderNumber) {
            orderNumber.textContent = invoiceNumber;
        }
        localStorage.setItem('currentInvoiceNumber', invoiceNumber);
    }
}


function calculateItemPrice(productId, quantity) {
    const specialPricing = SPECIAL_PRICING[productId];

    if (!specialPricing) {
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

function setupEventListeners() {
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => openCheckoutModal());
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeCheckoutModal);
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeCheckoutModal);
    }

    nextStepBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const nextStep = this.getAttribute('data-next');
            validateStepTransition(this, nextStep);
        });
    });

    prevStepBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const prevStep = this.getAttribute('data-prev');
            goToStep(prevStep);
        });
    });

    if (downloadInvoiceBtn) {
        downloadInvoiceBtn.addEventListener('click', generatePDFInvoice);
    }

    window.addEventListener('click', function (event) {
        if (event.target === checkoutModal) {
            closeCheckoutModal();
        }
    });

    // Enhanced payment proof upload handler with visual feedback
    const proofInput = document.getElementById('proof-payment');
    if (proofInput) {
        proofInput.addEventListener('change', function () {
            if (this.files.length > 0) {
                const feedback = this.parentElement.querySelector('.upload-feedback');
                if (feedback) {
                    feedback.style.display = 'flex';
                }
                showCartNotification('Payment proof selected', 'success');
            }
        });
    }

    window.addEventListener('pageshow', function (event) {
        if (event.persisted || performance.navigation.type === 2) {
            const activeStep = document.querySelector('.checkout-step.active');
            if (activeStep && activeStep.classList.contains('step-2')) {
                showCartNotification('Please upload your payment proof to complete your order', 'info');
                document.getElementById('proof-payment')?.focus();
            }
        }
    });
}

function addInvoiceDownloadButton() {
    const step2 = document.querySelector('.step-2 .step-content');
    if (!step2) return;

    const existingContainer = step2.querySelector('.invoice-download-container');
    if (existingContainer) return;

    const downloadContainer = document.createElement('div');
    downloadContainer.className = 'invoice-download-container';

    const enhancedInstructions = document.createElement('div');
    enhancedInstructions.className = 'enhanced-instructions';
    enhancedInstructions.innerHTML = `
        <div class="instruction-step">
            <i class="fas fa-file-invoice-dollar"></i>
            <h4>Invoice Generated</h4>
            <p>Your invoice will be created with all payment details.</p>
        </div>
        <div class="instruction-step">
            <i class="fas fa-money-bill-wave"></i>
            <h4>Make Payment</h4>
            <p>Complete the payment using the banking details provided.</p>
        </div>
        <div class="instruction-step">
            <i class="fas fa-upload"></i>
            <h4>Return & Upload</h4>
            <p>Come back to this page and upload your payment proof below.</p>
            <p class="note"><i class="fas fa-info-circle"></i> The invoice opens in a new tab so this page remains open</p>
        </div>
    `;

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'cta-button invoice-download-btn';
    downloadBtn.innerHTML = '<i class="fas fa-file-download"></i> Generate Invoice';
    downloadBtn.addEventListener('click', generatePDFInvoice);

    const paymentDoneBtn = document.createElement('button');
    paymentDoneBtn.className = 'cta-button payment-done-btn';
    paymentDoneBtn.innerHTML = '<i class="fas fa-check-circle"></i> I\'ve Made Payment';
    paymentDoneBtn.addEventListener('click', function () {
        document.getElementById('proof-payment').click();
    });

    downloadContainer.appendChild(enhancedInstructions);
    downloadContainer.appendChild(downloadBtn);
    downloadContainer.appendChild(paymentDoneBtn);

    const firstStep = step2.querySelector('.payment-step');
    if (firstStep) {
        firstStep.insertBefore(downloadContainer, firstStep.firstChild);
    }
}

function validateStepTransition(button, nextStep) {
    const currentStep = button.closest('.checkout-step').classList[1].split('-')[1];
    const spinner = document.querySelector('.upload-spinner');

    if (currentStep === '1' && nextStep === '2') {
        if (validateShippingForm()) {
            goToStep(nextStep);
        }
    }
    else if (currentStep === '2' && nextStep === '3') {
        // Disable the button to prevent multiple submissions
        button.disabled = true;

        // Show spinner
        if (spinner) {
            spinner.style.display = 'flex';
            // Ensure spinner is on top
            spinner.style.zIndex = '1001';
        }

        // Process order
        processOrderWithoutPayment()
            .then(success => {
                if (success) {
                    completeOrder();
                    goToStep(nextStep);
                } else {
                    // Re-enable button if failed
                    button.disabled = false;
                }
            })
            .catch(error => {
                console.error('Order processing error:', error);
                showCartNotification('Failed to complete order. Please try again.', 'error');
                button.disabled = false;
            })
            .finally(() => {
                // Always hide spinner when done
                if (spinner) spinner.style.display = 'none';
            });
    }
    else {
        goToStep(nextStep);
    }
}

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

    const emailField = document.getElementById('email');
    if (emailField && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailField.value)) {
        showCartNotification('Please enter a valid email address', 'error');
        isValid = false;
    }

    return isValid;
}

async function processOrderWithoutPayment() {
    try {
        const customerName = document.getElementById('full-name')?.value || 'Customer';
        const customerEmail = document.getElementById('email')?.value || 'No email provided';
        const customerPhone = document.getElementById('phone')?.value || 'No phone provided';
        const customerAddress = document.getElementById('address')?.value || 'No address provided';
        const customerCity = document.getElementById('city')?.value || 'No city provided';
        const customerPostalCode = document.getElementById('postal-code')?.value || 'No postal code provided';
        const customerProvince = document.getElementById('province')?.value || 'No province provided';

        let orderDetails = cart.map(item => {
            const price = calculateItemPrice(item.id, item.quantity);
            return `${item.name} (Qty: ${item.quantity}) - R${price.toFixed(2)}`;
        }).join('\n');

        const subtotal = cart.reduce((total, item) => {
            return total + calculateItemPrice(item.id, item.quantity);
        }, 0);

        const total = subtotal + STANDARD_SHIPPING_FEE;

        // First send the order confirmation email
        await sendOrderConfirmationEmail(customerName, customerEmail, orderDetails, subtotal, total);

        // Then submit to FormSubmit
        const orderFormData = new FormData();
        orderFormData.append('_cc', 'cheyliasingh3@gmail.com');
        orderFormData.append('_subject', `New Order: ${orderReference.textContent}`);
        orderFormData.append('Order Reference', orderReference.textContent);
        orderFormData.append('full-name', customerName);
        orderFormData.append('email', customerEmail);
        orderFormData.append('phone', customerPhone);
        orderFormData.append('address', `${customerAddress}, ${customerCity}, ${customerPostalCode}, ${customerProvince}`);
        orderFormData.append('Order Details', orderDetails);
        orderFormData.append('Subtotal', `R${subtotal.toFixed(2)}`);
        orderFormData.append('Shipping Fee', `R${STANDARD_SHIPPING_FEE.toFixed(2)}`);
        orderFormData.append('Total Amount', `R${total.toFixed(2)}`);

        const proofInput = document.getElementById('proof-payment');

        if (proofInput && proofInput.files.length > 0) {
            orderFormData.append('Proof of Payment', proofInput.files[0]);  // ✅ Attach file
            orderFormData.append('Payment Status', 'Proof uploaded');       // ✅ Update status
        } else {
            orderFormData.append('Payment Status', 'Pending (No proof uploaded)');
        }


        const orderResponse = await fetch('https://formsubmit.co/ajax/cheyliasingh3@gmail.com', {
            method: 'POST',
            body: orderFormData
        });

        if (!orderResponse.ok) {
            throw new Error('Failed to submit order details');
        }

        showCartNotification('Order successfully submitted', 'success');
        return true;

    } catch (error) {
        console.error('Submission error:', error);
        showCartNotification('Failed to complete order. Please try again or contact support.', 'error');
        return false;
    } finally {
        const spinner = document.querySelector('.upload-spinner');
        if (spinner) spinner.style.display = 'none';
    }
}

async function sendOrderConfirmationEmail(customerName, customerEmail, orderDetails, subtotal, total) {
    try {
        const emailFormData = new FormData();
        emailFormData.append('_cc', customerEmail); // CC to customer
        emailFormData.append('_subject', `Your CHE Cosmetics Order: ${orderReference.textContent}`);
        emailFormData.append('Order Reference', orderReference.textContent);
        emailFormData.append('Customer Name', customerName);
        emailFormData.append('Order Details', orderDetails);
        emailFormData.append('Subtotal', `R${subtotal.toFixed(2)}`);
        emailFormData.append('Shipping Fee', `R${STANDARD_SHIPPING_FEE.toFixed(2)}`);
        emailFormData.append('Total Amount', `R${total.toFixed(2)}`);
        emailFormData.append('Banking Details', `
        Bank: Capitec Bank
        Account Name: MISS C SINGH
        Account Number: 2247161800
        Branch Code: 470010
        Reference: ${orderReference.textContent}
        `);
        emailFormData.append('_template', 'table');
        emailFormData.append('Instructions', 'Please use the invoice number above as your payment reference. Email this proof of payment to cheyliasingh3@gmail.com.');
        emailFormData.append('_template', 'table');

        const response = await fetch('https://formsubmit.co/ajax/cheyliasingh3@gmail.com', {
            method: 'POST',
            body: emailFormData
        });

        if (!response.ok) {
            throw new Error('Failed to send order confirmation email');
        }

        console.log('Order confirmation email sent successfully');
    } catch (error) {
        console.error('Email sending error:', error);
        // Don't fail the whole order if email fails
    }
}

function goToStep(stepNumber) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('current');
        if (parseInt(step.getAttribute('data-step')) <= parseInt(stepNumber)) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    const currentStep = document.querySelector(`.step[data-step="${stepNumber}"]`);
    if (currentStep) currentStep.classList.add('current');

    checkoutSteps.forEach(step => {
        if (step.classList.contains(`step-${stepNumber}`)) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });

    document.querySelector('.modal-content').scrollTop = 0;
}

function generatePDFInvoice() {
    if (window.jspdf) {
        createPDF();
    } else {
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
            doc.setTextColor(239, 93, 168);
            doc.text('CHE COSMETICS', 105, 20, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text('Tel: +27 66 207 4523 | Email: cheyliasingh3@gmail.com', 105, 32, { align: 'center' });

            // Invoice title
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.text('INVOICE', 105, 45, { align: 'center' });

            // Invoice details
            const invoiceNumber = orderReference.textContent;
            localStorage.setItem('currentInvoiceNumber', invoiceNumber);
            localStorage.setItem('returningFromInvoice', 'true');

            doc.setFontSize(10);
            doc.text(`Invoice #: ${invoiceNumber}`, 15, 55);
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

            // Table rows
            doc.setTextColor(0, 0, 0);
            let y = 110;
            let subtotal = 0;

            cart.forEach(item => {
                const itemTotal = calculateItemPrice(item.id, item.quantity);
                subtotal += itemTotal;

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
            doc.text(`Reference: ${invoiceNumber}`, 20, y);

            // Thank you message
            y += 10;
            doc.setFontSize(12);
            doc.setTextColor(239, 93, 168);
            doc.text('Thank you for your purchase!', 105, y, { align: 'center' });

            // Generate PDF output
            const pdfOutput = doc.output('blob');
            const pdfUrl = URL.createObjectURL(pdfOutput);

            const a = document.createElement('a');
            a.href = pdfUrl;
            a.download = `CHE_Invoice_${invoiceNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setTimeout(() => {
                URL.revokeObjectURL(pdfUrl);
            }, 100);

            invoiceDownloaded = true;
            showCartNotification('Invoice downloaded successfully', 'success');

            // Update the download button
            const downloadBtn = document.querySelector('.invoice-download-btn');
            if (downloadBtn) {
                downloadBtn.innerHTML = '<i class="fas fa-check-circle"></i> Invoice Downloaded';
                downloadBtn.classList.add('downloaded');
                downloadBtn.disabled = true;
            }

            // Add a prominent "Return to Payment" button
            const returnContainer = document.querySelector('.invoice-download-container');
            if (returnContainer) {
                const existingReturnBtn = returnContainer.querySelector('.return-to-payment-btn');
                if (!existingReturnBtn) {
                    const returnBtn = document.createElement('button');
                    returnBtn.className = 'cta-button return-to-payment-btn';
                    returnBtn.innerHTML = '<i class="fas fa-arrow-circle-left"></i> Return to Payment Upload';
                    returnBtn.addEventListener('click', function () {
                        // Focus on the payment proof upload field
                        document.getElementById('proof-payment')?.focus();
                        showCartNotification('Please upload your payment proof', 'info');
                    });

                    // Insert after the download button
                    const paymentDoneBtn = returnContainer.querySelector('.payment-done-btn');
                    if (paymentDoneBtn) {
                        returnContainer.insertBefore(returnBtn, paymentDoneBtn.nextSibling);
                    } else {
                        returnContainer.appendChild(returnBtn);
                    }
                }
            }

            sendInvoiceEmail();

        } catch (error) {
            console.error('PDF generation error:', error);
            showCartNotification('Failed to generate invoice. Please try again.', 'error');
        }
    }
}

async function sendInvoiceEmail() {
    try {
        const customerName = document.getElementById('full-name')?.value || 'Customer';
        const customerEmail = document.getElementById('email')?.value || 'No email provided';

        let orderDetails = cart.map(item => {
            const price = calculateItemPrice(item.id, item.quantity);
            return `${item.name} (Qty: ${item.quantity}) - R${price.toFixed(2)}`;
        }).join('\n');

        const subtotal = cart.reduce((total, item) => {
            return total + calculateItemPrice(item.id, item.quantity);
        }, 0);

        const total = subtotal + STANDARD_SHIPPING_FEE;

        const emailFormData = new FormData();
        emailFormData.append('_cc', 'cheyliasingh3@gmail.com');
        emailFormData.append('_subject', `Invoice Generated: ${orderReference.textContent}`);
        emailFormData.append('Order Reference', orderReference.textContent);
        emailFormData.append('full-name', customerName);
        emailFormData.append('email', customerEmail);
        emailFormData.append('Order Details', orderDetails);
        emailFormData.append('Subtotal', `R${subtotal.toFixed(2)}`);
        emailFormData.append('Shipping Fee', `R${STANDARD_SHIPPING_FEE.toFixed(2)}`);
        emailFormData.append('Total Amount', `R${total.toFixed(2)}`);
        emailFormData.append('Banking Details', `
        Bank: Capitec Bank
        Account Name: MISS C SINGH
        Account Number: 2247161800
        Branch Code: 470010
        Reference: ${orderReference.textContent}
        `);
        emailFormData.append('_template', 'table');

        const response = await fetch('https://formsubmit.co/ajax/cheyliasingh3@gmail.com', {
            method: 'POST',
            body: emailFormData
        });

        if (!response.ok) {
            throw new Error('Failed to send invoice email');
        }

        console.log('Invoice details emailed successfully');
    } catch (error) {
        console.error('Email sending error:', error);
    }
}

function closeCheckoutModal() {
    checkoutModal.style.display = 'none';
    document.body.style.overflow = '';
}

function completeOrder() {
    const email = document.getElementById('email')?.value || 'your@email.com';
    if (confirmationEmail) confirmationEmail.textContent = email;

    if (document.querySelector('.step-3.active')) {
        cart = [];
        saveCart();
        updateCartCount();
        sessionStorage.setItem('suppressCartNotification', 'true');
    }

    const continueShoppingBtn = document.querySelector('.continue-shopping-btn');
    if (continueShoppingBtn) {
        continueShoppingBtn.addEventListener('click', function (e) {
            e.preventDefault();
            sessionStorage.setItem('suppressCartNotification', 'true');
            window.location.href = 'index.html';
        });
    }
}

window.addToCart = function (product) {
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

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartCount();
    renderCartItems();
}

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

function saveCart() {
    localStorage.setItem('cheCosmeticsCart', JSON.stringify(cart));
}

function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + item.quantity, 0);

    cartCountElements.forEach(element => {
        element.textContent = totalItems;
    });

    cartLinkElements.forEach(link => {
        link.setAttribute('href', 'shopping-cart.html');
    });
}

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

function showCartNotification(message, type = 'success') {
    if (message === 'Your cart is empty' && sessionStorage.getItem('suppressCartNotification') === 'true') {
        return;
    }

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
    .cart-notification.info {
        background-color: #2196F3;
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
    .enhanced-instructions {
        margin-bottom: 20px;
        border-bottom: 1px solid #eee;
        padding-bottom: 15px;
    }
    .instruction-step {
        display: flex;
        align-items: flex-start;
        margin-bottom: 15px;
    }
    .instruction-step i {
        color: #ef5da8;
        font-size: 1.2em;
        margin-right: 10px;
        margin-top: 3px;
    }
    .instruction-step h4 {
        margin: 0 0 5px 0;
        font-size: 1em;
    }
    .instruction-step p {
        margin: 0;
        font-size: 0.9em;
        color: #666;
    }
    .instruction-step p.note {
        font-size: 0.8em;
        color: #888;
        margin-top: 5px;
    }
    .payment-done-btn {
        margin-top: 10px;
        background-color: #4CAF50 !important;
    }
    .payment-done-btn:hover {
        background-color: #3e8e41 !important;
    }
    .checkout-steps .step.current {
        background: #ef5da8;
        color: white;
        border-color: #ef5da8;
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
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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
    .email-status {
        margin-top: 10px;
        font-size: 0.9em;
        color: #666;
    }
    .email-status.success {
        color: #4CAF50;
    }
    .email-status.error {
        color: #f44336;
    }

    .return-to-payment-btn {
    margin-top: 10px;
    background-color: #2196F3 !important;
    width: 100%;
}

.return-to-payment-btn:hover {
    background-color: #0b7dda !important;
}
    .upload-feedback {
        margin-top: 10px;
        padding: 10px;
        background: #e8f5e9;
        border-radius: 4px;
        color: #2e7d32;
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .upload-feedback i {
        color: #2e7d32;
    }
    .upload-hint {
        font-size: 0.8em;
        color: #666;
        margin-top: 5px;
    }
`;
document.head.appendChild(style);
