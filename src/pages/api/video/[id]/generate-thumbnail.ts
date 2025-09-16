import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // This API endpoint is deprecated in favor of the Firebase Cloud Function
  // Direct calls to generateVideoThumbnail should be made from the frontend
  res.status(410).json({ 
    error: 'This endpoint is deprecated. Use the Firebase Cloud Function generateVideoThumbnail instead.',
    migration: 'Call the Cloud Function directly from your frontend using httpsCallable'
  });
}
