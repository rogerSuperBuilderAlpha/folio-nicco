import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { collection, query, where, getDocs, orderBy, limit, or } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../lib/auth';

const FILM_ROLES = [
  'Cinematographer',
  'Director', 
  'Producer',
  'Editor',
  'Gaffer',
  '1st Assistant Camera',
  '2nd Assistant Camera',
  'Script Supervisor',
  'Sound Recordist',
  'Production Designer'
];

const CAMERA_TYPES = [
  'Arri Alexa Mini',
  'Arri Alexa 35',
  'RED Komodo', 
  'RED Raptor',
  'Sony FX6',
  'Sony FX9',
  'Canon C70',
  'Canon C300',
  'Blackmagic Pocket 6K'
];

const PROJECT_TYPES = [
  'Commercial',
  'Narrative', 
  'Documentary',
  'Music Video',
  'Corporate',
  'Wedding',
  'Event',
  'Experimental'
];

interface Video {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  tags: string[];
  techMeta: { camera?: string; durationSec?: number };
  playback: { posterUrl?: string };
  visibility: string;
  createdAt: any;
}

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
  const [filteredVideos, setFilteredVideos] = useState<Video[]>([]);
  const [profileVideoCounts, setProfileVideoCounts] = useState<{[uid: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'profiles' | 'videos'>('profiles');
  const [roleFilter, setRoleFilter] = useState('');
  const [cameraFilter, setCameraFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [projectTypeFilter, setProjectTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'name' | 'popular'>('newest');

  // Fetch all data once
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch public profiles
        const profilesRef = collection(db, 'profiles');
        const profilesQuery = query(
          profilesRef,
          where('visibility', '==', 'public'),
          limit(100)
        );
        
        const profilesSnapshot = await getDocs(profilesQuery);
        const profilesData = profilesSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        })) as UserProfile[];
        
        setProfiles(profilesData);

        // Fetch public videos
        const videosRef = collection(db, 'videos');
        const videosQuery = query(
          videosRef,
          where('visibility', '==', 'public'),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        
        const videosSnapshot = await getDocs(videosQuery);
        const videosData = videosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Video[];
        
        setVideos(videosData);
        
        // Calculate video counts per profile
        const videoCounts: {[uid: string]: number} = {};
        videosData.forEach(video => {
          videoCounts[video.ownerUid] = (videoCounts[video.ownerUid] || 0) + 1;
        });
        setProfileVideoCounts(videoCounts);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and search logic
  useEffect(() => {
    if (filter === 'profiles') {
      let filtered = [...profiles];
      
      // Search by name, headline, or skills
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(profile => 
          profile.displayName?.toLowerCase().includes(term) ||
          profile.headline?.toLowerCase().includes(term) ||
          profile.skills?.some(skill => skill.toLowerCase().includes(term)) ||
          profile.location?.toLowerCase().includes(term)
        );
      }
      
      // Filter by role
      if (roleFilter) {
        filtered = filtered.filter(profile => 
          profile.skills?.includes(roleFilter)
        );
      }
      
      // Filter by location
      if (locationFilter) {
        filtered = filtered.filter(profile => 
          profile.location?.toLowerCase().includes(locationFilter.toLowerCase())
        );
      }
      
      // Sort profiles
      filtered.sort((a, b) => {
        if (sortBy === 'name') {
          return (a.displayName || '').localeCompare(b.displayName || '');
        } else if (sortBy === 'newest') {
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        }
        return 0;
      });
      
      setFilteredProfiles(filtered);
    } else {
      let filtered = [...videos];
      
      // Search by title, description, or tags
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(video => 
          video.title?.toLowerCase().includes(term) ||
          video.description?.toLowerCase().includes(term) ||
          video.tags?.some(tag => tag.toLowerCase().includes(term)) ||
          video.techMeta?.camera?.toLowerCase().includes(term) ||
          video.techMeta?.location?.toLowerCase().includes(term)
        );
      }
      
      // Filter by camera
      if (cameraFilter) {
        filtered = filtered.filter(video => 
          video.techMeta?.camera === cameraFilter
        );
      }
      
      // Filter by project type (tags)
      if (projectTypeFilter) {
        filtered = filtered.filter(video => 
          video.tags?.some(tag => tag.toLowerCase() === projectTypeFilter.toLowerCase())
        );
      }
      
      // Filter by location
      if (locationFilter) {
        filtered = filtered.filter(video => 
          video.techMeta?.location?.toLowerCase().includes(locationFilter.toLowerCase())
        );
      }
      
      // Sort videos
      filtered.sort((a, b) => {
        if (sortBy === 'newest') {
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        } else if (sortBy === 'name') {
          return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
      });
      
      setFilteredVideos(filtered);
    }
  }, [profiles, videos, searchTerm, filter, roleFilter, cameraFilter, locationFilter, projectTypeFilter, sortBy]);

  return (
    <>
      <Head>
        <title>Discover - Folio</title>
        <meta name="description" content="Discover talented film professionals and their work" />
      </Head>
      
      <div className="container" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-8)' }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Discover</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>
            Find talented film professionals and explore their work
          </p>
        </div>

        {/* Search and Filter */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          {/* Main Search */}
          <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
              placeholder={filter === 'profiles' ? "Search professionals, skills, or locations..." : "Search videos, equipment, or tags..."}
              style={{ flex: 1, minWidth: '300px' }}
            />
            <div className="filter-buttons">
              <button
                onClick={() => setFilter('profiles')}
                className={`filter-btn ${filter === 'profiles' ? 'filter-btn--active' : ''}`}
              >
                Professionals
                <span className="filter-count">{filteredProfiles.length}</span>
              </button>
              <button
                onClick={() => setFilter('videos')}
                className={`filter-btn ${filter === 'videos' ? 'filter-btn--active' : ''}`}
              >
                Videos
                <span className="filter-count">{filteredVideos.length}</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
            {filter === 'profiles' ? (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)', fontWeight: 500 }}>
                    Role
                  </label>
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="input"
                  >
                    <option value="">All roles</option>
                    {FILM_ROLES.map((role) => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)', fontWeight: 500 }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="input"
                    placeholder="City, State"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)', fontWeight: 500 }}>
                    Camera
                  </label>
                  <select
                    value={cameraFilter}
                    onChange={(e) => setCameraFilter(e.target.value)}
                    className="input"
                  >
                    <option value="">All cameras</option>
                    {CAMERA_TYPES.map((camera) => (
                      <option key={camera} value={camera}>{camera}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)', fontWeight: 500 }}>
                    Project Type
                  </label>
                  <select
                    value={projectTypeFilter}
                    onChange={(e) => setProjectTypeFilter(e.target.value)}
                    className="input"
                  >
                    <option value="">All types</option>
                    {PROJECT_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)', fontWeight: 500 }}>
                    Location
                  </label>
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="input"
                    placeholder="Filming location"
                  />
                </div>
              </>
            )}
            <div>
              <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)', fontWeight: 500 }}>
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input"
              >
                <option value="newest">Newest</option>
                <option value="name">{filter === 'profiles' ? 'Name' : 'Title'}</option>
                <option value="popular">Most Popular</option>
              </select>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchTerm || roleFilter || cameraFilter || locationFilter || projectTypeFilter) && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('');
                  setCameraFilter('');
                  setLocationFilter('');
                  setProjectTypeFilter('');
                }}
                className="btn btn--ghost"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
            <div>Loading...</div>
          </div>
        ) : filter === 'profiles' ? (
          <div>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>
              Film Professionals 
              {filteredProfiles.length !== profiles.length && (
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 'var(--text-body-size)' }}>
                  ({filteredProfiles.length} of {profiles.length})
                </span>
              )}
            </h2>
            {filteredProfiles.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--space-5)' }}>
                {filteredProfiles.map((profile) => (
                  <Link key={profile.uid} href={`/profile/${profile.handle}`} className="card profile-card" style={{ textDecoration: 'none', transition: 'transform var(--duration-base) var(--ease-standard)' }}>
                    {/* Header with Avatar and Name */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: profile.avatarUrl ? `url(${profile.avatarUrl})` : 'var(--surface-subtle)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        fontWeight: 700,
                        color: 'var(--text-secondary)',
                        flexShrink: 0,
                        border: '2px solid var(--border-subtle)'
                      }}>
                        {!profile.avatarUrl && profile.displayName?.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ margin: '0 0 var(--space-1)', fontSize: '18px', fontWeight: 600, lineHeight: 1.3 }}>
                          {profile.displayName}
                        </h3>
                        {profile.skills && profile.skills.length > 0 && (
                          <div style={{ margin: '0 0 var(--space-2)', color: 'var(--interactive)', fontSize: 'var(--text-small-size)', fontWeight: 600 }}>
                            {profile.skills[0]}
                          </div>
                        )}
                        {profile.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--text-secondary)', fontSize: 'var(--text-small-size)' }}>
                            <span>📍</span>
                            <span>{profile.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Key Stats */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: 'var(--space-3)',
                      marginBottom: 'var(--space-4)',
                      padding: 'var(--space-3)',
                      background: 'var(--surface-subtle)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {profileVideoCounts[profile.uid] || 0}
                        </div>
                        <div style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)' }}>
                          Videos
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {profile.skills?.length || 0}
                        </div>
                        <div style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)' }}>
                          Skills
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {profile.createdAt ? 
                            new Date().getFullYear() - new Date(profile.createdAt.seconds * 1000).getFullYear() + 1 : 0}
                        </div>
                        <div style={{ fontSize: 'var(--text-caption-size)', color: 'var(--text-secondary)' }}>
                          Years
                        </div>
                      </div>
                    </div>

                    {/* Bio Preview */}
                    {profile.bio && (
                      <div style={{ marginBottom: 'var(--space-4)' }}>
                        <p style={{ 
                          margin: 0, 
                          color: 'var(--text-secondary)', 
                          fontSize: 'var(--text-small-size)', 
                          lineHeight: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {profile.bio}
                        </p>
                      </div>
                    )}

                    {/* All Skills */}
                    {profile.skills && profile.skills.length > 0 && (
                      <div style={{ marginBottom: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-1)', flexWrap: 'wrap' }}>
                          {profile.skills.map((skill) => (
                            <span key={skill} className="tag" style={{ fontSize: 'var(--text-caption-size)' }}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Bottom Info */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingTop: 'var(--space-3)', 
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: 'var(--text-caption-size)',
                      color: 'var(--text-secondary)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        {profile.website && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                            🌐 <span>Website</span>
                          </span>
                        )}
                        {profile.headline && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                            ⭐ <span>Pro</span>
                          </span>
                        )}
                      </div>
                      {profile.createdAt && (
                        <span>
                          Joined {new Date(profile.createdAt.seconds * 1000).toLocaleDateString('en-US', { 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>👥</div>
                <h3>No professionals found</h3>
                <p>
                  {searchTerm || roleFilter || locationFilter 
                    ? "Try adjusting your search criteria" 
                    : "Be the first to create a public profile!"
                  }
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h2 style={{ marginBottom: 'var(--space-4)' }}>
              Public Videos
              {filteredVideos.length !== videos.length && (
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: 'var(--text-body-size)' }}>
                  ({filteredVideos.length} of {videos.length})
                </span>
              )}
            </h2>
            {filteredVideos.length > 0 ? (
              <div className="video-grid">
                {filteredVideos.map((video) => (
                  <div key={video.id} className="video-card">
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
                        {video.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🎬</div>
                <h3>No videos found</h3>
                <p>
                  {searchTerm || cameraFilter || projectTypeFilter || locationFilter
                    ? "Try adjusting your search criteria"
                    : "Check back soon as creators start sharing their work!"
                  }
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
