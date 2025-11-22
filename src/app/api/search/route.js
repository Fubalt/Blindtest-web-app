import { NextResponse } from 'next/server';
import { searchSpotify } from '@/lib/spotify';
import { searchYouTube } from '@/lib/youtube';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json([]);
    }

    try {
        // Run searches in parallel
        const [spotifyResults, youtubeResults] = await Promise.all([
            searchSpotify(query),
            searchYouTube(query)
        ]);

        // Combine results
        const combinedResults = [...spotifyResults, ...youtubeResults];

        // Fallback to mock if no results (e.g. if keys are invalid/missing)
        if (combinedResults.length === 0) {
            return NextResponse.json([
                {
                    id: '1',
                    title: `${query} - Hit Song (Mock)`,
                    artist: 'Famous Artist',
                    source: 'spotify',
                    cover: 'https://placehold.co/60x60/1db954/ffffff?text=S'
                },
                {
                    id: '2',
                    title: `${query} (Official Video) (Mock)`,
                    artist: 'Youtube Star',
                    source: 'youtube',
                    cover: 'https://placehold.co/60x60/ff0000/ffffff?text=Y'
                }
            ]);
        }

        return NextResponse.json(combinedResults);
    } catch (error) {
        console.error('Search API error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
