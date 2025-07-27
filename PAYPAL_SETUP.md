# PayPal Integration Setup Guide

## Step 1: Create PayPal Developer App

1. Go to [developer.paypal.com](https://developer.paypal.com)
2. Login with your PayPal business account
3. Click "Create App"
4. Choose "Default Application" 
5. Select "Sandbox" environment
6. Enable these features:
   - ✅ **Subscriptions**
   - ✅ **Webhooks** 
   - ✅ **PayPal Checkout**

## Step 2: Configure Webhooks

After creating your app:

1. Go to your app settings
2. Click "Add Webhook"
3. Set webhook URL to: `https://your-domain.com/api/billing/paypal/webhooks`
4. Select these event types:
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.PAYMENT.FAILED`
   - `PAYMENT.SALE.COMPLETED`

## Step 3: Product Creation

Your backend will automatically create products, but you can also create them manually:

1. Go to PayPal Business Dashboard
2. Navigate to "Products & Services"
3. Create these products:
   - **Aura AI Starter** - $29.99/month
   - **Aura AI Pro** - $79.99/month  
   - **Aura AI Enterprise** - $199.99/month

## Step 4: Test in Sandbox

Use PayPal's sandbox environment to test:

1. Create sandbox test accounts (buyer & seller)
2. Test subscription creation
3. Test payment processing
4. Test webhook delivery

## Step 5: Go Live

When ready for production:

1. Switch `PAYPAL_ENVIRONMENT` to `production`
2. Update credentials to live app credentials
3. Update webhook URLs to production domain
4. Test with real PayPal accounts

## Important Notes

- **Sandbox vs Production**: Use sandbox for testing, production for real payments
- **Webhook Security**: Always verify webhook signatures
- **Error Handling**: Implement proper error handling for failed payments
- **User Experience**: Provide clear payment status updates

## Subscription Flow

1. User selects plan → API creates PayPal subscription
2. User redirected to PayPal → Approves subscription  
3. PayPal sends webhook → Backend updates user status
4. User returns to app → Subscription active

## Testing Credentials

Sandbox test accounts:
- **Buyer**: Use any sandbox personal account
- **Seller**: Your sandbox business account
- **Cards**: Use PayPal's test card numbers