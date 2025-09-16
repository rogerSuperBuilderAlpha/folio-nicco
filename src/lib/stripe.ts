import { User } from 'firebase/auth'

export const createCheckoutSession = async (user: User) => {
  const token = await user.getIdToken()
  
  const response = await fetch('/api/stripe/create-checkout', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to create checkout session')
  }

  return response.json()
}

export const redirectToCheckout = (checkoutUrl: string) => {
  window.location.href = checkoutUrl
}

export type SubscriptionStatus = 'inactive' | 'active' | 'canceled' | 'past_due'

export const getSubscriptionStatusColor = (status: SubscriptionStatus) => {
  switch (status) {
    case 'active':
      return 'green'
    case 'past_due':
      return 'orange'
    case 'canceled':
      return 'red'
    case 'inactive':
    default:
      return 'gray'
  }
}

export const getSubscriptionStatusText = (status: SubscriptionStatus) => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'past_due':
      return 'Past Due'
    case 'canceled':
      return 'Canceled'
    case 'inactive':
    default:
      return 'Inactive'
  }
}
