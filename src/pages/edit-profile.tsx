import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../contexts/AuthContext';
import { updateUserProfile } from '../lib/auth';
import { storage } from '../lib/firebase';

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
  'Production Designer',
  'Other'
];

export default function EditProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  
  // Form state
  const [displayName, setDisplayName] = useState('');
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [website, setWebsite] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [links, setLinks] = useState<{ label: string; url: string }[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Credits management
  const [credits, setCredits] = useState<{
    projectTitle: string;
    role: string;
    projectYear: string;
    projectType: string;
    collaborators: string;
  }[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Populate form with current profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setHeadline(profile.headline || '');
      setBio(profile.bio || '');
      setLocation(profile.location || '');
      setWebsite(profile.website || '');
      setSkills(profile.skills || []);
      setLinks(profile.links || []);
      setVisibility(profile.visibility || 'public');
      setAvatarPreview(profile.avatarUrl || '');
    }
  }, [profile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    
    try {
      setUploadingAvatar(true);
      
      // Create a reference to the file in Firebase Storage
      const fileExtension = avatarFile.name.split('.').pop();
      const fileName = `avatar.${fileExtension}`;
      const storageRef = ref(storage, `avatars/${user.uid}/${fileName}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, avatarFile);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw new Error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (authLoading || !user || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      let avatarUrl = profile.avatarUrl;
      
      // Upload avatar if a new one was selected
      if (avatarFile) {
        console.log('Uploading new avatar...');
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        }
      }

      await updateUserProfile(user.uid, {
        displayName: displayName.trim(),
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        skills: skills.filter(skill => skill.trim()),
        links: links.filter(link => link.label.trim() && link.url.trim()),
        visibility,
        avatarUrl: avatarUrl || undefined
      });

      await refreshProfile();
      setSuccess('Profile updated successfully!');
      
      // Redirect back to profile after a moment
      setTimeout(() => {
        router.push(`/profile/${profile.handle}`);
      }, 1500);
    } catch (error: any) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSkill = (skill: string) => {
    if (!skills.includes(skill)) {
      setSkills([...skills, skill]);
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addLink = () => {
    setLinks([...links, { label: '', url: '' }]);
  };

  const updateLink = (index: number, field: 'label' | 'url', value: string) => {
    const newLinks = [...links];
    newLinks[index][field] = value;
    setLinks(newLinks);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const addCredit = () => {
    setCredits([...credits, {
      projectTitle: '',
      role: '',
      projectYear: '',
      projectType: '',
      collaborators: ''
    }]);
  };

  const updateCredit = (index: number, field: keyof typeof credits[0], value: string) => {
    const newCredits = [...credits];
    newCredits[index][field] = value;
    setCredits(newCredits);
  };

  const removeCredit = (index: number) => {
    setCredits(credits.filter((_, i) => i !== index));
  };

  return (
    <>
      <Head>
        <title>Edit Profile - Folio</title>
        <meta name="description" content="Update your professional profile information" />
      </Head>
      
      <div className="container" style={{ maxWidth: '600px', paddingTop: 'var(--space-8)' }}>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h1>Edit Profile</h1>
              <p style={{ color: 'var(--text-secondary)' }}>Update your professional information and portfolio settings.</p>
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
                color: 'var(--success)'
              }}>
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>Basic Information</h2>
                
                {/* Avatar Upload */}
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                    Profile Photo
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'var(--surface-subtle)',
                      border: '2px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      flexShrink: 0
                    }}>
                      {avatarPreview ? (
                        <img 
                          src={avatarPreview} 
                          alt="Avatar preview" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn--secondary"
                        disabled={uploadingAvatar}
                        style={{ marginBottom: 'var(--space-1)' }}
                      >
                        {uploadingAvatar ? 'Uploading...' : 'Change Photo'}
                      </button>
                      <p style={{ margin: 0, fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                        JPG, PNG or GIF. Max 5MB.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="displayName" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Display Name *
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="input"
                    placeholder="Your full name"
                  />
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="headline" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Professional Headline
                  </label>
                  <input
                    id="headline"
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="input"
                    placeholder="Award-winning Cinematographer specializing in narrative films"
                    maxLength={100}
                  />
                  <div className="char-counter">{headline.length}/100 characters</div>
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="location" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Location
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

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label htmlFor="website" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Website
                  </label>
                  <input
                    id="website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="input"
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div>
                  <label htmlFor="bio" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="input"
                    rows={4}
                    placeholder="Tell your story... What drives your work? What are you passionate about?"
                    maxLength={500}
                    style={{ resize: 'vertical', minHeight: '120px' }}
                  />
                  <div className="char-counter">{bio.length}/500 characters</div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>Skills & Roles</h2>
                
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                    Your Skills
                  </label>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                    {skills.map((skill) => (
                      <span 
                        key={skill} 
                        className="skill-tag"
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 'var(--space-1)',
                          cursor: 'pointer'
                        }}
                        onClick={() => removeSkill(skill)}
                      >
                        {skill} <span style={{ opacity: 0.7 }}>×</span>
                      </span>
                    ))}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {FILM_ROLES.filter(role => !skills.includes(role)).map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => addSkill(role)}
                        style={{
                          padding: 'var(--space-2) var(--space-3)',
                          background: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all var(--duration-fast) var(--ease-standard)',
                          fontSize: 'var(--text-small-size)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--interactive)';
                          e.currentTarget.style.color = 'var(--interactive)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                          e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                      >
                        + {role}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>Credits & Experience</h2>
                
                {credits.map((credit, index) => (
                  <div key={index} style={{ 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: 'var(--space-4)', 
                    marginBottom: 'var(--space-4)',
                    background: 'var(--surface-subtle)'
                  }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                          Project Title
                        </label>
                        <input
                          type="text"
                          value={credit.projectTitle}
                          onChange={(e) => updateCredit(index, 'projectTitle', e.target.value)}
                          className="input"
                          placeholder="The Last Light"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                          Your Role
                        </label>
                        <input
                          type="text"
                          value={credit.role}
                          onChange={(e) => updateCredit(index, 'role', e.target.value)}
                          className="input"
                          placeholder="Director of Photography"
                        />
                      </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                          Year
                        </label>
                        <input
                          type="text"
                          value={credit.projectYear}
                          onChange={(e) => updateCredit(index, 'projectYear', e.target.value)}
                          className="input"
                          placeholder="2024"
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                          Project Type
                        </label>
                        <select
                          value={credit.projectType}
                          onChange={(e) => updateCredit(index, 'projectType', e.target.value)}
                          className="input"
                        >
                          <option value="">Select type</option>
                          <option value="feature">Feature Film</option>
                          <option value="short">Short Film</option>
                          <option value="commercial">Commercial</option>
                          <option value="documentary">Documentary</option>
                          <option value="music-video">Music Video</option>
                          <option value="tv">TV/Series</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                        Collaborators (optional)
                      </label>
                      <input
                        type="text"
                        value={credit.collaborators}
                        onChange={(e) => updateCredit(index, 'collaborators', e.target.value)}
                        className="input"
                        placeholder="John Director, Sarah Producer"
                      />
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => removeCredit(index)}
                        className="btn btn--ghost"
                        style={{ color: 'var(--danger)' }}
                      >
                        Remove Credit
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addCredit}
                  className="btn btn--ghost"
                  style={{ marginBottom: 'var(--space-4)' }}
                >
                  + Add Credit
                </button>
              </div>

              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>Links</h2>
                
                {links.map((link, index) => (
                  <div key={index} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                        Label
                      </label>
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(index, 'label', e.target.value)}
                        className="input"
                        placeholder="IMDb, Reel, etc."
                      />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ display: 'block', marginBottom: 'var(--space-1)', fontSize: 'var(--text-small-size)' }}>
                        URL
                      </label>
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => updateLink(index, 'url', e.target.value)}
                        className="input"
                        placeholder="https://..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="btn btn--ghost"
                      style={{ height: 'var(--input-height)' }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addLink}
                  className="btn btn--ghost"
                >
                  + Add Link
                </button>
              </div>

              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>Privacy</h2>
                
                <div>
                  <label style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
                    Profile Visibility
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
                          cursor: 'pointer',
                          transition: 'all var(--duration-fast) var(--ease-standard)'
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
                          <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: 'var(--space-1)' }}>
                            {option}
                          </div>
                          <div style={{ fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                            {option === 'public' && 'Anyone can find and view your profile'}
                            {option === 'unlisted' && 'Only people with the link can view your profile'}
                            {option === 'private' && 'Only you can view your profile'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <Link href={`/profile/${profile.handle}`} className="btn btn--ghost">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn--primary"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
      </div>
    </>
  );
}
