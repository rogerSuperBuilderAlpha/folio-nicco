import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Video {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  storage: { downloadURL?: string };
  playback: { posterUrl?: string; mp4Url?: string };
  visibility: 'public' | 'private' | 'unlisted';
}

export default function EmbedPage() {
  const router = useRouter();
  const { id } = router.query;
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const fetchVideo = async () => {
      try {
        const videoDoc = await getDoc(doc(db, 'videos', id));
        
        if (!videoDoc.exists()) {
          setNotFound(true);
          return;
        }

        const videoData = { id: videoDoc.id, ...videoDoc.data() } as Video;
        
        // Only allow embedding public videos
        if (videoData.visibility !== 'public') {
          setNotFound(true);
          return;
        }

        setVideo(videoData);
        
      } catch (error) {
        console.error('Error fetching video:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id]);

  if (loading) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#000',
        color: 'white'
      }}>
        Loading...
      </div>
    );
  }

  if (notFound || !video) {
    return (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#000',
        color: 'white',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <div>Video not available for embedding</div>
      </div>
    );
  }

  const videoUrl = video.playback?.mp4Url || video.storage?.downloadURL;

  return (
    <>
      <Head>
        <title>{video.title} - Folio</title>
        <meta name="description" content={video.description || video.title} />
        
        {/* Prevent embedding in other sites if needed */}
        <meta httpEquiv="X-Frame-Options" content="SAMEORIGIN" />
      </Head>
      
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {videoUrl ? (
          <video
            controls
            autoPlay={false}
            poster={video.playback?.posterUrl}
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit: 'contain'
            }}
          >
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div style={{ 
            color: 'white',
            textAlign: 'center',
            fontSize: '18px'
          }}>
            Video processing...
          </div>
        )}

        {/* Folio Branding (small, bottom right) */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 600
        }}>
          <a 
            href={`${typeof window !== 'undefined' ? window.location.origin : ''}/video/${video.id}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'white', textDecoration: 'none' }}
          >
            Watch on Folio →
          </a>
        </div>
      </div>
    </>
  );
}
