interface PayPalConfig {
  clientId: string
  clientSecret: string
  environment: 'sandbox' | 'production'
}

interface PayPalSubscription {
  id: string
  plan_id: string
  status: string
  create_time: string
  subscriber: {
    email_address: string
  }
}

interface PayPalPlan {
  id: string
  name: string
  description: string
  status: string
  billing_cycles: Array<{
    frequency: {
      interval_unit: string
      interval_count: number
    }
    tenure_type: string
    sequence: number
    total_cycles: number
    pricing_scheme: {
      fixed_price: {
        value: string
        currency_code: string
      }
    }
  }>
}

export class PayPalClient {
  private config: PayPalConfig
  private baseURL: string
  private accessToken?: string
  private tokenExpiry?: Date

  constructor(config: PayPalConfig) {
    this.config = config
    this.baseURL = config.environment === 'sandbox' 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'
  }

  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken
    }

    const auth = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')
    
    const response = await fetch(`${this.baseURL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    if (!response.ok) {
      throw new Error(`PayPal auth failed: ${response.status}`)
    }

    const data = await response.json()
    this.accessToken = data.access_token
    this.tokenExpiry = new Date(Date.now() + (data.expires_in * 1000))
    
    return this.accessToken
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken()
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`PayPal API error: ${response.status} ${error}`)
    }

    return response.json()
  }

  // Create subscription plan
  async createPlan(planData: {
    name: string
    description: string
    monthlyPrice: number
  }): Promise<PayPalPlan> {
    const plan = {
      product_id: await this.getOrCreateProduct(),
      name: planData.name,
      description: planData.description,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: "MONTH",
            interval_count: 1
          },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // Infinite
          pricing_scheme: {
            fixed_price: {
              value: planData.monthlyPrice.toString(),
              currency_code: "USD"
            }
          }
        }
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3
      }
    }

    return this.request<PayPalPlan>('/v1/billing/plans', {
      method: 'POST',
      body: JSON.stringify(plan)
    })
  }

  // Create subscription
  async createSubscription(data: {
    planId: string
    subscriberEmail: string
    returnUrl: string
    cancelUrl: string
  }): Promise<PayPalSubscription> {
    const subscription = {
      plan_id: data.planId,
      subscriber: {
        email_address: data.subscriberEmail
      },
      application_context: {
        brand_name: "Aura AI Receptionist",
        locale: "en-US",
        shipping_preference: "NO_SHIPPING",
        user_action: "SUBSCRIBE_NOW",
        payment_method: {
          payer_selected: "PAYPAL",
          payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
        },
        return_url: data.returnUrl,
        cancel_url: data.cancelUrl
      }
    }

    return this.request<PayPalSubscription>('/v1/billing/subscriptions', {
      method: 'POST',
      body: JSON.stringify(subscription)
    })
  }

  // Get subscription details
  async getSubscription(subscriptionId: string): Promise<PayPalSubscription> {
    return this.request<PayPalSubscription>(`/v1/billing/subscriptions/${subscriptionId}`)
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string, reason: string): Promise<void> {
    await this.request(`/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        reason: reason
      })
    })
  }

  // Verify webhook signature
  static verifyWebhookSignature(
    headers: Record<string, string>,
    body: string,
    webhookId: string
  ): boolean {
    // PayPal webhook verification logic
    // This is a simplified version - implement full verification based on PayPal docs
    const authAlgo = headers['paypal-auth-algo']
    const transmission = headers['paypal-transmission-id']
    const certId = headers['paypal-cert-id']
    const signature = headers['paypal-transmission-sig']
    const timestamp = headers['paypal-transmission-time']

    // For now, return true - implement proper verification in production
    return true
  }

  private async getOrCreateProduct(): Promise<string> {
    // Create a product for our subscription plans
    // This would typically be created once and reused
    const product = {
      name: "Aura AI Receptionist Service",
      description: "AI-powered voice receptionist for businesses",
      type: "SERVICE",
      category: "SOFTWARE"
    }

    try {
      const result = await this.request<{ id: string }>('/v1/catalogs/products', {
        method: 'POST',
        body: JSON.stringify(product)
      })
      return result.id
    } catch (error) {
      // Product might already exist, return a default product ID
      // In production, you'd store this product ID
      return 'PROD_DEFAULT'
    }
  }
}

// Usage billing service for PayPal
export class PayPalUsageService {
  constructor(private paypalClient: PayPalClient) {}

  async trackUsage(data: {
    subscriptionId: string
    usage: {
      callMinutes: number
      period: string
    }
  }): Promise<void> {
    // PayPal doesn't have built-in usage billing like Stripe
    // You'd implement this by:
    // 1. Tracking usage in your database
    // 2. Creating one-time payments for overages
    // 3. Or upgrading/downgrading plans based on usage

    console.log('Usage tracked for PayPal subscription:', data)
  }

  async createOveragePayment(data: {
    subscriptionId: string
    amount: number
    description: string
  }): Promise<any> {
    // Create a one-time payment for usage overages
    const payment = {
      intent: "CAPTURE",
      purchase_units: [{
        amount: {
          currency_code: "USD",
          value: data.amount.toString()
        },
        description: data.description
      }]
    }

    return this.paypalClient.request('/v2/checkout/orders', {
      method: 'POST',
      body: JSON.stringify(payment)
    })
  }
}

// Initialize PayPal client
export function createPayPalClient(): PayPalClient {
  return new PayPalClient({
    clientId: process.env.PAYPAL_CLIENT_ID!,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET!,
    environment: (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox'
  })
}