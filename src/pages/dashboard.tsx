import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, doc, deleteDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  folderId?: string; // Optional folder assignment
  createdAt: any;
  updatedAt: any;
}

interface Folder {
  id: string;
  ownerUid: string;
  name: string;
  color?: string;
  createdAt: any;
  updatedAt: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'unlisted'>('all');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [shareModalVideo, setShareModalVideo] = useState<Video | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [draggedVideo, setDraggedVideo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');

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

        // Fetch user's folders
        const foldersRef = collection(db, 'folders');
        const foldersQuery = query(
          foldersRef,
          where('ownerUid', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        const foldersSnapshot = await getDocs(foldersQuery);
        const foldersData = foldersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Folder[];
        
        console.log('Folders found:', foldersData);
        setFolders(foldersData);

      } catch (error) {
        console.error('Error fetching data:', error);
        setVideos([]);
        setFolders([]);
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

  // Get all unique tags for dropdown
  const allTags = Array.from(new Set(videos.flatMap(video => video.tags))).sort();

  // Search function that searches across all video fields
  const searchInVideo = (video: Video, query: string): boolean => {
    if (!query.trim()) return true;
    
    const searchTerm = query.toLowerCase().trim();
    
    // Search in basic fields
    const basicFields = [
      video.title,
      video.description,
      video.visibility,
      ...(video.tags || []),
      ...(video.collaborators?.map(c => c.role) || [])
    ];
    
    // Search in techMeta fields
    const techFields = [
      video.techMeta?.camera,
      video.techMeta?.lenses,
      video.techMeta?.location
    ].filter(Boolean);
    
    // Combine all searchable text
    const searchableText = [...basicFields, ...techFields]
      .join(' ')
      .toLowerCase();
    
    return searchableText.includes(searchTerm);
  };

  const filteredVideos = videos.filter(video => {
    // Filter by folder
    let inCorrectFolder = true;
    if (currentFolder === 'unorganized') {
      inCorrectFolder = !video.folderId; // Show only unorganized videos
    } else if (currentFolder) {
      inCorrectFolder = video.folderId === currentFolder; // Show videos in specific folder
    }
    // If currentFolder is null, show ALL videos (no folder filtering)
    
    // Filter by visibility
    const matchesVisibility = filter === 'all' || video.visibility === filter;
    
    // Filter by search query
    const matchesSearch = searchInVideo(video, searchQuery);
    
    // Filter by selected tag
    const matchesTag = !selectedTag || video.tags.includes(selectedTag);
    
    return inCorrectFolder && matchesVisibility && matchesSearch && matchesTag;
  });

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

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedTag('');
    setFilter('all');
  };

  // Folder management functions
  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    try {
      const folderData = {
        ownerUid: user.uid,
        name: newFolderName.trim(),
        color: '#10B981', // Default emerald color
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'folders'), folderData);
      
      // Add to local state
      setFolders([{ id: docRef.id, ...folderData }, ...folders]);
      setNewFolderName('');
      setShowCreateFolder(false);
      
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  };

  // Drag and drop functions
  const handleDragStart = (videoId: string) => {
    setDraggedVideo(videoId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    
    if (!draggedVideo || !user) return;

    try {
      // Update video's folder assignment
      await updateDoc(doc(db, 'videos', draggedVideo), {
        folderId: folderId || null,
        updatedAt: serverTimestamp()
      });

      // Update local state
      setVideos(videos.map(video => 
        video.id === draggedVideo 
          ? { ...video, folderId: folderId || undefined }
          : video
      ));

      setDraggedVideo(null);
      
    } catch (error) {
      console.error('Error moving video to folder:', error);
      alert('Failed to move video. Please try again.');
    }
  };

  return (
    <>
      <Head>
        <title>Dashboard - Folio</title>
        <meta name="description" content="Manage your video portfolio and track performance" />
      </Head>
      
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          {/* Welcome Header */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <h1 style={{ marginBottom: 'var(--space-2)', fontSize: 'var(--text-h3-size)' }}>Welcome back</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)', margin: 0 }}>
              {profile.displayName}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="sidebar-stats" style={{ marginBottom: 'var(--space-6)' }}>
            <div className="sidebar-stat">
              <span className="stat-number">{stats.totalVideos}</span>
              <span className="stat-label">Videos</span>
            </div>
            <div className="sidebar-stat">
              <span className="stat-number">{folders.length}</span>
              <span className="stat-label">Folders</span>
            </div>
          </div>

          {/* Folders List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--text-body-size)', fontWeight: 600 }}>Library</h3>
              <button 
                onClick={() => setShowCreateFolder(true)}
                className="btn btn--ghost"
                style={{ padding: 'var(--space-1) var(--space-2)', height: 'auto', fontSize: 'var(--text-small-size)' }}
              >
                + New
              </button>
            </div>

            {/* Create Folder Form */}
            {showCreateFolder && (
              <div style={{ 
                marginBottom: 'var(--space-4)', 
                padding: 'var(--space-3)', 
                background: 'var(--surface-subtle)', 
                borderRadius: 'var(--radius-sm)' 
              }}>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && createFolder()}
                  className="input"
                  placeholder="Folder name"
                  autoFocus
                  style={{ marginBottom: 'var(--space-2)' }}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button onClick={createFolder} className="btn btn--primary" style={{ flex: 1, fontSize: 'var(--text-small-size)' }}>
                    Create
                  </button>
                  <button 
                    onClick={() => {
                      setShowCreateFolder(false);
                      setNewFolderName('');
                    }} 
                    className="btn btn--ghost"
                    style={{ fontSize: 'var(--text-small-size)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Folders List */}
            <div className="folders-list">
              {/* All Videos */}
              <div
                className={`folder-list-item ${!currentFolder ? 'folder-list-item--active' : ''}`}
                onClick={() => setCurrentFolder(null)}
              >
                <div className="folder-list-icon">📁</div>
                <div className="folder-list-content">
                  <div className="folder-list-name">All Videos</div>
                  <div className="folder-list-count">{videos.length} videos</div>
                </div>
              </div>

              {/* Unorganized Videos */}
              <div
                className={`folder-list-item ${currentFolder === 'unorganized' ? 'folder-list-item--active' : ''}`}
                onClick={() => setCurrentFolder('unorganized')}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)}
              >
                <div className="folder-list-icon">📂</div>
                <div className="folder-list-content">
                  <div className="folder-list-name">Unorganized</div>
                  <div className="folder-list-count">{videos.filter(v => !v.folderId).length} videos</div>
                </div>
              </div>

              {/* User Folders */}
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className={`folder-list-item ${currentFolder === folder.id ? 'folder-list-item--active' : ''}`}
                  onClick={() => setCurrentFolder(folder.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, folder.id)}
                >
                  <div className="folder-list-icon" style={{ color: folder.color }}>📁</div>
                  <div className="folder-list-content">
                    <div className="folder-list-name">{folder.name}</div>
                    <div className="folder-list-count">{videos.filter(v => v.folderId === folder.id).length} videos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          {/* Content Header */}
          <div className="content-header">
            <div>
              <h1 style={{ margin: 0, fontSize: 'var(--text-h2-size)' }}>
                {currentFolder 
                  ? folders.find(f => f.id === currentFolder)?.name || 'Folder'
                  : 'All Videos'
                }
              </h1>
              <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--text-secondary)' }}>
                {currentFolder 
                  ? `${filteredVideos.length} videos in this folder`
                  : `${filteredVideos.length} of ${videos.length} videos`
                }
                {(searchQuery || selectedTag) && (
                  <span>
                    {' • '}
                    {searchQuery && `Search: "${searchQuery}"`}
                    {searchQuery && selectedTag && ' • '}
                    {selectedTag && `Tag: "${selectedTag}"`}
                  </span>
                )}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
              <Link href="/upload" className="btn btn--primary">
                + Upload Video
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="video-filters" style={{ marginBottom: 'var(--space-6)' }}>
            {/* Search and Tag Filters */}
            <div style={{ 
              display: 'flex', 
              gap: 'var(--space-4)', 
              marginBottom: 'var(--space-4)',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Search Bar */}
              <div style={{ flex: '1', minWidth: '300px' }}>
                <input
                  type="text"
                  placeholder="Search videos by title, description, tags, camera, location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                />
              </div>

              {/* Tag Dropdown */}
              <div style={{ minWidth: '200px' }}>
                <select
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                  className="input"
                  style={{ width: '100%' }}
                >
                  <option value="">All Tags</option>
                  {allTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag} ({videos.filter(v => v.tags.includes(tag)).length})
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters Button */}
              {(searchQuery || selectedTag || filter !== 'all') && (
                <button
                  onClick={clearAllFilters}
                  className="btn btn--ghost"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Visibility Filter Buttons */}
            <div className="filter-buttons">
              {(['all', 'public', 'private', 'unlisted'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`filter-btn ${filter === filterOption ? 'filter-btn--active' : ''}`}
                >
                  {filterOption === 'all' ? 'All' : filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                  <span className="filter-count">
                    {filterOption === 'all' ? filteredVideos.length : 
                     filteredVideos.filter(v => v.visibility === filterOption).length}
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
                    <div 
                      key={video.id} 
                      className="dashboard-video-card"
                      draggable
                      onDragStart={() => handleDragStart(video.id)}
                    >
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
        </main>
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
