import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface Video {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  tags: string[];
  visibility: 'public' | 'private' | 'unlisted';
  createdAt: any;
  updatedAt: any;
  storage: { sizeBytes: number };
}

// Analytics data structure
interface VideoView {
  id: string;
  videoId: string;
  viewerUid?: string; // undefined for anonymous views
  timestamp: any;
  watchTimeSeconds?: number;
  completed?: boolean;
  source?: 'direct' | 'profile' | 'discover' | 'embed';
}

interface VideoShare {
  id: string;
  videoId: string;
  sharedBy: string;
  timestamp: any;
  platform?: string;
}

export default function VideoAnalyticsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [views, setViews] = useState<VideoView[]>([]);
  const [shares, setShares] = useState<VideoShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

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
        
        // Fetch analytics data
        await fetchAnalytics(id);
        
      } catch (error) {
        console.error('Error fetching video:', error);
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    const fetchAnalytics = async (videoId: string) => {
      try {
        setAnalyticsLoading(true);
        
        // Fetch video views
        const viewsRef = collection(db, 'videoViews');
        const viewsQuery = query(
          viewsRef,
          where('videoId', '==', videoId),
          orderBy('timestamp', 'desc')
        );
        
        const viewsSnapshot = await getDocs(viewsQuery);
        const viewsData = viewsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VideoView[];
        
        setViews(viewsData);
        
        // Fetch video shares
        const sharesRef = collection(db, 'videoShares');
        const sharesQuery = query(
          sharesRef,
          where('videoId', '==', videoId),
          orderBy('timestamp', 'desc')
        );
        
        const sharesSnapshot = await getDocs(sharesQuery);
        const sharesData = sharesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as VideoShare[];
        
        setShares(sharesData);
        
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Don't fail the whole page if analytics fail
        setViews([]);
        setShares([]);
      } finally {
        setAnalyticsLoading(false);
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

  // Calculate real analytics from Firestore data
  const analytics = {
    views: views.length,
    uniqueViewers: new Set(views.map(v => v.viewerUid).filter(Boolean)).size + 
                   views.filter(v => !v.viewerUid).length, // Anonymous views count as unique
    avgWatchTime: views.length > 0 ? 
      (() => {
        const totalWatchTime = views.reduce((sum, v) => sum + (v.watchTimeSeconds || 0), 0);
        const avgSeconds = totalWatchTime / views.length;
        const minutes = Math.floor(avgSeconds / 60);
        const seconds = Math.floor(avgSeconds % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
      })() : '0:00',
    completionRate: views.length > 0 ? 
      Math.round((views.filter(v => v.completed).length / views.length) * 100) : 0,
    shares: shares.length,
    profileVisits: views.filter(v => v.source === 'profile').length,
    directViews: views.filter(v => v.source === 'direct').length,
    discoverViews: views.filter(v => v.source === 'discover').length,
    embedViews: views.filter(v => v.source === 'embed').length
  };

  const timeRange = 'All time';

  return (
    <>
      <Head>
        <title>Analytics: {video.title} - Folio</title>
        <meta name="description" content="View performance analytics for your video" />
      </Head>
      
      <div className="container" style={{ maxWidth: '1000px', paddingTop: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
            <h1>Analytics: {video.title}</h1>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <Link href={`/video/${video.id}`} className="btn btn--ghost">
                View Video
              </Link>
              <Link href={`/video/${video.id}/edit`} className="btn btn--ghost">
                Edit Video
              </Link>
            </div>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>
            Performance metrics for the last {timeRange}
          </p>
        </div>

        {/* Key Metrics */}
        <div className="dashboard-stats" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="stat-card">
            <div className="stat-icon">👁️</div>
            <div className="stat-content">
              <div className="stat-number">{analytics.views.toLocaleString()}</div>
              <div className="stat-label">Total Views</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{analytics.uniqueViewers.toLocaleString()}</div>
              <div className="stat-label">Unique Viewers</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⏱️</div>
            <div className="stat-content">
              <div className="stat-number">{analytics.avgWatchTime}</div>
              <div className="stat-label">Avg Watch Time</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-number">{analytics.completionRate}%</div>
              <div className="stat-label">Completion Rate</div>
            </div>
          </div>
        </div>

        {/* Detailed Analytics */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
          <div>
            {/* Performance Chart Placeholder */}
            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ marginBottom: 'var(--space-4)' }}>Views Over Time</h2>
              <div style={{ 
                height: '300px', 
                background: 'var(--surface-subtle)', 
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)'
              }}>
                📈 Chart would go here (Phase 2)
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="card">
              <h2 style={{ marginBottom: 'var(--space-4)' }}>Traffic Sources</h2>
              {analyticsLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  Loading analytics...
                </div>
              ) : views.length > 0 ? (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Direct Link</span>
                    <span style={{ fontWeight: 600 }}>
                      {analytics.directViews} ({Math.round((analytics.directViews / analytics.views) * 100)}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Your Profile</span>
                    <span style={{ fontWeight: 600 }}>
                      {analytics.profileVisits} ({Math.round((analytics.profileVisits / analytics.views) * 100)}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Discover Page</span>
                    <span style={{ fontWeight: 600 }}>
                      {analytics.discoverViews} ({Math.round((analytics.discoverViews / analytics.views) * 100)}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>External Embed</span>
                    <span style={{ fontWeight: 600 }}>
                      {analytics.embedViews} ({Math.round((analytics.embedViews / analytics.views) * 100)}%)
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-secondary)' }}>
                  No traffic data yet. Views will appear here once people start watching your video.
                </div>
              )}
            </div>
          </div>

          <div>
            {/* Engagement */}
            <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Engagement</h3>
              {analyticsLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-4)' }}>
                  Loading...
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Shares</span>
                    <span style={{ fontWeight: 600 }}>{analytics.shares}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Profile Visits</span>
                    <span style={{ fontWeight: 600 }}>{analytics.profileVisits}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Avg Watch Time</span>
                    <span style={{ fontWeight: 600 }}>{analytics.avgWatchTime}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Completion Rate</span>
                    <span style={{ fontWeight: 600 }}>{analytics.completionRate}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="card">
              <h3 style={{ marginBottom: 'var(--space-3)' }}>Video Info</h3>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Status</span>
                  <span className={`visibility-badge visibility-badge--${video.visibility}`}>
                    {video.visibility}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                  <span>{new Date(video.createdAt.seconds * 1000).toLocaleDateString()}</span>
                </div>
                {video.updatedAt && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Last Updated</span>
                    <span>{new Date(video.updatedAt.seconds * 1000).toLocaleDateString()}</span>
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
