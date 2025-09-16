import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';
import { generateVideoThumbnail, formatTime, isValidTimestamp } from '../../../lib/thumbnails';

interface Video {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  tags: string[];
  collaborators: { uid: string; role: string; name?: string }[];
  credits: {
    aboveLine: { name: string; role: string }[];
    belowLine: { name: string; role: string }[];
  };
  talent: {
    lead: { name: string; role: string }[];
    supporting: { name: string; role: string }[];
  };
  vendors: { name: string; type: string; description?: string }[];
  awards: { name: string; category?: string; year?: number; status: 'winner' | 'nominee' | 'finalist' }[];
  techMeta: { 
    camera?: string; 
    lenses?: string; 
    location?: string; 
    durationSec?: number;
    resolution?: string;
    frameRate?: string;
    codec?: string;
    colorProfile?: string;
  };
  releaseDate?: string;
  notes?: string;
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

const VENDOR_TYPES = [
  'Production Company',
  'Post-Production House',
  'Equipment Rental',
  'Sound Studio',
  'VFX House',
  'Color House',
  'Music/Composer',
  'Location Services',
  'Catering',
  'Transportation',
  'Insurance',
  'Legal Services',
  'Other'
];

const RESOLUTION_OPTIONS = [
  '4K (3840×2160)',
  '6K (6144×3456)',
  '8K (7680×4320)',
  '2K (2048×1080)',
  'HD (1920×1080)',
  'Other'
];

const FRAME_RATE_OPTIONS = [
  '23.98 fps',
  '24 fps',
  '25 fps',
  '29.97 fps',
  '30 fps',
  '50 fps',
  '59.94 fps',
  '60 fps',
  '120 fps',
  'Other'
];

const CODEC_OPTIONS = [
  'ProRes 422',
  'ProRes 4444',
  'RED R3D',
  'BRAW',
  'H.264',
  'H.265/HEVC',
  'DNxHD',
  'Other'
];

const COLOR_PROFILE_OPTIONS = [
  'Rec. 709',
  'Rec. 2020',
  'Log-C',
  'S-Log3',
  'V-Log',
  'RED Log',
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
  const [resolution, setResolution] = useState('');
  const [frameRate, setFrameRate] = useState('');
  const [codec, setCodec] = useState('');
  const [colorProfile, setColorProfile] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [notes, setNotes] = useState('');
  const [collaborators, setCollaborators] = useState<{ name: string; role: string }[]>([]);
  const [aboveLineCredits, setAboveLineCredits] = useState<{ name: string; role: string }[]>([]);
  const [belowLineCredits, setBelowLineCredits] = useState<{ name: string; role: string }[]>([]);
  const [leadTalent, setLeadTalent] = useState<{ name: string; role: string }[]>([]);
  const [supportingTalent, setSupportingTalent] = useState<{ name: string; role: string }[]>([]);
  const [vendors, setVendors] = useState<{ name: string; type: string; description: string }[]>([]);
  const [awards, setAwards] = useState<{ name: string; category: string; year: string; status: 'winner' | 'nominee' | 'finalist' }[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [capturedFrames, setCapturedFrames] = useState<string[]>([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState<string>('');
  const [videoReady, setVideoReady] = useState(false);
  const [thumbnailGenerating, setThumbnailGenerating] = useState(false);
  
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
        setResolution(videoData.techMeta?.resolution || '');
        setFrameRate(videoData.techMeta?.frameRate || '');
        setCodec(videoData.techMeta?.codec || '');
        setColorProfile(videoData.techMeta?.colorProfile || '');
        setReleaseDate(videoData.releaseDate || '');
        setNotes(videoData.notes || '');
        setCollaborators(videoData.collaborators.map(c => ({ name: c.name || '', role: c.role })));
        setAboveLineCredits(videoData.credits?.aboveLine || []);
        setBelowLineCredits(videoData.credits?.belowLine || []);
        setLeadTalent(videoData.talent?.lead || []);
        setSupportingTalent(videoData.talent?.supporting || []);
        setVendors(videoData.vendors?.map(v => ({ name: v.name, type: v.type, description: v.description || '' })) || []);
        setAwards(videoData.awards?.map(a => ({ name: a.name, category: a.category || '', year: a.year?.toString() || '', status: a.status })) || []);
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

  // Credits management
  const addAboveLineCredit = () => {
    setAboveLineCredits([...aboveLineCredits, { name: '', role: '' }]);
  };

  const updateAboveLineCredit = (index: number, field: 'name' | 'role', value: string) => {
    const newCredits = [...aboveLineCredits];
    newCredits[index][field] = value;
    setAboveLineCredits(newCredits);
  };

  const removeAboveLineCredit = (index: number) => {
    setAboveLineCredits(aboveLineCredits.filter((_, i) => i !== index));
  };

  const addBelowLineCredit = () => {
    setBelowLineCredits([...belowLineCredits, { name: '', role: '' }]);
  };

  const updateBelowLineCredit = (index: number, field: 'name' | 'role', value: string) => {
    const newCredits = [...belowLineCredits];
    newCredits[index][field] = value;
    setBelowLineCredits(newCredits);
  };

  const removeBelowLineCredit = (index: number) => {
    setBelowLineCredits(belowLineCredits.filter((_, i) => i !== index));
  };

  // Talent management
  const addLeadTalent = () => {
    setLeadTalent([...leadTalent, { name: '', role: '' }]);
  };

  const updateLeadTalent = (index: number, field: 'name' | 'role', value: string) => {
    const newTalent = [...leadTalent];
    newTalent[index][field] = value;
    setLeadTalent(newTalent);
  };

  const removeLeadTalent = (index: number) => {
    setLeadTalent(leadTalent.filter((_, i) => i !== index));
  };

  const addSupportingTalent = () => {
    setSupportingTalent([...supportingTalent, { name: '', role: '' }]);
  };

  const updateSupportingTalent = (index: number, field: 'name' | 'role', value: string) => {
    const newTalent = [...supportingTalent];
    newTalent[index][field] = value;
    setSupportingTalent(newTalent);
  };

  const removeSupportingTalent = (index: number) => {
    setSupportingTalent(supportingTalent.filter((_, i) => i !== index));
  };

  // Vendors management
  const addVendor = () => {
    setVendors([...vendors, { name: '', type: '', description: '' }]);
  };

  const updateVendor = (index: number, field: 'name' | 'type' | 'description', value: string) => {
    const newVendors = [...vendors];
    newVendors[index][field] = value;
    setVendors(newVendors);
  };

  const removeVendor = (index: number) => {
    setVendors(vendors.filter((_, i) => i !== index));
  };

  // Awards management
  const addAward = () => {
    setAwards([...awards, { name: '', category: '', year: '', status: 'nominee' }]);
  };

  const updateAward = (index: number, field: 'name' | 'category' | 'year' | 'status', value: string) => {
    const newAwards = [...awards];
    newAwards[index][field] = value;
    setAwards(newAwards);
  };

  const removeAward = (index: number) => {
    setAwards(awards.filter((_, i) => i !== index));
  };

  // Generate thumbnail using Firebase Cloud Function
  const captureFrame = async () => {
    if (!videoRef.current || !user || !video) return;

    const videoElement = videoRef.current;
    const currentTime = videoElement.currentTime;

    if (videoElement.readyState < 2) {
      alert('Video is still loading. Please wait and try again.');
      return;
    }

    // Validate timestamp
    if (!isValidTimestamp(currentTime, video.techMeta?.durationSec)) {
      setError('Invalid timestamp for thumbnail generation.');
      return;
    }

    try {
      setThumbnailGenerating(true);
      setError('');
      setSuccess('');
      
      console.log('Generating thumbnail at time:', formatTime(currentTime));
      
      // Call Firebase Cloud Function
      const result = await generateVideoThumbnail({
        videoId: video.id,
        timestamp: currentTime,
        userId: user.uid,
        quality: 'high'
      });
      
      if (result.success && result.thumbnailUrl) {
        // Refresh video data to get the updated thumbnail
        const videoDoc = await getDoc(doc(db, 'videos', video.id));
        if (videoDoc.exists()) {
          const updatedVideo = { id: videoDoc.id, ...videoDoc.data() } as Video;
          setVideo(updatedVideo);
          setSelectedThumbnail(updatedVideo.playback?.posterUrl || '');
          
          // Update video player poster
          if (videoRef.current && updatedVideo.playback?.posterUrl) {
            videoRef.current.poster = updatedVideo.playback.posterUrl;
          }
        }
        
        setSuccess(`Thumbnail updated successfully! (Generated in ${result.processingTime ? Math.round(result.processingTime / 1000) : '?'}s)`);
        console.log('Thumbnail generated successfully:', result.thumbnailUrl);
        
      } else {
        throw new Error(result.error || 'Unknown error occurred');
      }
      
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate thumbnail. Please try again.');
    } finally {
      setThumbnailGenerating(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
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
      if (resolution) techMeta.resolution = resolution;
      if (frameRate) techMeta.frameRate = frameRate;
      if (codec) techMeta.codec = codec;
      if (colorProfile) techMeta.colorProfile = colorProfile;
      if (video.techMeta?.durationSec) techMeta.durationSec = video.techMeta.durationSec;

      // Clean credits object
      const credits = {
        aboveLine: aboveLineCredits.filter(c => c.name.trim() && c.role.trim()),
        belowLine: belowLineCredits.filter(c => c.name.trim() && c.role.trim())
      };

      // Clean talent object
      const talent = {
        lead: leadTalent.filter(t => t.name.trim() && t.role.trim()),
        supporting: supportingTalent.filter(t => t.name.trim() && t.role.trim())
      };

      // Clean vendors array
      const cleanVendors = vendors.filter(v => v.name.trim() && v.type.trim());

      // Clean awards array
      const cleanAwards = awards
        .filter(a => a.name.trim())
        .map(a => ({
          name: a.name.trim(),
          category: a.category.trim() || undefined,
          year: a.year ? parseInt(a.year) : undefined,
          status: a.status
        }));

      const updateData: any = {
        title: title.trim(),
        description: description.trim(),
        tags: tags.filter(tag => tag.trim()),
        collaborators: collaborators
          .filter(c => c.name.trim() && c.role.trim())
          .map(c => ({ uid: '', role: c.role.trim(), name: c.name.trim() })),
        credits,
        talent,
        vendors: cleanVendors,
        awards: cleanAwards,
        techMeta,
        releaseDate: releaseDate || null,
        notes: notes.trim() || null,
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
          {/* Video Preview & Thumbnail Management */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Video Preview & Thumbnail Selection</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
              {/* Video Player */}
              <div>
                <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg-size)' }}>Video Preview</h3>
                <div className="video-player-container" style={{
                  width: '100%',
                  aspectRatio: '16/9',
                  background: '#000',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: 'var(--space-3)'
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
                  padding: 'var(--space-4)',
                  background: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <button
                      type="button"
                      onClick={captureFrame}
                      className="btn btn--primary"
                      disabled={!videoReady || thumbnailGenerating}
                    >
                      {thumbnailGenerating ? '⏳ Generating...' : '📸 Capture Current Frame'}
                    </button>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)', lineHeight: 1.4 }}>
                    {thumbnailGenerating
                      ? "Generating high-quality thumbnail from video frame..."
                      : videoReady 
                        ? "Scrub to the perfect moment in the video timeline and click 'Capture Current Frame' to create a professional thumbnail"
                        : "Loading video... Please wait"
                    }
                  </p>
                </div>
              </div>

              {/* Thumbnail Selection Panel */}
              <div>
                <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg-size)' }}>Thumbnail Options</h3>
                
                {/* Current Thumbnail */}
                {selectedThumbnail && (
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-base-size)', color: 'var(--text-secondary)' }}>
                      Current Thumbnail
                    </h4>
                    <div style={{ 
                      position: 'relative',
                      border: '2px solid var(--success)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden'
                    }}>
                      <img 
                        src={selectedThumbnail} 
                        alt="Current thumbnail"
                        style={{ 
                          width: '100%', 
                          aspectRatio: '16/9', 
                          objectFit: 'cover'
                        }}
                      />
                      <div style={{
                        position: 'absolute',
                        top: 'var(--space-2)',
                        right: 'var(--space-2)',
                        background: 'var(--success)',
                        color: 'white',
                        padding: 'var(--space-1) var(--space-2)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-small-size)',
                        fontWeight: 600
                      }}>
                        ✓ Active
                      </div>
                    </div>
                  </div>
                )}

                {/* Captured Frames */}
                {capturedFrames.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-base-size)', color: 'var(--text-secondary)' }}>
                      Captured Frames ({capturedFrames.length})
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: 'var(--space-2)',
                      marginBottom: 'var(--space-4)'
                    }}>
                      {capturedFrames.map((frameUrl, index) => (
                        <div 
                          key={frameUrl}
                          onClick={() => selectThumbnail(frameUrl)}
                          style={{ 
                            position: 'relative',
                            cursor: 'pointer',
                            border: selectedThumbnail === frameUrl ? '2px solid var(--interactive)' : '2px solid transparent',
                            borderRadius: 'var(--radius-sm)',
                            overflow: 'hidden',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <img 
                            src={frameUrl} 
                            alt={`Frame ${index + 1}`}
                            style={{ 
                              width: '100%', 
                              aspectRatio: '16/9', 
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                          {selectedThumbnail === frameUrl && (
                            <div style={{
                              position: 'absolute',
                              top: 'var(--space-1)',
                              right: 'var(--space-1)',
                              background: 'var(--interactive)',
                              color: 'white',
                              padding: '2px var(--space-1)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '10px',
                              fontWeight: 600
                            }}>
                              ✓
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFrame(frameUrl);
                            }}
                            style={{
                              position: 'absolute',
                              top: 'var(--space-1)',
                              left: 'var(--space-1)',
                              background: 'rgba(0, 0, 0, 0.7)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div style={{ 
                  padding: 'var(--space-3)',
                  background: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-small-size)',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.4
                }}>
                  <strong style={{ color: 'var(--text-primary)' }}>💡 Tips:</strong>
                  <ul style={{ margin: 'var(--space-2) 0 0 0', paddingLeft: 'var(--space-4)' }}>
                    <li>Scrub through the video to find the most compelling moment</li>
                    <li>Look for clear, well-lit shots that represent your content</li>
                    <li>Avoid blurry frames or transition moments</li>
                    <li>Click any captured frame to set it as your thumbnail</li>
                  </ul>
                </div>
              </div>
            </div>

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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <label htmlFor="resolution" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Resolution
                </label>
                <select
                  id="resolution"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="input"
                >
                  <option value="">Select resolution</option>
                  {RESOLUTION_OPTIONS.map((res) => (
                    <option key={res} value={res}>{res}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="frameRate" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Frame Rate
                </label>
                <select
                  id="frameRate"
                  value={frameRate}
                  onChange={(e) => setFrameRate(e.target.value)}
                  className="input"
                >
                  <option value="">Select frame rate</option>
                  {FRAME_RATE_OPTIONS.map((rate) => (
                    <option key={rate} value={rate}>{rate}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div>
                <label htmlFor="codec" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Codec
                </label>
                <select
                  id="codec"
                  value={codec}
                  onChange={(e) => setCodec(e.target.value)}
                  className="input"
                >
                  <option value="">Select codec</option>
                  {CODEC_OPTIONS.map((cod) => (
                    <option key={cod} value={cod}>{cod}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="colorProfile" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                  Color Profile
                </label>
                <select
                  id="colorProfile"
                  value={colorProfile}
                  onChange={(e) => setColorProfile(e.target.value)}
                  className="input"
                >
                  <option value="">Select color profile</option>
                  {COLOR_PROFILE_OPTIONS.map((profile) => (
                    <option key={profile} value={profile}>{profile}</option>
                  ))}
                </select>
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

          {/* Credits */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Credits</h2>
            
            {/* Above the Line Credits */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg-size)' }}>Above the Line</h3>
              {aboveLineCredits.map((credit, index) => (
                <div key={index} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={credit.name}
                      onChange={(e) => updateAboveLineCredit(index, 'name', e.target.value)}
                      className="input"
                      placeholder="John Smith"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Role
                    </label>
                    <input
                      type="text"
                      value={credit.role}
                      onChange={(e) => updateAboveLineCredit(index, 'role', e.target.value)}
                      className="input"
                      placeholder="Executive Producer, Director, etc."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAboveLineCredit(index)}
                    className="btn btn--ghost"
                    style={{ height: 'var(--input-height)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addAboveLineCredit}
                className="btn btn--ghost"
              >
                + Add Above the Line Credit
              </button>
            </div>

            {/* Below the Line Credits */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg-size)' }}>Below the Line</h3>
              {belowLineCredits.map((credit, index) => (
                <div key={index} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={credit.name}
                      onChange={(e) => updateBelowLineCredit(index, 'name', e.target.value)}
                      className="input"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Role
                    </label>
                    <input
                      type="text"
                      value={credit.role}
                      onChange={(e) => updateBelowLineCredit(index, 'role', e.target.value)}
                      className="input"
                      placeholder="Cinematographer, Editor, etc."
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeBelowLineCredit(index)}
                    className="btn btn--ghost"
                    style={{ height: 'var(--input-height)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addBelowLineCredit}
                className="btn btn--ghost"
              >
                + Add Below the Line Credit
              </button>
            </div>
          </div>

          {/* Talent */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Talent</h2>
            
            {/* Lead Talent */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg-size)' }}>Lead</h3>
              {leadTalent.map((talent, index) => (
                <div key={index} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={talent.name}
                      onChange={(e) => updateLeadTalent(index, 'name', e.target.value)}
                      className="input"
                      placeholder="Actor Name"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Character/Role
                    </label>
                    <input
                      type="text"
                      value={talent.role}
                      onChange={(e) => updateLeadTalent(index, 'role', e.target.value)}
                      className="input"
                      placeholder="Character Name or Role"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLeadTalent(index)}
                    className="btn btn--ghost"
                    style={{ height: 'var(--input-height)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addLeadTalent}
                className="btn btn--ghost"
              >
                + Add Lead Talent
              </button>
            </div>

            {/* Supporting Talent */}
            <div>
              <h3 style={{ marginBottom: 'var(--space-3)', fontSize: 'var(--text-lg-size)' }}>Supporting</h3>
              {supportingTalent.map((talent, index) => (
                <div key={index} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Name
                    </label>
                    <input
                      type="text"
                      value={talent.name}
                      onChange={(e) => updateSupportingTalent(index, 'name', e.target.value)}
                      className="input"
                      placeholder="Actor Name"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Character/Role
                    </label>
                    <input
                      type="text"
                      value={talent.role}
                      onChange={(e) => updateSupportingTalent(index, 'role', e.target.value)}
                      className="input"
                      placeholder="Character Name or Role"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSupportingTalent(index)}
                    className="btn btn--ghost"
                    style={{ height: 'var(--input-height)' }}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSupportingTalent}
                className="btn btn--ghost"
              >
                + Add Supporting Talent
              </button>
            </div>
          </div>

          {/* Vendors */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Vendors</h2>
            
            {vendors.map((vendor, index) => (
              <div key={index} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Vendor Name
                    </label>
                    <input
                      type="text"
                      value={vendor.name}
                      onChange={(e) => updateVendor(index, 'name', e.target.value)}
                      className="input"
                      placeholder="Company Name"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Type
                    </label>
                    <select
                      value={vendor.type}
                      onChange={(e) => updateVendor(index, 'type', e.target.value)}
                      className="input"
                    >
                      <option value="">Select type</option>
                      {VENDOR_TYPES.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeVendor(index)}
                    className="btn btn--ghost"
                    style={{ height: 'var(--input-height)' }}
                  >
                    Remove
                  </button>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={vendor.description}
                    onChange={(e) => updateVendor(index, 'description', e.target.value)}
                    className="input"
                    placeholder="Brief description of services provided"
                  />
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addVendor}
              className="btn btn--ghost"
            >
              + Add Vendor
            </button>
          </div>

          {/* Awards */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Awards & Recognition</h2>
            
            {awards.map((award, index) => (
              <div key={index} style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)', background: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', alignItems: 'flex-end' }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Award Name
                    </label>
                    <input
                      type="text"
                      value={award.name}
                      onChange={(e) => updateAward(index, 'name', e.target.value)}
                      className="input"
                      placeholder="Emmy Award, Cannes Film Festival, etc."
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Status
                    </label>
                    <select
                      value={award.status}
                      onChange={(e) => updateAward(index, 'status', e.target.value)}
                      className="input"
                    >
                      <option value="winner">Winner</option>
                      <option value="nominee">Nominee</option>
                      <option value="finalist">Finalist</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAward(index)}
                    className="btn btn--ghost"
                    style={{ height: 'var(--input-height)' }}
                  >
                    Remove
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Category (Optional)
                    </label>
                    <input
                      type="text"
                      value={award.category}
                      onChange={(e) => updateAward(index, 'category', e.target.value)}
                      className="input"
                      placeholder="Best Cinematography, Best Short Film, etc."
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                      Year (Optional)
                    </label>
                    <input
                      type="number"
                      value={award.year}
                      onChange={(e) => updateAward(index, 'year', e.target.value)}
                      className="input"
                      placeholder="2024"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addAward}
              className="btn btn--ghost"
            >
              + Add Award
            </button>
          </div>

          {/* Release Date & Notes */}
          <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>Additional Information</h2>
            
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label htmlFor="releaseDate" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Release Date
              </label>
              <input
                id="releaseDate"
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label htmlFor="notes" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                Production Notes
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
                rows={4}
                maxLength={2000}
                style={{ resize: 'vertical', minHeight: '120px' }}
                placeholder="Behind-the-scenes information, production challenges, special techniques used, etc."
              />
              <div className="char-counter">{notes.length}/2000 characters</div>
            </div>
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
