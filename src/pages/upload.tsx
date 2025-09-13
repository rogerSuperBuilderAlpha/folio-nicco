import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { storage, db } from '../lib/firebase';

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

const PROJECT_TYPES = [
  'Commercial',
  'Narrative',
  'Documentary',
  'Music Video',
  'Corporate',
  'Wedding',
  'Event',
  'Experimental',
  'Other'
];

export default function UploadPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [camera, setCamera] = useState('');
  const [lenses, setLenses] = useState('');
  const [location, setLocation] = useState('');
  const [collaborators, setCollaborators] = useState<{ name: string; role: string }[]>([]);
  const [visibility, setVisibility] = useState<'public' | 'private' | 'unlisted'>('public');
  
  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  if (authLoading || !user || !profile) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div>Loading...</div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please select a video file');
        return;
      }
      
      // Validate file size (max 2GB)
      if (selectedFile.size > 2 * 1024 * 1024 * 1024) {
        setError('Video must be less than 2GB');
        return;
      }
      
      setFile(selectedFile);
      setError('');
      
      // Auto-populate title from filename
      if (!title) {
        const fileName = selectedFile.name.split('.')[0];
        setTitle(fileName.replace(/[-_]/g, ' '));
      }
    }
  };

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
    
    if (!file) {
      setError('Please select a video file');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      // Create storage reference
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExtension}`;
      const storageRef = ref(storage, `uploads/${user.uid}/${fileName}`);
      
      // Start upload with progress tracking
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(Math.round(progress));
        },
        (error) => {
          console.error('Upload error:', error);
          setError('Upload failed. Please try again.');
          setUploading(false);
        },
        async () => {
          try {
            // Upload completed, get download URL
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            // Create video document in Firestore (clean undefined values)
            const techMeta: any = {};
            if (camera) techMeta.camera = camera;
            if (lenses) techMeta.lenses = lenses;
            if (location) techMeta.location = location;
            
            const videoData = {
              ownerUid: user.uid,
              title: title.trim(),
              description: description.trim(),
              tags: tags.filter(tag => tag.trim()),
              collaborators: collaborators
                .filter(c => c.name.trim() && c.role.trim())
                .map(c => ({ uid: '', role: c.role.trim(), name: c.name.trim() })),
              techMeta,
              storage: {
                path: `uploads/${user.uid}/${fileName}`,
                sizeBytes: file.size,
                downloadURL
              },
              playback: {
                provider: 'native',
                id: fileName,
                mp4Url: downloadURL
              },
              visibility,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };

            await addDoc(collection(db, 'videos'), videoData);
            
            setSuccess('Video uploaded successfully!');
            
            // Redirect to dashboard after success
            setTimeout(() => {
              router.push('/dashboard');
            }, 2000);
            
          } catch (error) {
            console.error('Error saving video:', error);
            setError('Failed to save video. Please try again.');
          }
          
          setUploading(false);
        }
      );
      
    } catch (error) {
      console.error('Upload error:', error);
      setError('Upload failed. Please try again.');
      setUploading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Upload Video - Folio</title>
        <meta name="description" content="Upload and share your professional video work" />
      </Head>
      
      <div className="container" style={{ maxWidth: '700px', paddingTop: 'var(--space-8)' }}>
            <div style={{ marginBottom: 'var(--space-6)' }}>
              <h1>Upload Video</h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Share your work with the film community. Add details to help others discover and understand your craft.
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
              {/* File Upload */}
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)' }}>Select Video</h2>
                
                <div className="upload-area" style={{
                  border: file ? '2px solid var(--success)' : '2px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-6)',
                  textAlign: 'center',
                  background: file ? 'color-mix(in srgb, var(--success), transparent 95%)' : 'var(--surface-subtle)',
                  cursor: 'pointer',
                  transition: 'all var(--duration-base) var(--ease-standard)'
                }} onClick={() => fileInputRef.current?.click()}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  
                  {file ? (
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--space-2)' }}>✅</div>
                      <h3 style={{ marginBottom: 'var(--space-2)' }}>{file.name}</h3>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        {(file.size / (1024 * 1024)).toFixed(1)} MB • Click to change
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '48px', marginBottom: 'var(--space-2)' }}>📹</div>
                      <h3 style={{ marginBottom: 'var(--space-2)' }}>Choose video file</h3>
                      <p style={{ color: 'var(--text-secondary)' }}>
                        MP4, MOV, AVI up to 2GB
                      </p>
                    </div>
                  )}
                </div>

                {uploading && (
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div style={{ 
                      width: '100%', 
                      height: '8px', 
                      background: 'var(--surface-subtle)', 
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden'
                    }}>
                      <div style={{ 
                        width: `${uploadProgress}%`, 
                        height: '100%', 
                        background: 'var(--interactive)',
                        transition: 'width var(--duration-base) var(--ease-standard)'
                      }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Video Details */}
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
                    placeholder="Demo Reel 2024"
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
                    placeholder="Describe your work, the story behind it, or technical details..."
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
                      placeholder="Add tag (e.g., commercial, narrative)"
                      style={{ flex: 1 }}
                    />
                    <button type="button" onClick={addTag} className="btn btn--ghost">
                      Add
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
                    {PROJECT_TYPES.filter(type => !tags.includes(type.toLowerCase())).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTags([...tags, type.toLowerCase()])}
                        style={{
                          padding: 'var(--space-1) var(--space-2)',
                          background: 'transparent',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-xs)',
                          color: 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontSize: 'var(--text-small-size)'
                        }}
                      >
                        + {type}
                      </button>
                    ))}
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
                          <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: 'var(--space-1)' }}>
                            {option}
                          </div>
                          <div style={{ fontSize: 'var(--text-small-size)', color: 'var(--text-secondary)' }}>
                            {option === 'public' && 'Anyone can find and view this video'}
                            {option === 'unlisted' && 'Only people with the link can view this video'}
                            {option === 'private' && 'Only you can view this video'}
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
                <Link href="/dashboard" className="btn btn--ghost">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={uploading || !file}
                  className="btn btn--primary"
                >
                  {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Video'}
                </button>
              </div>
            </form>
      </div>
    </>
  );
}
