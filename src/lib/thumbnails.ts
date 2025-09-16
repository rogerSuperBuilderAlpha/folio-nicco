import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

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

/**
 * Generate a video thumbnail using the Firebase Cloud Function
 * @param request - The thumbnail generation request parameters
 * @returns Promise resolving to thumbnail response
 */
export async function generateVideoThumbnail(request: ThumbnailRequest): Promise<ThumbnailResponse> {
  try {
    const generateThumbnail = httpsCallable<ThumbnailRequest, ThumbnailResponse>(
      functions,
      'generateVideoThumbnail'
    );
    
    const result = await generateThumbnail(request);
    return result.data;
  } catch (error) {
    console.error('Error calling generateVideoThumbnail:', error);
    
    // Handle Firebase Function errors
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      return {
        success: false,
        error: `${error.code}: ${error.message}`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Format timestamp for display
 * @param seconds - Time in seconds
 * @returns Formatted time string (e.g., "1:23")
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Validate timestamp against video duration
 * @param timestamp - Time in seconds
 * @param duration - Video duration in seconds
 * @returns Whether timestamp is valid
 */
export function isValidTimestamp(timestamp: number, duration?: number): boolean {
  if (timestamp < 0) return false;
  if (duration && timestamp > duration) return false;
  return true;
}
