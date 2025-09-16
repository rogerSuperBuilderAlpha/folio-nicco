import { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { auth } from '../../../lib/firebase'
import { getAuth } from 'firebase-admin/auth'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    // Get the user's auth token from the request
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await getAuth().verifyIdToken(idToken)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    if (!userEmail) {
      return res.status(400).json({ message: 'User email required' })
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: userEmail,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID!, // You'll need to provide this
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/?canceled=true`,
      metadata: {
        userId: userId,
      },
    })

    res.status(200).json({ sessionId: session.id, url: session.url })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
