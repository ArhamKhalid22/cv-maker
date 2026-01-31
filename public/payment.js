const STORAGE_KEYS = {
    STRIPE_PUBLISHABLE_KEY: 'stripe_publishable_key',
    STRIPE_PRICE_ID: 'stripe_price_id',
    CURRENT_USER: 'currentUser'
};

const publishableKeyInput = document.getElementById('stripe-publishable-key');
const priceIdInput = document.getElementById('stripe-price-id');
const saveStripeBtn = document.getElementById('save-stripe-config');
const configStatus = document.getElementById('stripe-config-status');
const paymentMessage = document.getElementById('payment-message');
const paymentUser = document.getElementById('payment-user');

function updateConfigStatus() {
    const publishableKey = localStorage.getItem(STORAGE_KEYS.STRIPE_PUBLISHABLE_KEY);
    const priceId = localStorage.getItem(STORAGE_KEYS.STRIPE_PRICE_ID);
    if (publishableKey && priceId) {
        configStatus.textContent = 'Stripe settings saved.';
        configStatus.classList.remove('muted');
    } else {
        configStatus.textContent = 'Not configured yet.';
        configStatus.classList.add('muted');
    }
}

function updateUserStatus() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
    if (currentUser) {
        paymentUser.textContent = `Signed in as ${currentUser.name || currentUser.email}`;
        paymentUser.classList.remove('muted');
    } else {
        paymentUser.textContent = 'Not signed in';
        paymentUser.classList.add('muted');
    }
}

function saveStripeConfig() {
    const publishableKey = publishableKeyInput.value.trim();
    const priceId = priceIdInput.value.trim();

    if (publishableKey) {
        localStorage.setItem(STORAGE_KEYS.STRIPE_PUBLISHABLE_KEY, publishableKey);
    } else {
        localStorage.removeItem(STORAGE_KEYS.STRIPE_PUBLISHABLE_KEY);
    }

    if (priceId) {
        localStorage.setItem(STORAGE_KEYS.STRIPE_PRICE_ID, priceId);
    } else {
        localStorage.removeItem(STORAGE_KEYS.STRIPE_PRICE_ID);
    }

    updateConfigStatus();
    showMessage('Stripe settings saved.', true);
}

function showMessage(message, isSuccess = false) {
    paymentMessage.textContent = message;
    paymentMessage.classList.toggle('muted', !isSuccess);
}

async function startStripeCheckout() {
    const currentUser = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
    if (!currentUser) {
        showMessage('Please sign in before starting payment.');
        return;
    }

    if (typeof Stripe !== 'function') {
        showMessage('Stripe failed to load. Check your connection and disable ad blockers.');
        return;
    }

    const publishableKey = localStorage.getItem(STORAGE_KEYS.STRIPE_PUBLISHABLE_KEY);
    const priceId = localStorage.getItem(STORAGE_KEYS.STRIPE_PRICE_ID);

    if (!publishableKey || !priceId) {
        showMessage('Add a Stripe publishable key and price ID to continue.');
        return;
    }

    const stripe = Stripe(publishableKey);
    const origin = window.location.origin;

    const { error } = await stripe.redirectToCheckout({
        lineItems: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        successUrl: `${origin}/payment-success`,
        cancelUrl: `${origin}/payment-cancel`,
        customerEmail: currentUser.email || undefined
    });

    if (error) {
        console.error('Stripe checkout error:', error);
        showMessage(error.message || 'Unable to start checkout. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Auto-fill keys from previous chat if empty
    const chatStripeKey = 'pk_live_51StsFSFiJCDaNvF8bZBWHJE1WVODOnAek3kmq7eyIaaTOO5A8HfGmdS3ejArloPzSjhnqJcgDLjFmQZ0YMey4MXt00wPqCXoq8';
    const chatPriceId = 'price_1Su8EXFiJCDaNvF8BlrcMWLQ';

    if (!localStorage.getItem(STORAGE_KEYS.STRIPE_PUBLISHABLE_KEY)) {
        localStorage.setItem(STORAGE_KEYS.STRIPE_PUBLISHABLE_KEY, chatStripeKey);
    }
    if (!localStorage.getItem(STORAGE_KEYS.STRIPE_PRICE_ID)) {
        localStorage.setItem(STORAGE_KEYS.STRIPE_PRICE_ID, chatPriceId);
    }

    publishableKeyInput.value = localStorage.getItem(STORAGE_KEYS.STRIPE_PUBLISHABLE_KEY) || '';
    priceIdInput.value = localStorage.getItem(STORAGE_KEYS.STRIPE_PRICE_ID) || '';

    updateConfigStatus();
    updateUserStatus();

    saveStripeBtn.addEventListener('click', saveStripeConfig);
    document.getElementById('stripe-checkout-btn').addEventListener('click', startStripeCheckout);
});
