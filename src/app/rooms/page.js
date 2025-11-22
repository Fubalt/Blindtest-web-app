'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/context/UserContext';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function RoomsPage() {
    const { user, loading, logout } = useUser();
    const router = useRouter();
    const [rooms, setRooms] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [showCreate, setShowCreate] = useState(false);

    // Form State
    const [newRoomName, setNewRoomName] = useState('');
    const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
    const [rounds, setRounds] = useState(10);
    const [timer, setTimer] = useState(30);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/');
        } else if (user) {
            fetchRooms();
            fetchPlaylists();
        }
    }, [user, loading, router]);

    const fetchRooms = async () => {
        try {
            const res = await axios.get('/api/rooms');
            setRooms(res.data);
        } catch (error) {
            console.error('Failed to fetch rooms', error);
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

    const createRoom = async () => {
        if (!newRoomName || !selectedPlaylistId) return;
        try {
            const res = await axios.post('/api/rooms', {
                hostId: user.id,
                playlistId: selectedPlaylistId,
                name: newRoomName,
                settings: {
                    rounds: parseInt(rounds),
                    timer: parseInt(timer)
                }
            });
            router.push(`/rooms/${res.data.id}`);
        } catch (error) {
            console.error('Failed to create room', error);
        }
    };

    const deleteRoom = async (roomId) => {
        // if (!confirm('Are you sure you want to delete this room?')) return;
        console.log('Deleting room:', roomId, 'User:', user.id);
        try {
            const res = await axios.delete(`/api/rooms?id=${roomId}&userId=${user.id}`);
            console.log('Delete response:', res.data);
            fetchRooms();
        } catch (error) {
            console.error('Failed to delete room', error.response?.data || error);
        }
    };

    if (loading) return <div className="container">Loading...</div>;
    if (!user) return null; // Will redirect

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/" className="btn btn-secondary">← Back</Link>
                    <h1 className="title" style={{ margin: 0, fontSize: '2rem' }}>Rooms</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="subtitle">{user.username}</span>
                    <button onClick={() => setShowCreate(!showCreate)} className="btn btn-primary">
                        {showCreate ? 'Cancel' : '+ Create Room'}
                    </button>
                    <button onClick={logout} className="btn btn-secondary">
                        Logout
                    </button>
                </div>
            </header>

            {showCreate && (
                <div className="glass-panel animate-fade-in" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1rem' }}>Create a Room</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Room Name"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                        />
                        <select
                            className="input"
                            value={selectedPlaylistId}
                            onChange={(e) => setSelectedPlaylistId(e.target.value)}
                        >
                            <option value="">Select a Playlist</option>
                            {playlists.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.songs.length} songs)</option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Rounds</label>
                                <input
                                    type="number"
                                    className="input"
                                    min="1"
                                    max="50"
                                    value={rounds}
                                    onChange={(e) => setRounds(e.target.value)}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Guess Time (sec)</label>
                                <input
                                    type="number"
                                    className="input"
                                    min="5"
                                    max="60"
                                    value={timer}
                                    onChange={(e) => setTimer(e.target.value)}
                                />
                            </div>
                        </div>

                        <button onClick={createRoom} className="btn btn-primary" disabled={!selectedPlaylistId || !newRoomName}>
                            Start Game
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {rooms.map(room => (
                    <div key={room.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>{room.name}</h3>
                            <span style={{ background: room.status === 'playing' ? '#db2777' : '#06b6d4', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                                {room.status}
                            </span>
                        </div>
                        <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Playlist: {room.playlist_name}</div>
                        <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Host: {room.host_name}</div>
                        <div style={{ opacity: 0.7, fontSize: '0.9rem' }}>Players: {room.players.length}</div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <Link href={`/rooms/${room.id}`} className="btn btn-primary" style={{ flex: 1, textAlign: 'center' }}>
                                Join
                            </Link>
                            {room.host_id === user.id && (
                                <button
                                    onClick={() => deleteRoom(room.id)}
                                    className="btn btn-secondary"
                                    style={{ color: '#f87171', padding: '0.5rem' }}
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {rooms.length === 0 && !showCreate && <p style={{ opacity: 0.5 }}>No active rooms.</p>}
            </div>
        </div>
    );
}
