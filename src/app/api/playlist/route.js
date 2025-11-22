import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const stmt = db.prepare('SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC');
        const playlists = stmt.all(userId);

        // Parse songs JSON
        const parsedPlaylists = playlists.map(p => ({
            ...p,
            songs: JSON.parse(p.songs)
        }));

        return NextResponse.json(parsedPlaylists);
    } catch (error) {
        console.error('Database error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, name, songs } = body;

        if (!userId || !name || !songs) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const id = uuidv4();
        const stmt = db.prepare('INSERT INTO playlists (id, user_id, name, songs) VALUES (?, ?, ?, ?)');
        stmt.run(id, userId, name, JSON.stringify(songs));

        return NextResponse.json({ id, name, songs });
    } catch (error) {
        console.error('Playlist API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const userId = searchParams.get('userId');

        if (!id || !userId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Verify ownership
        const getStmt = db.prepare('SELECT user_id FROM playlists WHERE id = ?');
        const playlist = getStmt.get(id);

        if (!playlist) {
            return NextResponse.json({ error: 'Playlist not found' }, { status: 404 });
        }

        if (String(playlist.user_id) !== String(userId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const deleteStmt = db.prepare('DELETE FROM playlists WHERE id = ?');
        deleteStmt.run(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Playlist Delete Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
