# 💳 Stripe Deposit System - Frontend Implementation Guide

## 🎯 Overview

Sistem deposit menggunakan **Stripe** untuk memproses pembayaran credit card. Frontend perlu melakukan 3 langkah sederhana:

1. **Create Deposit** → Backend API
2. **Process Payment** → Stripe Elements
3. **Confirm Deposit** → Backend API

## 🔄 How It Works (High Level)

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant S as Stripe

    Note over U,S: Step 1: Initialize
    U->>F: Input amount & card details
    F->>B: POST /payments/deposits
    Note right of F: { amount: 25, currency: "usd" }
    B->>S: Create Payment Intent
    S-->>B: Return client_secret
    B-->>F: { client_secret, deposit_id }

    Note over U,S: Step 2: Process Payment
    F->>S: confirmCardPayment(client_secret, card)
    Note right of F: User enters card info
    S-->>F: { paymentIntent, status: "succeeded" }

    Note over U,S: Step 3: Confirm & Complete
    F->>F: Wait 2 seconds (important!)
    F->>B: POST /payments/deposits/confirm
    Note right of F: { payment_intent_id, payment_method_id }
    B->>S: Retrieve payment status
    S-->>B: Payment confirmed
    B->>B: Update balance & create transaction
    B-->>F: { success: true, new_balance: 175 }
    F-->>U: Show success message

    Note over U,S: ✅ Deposit Complete
```

**Simple Flow:**

1. User input amount & card details
2. Frontend creates deposit di backend
3. Frontend confirm payment dengan Stripe
4. Frontend confirm deposit kembali ke backend
5. Balance updated ✅

## 🔌 API Endpoints You Need

### 1. Create Deposit

```http
POST /payments/deposits
Authorization: Bearer <jwt_token>

{
  "amount": 25.00,
  "currency": "usd",
  "description": "Credit card deposit"
}
```

**Response:**

```json
{
  "deposit_id": 10,
  "client_secret": "pi_xxx_secret_xxx",
  "amount": 25,
  "currency": "usd",
  "status": "PENDING"
}
```

### 2. Confirm Deposit

```http
POST /payments/deposits/confirm
Authorization: Bearer <jwt_token>

{
  "payment_intent_id": "pi_3RrpFsRpP4URq09n1ExzGDUB",
  "payment_method_id": "pm_1234567890"
}
```

**Response:**

```json
{
  "success": true,
  "deposit_id": 10,
  "new_balance": 175.0,
  "transaction_id": 25
}
```

## 💻 Frontend Implementation

### Setup Requirements

```html
<!-- Load Stripe.js -->
<script src="https://js.stripe.com/v3/"></script>
```

```javascript
// Configuration
const API_BASE_URL = 'http://localhost:3000';
const STRIPE_PUBLISHABLE_KEY = 'pk_test_51RjWey...'; // Must match backend
const JWT_TOKEN = 'your_jwt_token_here';
```

### Complete Implementation

```javascript
// Initialize Stripe
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
const elements = stripe.elements();

// Create card input
const cardElement = elements.create('card');
cardElement.mount('#card-element');

// Process deposit
async function processDeposit(amount, description) {
  try {
    // Step 1: Create deposit on backend
    const depositResponse = await fetch(`${API_BASE_URL}/payments/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${JWT_TOKEN}`,
      },
      body: JSON.stringify({
        amount: amount,
        currency: 'usd',
        description: description,
      }),
    });

    const depositData = await depositResponse.json();
    console.log('✅ Deposit created:', depositData);

    // Step 2: Process payment with Stripe
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      depositData.client_secret,
      {
        payment_method: {
          card: cardElement,
          billing_details: { name: 'User Name' },
        },
      },
    );

    if (error) {
      throw new Error(`Payment failed: ${error.message}`);
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new Error(`Payment failed. Status: ${paymentIntent.status}`);
    }

    console.log('✅ Payment confirmed:', paymentIntent);

    // Step 3: Wait for processing (important!)
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 4: Confirm deposit on backend
    const confirmResponse = await fetch(
      `${API_BASE_URL}/payments/deposits/confirm`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${JWT_TOKEN}`,
        },
        body: JSON.stringify({
          payment_intent_id: paymentIntent.id,
          payment_method_id: paymentIntent.payment_method,
        }),
      },
    );

    const result = await confirmResponse.json();
    console.log('✅ Deposit confirmed:', result);

    return result; // { success: true, new_balance: 175.00 }
  } catch (error) {
    console.error('❌ Deposit failed:', error);
    throw error;
  }
}
```

### HTML Form Example

```html
<form id="payment-form">
  <!-- Amount Input -->
  <input type="number" id="amount" value="25" min="1" max="10000" required />

  <!-- Stripe Card Element -->
  <div id="card-element"></div>
  <div id="card-errors"></div>

  <!-- Submit Button -->
  <button type="submit">Deposit $<span id="amount-display">25.00</span></button>
</form>

<script>
  document
    .getElementById('payment-form')
    .addEventListener('submit', async (e) => {
      e.preventDefault();

      const amount = parseFloat(document.getElementById('amount').value);

      try {
        const result = await processDeposit(amount, 'Credit card deposit');
        alert(`Success! New balance: $${result.new_balance}`);
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    });
</script>
```

## 🔐 Authentication

Semua API calls memerlukan JWT token di header:

```javascript
headers: {
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

**How to get JWT token:**

- User harus login dulu melalui `/auth/signin` endpoint
- Token berisi wallet address user
- Token expires after beberapa jam

## ⚠️ Important Notes

### 1. **API Key Matching**

Frontend publishable key HARUS dari account Stripe yang sama dengan backend secret key:

```javascript
// ❌ Wrong - Different accounts
Frontend: 'pk_test_TYooMQauvdEDq54NiTphI7jx';
Backend: 'sk_test_51RjWeyRpP4URq09n...';

// ✅ Correct - Same account
Frontend: 'pk_test_51RjWeyRpP4URq09n...';
Backend: 'sk_test_51RjWeyRpP4URq09n...';
```

### 2. **Timing is Critical**

Harus ada delay 2 detik setelah Stripe confirmation sebelum confirm ke backend:

```javascript
// ✅ Correct
await stripe.confirmCardPayment(...);
await new Promise(resolve => setTimeout(resolve, 2000)); // Important!
await fetch('/payments/deposits/confirm', ...);
```

### 3. **Error Handling**

Implementasikan retry mechanism untuk network issues:

```javascript
async function confirmWithRetry(paymentIntent, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/payments/deposits/confirm', {
        // ... request config
      });

      if (response.ok) {
        return await response.json();
      }

      // If error contains "No such payment_intent", retry
      const error = await response.json();
      if (
        error.message?.includes('No such payment_intent') &&
        i < maxRetries - 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        continue;
      }

      throw new Error(error.message);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
```

## 🧪 Testing

### Test Cards (Stripe Test Mode)

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Insufficient Funds:** `4000 0000 0000 9995`
- **CVC:** Any 3 digits
- **Expiry:** Any future date

### Testing Steps

1. Use test card `4242 4242 4242 4242`
2. Amount: $25.00
3. Check console logs for each step
4. Verify balance updates correctly

## 🚨 Common Errors & Solutions

| Error                    | Cause             | Solution                                |
| ------------------------ | ----------------- | --------------------------------------- |
| `Invalid API Key`        | Key mismatch      | Check publishable key matches backend   |
| `Unauthorized`           | Invalid JWT       | Get new token from `/auth/signin`       |
| `No such payment_intent` | Timing issue      | Add 2-second delay + retry              |
| `User rejected request`  | MetaMask conflict | Use incognito mode or different browser |

## Production Checklist

- [ ] Replace test keys dengan live keys
- [ ] Use HTTPS for all requests
- [ ] Implement proper error messages for users
- [ ] Add loading states for better UX
- [ ] Test with real bank cards (small amounts)
- [ ] Setup monitoring for failed payments

---

**Last Updated:** August 3, 2025  
**Version:** 2.1.0 - Simplified with Flow Diagram
