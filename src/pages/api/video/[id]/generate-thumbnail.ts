import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../../lib/firebase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  const { timeInSeconds, userUid } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid video ID' });
  }

  try {
    // Get video data
    const videoDoc = await getDoc(doc(db, 'videos', id));
    if (!videoDoc.exists()) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const videoData = videoDoc.data();
    
    // Verify user owns this video
    if (videoData.ownerUid !== userUid) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const videoUrl = videoData.playback?.mp4Url || videoData.storage?.downloadURL;

    if (!videoUrl) {
      return res.status(400).json({ error: 'No video URL found' });
    }

    console.log('Generating thumbnail for video:', id, 'at time:', timeInSeconds);

    // Simple approach: Create a thumbnail using Sharp with video info
    const sharp = require('sharp');
    
    // Create a simple thumbnail with time marker
    const timeMinutes = Math.floor((timeInSeconds || 0) / 60);
    const timeSeconds = Math.floor((timeInSeconds || 0) % 60);
    const timeDisplay = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;
    
    // Generate SVG thumbnail with time info
    const svgThumbnail = `
      <svg width="1280" height="720" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#374151;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <circle cx="640" cy="360" r="60" fill="rgba(16, 185, 129, 0.8)"/>
        <polygon points="620,340 620,380 660,360" fill="white"/>
        <text x="640" y="450" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="600">
          ${timeDisplay}
        </text>
        <text x="640" y="480" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="18">
          Video Thumbnail
        </text>
      </svg>
    `;

    // Convert SVG to PNG using Sharp
    const thumbnailBuffer = await sharp(Buffer.from(svgThumbnail))
      .png()
      .toBuffer();

    // Upload thumbnail to Firebase Storage
    const timestamp = Date.now();
    const thumbnailRef = ref(storage, `thumbnails/${id}/frame_${timestamp}.png`);
    
    await uploadBytes(thumbnailRef, thumbnailBuffer);
    const thumbnailUrl = await getDownloadURL(thumbnailRef);
    
    console.log('Thumbnail generated successfully:', thumbnailUrl);
    
    res.status(200).json({ 
      success: true, 
      thumbnailUrl,
      timeInSeconds: timeInSeconds || 0
    });

  } catch (error) {
    console.error('Error generating thumbnail:', error);
    res.status(500).json({ 
      error: 'Failed to generate thumbnail',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
