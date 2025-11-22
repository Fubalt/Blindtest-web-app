import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request, context) {
    const { id } = await context.params;

    try {
        const stmt = db.prepare(`
      SELECT rooms.* 
      FROM rooms 
      WHERE rooms.id = ?
    `);
        const room = stmt.get(id);

        if (!room) {
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        // Get playlist name separately if needed, or just rely on room data
        // Let's fetch playlist name for display
        const playlistStmt = db.prepare('SELECT name FROM playlists WHERE id = ?');
        const playlist = playlistStmt.get(room.playlist_id);

        return NextResponse.json({
            ...room,
            playlist_name: playlist ? playlist.name : 'Unknown Playlist',
            players: JSON.parse(room.players),
            songs: JSON.parse(room.songs)
        });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request, context) {
    const { id } = await context.params;
    const body = await request.json();
    const { action, userId, username } = body;

    try {
        const getStmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
        const room = getStmt.get(id);

        if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

        let players = JSON.parse(room.players);
        let status = room.status;
        let currentSongIndex = room.current_song_index;

        if (action === 'join') {
            if (!players.find(p => p.id === userId)) {
                players.push({ id: userId, username, score: 0 });
            }
        } else if (action === 'start') {
            status = 'playing';
        } else if (action === 'next_song') {
            currentSongIndex += 1;
        } else if (action === 'guess') {
            const { guess, timeTaken } = body;
            const playerIndex = players.findIndex(p => p.id === userId);

            if (playerIndex !== -1) {
                const songs = JSON.parse(room.songs);
                const currentSong = songs[currentSongIndex];
                const player = players[playerIndex];

                // Initialize round_scores if needed
                if (!player.round_scores) player.round_scores = {};
                if (!player.round_scores[currentSongIndex]) {
                    player.round_scores[currentSongIndex] = { title: false, artist: false };
                }

                const roundScore = player.round_scores[currentSongIndex];
                let points = 0;
                let feedback = { title: false, artist: false, speed: false };
                const isFast = timeTaken < 5000;

                // Normalize strings for comparison
                const normalize = str => str.toLowerCase().replace(/[^\w\s]/g, '').trim();
                const normalizedGuess = normalize(guess);
                const normalizedTitle = normalize(currentSong.title || '');
                const normalizedArtist = normalize(currentSong.artist || '');

                // Helper to check match
                const checkMatch = (target, input) => {
                    if (!target) return false;
                    return input.includes(target) || target.includes(input); // Bidirectional inclusion for flexibility
                };

                // Check Title
                if (!roundScore.title && checkMatch(normalizedTitle, normalizedGuess)) {
                    let p = 1;
                    if (isFast) {
                        p += 0.5;
                        feedback.speed = true;
                    }
                    points += p;
                    roundScore.title = true;
                    feedback.title = true;
                }

                // Check Artist
                if (!roundScore.artist && checkMatch(normalizedArtist, normalizedGuess)) {
                    let p = 1;
                    if (isFast) {
                        p += 0.5;
                        feedback.speed = true;
                    }
                    points += p;
                    roundScore.artist = true;
                    feedback.artist = true;
                }

                player.score += points;

                // Save changes
                players[playerIndex] = player;

                // Return immediate feedback (don't wait for polling)
                const updateStmt = db.prepare('UPDATE rooms SET players = ? WHERE id = ?');
                updateStmt.run(JSON.stringify(players), id);

                return NextResponse.json({ success: true, feedback, points, totalScore: player.score });
            }
        }

        const updateStmt = db.prepare('UPDATE rooms SET players = ?, status = ?, current_song_index = ? WHERE id = ?');
        updateStmt.run(JSON.stringify(players), status, currentSongIndex, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
