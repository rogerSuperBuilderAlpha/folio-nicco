# Stripe Integration Setup

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_...  # From Stripe Dashboard
STRIPE_SECRET_KEY=sk_test_...       # From Stripe Dashboard  
STRIPE_WEBHOOK_SECRET=whsec_...     # From Stripe Webhook endpoint
STRIPE_PRICE_ID=price_...           # Create a $50/month subscription product in Stripe

# Firebase Admin (for webhook)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

## Stripe Dashboard Setup

### 1. Create Product & Price
1. Go to Stripe Dashboard → Products
2. Create new product: "Folio Pro Subscription"
3. Add recurring price: $50/month
4. Copy the Price ID (starts with `price_`) to `STRIPE_PRICE_ID`

### 2. Setup Webhook
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
4. Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### 3. Test Mode
- Use test keys (pk_test_, sk_test_) for development
- Use test card: 4242 4242 4242 4242

## How It Works

1. User clicks "Subscribe Now" on homepage
2. If not logged in, redirects to sign in
3. Creates Stripe checkout session via `/api/stripe/create-checkout`
4. User completes payment on Stripe
5. Stripe webhook calls `/api/stripe/webhook`
6. User's `subscriptionStatus` updated to "active" in Firestore
7. User redirected to dashboard

## User Flow

```
Homepage → Click Subscribe → Sign In (if needed) → Stripe Checkout → Payment → Webhook → Dashboard
```

## Database Updates

The webhook automatically updates the user document in Firestore:

```json
{
  "subscriptionStatus": "active",
  "subscriptionId": "sub_...",
  "customerId": "cus_...",
  "updatedAt": "timestamp"
}
```

## Testing

1. Use Stripe test mode
2. Test card: 4242 4242 4242 4242
3. Check Stripe Dashboard → Events for webhook delivery
4. Verify user document updated in Firestore
