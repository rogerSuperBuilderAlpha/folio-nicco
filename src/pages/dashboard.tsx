import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';

// Video type from Data Model
interface Video {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  tags: string[];
  collaborators: { uid: string; role: string }[];
  techMeta: { camera?: string; lenses?: string; location?: string; durationSec?: number };
  playback: { provider: string; id: string; posterUrl?: string; mp4Url?: string };
  visibility: 'public' | 'private' | 'unlisted';
  createdAt: any;
  updatedAt: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'unlisted'>('all');
  const [shareModalVideo, setShareModalVideo] = useState<Video | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/signin');
      return;
    }

    if (!profile?.onboarded) {
      router.push('/onboarding');
      return;
    }
  }, [user, profile, authLoading, router]);

  // Fetch user's videos
  useEffect(() => {
    if (!user) return;

    const fetchVideos = async () => {
      try {
        setLoading(true);
        console.log('Fetching all videos for user:', user.uid);
        
        const videosRef = collection(db, 'videos');
        const q = query(
          videosRef, 
          where('ownerUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const videosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Video[];
        
        console.log('Videos found:', videosData);
        setVideos(videosData);
      } catch (error) {
        console.error('Error fetching videos:', error);
        setVideos([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [user]);

  if (authLoading || !user || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const filteredVideos = videos.filter(video => 
    filter === 'all' || video.visibility === filter
  );

  const stats = {
    totalVideos: videos.length,
    publicVideos: videos.filter(v => v.visibility === 'public').length,
    privateVideos: videos.filter(v => v.visibility === 'private').length,
    unlistedVideos: videos.filter(v => v.visibility === 'unlisted').length,
    totalViews: videos.reduce((sum, v) => sum + (v.techMeta?.durationSec || 0), 0) // Placeholder for actual view counts
  };

  const handleEditVideo = (videoId: string) => {
    router.push(`/video/${videoId}/edit`);
  };

  const handleShareVideo = (video: Video) => {
    setShareModalVideo(video);
  };

  const handleViewAnalytics = (videoId: string) => {
    router.push(`/video/${videoId}/analytics`);
  };

  const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${videoTitle}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'videos', videoId));
        // Refresh the videos list
        setVideos(videos.filter(v => v.id !== videoId));
      } catch (error) {
        console.error('Error deleting video:', error);
        alert('Failed to delete video. Please try again.');
      }
    }
  };

  const copyToClipboard = async (text: string, videoId: string, type: 'link' | 'embed') => {
    try {
      await navigator.clipboard.writeText(text);
      
      // Track the share event
      const shareData = {
        videoId,
        sharedBy: user?.uid || 'anonymous',
        timestamp: serverTimestamp(),
        platform: type,
        method: 'copy'
      };
      
      await addDoc(collection(db, 'videoShares'), shareData);
      console.log('Share tracked:', type, 'for video:', videoId);
      
      alert(`${type === 'link' ? 'Link' : 'Embed code'} copied to clipboard!`);
    } catch (error) {
      console.error('Error copying to clipboard or tracking share:', error);
      alert('Failed to copy. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Dashboard - Folio</title>
        <meta name="description" content="Manage your video portfolio and track performance" />
      </Head>
      
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
            {/* Welcome Header */}
            <div style={{ marginBottom: 'var(--space-8)' }}>
              <h1 style={{ marginBottom: 'var(--space-2)' }}>Welcome back, {profile.displayName}</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
                Manage your videos and track your portfolio performance
              </p>
            </div>

            {/* Stats Overview */}
            <div className="dashboard-stats" style={{ marginBottom: 'var(--space-8)' }}>
              <div className="stat-card">
                <div className="stat-icon">🎬</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.totalVideos}</div>
                  <div className="stat-label">Total Videos</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👁️</div>
                <div className="stat-content">
                  <div className="stat-number">{stats.publicVideos}</div>
                  <div className="stat-label">Public Videos</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Total Views</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">💾</div>
                <div className="stat-content">
                  <div className="stat-number">0 GB</div>
                  <div className="stat-label">Storage Used</div>
                </div>
              </div>
            </div>

            {/* Video Library Section */}
            <div className="card">
              <div className="dashboard-section-header">
                <div>
                  <h2 style={{ margin: 0 }}>Video Library</h2>
                  <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--text-secondary)' }}>
                    Manage all your videos in one place
                  </p>
                </div>
                <Link href="/upload" className="btn btn--primary">
                  + Upload Video
                </Link>
              </div>

              {/* Filters */}
              <div className="video-filters" style={{ marginBottom: 'var(--space-6)' }}>
                <div className="filter-buttons">
                  {(['all', 'public', 'private', 'unlisted'] as const).map((filterOption) => (
                    <button
                      key={filterOption}
                      onClick={() => setFilter(filterOption)}
                      className={`filter-btn ${filter === filterOption ? 'filter-btn--active' : ''}`}
                    >
                      {filterOption === 'all' ? 'All' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                      <span className="filter-count">
                        {filterOption === 'all' ? stats.totalVideos : 
                         filterOption === 'public' ? stats.publicVideos :
                         filterOption === 'private' ? stats.privateVideos :
                         stats.unlistedVideos}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Video Grid */}
              {loading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div>Loading your videos...</div>
                </div>
              ) : filteredVideos.length > 0 ? (
                <div className="dashboard-video-grid">
                  {filteredVideos.map((video) => (
                    <div key={video.id} className="dashboard-video-card">
                      <div className="video-thumbnail">
                        {video.playback?.posterUrl ? (
                          <img src={video.playback.posterUrl} alt={video.title} />
                        ) : (
                          <div className="thumbnail-placeholder">
                            <div className="play-icon">🎬</div>
                          </div>
                        )}
                        <div className="video-overlay">
                          <div className="video-actions">
                            <button 
                              className="action-btn" 
                              title="Edit Video"
                              onClick={() => handleEditVideo(video.id)}
                            >
                              ✏️
                            </button>
                            <button 
                              className="action-btn" 
                              title="Share Video"
                              onClick={() => handleShareVideo(video)}
                            >
                              🔗
                            </button>
                            <button 
                              className="action-btn" 
                              title="View Analytics"
                              onClick={() => handleViewAnalytics(video.id)}
                            >
                              📊
                            </button>
                            <button 
                              className="action-btn" 
                              title="Delete Video"
                              onClick={() => handleDeleteVideo(video.id, video.title)}
                              style={{ background: 'var(--danger)' }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="video-details">
                        <h4 className="video-title">{video.title}</h4>
                        <div className="video-meta">
                          <span className={`visibility-badge visibility-badge--${video.visibility}`}>
                            {video.visibility}
                          </span>
                          {video.techMeta?.camera && (
                            <span className="meta-item">{video.techMeta.camera}</span>
                          )}
                          {video.techMeta?.durationSec && (
                            <span className="meta-item">
                              {Math.floor(video.techMeta.durationSec / 60)}:{(video.techMeta.durationSec % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <div className="video-tags">
                          {video.tags.slice(0, 3).map((tag) => (
                            <span key={tag} className="tag">{tag}</span>
                          ))}
                          {video.tags.length > 3 && (
                            <span className="tag">+{video.tags.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <div style={{ fontSize: '64px', marginBottom: 'var(--space-4)' }}>🎬</div>
                  <h3>No videos yet</h3>
                  <p style={{ marginBottom: 'var(--space-5)' }}>
                    {filter === 'all' 
                      ? "Upload your first video to start building your portfolio"
                      : `No ${filter} videos found`
                    }
                  </p>
                  <Link href="/upload" className="btn btn--primary btn--large">
                    Upload Your First Video
                  </Link>
                </div>
              )}
            </div>
      </div>

      {/* Share Modal */}
      {shareModalVideo && (
        <div className="modal-backdrop" onClick={() => setShareModalVideo(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ margin: 0 }}>Share "{shareModalVideo.title}"</h3>
            </div>
            
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Public Link
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input
                  type="text"
                  value={`${window.location.origin}/video/${shareModalVideo.id}`}
                  readOnly
                  className="input"
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/video/${shareModalVideo.id}`, shareModalVideo.id, 'link')}
                  className="btn btn--secondary"
                >
                  Copy
                </button>
              </div>
            </div>

            {shareModalVideo.visibility === 'public' && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                  Embed Code
                </label>
                <textarea
                  value={`<iframe src="${window.location.origin}/embed/${shareModalVideo.id}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`}
                  readOnly
                  className="input"
                  rows={3}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-small-size)' }}
                />
                <button
                  onClick={() => copyToClipboard(`<iframe src="${window.location.origin}/embed/${shareModalVideo.id}" width="640" height="360" frameborder="0" allowfullscreen></iframe>`, shareModalVideo.id, 'embed')}
                  className="btn btn--ghost"
                  style={{ marginTop: 'var(--space-2)' }}
                >
                  Copy Embed Code
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => setShareModalVideo(null)} className="btn btn--ghost">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
