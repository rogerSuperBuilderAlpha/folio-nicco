import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import fetch from 'node-fetch';

// Initialize Firebase Admin SDK
admin.initializeApp();

// Get Firestore instance for folio-nicco database
const db = admin.firestore();
db.settings({ databaseId: 'folio-nicco' });

// Get Storage instance
const storage = admin.storage();

interface ThumbnailRequest {
  videoId: string;
  timestamp: number;
  userId: string;
  quality?: 'high' | 'medium' | 'low';
}

interface ThumbnailResponse {
  success: boolean;
  thumbnailUrl?: string;
  error?: string;
  processingTime?: number;
}

export const generateVideoThumbnail = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: '1GB'
  })
  .https.onCall(async (data: ThumbnailRequest, context): Promise<ThumbnailResponse> => {
    const startTime = Date.now();
    
    try {
      // Validate authentication
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const { videoId, timestamp, userId, quality = 'high' } = data;

      // Validate input parameters
      if (!videoId || !timestamp || !userId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Missing required parameters: videoId, timestamp, or userId'
        );
      }

      if (context.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'User ID mismatch'
        );
      }

      // Fetch video document from Firestore
      const videoDoc = await db.collection('videos').doc(videoId).get();
      
      if (!videoDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Video not found'
        );
      }

      const videoData = videoDoc.data();
      
      // Verify ownership
      if (videoData?.ownerUid !== userId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'You do not have permission to edit this video'
        );
      }

      // Validate timestamp is within video duration (if available)
      if (videoData?.duration && timestamp > videoData.duration) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Timestamp exceeds video duration'
        );
      }

      // Get video file URL from storage
      const videoUrl = videoData?.playback?.mp4Url;
      if (!videoUrl) {
        throw new functions.https.HttpsError(
          'not-found',
          'Video file not found or not accessible'
        );
      }

      // Create temporary directories
      const tempDir = os.tmpdir();
      const videoFileName = `video_${videoId}_${Date.now()}.mp4`;
      const thumbnailFileName = `thumb_${videoId}_${timestamp}_${Date.now()}.jpg`;
      const videoPath = path.join(tempDir, videoFileName);
      const thumbnailPath = path.join(tempDir, thumbnailFileName);

      try {
        // Download video file
        console.log('Downloading video from:', videoUrl);
        const response = await fetch(videoUrl);
        
        if (!response.ok) {
          throw new Error(`Failed to download video: ${response.statusText}`);
        }

        const videoBuffer = await response.buffer();
        fs.writeFileSync(videoPath, videoBuffer);

        // Generate thumbnail using FFmpeg
        console.log('Generating thumbnail at timestamp:', timestamp);
        
        const qualitySettings = {
          high: { scale: '1280:720', quality: 2 },
          medium: { scale: '854:480', quality: 5 },
          low: { scale: '640:360', quality: 8 }
        };

        const settings = qualitySettings[quality];

        await new Promise<void>((resolve, reject) => {
          ffmpeg(videoPath)
            .seekInput(timestamp)
            .frames(1)
            .videoFilter(`scale=${settings.scale}`)
            .outputOptions([`-q:v ${settings.quality}`])
            .output(thumbnailPath)
            .on('end', () => {
              console.log('Thumbnail generation completed');
              resolve();
            })
            .on('error', (err) => {
              console.error('FFmpeg error:', err);
              reject(new Error(`FFmpeg processing failed: ${err.message}`));
            })
            .run();
        });

        // Upload thumbnail to Firebase Storage
        const bucket = storage.bucket();
        const thumbnailStoragePath = `thumbnails/${videoId}/thumb_${timestamp}_${Date.now()}.jpg`;
        
        console.log('Uploading thumbnail to:', thumbnailStoragePath);
        
        const [file] = await bucket.upload(thumbnailPath, {
          destination: thumbnailStoragePath,
          metadata: {
            contentType: 'image/jpeg',
            cacheControl: 'public, max-age=31536000', // 1 year
            metadata: {
              videoId,
              timestamp: timestamp.toString(),
              quality,
              generatedAt: new Date().toISOString()
            }
          }
        });

        // Make the file publicly accessible
        await file.makePublic();
        
        // Get public URL
        const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailStoragePath}`;

        // Update video document with new thumbnail URL
        await db.collection('videos').doc(videoId).update({
          'playback.posterUrl': thumbnailUrl,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log('Video document updated with new thumbnail URL');

        const processingTime = Date.now() - startTime;

        return {
          success: true,
          thumbnailUrl,
          processingTime
        };

      } finally {
        // Clean up temporary files
        try {
          if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
          }
          if (fs.existsSync(thumbnailPath)) {
            fs.unlinkSync(thumbnailPath);
          }
        } catch (cleanupError) {
          console.warn('Failed to clean up temporary files:', cleanupError);
        }
      }

    } catch (error) {
      console.error('Thumbnail generation error:', error);
      
      const processingTime = Date.now() - startTime;
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        processingTime
      };
    }
  });

// Health check function
export const healthCheck = functions.https.onRequest((req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'thumbnail-generation'
  });
});
