import { NextApiRequest, NextApiResponse } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../../lib/firebase';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

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

    // Initialize FFmpeg.wasm
    const ffmpeg = new FFmpeg();
    
    // Load FFmpeg.wasm
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    // Fetch video file
    const videoData_buffer = await fetchFile(videoUrl);
    
    // Write video to FFmpeg filesystem
    await ffmpeg.writeFile('input.mp4', videoData_buffer);

    // Extract frame at specific time
    const timeString = timeInSeconds ? timeInSeconds.toString() : '0';
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-ss', timeString,
      '-vframes', '1',
      '-vf', 'scale=1280:720',
      '-q:v', '2',
      'thumbnail.jpg'
    ]);

    // Read the generated thumbnail
    const thumbnailData = await ffmpeg.readFile('thumbnail.jpg');
    const thumbnailBuffer = thumbnailData as Uint8Array;

    // Upload thumbnail to Firebase Storage
    const timestamp = Date.now();
    const thumbnailRef = ref(storage, `thumbnails/${id}/frame_${timestamp}.jpg`);
    
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
