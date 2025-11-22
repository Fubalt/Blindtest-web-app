import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const stmt = db.prepare(`
      SELECT rooms.*, users.username as host_name, playlists.name as playlist_name 
      FROM rooms 
      JOIN users ON rooms.host_id = users.id 
      JOIN playlists ON rooms.playlist_id = playlists.id
      WHERE rooms.status != 'finished'
      ORDER BY rooms.created_at DESC
    `);
        const rooms = stmt.all();

        const parsedRooms = rooms.map(r => ({
            ...r,
            players: JSON.parse(r.players)
        }));

        return NextResponse.json(parsedRooms);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { hostId, playlistId, name, settings } = body;

        if (!hostId || !playlistId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Fetch playlist songs to randomize them
        const playlistStmt = db.prepare('SELECT songs FROM playlists WHERE id = ?');
        const playlist = playlistStmt.get(playlistId);

        if (!playlist) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
        }

        let songs = JSON.parse(playlist.songs);

        // Shuffle songs
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }

        const id = uuidv4();
        const initialPlayers = [];

        const stmt = db.prepare('INSERT INTO rooms (id, host_id, playlist_id, players, songs, settings) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(id, hostId, playlistId, JSON.stringify(initialPlayers), JSON.stringify(songs), JSON.stringify(settings || {}));

        return NextResponse.json({ id });
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        console.log(`Attempting to delete room ${id} by user ${userId}`);

        if (!id || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify ownership
        const getStmt = db.prepare('SELECT host_id FROM rooms WHERE id = ?');
        const room = getStmt.get(id);

        if (!room) {
            console.log('Room not found');
            return NextResponse.json({ error: 'Room not found' }, { status: 404 });
        }

        console.log(`Room host: ${room.host_id}, Request user: ${userId}`);

        if (String(room.host_id) !== String(userId)) {
            console.log('Unauthorized deletion attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const deleteStmt = db.prepare('DELETE FROM rooms WHERE id = ?');
        deleteStmt.run(id);

        console.log('Room deleted successfully');
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Room Delete Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
