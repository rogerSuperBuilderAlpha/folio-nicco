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
                  <h2 className="section-title">Portfolio</h2>
                  
                  {videosLoading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                      <div>Loading videos...</div>
                    </div>
                  ) : videos.length > 0 ? (
                    <div className="video-grid">
                      {videos.map((video) => (
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
                              {video.tags.map((tag) => (
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
                      <h3>No videos yet</h3>
                      <p>
                        {isOwnProfile 
                          ? "No videos in your portfolio yet" 
                          : `${profile.displayName} hasn't uploaded any videos yet`
                        }
                      </p>
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
