import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp, getApps, cert } from 'firebase-admin/app'

// Initialize Firebase Admin if not already initialized
let app
if (!getApps().length) {
  app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
} else {
  app = getApps()[0]
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

const db = getFirestore(app, 'folio-nicco')

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event

  try {
    const body = JSON.stringify(req.body)
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return res.status(400).json({ message: 'Webhook signature verification failed' })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId

        if (!userId) {
          console.error('No userId in session metadata')
          return res.status(400).json({ message: 'No userId in session metadata' })
        }

        // Update user's subscription status in Firestore
        await db.collection('users').doc(userId).update({
          subscriptionStatus: 'active',
          subscriptionId: session.subscription,
          customerId: session.customer,
          updatedAt: new Date(),
        })

        console.log(`User ${userId} subscription activated`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const usersQuery = await db.collection('users')
          .where('customerId', '==', customerId)
          .limit(1)
          .get()

        if (usersQuery.empty) {
          console.error(`No user found for customer ${customerId}`)
          return res.status(404).json({ message: 'User not found' })
        }

        const userDoc = usersQuery.docs[0]
        await userDoc.ref.update({
          subscriptionStatus: subscription.status,
          updatedAt: new Date(),
        })

        console.log(`User subscription status updated to ${subscription.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by customer ID
        const usersQuery = await db.collection('users')
          .where('customerId', '==', customerId)
          .limit(1)
          .get()

        if (usersQuery.empty) {
          console.error(`No user found for customer ${customerId}`)
          return res.status(404).json({ message: 'User not found' })
        }

        const userDoc = usersQuery.docs[0]
        await userDoc.ref.update({
          subscriptionStatus: 'canceled',
          updatedAt: new Date(),
        })

        console.log(`User subscription canceled`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    res.status(200).json({ received: true })
  } catch (error) {
    console.error('Error handling webhook:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
