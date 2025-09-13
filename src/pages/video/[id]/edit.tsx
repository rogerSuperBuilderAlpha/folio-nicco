import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface Video {
  id: string;
  ownerUid: string;
  title: string;
  description: string;
  tags: string[];
  collaborators: { uid: string; role: string; name?: string }[];
  techMeta: { camera?: string; lenses?: string; location?: string; durationSec?: number };
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
  const [collaborators, setCollaborators] = useState<{ name: string; role: string }[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');

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
        setCollaborators(videoData.collaborators.map(c => ({ name: c.name || '', role: c.role })));
        setVisibility(videoData.visibility);
        
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
      if (video.techMeta?.durationSec) techMeta.durationSec = video.techMeta.durationSec;

      const updateData = {
        title: title.trim(),
        description: description.trim(),
        tags: tags.filter(tag => tag.trim()),
        collaborators: collaborators
          .filter(c => c.name.trim() && c.role.trim())
          .map(c => ({ uid: '', role: c.role.trim(), name: c.name.trim() })),
        techMeta,
        visibility,
        updatedAt: serverTimestamp()
      };

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
