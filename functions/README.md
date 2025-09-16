# Firebase Cloud Functions - Thumbnail Generation

This directory contains Firebase Cloud Functions for the Folio video platform, specifically for generating high-quality video thumbnails using FFmpeg.

## Functions

### `generateVideoThumbnail`
- **Type**: HTTPS Callable Function
- **Purpose**: Extract high-quality thumbnails from video files at specific timestamps
- **Runtime**: Node.js 20 with FFmpeg
- **Memory**: 1GB
- **Timeout**: 5 minutes

#### Usage
```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

const generateThumbnail = httpsCallable(functions, 'generateVideoThumbnail');
const result = await generateThumbnail({
  videoId: 'video-document-id',
  timestamp: 30.5, // seconds
  userId: 'user-uid',
  quality: 'high' // 'high' | 'medium' | 'low'
});
```

#### Response
```typescript
{
  success: boolean;
  thumbnailUrl?: string;    // Firebase Storage URL
  error?: string;
  processingTime?: number;  // milliseconds
}
```

### `healthCheck`
- **Type**: HTTP Request Function
- **Purpose**: Health monitoring endpoint
- **URL**: `https://us-central1-your-project.cloudfunctions.net/healthCheck`

## Setup

1. **Install dependencies:**
   ```bash
   cd functions
   npm install
   ```

2. **Build TypeScript:**
   ```bash
   npm run build
   ```

3. **Deploy functions:**
   ```bash
   firebase deploy --only functions
   ```

   Or use the deployment script:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Development

### Local Testing
```bash
# Start Firebase emulator
npm run serve

# Or use Firebase shell
npm run shell
```

### Environment Variables
The function uses Firebase Admin SDK which automatically uses the default service account when deployed. No additional environment variables are required.

## Architecture

1. **Input Validation**: Verifies user authentication and video ownership
2. **Video Download**: Streams video from Firebase Storage to temporary file
3. **Frame Extraction**: Uses FFmpeg to extract frame at exact timestamp
4. **Thumbnail Upload**: Saves thumbnail to Firebase Storage with public access
5. **Database Update**: Updates video document with new thumbnail URL
6. **Cleanup**: Removes temporary files

## Quality Settings

- **High**: 1280x720, JPEG quality 2
- **Medium**: 854x480, JPEG quality 5  
- **Low**: 640x360, JPEG quality 8

## Security

- User must be authenticated
- User must own the video being processed
- Validates timestamp is within video duration
- All operations use Firestore security rules

## Monitoring

The function includes built-in logging and error handling:
- Processing time tracking
- Detailed error messages
- Firebase Functions logs integration

## Storage Structure

Thumbnails are stored in Firebase Storage at:
```
thumbnails/{videoId}/thumb_{timestamp}_{date}.jpg
```

## Error Handling

Common errors and solutions:

- **`unauthenticated`**: User not signed in
- **`permission-denied`**: User doesn't own the video
- **`not-found`**: Video document or file doesn't exist
- **`invalid-argument`**: Missing or invalid parameters
- **FFmpeg errors**: Video format issues or processing failures

## Performance

- **Cold start**: ~3-5 seconds (includes FFmpeg initialization)
- **Warm execution**: ~2-8 seconds (depending on video size and timestamp)
- **Memory usage**: 200-800MB (depending on video size)
- **Storage**: Temporary files cleaned up automatically
