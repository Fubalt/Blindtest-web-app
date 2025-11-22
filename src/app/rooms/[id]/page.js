'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/context/UserContext';
import axios from 'axios';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';


function RoomPageContent() {
    const { user } = useUser();
    const { id } = useParams();
    const router = useRouter();
    const [room, setRoom] = useState(null);
    const [guess, setGuess] = useState('');
    const [message, setMessage] = useState('');
    const [hasGuessed, setHasGuessed] = useState(false);
    const [currentlyPlaying, setCurrentlyPlaying] = useState(null);
    const audioRef = useRef(null);

    const pollingRef = useRef(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (user && id) {
            joinRoom();
            startPolling();
        }
        return () => stopPolling();
    }, [user, id]);

    const startPolling = () => {
        pollingRef.current = setInterval(fetchRoomState, 2000);
    };

    const stopPolling = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
    };

    const joinRoom = async () => {
        try {
            await axios.put(`/api/rooms/${id}`, {
                action: 'join',
                userId: user.id,
                username: user.username
            });
            fetchRoomState();
        } catch (error) {
            console.error('Failed to join room', error);
        }
    };

    const fetchRoomState = async () => {
        try {
            const res = await axios.get(`/api/rooms/${id}`);
            setRoom(res.data);
        } catch (error) {
            console.error('Failed to fetch room state', error);
        }
    };

    const startGame = async () => {
        await axios.put(`/api/rooms/${id}`, { action: 'start' });
    };

    const nextSong = async () => {
        stopAudio();
        await axios.put(`/api/rooms/${id}`, { action: 'next_song' });
    };

    const playAudio = (song) => {
        stopAudio();

        if (song.source === 'spotify' && song.preview_url) {
            // Play Spotify preview
            const audio = new Audio(song.preview_url);
            audio.volume = 0.5;
            audio.play().catch(e => console.error('Audio play failed', e));
            audioRef.current = audio;
            setCurrentlyPlaying({ type: 'spotify', song });
        } else {
            // Play YouTube (will be rendered as iframe)
            setCurrentlyPlaying({ type: 'youtube', song });
        }
    };

    const stopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setCurrentlyPlaying(null);
    };

    const [roundState, setRoundState] = useState({ title: false, artist: false });
    const [startTime, setStartTime] = useState(0);

    useEffect(() => {
        if (room?.status === 'playing' && room?.songs?.[room.current_song_index]) {
            // Reset timer when song changes
            const settings = room.settings ? JSON.parse(room.settings) : { timer: 30 };
            setTimeLeft(settings.timer);

            // Reset guess state
            setHasGuessed(false);
            setRoundState({ title: false, artist: false });
            setStartTime(Date.now());
            setMessage('');
            setGuess('');

            // Start playing audio
            const song = room.songs[room.current_song_index];
            playAudio(song);

            if (timerRef.current) clearInterval(timerRef.current);

            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
            stopAudio();
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            stopAudio();
        };
    }, [room?.current_song_index, room?.status]);

    const handleGuess = async (e) => {
        e.preventDefault();
        if ((roundState.title && roundState.artist) || !room || timeLeft === 0) return;

        const timeTaken = Date.now() - startTime;

        try {
            const res = await axios.put(`/api/rooms/${id}`, {
                action: 'guess',
                userId: user.id,
                guess,
                timeTaken
            });

            const { feedback, points } = res.data;

            if (feedback.title || feedback.artist) {
                let msg = [];
                if (feedback.title) msg.push('Title');
                if (feedback.artist) msg.push('Artist');

                let fullMsg = `${msg.join(' & ')} Found!`;
                if (feedback.speed) fullMsg += ' (Speed Bonus! ⚡️)';

                setMessage(fullMsg);
                setGuess(''); // Clear input for next guess

                setRoundState(prev => ({
                    title: prev.title || feedback.title,
                    artist: prev.artist || feedback.artist
                }));
            } else {
                setMessage('Wrong!');
                setTimeout(() => setMessage(''), 1000);
            }
        } catch (error) {
            console.error('Guess failed', error);
        }
    };

    if (!user || !room) return <div className="container">Loading...</div>;

    const isHost = room.host_id === user.id;
    const settings = room.settings ? JSON.parse(room.settings) : { rounds: room.songs.length };
    const maxRounds = settings.rounds || room.songs.length;
    const isFinished = room.current_song_index >= maxRounds || room.current_song_index >= room.songs.length;
    const roundComplete = roundState.title && roundState.artist;

    // Safety check for current song
    const currentSong = room.songs[room.current_song_index];
    if (!isFinished && !currentSong) {
        return <div className="container">Error: Song data missing. <button onClick={() => window.location.reload()} className="btn btn-secondary">Reload</button></div>;
    }

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => router.push('/rooms')} className="btn btn-secondary">Exit</button>
                    <h1 className="title" style={{ margin: 0, fontSize: '1.5rem' }}>{room.playlist_name}</h1>
                </div>
                <div>
                    <span className="subtitle">Room Code: {id.slice(0, 8)}</span>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '2rem' }}>
                {/* Game Area */}
                <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    {room.status === 'waiting' ? (
                        <div style={{ textAlign: 'center' }}>
                            <h2 style={{ marginBottom: '1rem' }}>Waiting for Host to Start</h2>
                            <div style={{ marginBottom: '1rem', opacity: 0.7 }}>
                                Settings: {maxRounds} Rounds • {settings.timer || 30}s Timer
                            </div>
                            {isHost && (
                                <button onClick={startGame} className="btn btn-primary">Start Game</button>
                            )}
                        </div>
                    ) : isFinished ? (
                        <div style={{ textAlign: 'center' }}>
                            <h2>Game Over!</h2>
                            <p>Check the scoreboard.</p>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                            <div style={{ marginBottom: '2rem' }}>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: timeLeft < 10 ? '#f87171' : 'white' }}>
                                    {timeLeft}s
                                </div>
                                <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>🎵</div>
                                <p>Playing from {currentSong.source}...</p>
                                {currentlyPlaying?.type === 'spotify' && (
                                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>🎧 Spotify Preview</p>
                                )}
                                {currentlyPlaying?.type === 'youtube' && (
                                    <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.5rem' }}>🎥 YouTube Audio</p>
                                )}

                                {/* Status Indicators */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
                                    <span style={{
                                        padding: '0.5rem 1rem',
                                        background: roundState.title ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '20px',
                                        transition: 'background 0.3s',
                                        border: roundState.title ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        Title {roundState.title ? '✓' : ''}
                                    </span>
                                    <span style={{
                                        padding: '0.5rem 1rem',
                                        background: roundState.artist ? '#22c55e' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '20px',
                                        transition: 'background 0.3s',
                                        border: roundState.artist ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        Artist {roundState.artist ? '✓' : ''}
                                    </span>
                                </div>

                                {/* Debug: Show title for testing */}
                                <p style={{ fontSize: '0.8rem', opacity: 0.3, marginTop: '1rem' }}>Debug: {currentSong.title} - {currentSong.artist}</p>
                            </div>

                            <form onSubmit={handleGuess} style={{ display: 'flex', gap: '0.5rem' }}>
                                <input
                                    className="input"
                                    placeholder={roundComplete ? "Round Complete!" : "Guess title or artist..."}
                                    value={guess}
                                    onChange={(e) => setGuess(e.target.value)}
                                    disabled={roundComplete || timeLeft === 0}
                                />
                                <button type="submit" className="btn btn-primary" disabled={roundComplete || timeLeft === 0}>Guess</button>
                            </form>
                            {message && (
                                <div style={{
                                    marginTop: '1rem',
                                    color: message.includes('Wrong') ? '#f87171' : message.includes('Speed') ? '#a855f7' : '#4ade80',
                                    fontWeight: 'bold',
                                    animation: 'fade-in 0.3s'
                                }}>
                                    {message}
                                </div>
                            )}

                            {isHost && (
                                <div style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                                    <button onClick={nextSong} className="btn btn-secondary">Next Song</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Hidden YouTube Player for Audio */}
                {currentlyPlaying?.type === 'youtube' && (
                    <iframe
                        src={`https://www.youtube.com/embed/${currentlyPlaying.song.id}?autoplay=1&start=30&controls=0&enablejsapi=1`}
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
                )}

                {/* Sidebar / Scoreboard */}
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '1rem' }}>Players</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {[...room.players].sort((a, b) => b.score - a.score).map(p => {
                            const roundScore = p.round_scores?.[room.current_song_index] || {};
                            return (
                                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{p.username} {p.id === room.host_id && '👑'}</span>
                                        <div style={{ display: 'flex', gap: '0.25rem', fontSize: '0.7rem', marginTop: '0.25rem' }}>
                                            {roundScore.title && <span style={{ background: '#22c55e', padding: '0 0.25rem', borderRadius: '2px', color: 'black' }}>Title</span>}
                                            {roundScore.artist && <span style={{ background: '#22c55e', padding: '0 0.25rem', borderRadius: '2px', color: 'black' }}>Artist</span>}
                                        </div>
                                    </div>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{p.score}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default dynamic(() => Promise.resolve(RoomPageContent), {
    ssr: false,
});
