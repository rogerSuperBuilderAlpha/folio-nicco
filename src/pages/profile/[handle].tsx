import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile, updateUserProfile } from '../../lib/auth';
import { useAuth } from '../../contexts/AuthContext';

// Types based on docs/Data-Model.md
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

interface Credit {
  id: string;
  subjectUid: string;
  videoId?: string;
  role: string;
  source: 'manual' | 'callSheet' | 'imdb';
  verified: boolean;
  projectTitle?: string;
  projectYear?: number;
  projectType?: string;
  collaborators?: string[];
}

export default function ProfilePage() {
  const router = useRouter();
  const { handle } = router.query;
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [videosLoading, setVideosLoading] = useState(true);
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // Portfolio filtering state
  const [portfolioSearch, setPortfolioSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);

  useEffect(() => {
    if (!handle || typeof handle !== 'string') return;
    
    // Handle the case where handle is "undefined" string
    if (handle === 'undefined' || handle === 'null') {
      console.log('Handle is undefined/null, redirecting to profile index');
      router.push('/profile');
      return;
    }

    const fetchProfile = async () => {
      try {
        console.log('Fetching profile for handle:', handle);
        // Query profiles by handle
        const profilesRef = collection(db, 'profiles');
        const q = query(profilesRef, where('handle', '==', handle));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          console.log('No profile found for handle:', handle);
          setNotFound(true);
        } else {
          const doc = querySnapshot.docs[0];
          const profileData = { 
            ...doc.data(),
            uid: doc.id // Use the document ID as the UID
          } as UserProfile;
          console.log('Profile found:', profileData);
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [handle, router]);

  // Filter videos based on search, tag, and folder selection
  useEffect(() => {
    if (!videos) return;
    
    let filtered = [...videos];
    
    // Search filter
    if (portfolioSearch) {
      const searchLower = portfolioSearch.toLowerCase();
      filtered = filtered.filter(video => 
        video.title.toLowerCase().includes(searchLower) ||
        video.description?.toLowerCase().includes(searchLower) ||
        video.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }
    
    // Tag filter
    if (selectedTag) {
      filtered = filtered.filter(video => video.tags.includes(selectedTag));
    }
    
    // Folder filter (based on video characteristics)
    if (selectedFolder !== 'all') {
      switch (selectedFolder) {
        case 'recent':
          filtered = filtered.filter(video => {
            const videoDate = new Date(video.createdAt?.seconds * 1000);
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            return videoDate > thirtyDaysAgo;
          });
          break;
        case 'commercial':
          filtered = filtered.filter(video => 
            video.tags.some(tag => ['commercial', 'advertisement', 'brand'].includes(tag.toLowerCase()))
          );
          break;
        case 'narrative':
          filtered = filtered.filter(video => 
            video.tags.some(tag => ['narrative', 'film', 'short film', 'feature'].includes(tag.toLowerCase()))
          );
          break;
        case 'documentary':
          filtered = filtered.filter(video => 
            video.tags.some(tag => ['documentary', 'doc', 'interview'].includes(tag.toLowerCase()))
          );
          break;
        case 'music-video':
          filtered = filtered.filter(video => 
            video.tags.some(tag => ['music video', 'music', 'band'].includes(tag.toLowerCase()))
          );
          break;
        case 'corporate':
          filtered = filtered.filter(video => 
            video.tags.some(tag => ['corporate', 'business', 'training'].includes(tag.toLowerCase()))
          );
          break;
      }
    }
    
    setFilteredVideos(filtered);
  }, [videos, portfolioSearch, selectedTag, selectedFolder]);

  // Fetch user's videos
  useEffect(() => {
    if (!profile?.uid) return;

    const fetchVideos = async () => {
      try {
        setVideosLoading(true);
        console.log('Fetching videos for user:', profile.uid);
        
        const videosRef = collection(db, 'videos');
        const q = query(
          videosRef, 
          where('ownerUid', '==', profile.uid),
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(20)
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
        setVideosLoading(false);
      }
    };

    fetchVideos();
  }, [profile?.uid]);

  // Fetch user's credits
  useEffect(() => {
    if (!profile?.uid) return;

    const fetchCredits = async () => {
      try {
        setCreditsLoading(true);
        console.log('Fetching credits for user:', profile.uid);
        
        const creditsRef = collection(db, 'credits');
        const q = query(
          creditsRef, 
          where('subjectUid', '==', profile.uid),
          limit(10)
        );
        
        const querySnapshot = await getDocs(q);
        const creditsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Credit[];
        
        console.log('Credits found:', creditsData);
        setCredits(creditsData);
      } catch (error) {
        console.error('Error fetching credits:', error);
        setCredits([]);
      } finally {
        setCreditsLoading(false);
      }
    };

    fetchCredits();
  }, [profile?.uid]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div>Loading...</div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <h1>Profile not found</h1>
          <p>This profile doesn't exist or has been set to private.</p>
          <Link href="/" className="btn btn--primary">Go home</Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = user?.uid === profile.uid;

  // Get all unique tags from videos
  const allTags = videos.reduce((tags: string[], video) => {
    video.tags.forEach(tag => {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    });
    return tags;
  }, []).sort();

  // Get folder counts
  const folderCounts = {
    all: videos.length,
    recent: videos.filter(video => {
      const videoDate = new Date(video.createdAt?.seconds * 1000);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return videoDate > thirtyDaysAgo;
    }).length,
    commercial: videos.filter(video => 
      video.tags.some(tag => ['commercial', 'advertisement', 'brand'].includes(tag.toLowerCase()))
    ).length,
    narrative: videos.filter(video => 
      video.tags.some(tag => ['narrative', 'film', 'short film', 'feature'].includes(tag.toLowerCase()))
    ).length,
    documentary: videos.filter(video => 
      video.tags.some(tag => ['documentary', 'doc', 'interview'].includes(tag.toLowerCase()))
    ).length,
    'music-video': videos.filter(video => 
      video.tags.some(tag => ['music video', 'music', 'band'].includes(tag.toLowerCase()))
    ).length,
    corporate: videos.filter(video => 
      video.tags.some(tag => ['corporate', 'business', 'training'].includes(tag.toLowerCase()))
    ).length,
  };
  
  // Debug logging
  console.log('Profile page debug:', {
    userUid: user?.uid,
    profileUid: profile.uid,
    isOwnProfile,
    userExists: !!user,
    profileExists: !!profile,
    userEmail: user?.email,
    profileDisplayName: profile.displayName
  });
  
  console.log('Raw comparison:', user?.uid, '===', profile.uid, '=', user?.uid === profile.uid);

  return (
    <>
      <Head>
        <title>{profile.displayName} - Folio</title>
        <meta name="description" content={profile.headline || `${profile.displayName}'s professional portfolio`} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      {/* Profile Header */}
          <section className="profile-header">
            <div className="container">
              <div className="profile-hero">
                <div className="profile-info">
                  <div className="profile-avatar">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.displayName} />
                    ) : (
                      <div className="avatar-placeholder">
                        {profile.displayName && profile.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="profile-details">
                    <h1 className="profile-name">{profile.displayName}</h1>
                    {profile.headline && (
                      <p className="profile-headline">{profile.headline}</p>
                    )}
                    <div className="profile-meta">
                      {profile.location && (
                        <span className="meta-item">📍 {profile.location}</span>
                      )}
                      {profile.skills && profile.skills.length > 0 && (
                        <span className="meta-item">🎬 {profile.skills[0]}</span>
                      )}
                    </div>
                    <div className="profile-actions">
                      {isOwnProfile ? (
                        <>
                          <Link href="/edit-profile" className="btn btn--primary">Edit Profile</Link>
                          <Link href="/dashboard" className="btn btn--secondary">Manage Videos</Link>
                        </>
                      ) : (
                        <>
                          <button className="btn btn--primary">Contact</button>
                          <button className="btn btn--secondary">Collaborate</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="container">
            <div className="profile-content">
              {/* About Section */}
              {profile.bio && (
                <section className="profile-section">
                  <div className="card">
                    <h2 className="section-title">About</h2>
                    <p className="bio-text">{profile.bio}</p>
                  </div>
                </section>
              )}

              {/* Portfolio Section */}
              <section className="profile-section">
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                    <h2 className="section-title" style={{ margin: 0 }}>Portfolio</h2>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                      {filteredVideos.length} of {videos.length} videos
                    </span>
                  </div>
                  
                  {videos.length > 0 && (
                    <>
                      {/* Portfolio Controls */}
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr auto auto', 
                        gap: 'var(--space-3)', 
                        marginBottom: 'var(--space-6)',
                        alignItems: 'center'
                      }}>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                          <input
                            type="text"
                            placeholder="Search videos..."
                            value={portfolioSearch}
                            onChange={(e) => setPortfolioSearch(e.target.value)}
                            style={{
                              width: '100%',
                              padding: 'var(--space-2) var(--space-3)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--text-body-size)',
                              background: 'var(--surface-primary)'
                            }}
                          />
                        </div>
                        
                        {/* Tag Filter */}
                        <select
                          value={selectedTag}
                          onChange={(e) => setSelectedTag(e.target.value)}
                          style={{
                            padding: 'var(--space-2) var(--space-3)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-body-size)',
                            background: 'var(--surface-primary)',
                            minWidth: '120px'
                          }}
                        >
                          <option value="">All Tags</option>
                          {allTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                          ))}
                        </select>
                        
                        {/* Folder Filter */}
                        <select
                          value={selectedFolder}
                          onChange={(e) => setSelectedFolder(e.target.value)}
                          style={{
                            padding: 'var(--space-2) var(--space-3)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--text-body-size)',
                            background: 'var(--surface-primary)',
                            minWidth: '140px'
                          }}
                        >
                          <option value="all">All Videos ({folderCounts.all})</option>
                          {folderCounts.recent > 0 && <option value="recent">Recent ({folderCounts.recent})</option>}
                          {folderCounts.commercial > 0 && <option value="commercial">Commercial ({folderCounts.commercial})</option>}
                          {folderCounts.narrative > 0 && <option value="narrative">Narrative ({folderCounts.narrative})</option>}
                          {folderCounts.documentary > 0 && <option value="documentary">Documentary ({folderCounts.documentary})</option>}
                          {folderCounts['music-video'] > 0 && <option value="music-video">Music Video ({folderCounts['music-video']})</option>}
                          {folderCounts.corporate > 0 && <option value="corporate">Corporate ({folderCounts.corporate})</option>}
                        </select>
                      </div>
                      
                      {/* Clear Filters */}
                      {(portfolioSearch || selectedTag || selectedFolder !== 'all') && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                          <button
                            onClick={() => {
                              setPortfolioSearch('');
                              setSelectedTag('');
                              setSelectedFolder('all');
                            }}
                            style={{
                              padding: 'var(--space-1) var(--space-2)',
                              background: 'transparent',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--text-small-size)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer'
                            }}
                          >
                            Clear filters
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  
                  {videosLoading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                      <div>Loading videos...</div>
                    </div>
                  ) : filteredVideos.length > 0 ? (
                    <div className="video-grid">
                      {filteredVideos.map((video) => (
                        <Link key={video.id} href={`/video/${video.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <div className="video-card" style={{ cursor: 'pointer' }}>
                            <div className="video-thumbnail">
                              {video.playback?.posterUrl ? (
                                <img src={video.playback.posterUrl} alt={video.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div className="play-icon">🎬</div>
                              )}
                            </div>
                            <div className="video-info">
                              <h4>{video.title}</h4>
                              <p>
                                {video.techMeta?.camera && `${video.techMeta.camera} • `}
                                {video.techMeta?.durationSec && `${Math.floor(video.techMeta.durationSec / 60)}:${(video.techMeta.durationSec % 60).toString().padStart(2, '0')}`}
                              </p>
                              <div className="video-tags">
                                {video.tags.map((tag) => (
                                  <span key={tag} className="tag">{tag}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                      
                    </div>
                  ) : videos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🎬</div>
                      <h3>No videos yet</h3>
                      <p>
                        {isOwnProfile 
                          ? "No videos in your portfolio yet" 
                          : `${profile.displayName} hasn't uploaded any videos yet`
                        }
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🔍</div>
                      <h3>No videos match your filters</h3>
                      <p>Try adjusting your search terms, tags, or folder selection.</p>
                      <button
                        onClick={() => {
                          setPortfolioSearch('');
                          setSelectedTag('');
                          setSelectedFolder('all');
                        }}
                        className="btn btn--secondary"
                        style={{ marginTop: 'var(--space-3)' }}
                      >
                        Clear all filters
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Credits Section */}
              <section className="profile-section">
                <div className="card">
                  <h2 className="section-title">Credits & Experience</h2>
                  
                  {creditsLoading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                      <div>Loading credits...</div>
                    </div>
                  ) : credits.length > 0 ? (
                    <div className="credits-list">
                      {credits.map((credit) => (
                        <div key={credit.id} className="credit-item">
                          <div className="credit-poster">
                            {credit.projectType === 'feature' ? '🎬' : 
                             credit.projectType === 'commercial' ? '📺' : 
                             credit.projectType === 'documentary' ? '📹' : '🎥'}
                          </div>
                          <div className="credit-details">
                            <h4 className="credit-title">
                              {credit.projectTitle || 'Untitled Project'}
                            </h4>
                            <p className="credit-role">{credit.role}</p>
                            <p className="credit-meta">
                              {credit.projectYear && `${credit.projectYear} • `}
                              {credit.projectType && `${credit.projectType} • `}
                              {/* Add camera info if available from linked video */}
                            </p>
                            {credit.collaborators && credit.collaborators.length > 0 && (
                              <div className="credit-collaborators">
                                <span>with {credit.collaborators.join(', ')}</span>
                              </div>
                            )}
                          </div>
                          <div className="credit-status">
                            <span className={`badge ${credit.verified ? 'badge--success' : ''}`}>
                              {credit.source === 'imdb' ? 'IMDb' : 
                               credit.source === 'callSheet' ? 'Call Sheet' : 'Manual'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>⭐</div>
                      <h3>No credits yet</h3>
                      <p>
                        {isOwnProfile 
                          ? "Add your film credits to showcase your experience" 
                          : `${profile.displayName} hasn't added any credits yet`
                        }
                      </p>
                    </div>
                  )}
                  
                </div>
              </section>

              {/* Skills & Equipment */}
              {profile.skills && profile.skills.length > 0 && (
                <section className="profile-section">
                  <div className="card">
                    <h2 className="section-title">Skills & Roles</h2>
                    <div className="skill-tags">
                      {profile.skills.map((skill) => (
                        <span key={skill} className="skill-tag">{skill}</span>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Contact & Links */}
              {(profile.website || profile.links?.length) && (
                <section className="profile-section">
                  <div className="card">
                    <h2 className="section-title">Links</h2>
                    <div className="links-list">
                      {profile.website && (
                        <a href={profile.website} target="_blank" rel="noopener noreferrer" className="link-item">
                          <span className="link-icon">🌐</span>
                          <span className="link-label">Website</span>
                          <span className="link-url">{profile.website}</span>
                        </a>
                      )}
                      {profile.links?.map((link, index) => (
                        <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className="link-item">
                          <span className="link-icon">🔗</span>
                          <span className="link-label">{link.label}</span>
                          <span className="link-url">{link.url}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
    </>
  );
}
