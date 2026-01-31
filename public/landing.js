// Storage keys - matching those in script.js
const STORAGE_KEYS = {
    GOOGLE_CLIENT_ID: 'google_client_id',
    OPENAI_API_KEY: 'openai_api_key',
    GEMINI_API_KEY: 'gemini_api_key',
    UNDETECTABLE_API_KEY: 'undetectable_api_key'
};

document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    
    // Auto-fill keys from previous chat if empty
    // NOTE: Do NOT hardcode secrets in source control.
    // Leave these empty and let users paste keys in the UI (stored in their browser localStorage).
    const chatOpenAIKey = '';
    const chatGeminiKey = '';
    const chatStripeKey = 'pk_live_51StsFSFiJCDaNvF8bZBWHJE1WVODOnAek3kmq7eyIaaTOO5A8HfGmdS3ejArloPzSjhnqJcgDLjFmQZ0YMey4MXt00wPqCXoq8';
    const chatPriceId = 'price_1Su8EXFiJCDaNvF8BlrcMWLQ';

    const openaiInput = document.getElementById('openai-api-key');
    const geminiInput = document.getElementById('gemini-api-key');

    if (chatOpenAIKey && !openaiInput.value && !localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY)) {
        openaiInput.value = chatOpenAIKey;
        localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, chatOpenAIKey);
    }
    if (chatGeminiKey && !geminiInput.value && !localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY)) {
        geminiInput.value = chatGeminiKey;
        localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, chatGeminiKey);
    }
    if (!localStorage.getItem('stripe_publishable_key')) {
        localStorage.setItem('stripe_publishable_key', chatStripeKey);
    }
    if (!localStorage.getItem('stripe_price_id')) {
        localStorage.setItem('stripe_price_id', chatPriceId);
    }
    
    updateStatus();

    document.getElementById('save-config-btn').addEventListener('click', saveConfig);
});

function loadConfig() {
    document.getElementById('google-client-id').value = localStorage.getItem(STORAGE_KEYS.GOOGLE_CLIENT_ID) || '';
    document.getElementById('openai-api-key').value = localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY) || '';
    document.getElementById('gemini-api-key').value = localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY) || '';
    document.getElementById('undetectable-api-key').value = localStorage.getItem(STORAGE_KEYS.UNDETECTABLE_API_KEY) || '';
    
    updateStatus();
}

function saveConfig() {
    const googleId = document.getElementById('google-client-id').value.trim();
    const openaiKey = document.getElementById('openai-api-key').value.trim();
    const geminiKey = document.getElementById('gemini-api-key').value.trim();
    const undetectableKey = document.getElementById('undetectable-api-key').value.trim();

    if (googleId) localStorage.setItem(STORAGE_KEYS.GOOGLE_CLIENT_ID, googleId);
    if (openaiKey) localStorage.setItem(STORAGE_KEYS.OPENAI_API_KEY, openaiKey);
    if (geminiKey) localStorage.setItem(STORAGE_KEYS.GEMINI_API_KEY, geminiKey);
    if (undetectableKey) localStorage.setItem(STORAGE_KEYS.UNDETECTABLE_API_KEY, undetectableKey);

    updateStatus();
    alert('Configuration saved successfully!');
}

function updateStatus() {
    const statusDiv = document.getElementById('config-status');
    const hasOpenAI = !!localStorage.getItem(STORAGE_KEYS.OPENAI_API_KEY);
    const hasGemini = !!localStorage.getItem(STORAGE_KEYS.GEMINI_API_KEY);
    
    if (hasOpenAI && hasGemini) {
        statusDiv.textContent = '✅ AI Fully Configured (OpenAI + Gemini Fallback)';
        statusDiv.className = 'status-badge status-configured';
    } else if (hasOpenAI || hasGemini) {
        statusDiv.textContent = `⚠️ AI Partially Configured (${hasOpenAI ? 'OpenAI' : 'Gemini'} only)`;
        statusDiv.className = 'status-badge status-configured';
    } else {
        statusDiv.textContent = '❌ AI Not Configured (Regeneration will fail)';
        statusDiv.className = 'status-badge status-missing';
    }
}