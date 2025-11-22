'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PlaylistPage() {
    const { user, loading } = useUser();
    const router = useRouter();
    const [playlists, setPlaylists] = useState([]);
    const [view, setView] = useState('list'); // 'list', 'create', 'details'
    const [selectedPlaylist, setSelectedPlaylist] = useState(null);

    // Create Form State
    const [newPlaylistName, setNewPlaylistName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [newPlaylistSongs, setNewPlaylistSongs] = useState([]);

    // Import State
    const [importUrl, setImportUrl] = useState('');
    const [importing, setImporting] = useState(false);
    const [importError, setImportError] = useState('');

    // Preview State
    const [playingTrack, setPlayingTrack] = useState(null);
    const audioRef = useRef(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user) {
            fetchPlaylists();
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, [user, loading, router]);

    const handlePlay = async (track) => {
        // Stop current
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }

        if (playingTrack?.id === track.id) {
            setPlayingTrack(null);
            return;
        }

        // For Spotify tracks, check if preview_url exists
        if (track.source === 'spotify') {
            if (track.preview_url) {
                // Use Spotify preview
                setPlayingTrack(track);
                const audio = new Audio(track.preview_url);
                audio.volume = 0.5;
                audio.play().catch(e => console.error('Audio play failed', e));
                audio.onended = () => setPlayingTrack(null);
                audioRef.current = audio;
            } else {
                // Fallback to YouTube search
                console.log('No Spotify preview, searching YouTube...');
                try {
                    const searchQuery = `${track.artist} ${track.title}`;
                    const res = await axios.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
                    const youtubeTrack = res.data.find(t => t.source === 'youtube');

                    if (youtubeTrack) {
                        setPlayingTrack(youtubeTrack);
                    } else {
                        console.error('No YouTube fallback found');
                    }
                } catch (error) {
                    console.error('YouTube fallback failed', error);
                }
            }
        } else if (track.source === 'youtube') {
            // YouTube tracks use the hidden iframe player
            setPlayingTrack(track);
        }
    };

    const fetchPlaylists = async () => {
        try {
            const res = await axios.get(`/api/playlist?userId=${user.id}`);
            setPlaylists(res.data);
        } catch (error) {
            console.error('Failed to fetch playlists', error);
        }
    };

    const handleImport = async () => {
        if (!importUrl.trim()) return;
        setImporting(true);
        setImportError('');

        try {
            const res = await axios.post('/api/import', { url: importUrl });
            const { type, data } = res.data;

            if (type === 'playlist') {
                setNewPlaylistName(data.name);
                setNewPlaylistSongs([...newPlaylistSongs, ...data.songs]);
            } else if (type === 'track') {
                setNewPlaylistSongs([...newPlaylistSongs, data]);
            }
            setImportUrl('');
        } catch (error) {
            console.error('Import failed', error);
            setImportError('Failed to import. Check URL.');
        } finally {
            setImporting(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        try {
            const res = await axios.get(`/api/search?q=${encodeURIComponent(searchQuery)}`);
            setSearchResults(res.data);
        } catch (error) {
            console.error('Search failed', error);
        }
    };

    const addSong = (song) => {
        setNewPlaylistSongs([...newPlaylistSongs, song]);
    };

    const removeSong = (index) => {
        const newSongs = [...newPlaylistSongs];
        newSongs.splice(index, 1);
        setNewPlaylistSongs(newSongs);
    };

    const savePlaylist = async () => {
        if (!newPlaylistName || newPlaylistSongs.length === 0) return;
        try {
            console.log('Saving playlist:', { userId: user?.id, name: newPlaylistName, songCount: newPlaylistSongs.length });
            const response = await axios.post('/api/playlist', {
                userId: user.id,
                name: newPlaylistName,
                songs: newPlaylistSongs
            });
            console.log('Playlist saved successfully:', response.data);
            setNewPlaylistName('');
            setNewPlaylistSongs([]);
            setSearchResults([]);
            setSearchQuery('');
            setView('list');
            fetchPlaylists();
        } catch (error) {
            console.error('Failed to save playlist', error);
            console.error('Error details:', error.response?.data);
            alert(`Failed to save playlist: ${error.response?.data?.details || error.message}`);
        }
    };

    const deletePlaylist = async (id) => {
        console.log('Deleting playlist:', id);
        try {
            await axios.delete(`/api/playlist?id=${id}&userId=${user.id}`);
            if (selectedPlaylist?.id === id) {
                setSelectedPlaylist(null);
                setView('list');
            }
            fetchPlaylists();
        } catch (error) {
            console.error('Failed to delete playlist', error);
        }
    };

    if (loading) return <div className="container">Loading...</div>;
    if (!user) return null; // Will redirect

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/" className="btn btn-secondary">← Back</Link>
                    <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>Playlists</h1>
                </div>
                {view === 'list' && (
                    <button onClick={() => setView('create')} className="btn btn-primary">
                        + New Playlist
                    </button>
                )}
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
                {/* Sidebar List */}
                <div className="glass-panel" style={{ height: 'fit-content' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Your Collection</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {playlists.map(p => (
                            <div
                                key={p.id}
                                style={{
                                    padding: '1rem',
                                    background: selectedPlaylist?.id === p.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                                    borderRadius: '8px',
                                    border: '1px solid transparent',
                                    borderColor: selectedPlaylist?.id === p.id ? 'var(--primary)' : 'transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                <div onClick={() => { setSelectedPlaylist(p); setView('details'); }} style={{ cursor: 'pointer', flex: 1 }}>
                                    <div style={{ fontWeight: 'bold' }}>{p.name}</div>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{p.songs.length} songs</div>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); deletePlaylist(p.id); }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.25rem 0.5rem', marginLeft: '0.5rem', color: '#f87171' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}
                        {playlists.length === 0 && <p style={{ opacity: 0.5 }}>No playlists yet.</p>}
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="glass-panel">
                    {view === 'list' && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', opacity: 0.5 }}>
                            Select a playlist or create a new one
                        </div>
                    )}

                    {view === 'details' && selectedPlaylist && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h2 style={{ fontSize: '2rem' }}>{selectedPlaylist.name}</h2>
                                <button onClick={() => setView('list')} className="btn btn-secondary">Close</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {selectedPlaylist.songs.map((song, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                        <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                            <img src={song.cover} alt="" style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'cover' }} />
                                            <button
                                                onClick={() => handlePlay(song)}
                                                style={{
                                                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                    background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '4px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    cursor: 'pointer', color: 'white', opacity: playingTrack?.id === song.id ? 1 : 0,
                                                    transition: 'opacity 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = playingTrack?.id === song.id ? 1 : 0}
                                            >
                                                {playingTrack?.id === song.id ? '⏹' : '▶'}
                                            </button>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{song.title}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{song.artist}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {view === 'create' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <h2>Create New Playlist</h2>
                                <button onClick={() => setView('list')} className="btn btn-secondary">Cancel</button>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <input
                                    className="input"
                                    placeholder="Playlist Name"
                                    value={newPlaylistName}
                                    onChange={(e) => setNewPlaylistName(e.target.value)}
                                    style={{ marginBottom: '1rem' }}
                                />

                                {/* Import Section */}
                                <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Import from Link</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            className="input"
                                            placeholder="Paste Spotify or YouTube link..."
                                            value={importUrl}
                                            onChange={(e) => setImportUrl(e.target.value)}
                                        />
                                        <button onClick={handleImport} className="btn btn-primary" disabled={importing}>
                                            {importing ? '...' : 'Import'}
                                        </button>
                                    </div>
                                    {importError && <p style={{ color: '#f87171', fontSize: '0.9rem', marginTop: '0.5rem' }}>{importError}</p>}
                                </div>

                                <h4 style={{ marginBottom: '0.5rem' }}>Search & Add</h4>
                                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <input
                                        className="input"
                                        placeholder="Search songs (Spotify/YouTube)..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                    <button type="submit" className="btn btn-secondary">Search</button>
                                </form>

                                {searchResults.length > 0 && (
                                    <div style={{ marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '8px' }}>
                                        {searchResults.map(song => (
                                            <div key={song.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                                        <img src={song.cover} alt="" style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'cover' }} />
                                                        <button
                                                            onClick={() => handlePlay(song)}
                                                            style={{
                                                                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                                background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '4px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', color: 'white', opacity: playingTrack?.id === song.id ? 1 : 0,
                                                                transition: 'opacity 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                            onMouseLeave={(e) => e.currentTarget.style.opacity = playingTrack?.id === song.id ? 1 : 0}
                                                        >
                                                            {playingTrack?.id === song.id ? '⏹' : '▶'}
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{song.title}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                                                            {song.artist} • <span style={{ color: song.source === 'spotify' ? '#1db954' : '#ff0000', textTransform: 'capitalize' }}>{song.source}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => addSong(song)} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Add</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Hidden YouTube Player for Audio-Only Playback */}
                            {playingTrack?.source === 'youtube' && (
                                <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000 }}>
                                    <div className="glass-panel" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{playingTrack.title}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{playingTrack.artist}</div>
                                        </div>
                                        <button onClick={() => setPlayingTrack(null)} className="btn btn-secondary" style={{ padding: '0.5rem' }}>⏹</button>
                                    </div>
                                    <iframe
                                        src={`https://www.youtube.com/embed/${playingTrack.id}?autoplay=1&start=40&controls=0&enablejsapi=1`}
                                        style={{
                                            position: 'fixed',
                                            bottom: 0,
                                            right: 0,
                                            width: '1px',
                                            height: '1px',
                                            opacity: 0.01,
                                            pointerEvents: 'none',
                                            zIndex: -1
                                        }}
                                        allow="autoplay; encrypted-media"
                                    />
                                </div>
                            )}
                            <h3>Songs ({newPlaylistSongs.length})</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                                {newPlaylistSongs.map((song, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                                                <img src={song.cover} alt="" style={{ width: '100%', height: '100%', borderRadius: '4px', objectFit: 'cover' }} />
                                                <button
                                                    onClick={() => handlePlay(song)}
                                                    style={{
                                                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                                                        background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '4px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', color: 'white', opacity: playingTrack?.id === song.id ? 1 : 0,
                                                        transition: 'opacity 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                                                    onMouseLeave={(e) => e.currentTarget.style.opacity = playingTrack?.id === song.id ? 1 : 0}
                                                >
                                                    {playingTrack?.id === song.id ? '⏹' : '▶'}
                                                </button>
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 'bold' }}>{song.title}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{song.artist}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => removeSong(idx)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', color: '#ff4444' }}>×</button>
                                    </div>
                                ))}
                                {newPlaylistSongs.length === 0 && <p style={{ opacity: 0.5 }}>No songs added yet.</p>}
                            </div>

                            <button onClick={savePlaylist} className="btn btn-primary" style={{ width: '100%' }} disabled={!newPlaylistName || newPlaylistSongs.length === 0}>
                                Save Playlist
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
