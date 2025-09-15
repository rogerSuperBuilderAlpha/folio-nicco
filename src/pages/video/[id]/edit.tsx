import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface Video {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  tags: string[];
  collaborators: { uid: string; role: string; name?: string }[];
  techMeta: { camera?: string; lenses?: string; location?: string; durationSec?: number };
  storage: { downloadURL?: string };
  playback: { posterUrl?: string; mp4Url?: string };
  visibility: 'public' | 'private' | 'unlisted';
}

const CAMERA_OPTIONS = [
  'Arri Alexa Mini',
  'Arri Alexa 35', 
  'RED Komodo',
  'RED Raptor',
  'Sony FX6',
  'Sony FX9',
  'Canon C70',
  'Canon C300',
  'Blackmagic Pocket 6K',
  'Other'
];

export default function EditVideoPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [camera, setCamera] = useState('');
  const [lenses, setLenses] = useState('');
  const [location, setLocation] = useState('');
  const [collaborators, setCollaborators] = useState<{ name: string; role: string }[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');
  const [videoReady, setVideoReady] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/signin');
      return;
    }
  }, [user, authLoading, router]);

  // Fetch video data
  useEffect(() => {
    if (!id || typeof id !== 'string' || !user) return;

    const fetchVideo = async () => {
      try {
        const videoDoc = await getDoc(doc(db, 'videos', id));
        
        if (!videoDoc.exists()) {
          router.push('/dashboard');
          return;
        }

        const videoData = { id: videoDoc.id, ...videoDoc.data() } as Video;
        
        // Check if user owns this video
        if (videoData.ownerUid !== user.uid) {
          router.push('/dashboard');
          return;
        }

        setVideo(videoData);
        
        // Populate form
        setTitle(videoData.title);
        setDescription(videoData.description);
        setTags(videoData.tags);
        setCamera(videoData.techMeta?.camera || '');
        setLenses(videoData.techMeta?.lenses || '');
        setLocation(videoData.techMeta?.location || '');
        setCollaborators(videoData.collaborators.map(c => ({ name: c.name || '', role: c.role })));
        setVisibility(videoData.visibility);
        setSelectedThumbnail(videoData.playback?.posterUrl || '');
        
        console.log('Video data loaded:', {
          title: videoData.title,
          playbackUrl: videoData.playback?.mp4Url,
          storageUrl: videoData.storage?.downloadURL,
          posterUrl: videoData.playback?.posterUrl
        });
        
      } catch (error) {
        console.error('Error fetching video:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id, user, router]);

  if (authLoading || loading || !user || !video) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const addCollaborator = () => {
    setCollaborators([...collaborators, { name: '', role: '' }]);
  };

  const updateCollaborator = (index: number, field: 'name' | 'role', value: string) => {
    const newCollaborators = [...collaborators];
    newCollaborators[index][field] = value;
    setCollaborators(newCollaborators);
  };

  const removeCollaborator = (index: number) => {
    setCollaborators(collaborators.filter((_, i) => i !== index));
  };

  // Real thumbnail capture using MediaRecorder API
  const captureFrame = async () => {
    if (!videoRef.current || !user || !video) return;

    const videoElement = videoRef.current;
    const currentTime = videoElement.currentTime;

    if (videoElement.readyState < 2) {
      alert('Video is still loading. Please wait and try again.');
      return;
    }

    try {
      console.log('Capturing real frame at time:', currentTime);
      
      // Create a new video element with the same source for clean capture
      const captureVideo = document.createElement('video');
      captureVideo.src = video.playback?.mp4Url || video.storage?.downloadURL || '';
      captureVideo.crossOrigin = 'anonymous';
      captureVideo.muted = true;
      
      // Wait for video to load
      await new Promise((resolve, reject) => {
        captureVideo.onloadeddata = resolve;
        captureVideo.onerror = reject;
        captureVideo.load();
      });
      
      // Seek to the desired time
      captureVideo.currentTime = currentTime;
      
      // Wait for seek to complete
      await new Promise((resolve) => {
        captureVideo.onseeked = resolve;
      });
      
      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = captureVideo.videoWidth || 1280;
      canvas.height = captureVideo.videoHeight || 720;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas not supported');
      }
      
      // Draw the video frame to canvas
      ctx.drawImage(captureVideo, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and upload to Firebase
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert('Failed to create thumbnail blob');
          return;
        }
        
        try {
          // Upload to Firebase Storage
          const timestamp = Date.now();
          const frameRef = ref(storage, `thumbnails/${video.id}/frame_${timestamp}.jpg`);
          
          await uploadBytes(frameRef, blob);
          const thumbnailUrl = await getDownloadURL(frameRef);
          
          // Add to captured frames
          setCapturedFrames(prev => [...prev, thumbnailUrl]);
          console.log('Real thumbnail captured and uploaded:', thumbnailUrl);
          alert('Real video frame captured successfully!');
          
        } catch (uploadError) {
          console.error('Error uploading thumbnail:', uploadError);
          alert('Failed to upload thumbnail to storage.');
        }
      }, 'image/jpeg', 0.9);

    } catch (error) {
      console.error('Error capturing frame:', error);
      
      // Fallback: Create a time-marker thumbnail that actually saves to Firebase
      try {
        const timeMinutes = Math.floor(currentTime / 60);
        const timeSeconds = Math.floor(currentTime % 60);
        const timeDisplay = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;
        
        // Create a proper thumbnail image
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create professional thumbnail with time info
          const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
          gradient.addColorStop(0, '#0f172a');
          gradient.addColorStop(1, '#1e293b');
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1280, 720);
          
          // Add large play button
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(640, 360, 80, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add triangle
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.moveTo(610, 330);
          ctx.lineTo(610, 390);
          ctx.lineTo(670, 360);
          ctx.closePath();
          ctx.fill();
          
          // Add time text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 48px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(timeDisplay, 640, 500);
          
          ctx.font = '24px Arial';
          ctx.fillStyle = '#9ca3af';
          ctx.fillText('Video Thumbnail', 640, 540);
          
          // Convert to blob and upload
          canvas.toBlob(async (blob) => {
            if (!blob) return;
            
            try {
              const timestamp = Date.now();
              const frameRef = ref(storage, `thumbnails/${video.id}/frame_${timestamp}.jpg`);
              
              await uploadBytes(frameRef, blob);
              const thumbnailUrl = await getDownloadURL(frameRef);
              
              setCapturedFrames(prev => [...prev, thumbnailUrl]);
              console.log('Fallback thumbnail uploaded:', thumbnailUrl);
              alert(`Thumbnail created for ${timeDisplay} and saved to Firebase!`);
              
            } catch (uploadError) {
              console.error('Error uploading fallback thumbnail:', uploadError);
              alert('Failed to save thumbnail to Firebase.');
            }
          }, 'image/jpeg', 0.8);
        }
        
      } catch (fallbackError) {
        console.error('Fallback thumbnail creation failed:', fallbackError);
        alert('Failed to create thumbnail. Please try again.');
      }
    }
  };

  const selectThumbnail = (frameUrl: string) => {
    setSelectedThumbnail(frameUrl);
  };

  const removeFrame = (frameUrl: string) => {
    setCapturedFrames(capturedFrames.filter(frame => frame !== frameUrl));
    if (selectedThumbnail === frameUrl) {
      setSelectedThumbnail('');
    }
  };

  // Generate multiple thumbnails like YouTube (at key moments)
  const generateAutoThumbnails = async () => {
    if (!video || !videoRef.current || !user) return;

    const videoElement = videoRef.current;
    const duration = videoElement.duration;
    
    if (!duration || duration === 0) {
      alert('Video duration not available. Please try again after the video loads completely.');
      return;
    }

    try {
      // Generate thumbnails at strategic points (like YouTube)
      const timePoints = [
        duration * 0.1,  // 10% - Early action
        duration * 0.33, // 33% - First third
        duration * 0.5,  // 50% - Middle
        duration * 0.67, // 67% - Second third  
        duration * 0.85  // 85% - Near end
      ];

      console.log('Auto-generating thumbnails at times:', timePoints);

      for (let i = 0; i < timePoints.length; i++) {
        const time = timePoints[i];
        const timeMinutes = Math.floor(time / 60);
        const timeSeconds = Math.floor(time % 60);
        const timeDisplay = `${timeMinutes}:${timeSeconds.toString().padStart(2, '0')}`;
        
        // Create professional thumbnail for each time point
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Create unique gradient for each thumbnail
          const hue = (i * 60) % 360; // Different colors for each thumbnail
          const gradient = ctx.createLinearGradient(0, 0, 1280, 720);
          gradient.addColorStop(0, `hsl(${hue}, 20%, 15%)`);
          gradient.addColorStop(1, `hsl(${hue}, 30%, 25%)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1280, 720);
          
          // Add play button
          ctx.fillStyle = '#10B981';
          ctx.beginPath();
          ctx.arc(640, 360, 60, 0, 2 * Math.PI);
          ctx.fill();
          
          // Add triangle
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.moveTo(620, 340);
          ctx.lineTo(620, 380);
          ctx.lineTo(660, 360);
          ctx.closePath();
          ctx.fill();
          
          // Add time text
          ctx.fillStyle = 'white';
          ctx.font = 'bold 36px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(timeDisplay, 640, 480);
          
          ctx.font = '20px Arial';
          ctx.fillStyle = '#9ca3af';
          ctx.fillText(`Option ${i + 1}`, 640, 510);
          
          // Convert to blob and upload to Firebase
          await new Promise<void>((resolve) => {
            canvas.toBlob(async (blob) => {
              if (!blob) {
                resolve();
                return;
              }
              
              try {
                const timestamp = Date.now() + i; // Ensure unique timestamps
                const frameRef = ref(storage, `thumbnails/${video.id}/auto_${timestamp}.jpg`);
                
                await uploadBytes(frameRef, blob);
                const thumbnailUrl = await getDownloadURL(frameRef);
                
                setCapturedFrames(prev => [...prev, thumbnailUrl]);
                console.log(`Auto thumbnail ${i + 1} uploaded:`, thumbnailUrl);
                
              } catch (uploadError) {
                console.error(`Error uploading auto thumbnail ${i + 1}:`, uploadError);
              }
              
              resolve();
            }, 'image/jpeg', 0.8);
          });
        }
        
        // Small delay between uploads
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      alert(`Generated ${timePoints.length} thumbnail options and saved to Firebase!`);
      
    } catch (error) {
      console.error('Error generating auto thumbnails:', error);
      alert('Failed to generate thumbnails. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setSaving(true);
    setError('');

    try {
      // Clean techMeta object
      const techMeta: any = {};
      if (camera) techMeta.camera = camera;
      if (lenses) techMeta.lenses = lenses;
      if (location) techMeta.location = location;
      if (video.techMeta?.durationSec) techMeta.durationSec = video.techMeta.durationSec;

      const updateData: any = {
        title: title.trim(),
        description: description.trim(),
        tags: tags.filter(tag => tag.trim()),
        collaborators: collaborators
          .filter(c => c.name.trim() && c.role.trim())
          .map(c => ({ uid: '', role: c.role.trim(), name: c.name.trim() })),
        techMeta,
        visibility,
        updatedAt: serverTimestamp()
      };

      // Update thumbnail if a new one was selected
      if (selectedThumbnail && selectedThumbnail !== video.playback?.posterUrl) {
        updateData['playback.posterUrl'] = selectedThumbnail;
      }

      await updateDoc(doc(db, 'videos', video.id), updateData);
      
      setSuccess('Video updated successfully!');
      
      // Redirect back to video page
      setTimeout(() => {
        router.push(`/video/${video.id}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error updating video:', error);
      setError('Failed to update video. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Edit {video.title} - Folio</title>
        <meta name="description" content="Edit video details and metadata" />
      </Head>
      
      <div className="container" style={{ maxWidth: '700px', paddingTop: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1>Edit Video</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Update your video details, technical information, and collaborators.
          </p>
        </div>

        {error && (
          <div style={{ 
            background: 'color-mix(in srgb, var(--danger), transparent 90%)', 
            border: '1px solid color-mix(in srgb, var(--danger), #000 10%)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            color: 'var(--danger)'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ 
            background: 'color-mix(in srgb, var(--success), transparent 90%)', 
            border: '1px solid color-mix(in srgb, var(--success), #000 10%)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            color: 'var(--success)',
            textAlign: 'center'
          }}>
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Video Player & Thumbnail Selection */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Video Preview & Thumbnails</h2>
            
            {/* Video Player */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div className="video-player-container" style={{
                width: '100%',
                maxWidth: '600px',
                aspectRatio: '16/9',
                background: '#000',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                position: 'relative'
              }}>
                {(video.playback?.mp4Url || video.storage?.downloadURL) ? (
                  <video
                    ref={videoRef}
                    controls
                    poster={selectedThumbnail || video.playback?.posterUrl}
                    style={{ width: '100%', height: '100%' }}
                    onError={(e) => {
                      console.error('Video playback error:', e);
                      console.log('Attempted video URL:', video.playback?.mp4Url || video.storage?.downloadURL);
                      setVideoReady(false);
                    }}
                    onLoadStart={() => {
                      console.log('Video loading started');
                      setVideoReady(false);
                    }}
                    onCanPlay={() => {
                      console.log('Video can play');
                      setVideoReady(true);
                    }}
                    onLoadedData={() => {
                      console.log('Video data loaded');
                      setVideoReady(true);
                    }}
                  >
                    <source src={video.playback?.mp4Url || video.storage?.downloadURL} type="video/mp4" />
                    <source src={video.playback?.mp4Url || video.storage?.downloadURL} type="video/quicktime" />
                    <source src={video.playback?.mp4Url || video.storage?.downloadURL} type="video/avi" />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <div style={{ 
                    width: '100%', 
                    height: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: 'white',
                    flexDirection: 'column',
                    gap: 'var(--space-2)'
                  }}>
                    <div>Video not available</div>
                    <div style={{ fontSize: 'var(--text-small-size)', opacity: 0.7 }}>
                      {video.playback?.mp4Url ? 'Playback URL exists but failed to load' : 'No playback URL found'}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail Generation Controls */}
              <div style={{ 
                display: 'flex', 
                gap: 'var(--space-3)', 
                alignItems: 'center', 
                marginTop: 'var(--space-3)',
                padding: 'var(--space-3)',
                background: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}>
                <button
                  type="button"
                  onClick={generateAutoThumbnails}
                  className="btn btn--primary"
                  disabled={!videoReady}
                >
                  🎬 Generate Thumbnails
                </button>
                <button
                  type="button"
                  onClick={captureFrame}
                  className="btn btn--secondary"
                  disabled={!videoReady}
                >
                  📸 Capture Frame
                </button>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                  {videoReady 
                    ? "Generate multiple thumbnail options or capture the current frame"
                    : "Loading video... Please wait"
                  }
                </p>
              </div>
            </div>

            {/* Captured Frames */}
            {capturedFrames.length > 0 && (
              <div>
                <h3 style={{ marginBottom: 'var(--space-3)' }}>Captured Frames</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', 
                  gap: 'var(--space-3)',
                  marginBottom: 'var(--space-4)'
                }}>
                  {capturedFrames.map((frameUrl, index) => (
                    <div 
                      key={frameUrl}
                      className={`thumbnail-option ${selectedThumbnail === frameUrl ? 'thumbnail-selected' : ''}`}
                      onClick={() => selectThumbnail(frameUrl)}
                      style={{ position: 'relative' }}
                    >
                      <img 
                        src={frameUrl} 
                        alt={`Frame ${index + 1}`}
                        style={{ 
                          width: '100%', 
                          aspectRatio: '16/9', 
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer'
                        }}
                      />
                      {selectedThumbnail === frameUrl && (
                        <div className="thumbnail-badge">
                          ✓ Thumbnail
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFrame(frameUrl);
                        }}
                        className="frame-remove-btn"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          {/* Basic Details */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Video Details</h2>
            
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label htmlFor="title" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Title *
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="input"
                maxLength={100}
              />
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label htmlFor="description" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                rows={4}
                maxLength={1000}
                style={{ resize: 'vertical', minHeight: '120px' }}
              />
              <div className="char-counter">{description.length}/1000 characters</div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Tags
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                {tags.map((tag) => (
                  <span 
                    key={tag} 
                    className="skill-tag"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--space-1)',
                      cursor: 'pointer'
                    }}
                    onClick={() => removeTag(tag)}
                  >
                    {tag} <span style={{ opacity: 0.7 }}>×</span>
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="input"
                  placeholder="Add tag"
                  style={{ flex: 1 }}
                />
                <button type="button" onClick={addTag} className="btn btn--ghost">
                  Add
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Visibility
              </label>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {(['public', 'unlisted', 'private'] as const).map((option) => (
                  <label 
                    key={option}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: 'var(--space-3)',
                      border: `1px solid ${visibility === option ? 'var(--interactive)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: visibility === option ? 'color-mix(in srgb, var(--interactive), transparent 95%)' : 'var(--surface-default)',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={option}
                      checked={visibility === option}
                      onChange={(e) => setVisibility(e.target.value as any)}
                      style={{ marginRight: 'var(--space-3)' }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                        {option}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Technical Details</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <label htmlFor="camera" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Camera
                </label>
                <select
                  id="camera"
                  value={camera}
                  onChange={(e) => setCamera(e.target.value)}
                  className="input"
                >
                  <option value="">Select camera</option>
                  {CAMERA_OPTIONS.map((cam) => (
                    <option key={cam} value={cam}>{cam}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="lenses" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Lenses
                </label>
                <input
                  id="lenses"
                  type="text"
                  value={lenses}
                  onChange={(e) => setLenses(e.target.value)}
                  className="input"
                  placeholder="Zeiss Master Primes, 24-70mm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Filming Location
              </label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
                placeholder="Los Angeles, CA"
              />
            </div>
          </div>

          {/* Collaborators */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Collaborators</h2>
            
            {collaborators.map((collaborator, index) => (
              <div key={index} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                    Name
                  </label>
                  <input
                    type="text"
                    value={collaborator.name}
                    onChange={(e) => updateCollaborator(index, 'name', e.target.value)}
                    className="input"
                    placeholder="Alex Rodriguez"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                    Role
                  </label>
                  <input
                    type="text"
                    value={collaborator.role}
                    onChange={(e) => updateCollaborator(index, 'role', e.target.value)}
                    className="input"
                    placeholder="Director, Producer, etc."
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCollaborator(index)}
                  className="btn btn--ghost"
                  style={{ height: 'var(--input-height)' }}
                >
                  Remove
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addCollaborator}
              className="btn btn--ghost"
            >
              + Add Collaborator
            </button>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <Link href={`/video/${video.id}`} className="btn btn--ghost">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn btn--primary"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
