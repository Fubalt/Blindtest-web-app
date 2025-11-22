'use client';

import { useState } from 'react';
import { useUser } from '@/context/UserContext';
import Link from 'next/link';

export default function Home() {
    const { user, login, logout, loading } = useUser();
    const [username, setUsername] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (username.trim()) {
            login(username);
        }
    };

    if (loading) return <div className="container">Loading...</div>;

    if (!user) {
        return (
            <main className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="glass-panel animate-fade-in" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                    <h1 className="title" style={{ fontSize: '2.5rem' }}>Welcome</h1>
                    <p className="subtitle" style={{ marginBottom: '2rem' }}>Enter your username to start</p>

                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoFocus
                        />
                        <button type="submit" className="btn btn-primary">
                            Enter
                        </button>
                    </form>
                </div>
            </main>
        );
    }

    return (
        <main className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
                <h1 className="title" style={{ fontSize: '2rem', margin: 0 }}>Blindtest</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className="subtitle">Hello, {user.username}</span>
                    <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                        Logout
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <Link href="/playlist" className="glass-panel" style={{ textDecoration: 'none', transition: 'transform 0.2s' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Playlists</h2>
                    <p className="subtitle">Create and manage your music collections from Spotify and YouTube.</p>
                </Link>

                <Link href="/rooms" className="glass-panel" style={{ textDecoration: 'none', transition: 'transform 0.2s' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Rooms</h2>
                    <p className="subtitle">Join a game or host your own blindtest party.</p>
                </Link>
            </div>
        </main>
    );
}
