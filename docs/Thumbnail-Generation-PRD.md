# Thumbnail Generation System PRD

## Overview
A Firebase Cloud Function-based system for generating high-quality video thumbnails from specific timestamps, integrating seamlessly with the Folio video editing interface.

## Problem Statement
- Browser CORS restrictions prevent client-side video frame capture
- Vercel serverless functions have limitations for video processing
- Users need to create custom thumbnails from exact video moments
- Current fallback creates placeholder images, not actual video frames

## Solution Architecture

### Firebase Cloud Function: `generateVideoThumbnail`
**Trigger**: HTTPS callable function  
**Runtime**: Node.js 20 with FFmpeg binary  
**Location**: us-central1 (or closest to Firebase Storage)

#### Input Parameters
```typescript
{
  videoId: string;           // Firestore video document ID
  timestamp: number;         // Time in seconds (e.g., 1.72429)
  userId: string;           // User ID for authorization
  quality?: 'high' | 'medium' | 'low'; // Optional quality setting
}
```

#### Output Response
```typescript
{
  success: boolean;
  thumbnailUrl?: string;    // Firebase Storage URL
  error?: string;
  processingTime?: number;  // For monitoring
}
```

### Technical Implementation

#### Phase 1: Core Function
1. **Validate Request**
   - Verify user owns the video (Firestore security)
   - Validate timestamp is within video duration
   - Check video exists and is accessible

2. **Download Video**
   - Fetch video file from Firebase Storage URL
   - Stream to temporary file in Cloud Function environment
   - Handle large video files efficiently

3. **Extract Frame**
   - Use FFmpeg to seek to exact timestamp: `-ss ${timestamp}`
   - Extract single frame: `-vframes 1`
   - Scale to standard thumbnail size: `-vf scale=1280:720`
   - High quality JPEG output: `-q:v 2`

4. **Upload Thumbnail**
   - Save to Firebase Storage: `thumbnails/{videoId}/thumb_{timestamp}_{date}.jpg`
   - Generate public download URL
   - Set appropriate metadata (content-type, cache-control)

5. **Update Video Document**
   - Add thumbnail URL to video's `playback.posterUrl` field
   - Update `updatedAt` timestamp
   - Optionally store in `thumbnails` array for multiple options

#### Phase 2: Enhanced Features
- **Multiple quality options** (480p, 720p, 1080p)
- **Batch thumbnail generation** (multiple timestamps)
- **Thumbnail optimization** (WebP format, compression)
- **Cleanup old thumbnails** (storage management)

### Frontend Integration

#### Edit Video Page Updates

##### 1. Thumbnail Capture Interface
```typescript
// Enhanced video player controls
<div className="thumbnail-controls">
  <button 
    onClick={handleSetThumbnail}
    disabled={!videoReady || thumbnailGenerating}
    className="btn btn--primary"
  >
    {thumbnailGenerating ? 'Generating...' : '📸 Set Thumbnail'}
  </button>
  <div className="current-time-display">
    Current: {formatTime(currentTime)}
  </div>
</div>
```

##### 2. Thumbnail Generation Flow
```typescript
const handleSetThumbnail = async () => {
  try {
    setThumbnailGenerating(true);
    
    // Call Firebase Function
    const generateThumbnail = httpsCallable(functions, 'generateVideoThumbnail');
    const result = await generateThumbnail({
      videoId: video.id,
      timestamp: videoRef.current.currentTime,
      userId: user.uid
    });
    
    if (result.data.success) {
      // Refresh video data to get new thumbnail
      await refreshVideoData();
      setSuccess('Thumbnail updated successfully!');
    } else {
      throw new Error(result.data.error);
    }
    
  } catch (error) {
    setError('Failed to generate thumbnail');
  } finally {
    setThumbnailGenerating(false);
  }
};
```

##### 3. Real-time UI Updates
```typescript
const refreshVideoData = async () => {
  const videoDoc = await getDoc(doc(db, 'videos', video.id));
  if (videoDoc.exists()) {
    const updatedVideo = { id: videoDoc.id, ...videoDoc.data() } as Video;
    setVideo(updatedVideo);
    
    // Update video player poster
    if (videoRef.current && updatedVideo.playback?.posterUrl) {
      videoRef.current.poster = updatedVideo.playback.posterUrl;
    }
  }
};
```

### Data Model Updates

#### Video Document Schema Addition
```typescript
interface Video {
  // ... existing fields
  playback: {
    provider: string;
    id: string;
    posterUrl?: string;     // Main thumbnail URL
    mp4Url?: string;
    thumbnails?: {          // Optional: Multiple thumbnail options
      timestamp: number;
      url: string;
      quality: string;
    }[];
  };
}
```

### Security Rules

#### Cloud Function Security
```typescript
// In the function, verify ownership
const videoDoc = await admin.firestore()
  .collection('videos')
  .doc(videoId)
  .get();

if (!videoDoc.exists || videoDoc.data().ownerUid !== userId) {
  throw new functions.https.HttpsError('permission-denied', 'Unauthorized');
}
```

#### Firestore Rules Update
```javascript
// Allow thumbnail URL updates
match /videos/{videoId} {
  allow update: if request.auth != null && 
                   request.auth.uid == resource.data.ownerUid &&
                   request.resource.data.diff(resource.data).affectedKeys()
                   .hasOnly(['playback.posterUrl', 'updatedAt']);
}
```

### User Experience Flow

#### Happy Path
1. **User loads edit page** → Video player shows current thumbnail
2. **User scrubs to perfect frame** → Time display updates (e.g., "0:03")
3. **User clicks "📸 Set Thumbnail"** → Button shows "Generating..."
4. **Firebase Function processes** → FFmpeg extracts frame at 3.0 seconds
5. **Thumbnail uploaded** → Video document updated with new posterUrl
6. **Frontend refreshes** → New thumbnail appears in video player
7. **Success message** → "Thumbnail updated successfully!"

#### Error Handling
- **Video not found** → "Video not accessible"
- **Processing failed** → "Thumbnail generation failed, please try again"
- **Upload failed** → "Failed to save thumbnail"
- **Permission denied** → "You don't have permission to edit this video"

### Performance Considerations

#### Optimization
- **Function warm-up**: Keep function instances warm for faster response
- **Caching**: Cache FFmpeg binary to reduce cold start time
- **Timeout**: Set 60-second timeout for large video processing
- **Memory**: Allocate 1GB memory for video processing

#### Monitoring
- **Success rate** tracking via Firebase Analytics
- **Processing time** metrics
- **Error rate** monitoring
- **Storage usage** tracking for thumbnails

### Implementation Timeline

#### Week 1: Core Function
- Set up Firebase Functions project
- Implement basic FFmpeg thumbnail extraction
- Deploy and test with sample videos

#### Week 2: Frontend Integration
- Update edit video page with new thumbnail flow
- Implement real-time UI updates
- Add loading states and error handling

#### Week 3: Polish & Testing
- Add comprehensive error handling
- Implement monitoring and analytics
- Performance optimization and testing

### Success Metrics
- **Thumbnail generation success rate** > 95%
- **Average processing time** < 10 seconds
- **User satisfaction** with thumbnail quality
- **Reduced support tickets** about thumbnail issues

### Technical Requirements
- **FFmpeg binary** in Cloud Function environment
- **Firebase Storage** write permissions for function
- **Firestore** update permissions for video documents
- **Error logging** and monitoring setup

This system provides users with **professional-grade thumbnail generation** from exact video moments, matching the quality expected from industry-leading video platforms.
