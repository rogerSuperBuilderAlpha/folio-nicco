import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';

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
  storage: { path: string; sizeBytes: number; downloadURL?: string };
  playback: { provider: string; id: string; posterUrl?: string; mp4Url?: string };
  visibility: 'public' | 'private' | 'unlisted';
  createdAt: any;
  updatedAt: any;
}

export default function VideoPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [video, setVideo] = useState<Video | null>(null);
  const [creator, setCreator] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewTracked, setViewTracked] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const startTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchVideo = async () => {
      try {
        console.log('Fetching video:', id);
        
        // Get video document
        const videoDoc = await getDoc(doc(db, 'videos', id));
        
        if (!videoDoc.exists()) {
          console.log('Video not found');
          setNotFound(true);
          return;
        }

        const videoData = { id: videoDoc.id, ...videoDoc.data() } as Video;
        console.log('Video found:', videoData);

        // Check if user can view this video
        const canView = 
          videoData.visibility === 'public' || 
          (user && user.uid === videoData.ownerUid);

        if (!canView) {
          console.log('User cannot view this video');
          setNotFound(true);
          return;
        }

        setVideo(videoData);

        // Fetch creator profile
        const profilesRef = collection(db, 'profiles');
        const q = query(profilesRef, where('uid', '==', videoData.ownerUid));
        const profileSnapshot = await getDocs(q);
        
        if (!profileSnapshot.empty) {
          const creatorData = {
            uid: profileSnapshot.docs[0].id,
            ...profileSnapshot.docs[0].data()
          } as UserProfile;
          setCreator(creatorData);
        }

      } catch (error) {
        console.error('Error fetching video:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id, user]);

  // Track video view
  useEffect(() => {
    if (!video || viewTracked) return;

    const trackView = async () => {
      try {
        // Determine the source of the view
        const referrer = document.referrer;
        let source: 'direct' | 'profile' | 'discover' | 'embed' = 'direct';
        
        if (referrer.includes('/profile/')) {
          source = 'profile';
        } else if (referrer.includes('/discover')) {
          source = 'discover';
        } else if (referrer.includes('/embed/')) {
          source = 'embed';
        }

        const viewData = {
          videoId: video.id,
          viewerUid: user?.uid || null, // null for anonymous views
          timestamp: serverTimestamp(),
          source,
          watchTimeSeconds: 0, // Will be updated when video ends
          completed: false
        };

        await addDoc(collection(db, 'videoViews'), viewData);
        setViewTracked(true);
        startTimeRef.current = Date.now();
        
        console.log('View tracked for video:', video.id);
      } catch (error) {
        console.error('Error tracking view:', error);
      }
    };

    trackView();
  }, [video, viewTracked, user]);

  // Track watch time and completion
  const handleVideoPlay = () => {
    startTimeRef.current = Date.now();
  };

  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      lastTimeRef.current = videoRef.current.currentTime;
    }
  };

  const handleVideoEnded = async () => {
    if (!video || !viewTracked) return;

    try {
      const watchTime = Math.floor((Date.now() - startTimeRef.current) / 1000);
      
      // Update the view record with completion data
      // Note: In a real app, you'd want to store the view ID and update it
      // For now, we'll create a completion event
      const completionData = {
        videoId: video.id,
        viewerUid: user?.uid || null,
        timestamp: serverTimestamp(),
        watchTimeSeconds: watchTime,
        completed: true,
        source: 'direct' // Could be tracked from the original view
      };

      await addDoc(collection(db, 'videoViews'), completionData);
      console.log('Video completion tracked:', watchTime, 'seconds');
    } catch (error) {
      console.error('Error tracking completion:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (notFound || !video) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h1>Video not found</h1>
          <p>This video doesn't exist or is private.</p>
          <Link href="/discover" className="btn btn--primary">Discover Videos</Link>
        </div>
      </div>
    );
  }

  const isOwner = user?.uid === video.ownerUid;
  const videoUrl = video.playback?.mp4Url || video.storage?.downloadURL;

  return (
    <>
      <Head>
        <title>{video.title} - Folio</title>
        <meta name="description" content={video.description || `Watch ${video.title} by ${creator?.displayName}`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        
        {/* Open Graph for social sharing */}
        <meta property="og:title" content={video.title} />
        <meta property="og:description" content={video.description || `Watch ${video.title}`} />
        <meta property="og:type" content="video.other" />
        {video.playback?.posterUrl && <meta property="og:image" content={video.playback.posterUrl} />}
        {videoUrl && <meta property="og:video" content={videoUrl} />}
      </Head>
      
      <div className="container" style={{ maxWidth: '1000px', paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-8)' }}>
        {/* Video Player */}
        <div className="video-player-container" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="video-player" style={{
            width: '100%',
            aspectRatio: '16/9',
            background: '#000',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {videoUrl ? (
              <video
                ref={videoRef}
                controls
                poster={video.playback?.posterUrl}
                onPlay={handleVideoPlay}
                onTimeUpdate={handleVideoTimeUpdate}
                onEnded={handleVideoEnded}
                style={{ width: '100%', height: '100%' }}
              >
                <source src={videoUrl} type="video/mp4" />
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
                fontSize: '18px'
              }}>
                Video processing...
              </div>
            )}
          </div>
        </div>

        {/* Video Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
          <div>
            {/* Title and Description */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <h1 style={{ margin: 0, fontSize: 'var(--text-h2-size)', lineHeight: 'var(--text-h2-line)' }}>
                  {video.title}
                </h1>
                {isOwner && (
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Link href={`/video/${video.id}/edit`} className="btn btn--ghost">
                      Edit
                    </Link>
                    <Link href={`/video/${video.id}/analytics`} className="btn btn--ghost">
                      Analytics
                    </Link>
                  </div>
                )}
              </div>
              
              {video.description && (
                <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                  {video.description}
                </p>
              )}
            </div>

            {/* Tags */}
            {video.tags.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 'var(--space-3)' }}>Tags</h3>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {video.tags.map((tag) => (
                    <span key={tag} className="tag" style={{ 
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'var(--surface-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-small-size)'
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Details */}
            {(video.techMeta?.camera || video.techMeta?.lenses || video.techMeta?.location || video.techMeta?.resolution || video.techMeta?.frameRate || video.techMeta?.codec || video.techMeta?.colorProfile) && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <h3 style={{ marginBottom: 'var(--space-3)' }}>Technical Details</h3>
                <div className="card" style={{ background: 'var(--surface-subtle)' }}>
                  {video.techMeta.camera && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Camera:</strong> {video.techMeta.camera}
                    </div>
                  )}
                  {video.techMeta.lenses && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Lenses:</strong> {video.techMeta.lenses}
                    </div>
                  )}
                  {video.techMeta.location && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Location:</strong> {video.techMeta.location}
                    </div>
                  )}
                  {video.techMeta.resolution && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Resolution:</strong> {video.techMeta.resolution}
                    </div>
                  )}
                  {video.techMeta.frameRate && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Frame Rate:</strong> {video.techMeta.frameRate}
                    </div>
                  )}
                  {video.techMeta.codec && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Codec:</strong> {video.techMeta.codec}
                    </div>
                  )}
                  {video.techMeta.colorProfile && (
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <strong>Color Profile:</strong> {video.techMeta.colorProfile}
                    </div>
                  )}
                  {video.techMeta.durationSec && (
                    <div>
                      <strong>Duration:</strong> {Math.floor(video.techMeta.durationSec / 60)}:{(video.techMeta.durationSec % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Collaborators */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Collaborators</h3>
              {video.collaborators && video.collaborators.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {video.collaborators.map((collaborator, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--space-2) 0' }}>
                      <span>{collaborator.name || 'Unknown'}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{collaborator.role}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ background: 'var(--surface-subtle)', textAlign: 'center', padding: 'var(--space-4)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No collaborators listed for this project
                  </p>
                </div>
              )}
            </div>

            {/* Credits */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Credits</h3>
              <div className="card" style={{ background: 'var(--surface-subtle)' }}>
                {/* Above the Line */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-base-size)', color: 'var(--text-secondary)' }}>Above the Line</h4>
                  {video.credits?.aboveLine?.length > 0 ? (
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {video.credits.aboveLine.map((credit, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{credit.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{credit.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 'var(--text-small-size)' }}>
                      No above the line credits added
                    </p>
                  )}
                </div>

                {/* Below the Line */}
                <div>
                  <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-base-size)', color: 'var(--text-secondary)' }}>Below the Line</h4>
                  {video.credits?.belowLine?.length > 0 ? (
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {video.credits.belowLine.map((credit, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{credit.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{credit.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 'var(--text-small-size)' }}>
                      No below the line credits added
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Talent */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Talent</h3>
              <div className="card" style={{ background: 'var(--surface-subtle)' }}>
                {/* Lead Talent */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-base-size)', color: 'var(--text-secondary)' }}>Lead</h4>
                  {video.talent?.lead?.length > 0 ? (
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {video.talent.lead.map((person, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{person.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{person.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 'var(--text-small-size)' }}>
                      No lead talent listed
                    </p>
                  )}
                </div>

                {/* Supporting Talent */}
                <div>
                  <h4 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-base-size)', color: 'var(--text-secondary)' }}>Supporting</h4>
                  {video.talent?.supporting?.length > 0 ? (
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {video.talent.supporting.map((person, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{person.name}</span>
                          <span style={{ color: 'var(--text-secondary)' }}>{person.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: 'var(--text-small-size)' }}>
                      No supporting talent listed
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Vendors */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Vendors</h3>
              {video.vendors && video.vendors.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {video.vendors.map((vendor, index) => (
                    <div key={index} className="card" style={{ background: 'var(--surface-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontWeight: 600 }}>{vendor.name}</span>
                        <span style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: 'var(--text-small-size)',
                          padding: 'var(--space-1) var(--space-2)',
                          background: 'var(--surface-default)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          {vendor.type}
                        </span>
                      </div>
                      {vendor.description && (
                        <p style={{ margin: 0, fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                          {vendor.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ background: 'var(--surface-subtle)', textAlign: 'center', padding: 'var(--space-4)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No vendors listed for this project
                  </p>
                  <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                    Production companies, post houses, equipment rental, and other service providers will appear here
                  </p>
                </div>
              )}
            </div>

            {/* Awards */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Awards & Recognition</h3>
              {video.awards && video.awards.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  {video.awards.map((award, index) => (
                    <div key={index} className="card" style={{ background: 'var(--surface-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-1)' }}>
                        <span style={{ fontWeight: 600 }}>{award.name}</span>
                        <span style={{ 
                          color: award.status === 'winner' ? 'var(--success)' : award.status === 'nominee' ? 'var(--warning)' : 'var(--interactive)',
                          fontSize: 'var(--text-small-size)',
                          padding: 'var(--space-1) var(--space-2)',
                          background: award.status === 'winner' ? 'color-mix(in srgb, var(--success), transparent 90%)' : 
                                     award.status === 'nominee' ? 'color-mix(in srgb, var(--warning), transparent 90%)' :
                                     'color-mix(in srgb, var(--interactive), transparent 90%)',
                          borderRadius: 'var(--radius-sm)',
                          textTransform: 'capitalize'
                        }}>
                          {award.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                        {award.category && <span><strong>Category:</strong> {award.category}</span>}
                        {award.year && <span><strong>Year:</strong> {award.year}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="card" style={{ background: 'var(--surface-subtle)', textAlign: 'center', padding: 'var(--space-4)' }}>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    No awards or recognition listed
                  </p>
                  <p style={{ margin: 'var(--space-2) 0 0 0', fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                    Film festival awards, industry recognition, and other accolades will appear here
                  </p>
                </div>
              )}
            </div>

            {/* Release Date */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Release Information</h3>
              <div className="card" style={{ background: 'var(--surface-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Release Date</span>
                  {video.releaseDate ? (
                    <span>{new Date(video.releaseDate).toLocaleDateString()}</span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Not set</span>
                  )}
                </div>
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Production Notes</h3>
              <div className="card" style={{ background: 'var(--surface-subtle)' }}>
                {video.notes ? (
                  <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                    {video.notes}
                  </p>
                ) : (
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: 'var(--space-2)' }}>
                    No production notes added yet
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            {/* Creator Info */}
            {creator && (
              <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
                <h3 style={{ marginBottom: 'var(--space-3)' }}>Created by</h3>
                <Link href={`/profile/${creator.handle}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: creator.avatarUrl ? `url(${creator.avatarUrl})` : 'var(--surface-subtle)',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      {!creator.avatarUrl && creator.displayName?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {creator.displayName}
                      </div>
                      {creator.headline && (
                        <div style={{ fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                          {creator.headline}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                
                {!isOwner && (
                  <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn--primary" style={{ flex: 1 }}>
                      Contact
                    </button>
                    <button className="btn btn--secondary" style={{ flex: 1 }}>
                      Hire
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Video Stats */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Video Info</h3>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Visibility</span>
                  <span className={`visibility-badge visibility-badge--${video.visibility}`}>
                    {video.visibility}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>File Size</span>
                  <span>{(video.storage.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                </div>
                {video.createdAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Uploaded</span>
                    <span>{new Date(video.createdAt.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
