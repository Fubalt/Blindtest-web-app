import { NextResponse } from 'next/server';
import { getSpotifyTrack, getSpotifyPlaylist } from '@/lib/spotify';
import { getYouTubeVideo, getYouTubePlaylist } from '@/lib/youtube';

export async function POST(request) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let result = null;

        console.log('Processing URL:', url);

        // Spotify Handling
        if (url.includes('spotify.com')) {
            console.log('Detected Spotify URL');
            if (url.includes('track')) {
                const id = url.split('track/')[1].split('?')[0];
                console.log('Spotify Track ID:', id);
                const track = await getSpotifyTrack(id);
                if (track) result = { type: 'track', data: track };
            } else if (url.includes('playlist')) {
                const id = url.split('playlist/')[1].split('?')[0];
                console.log('Spotify Playlist ID:', id);
                const playlist = await getSpotifyPlaylist(id);
                if (playlist) result = { type: 'playlist', data: playlist };
            }
        }
        // YouTube Handling
        else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            console.log('Detected YouTube URL');
            if (url.includes('list=')) {
                const id = new URL(url).searchParams.get('list');
                console.log('YouTube Playlist ID:', id);
                const playlist = await getYouTubePlaylist(id);
                if (playlist) result = { type: 'playlist', data: playlist };
            } else {
                let id;
                if (url.includes('youtu.be')) {
                    id = url.split('youtu.be/')[1].split('?')[0];
                } else {
                    id = new URL(url).searchParams.get('v');
                }
                console.log('YouTube Video ID:', id);
                const video = await getYouTubeVideo(id);
                if (video) result = { type: 'track', data: video };
            }
        }

        if (!result) {
            console.log('No result found for URL:', url);
            return NextResponse.json({ error: 'Invalid URL or content not found' }, { status: 404 });
        }

        return NextResponse.json(result);

    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
