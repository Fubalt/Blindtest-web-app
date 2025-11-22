import axios from 'axios';

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';

export async function searchYouTube(query) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];

    try {
        // Add "lyrics" to query to prefer lyric videos
        const lyricsQuery = `${query} lyrics`;
        const response = await axios.get(`${YOUTUBE_API_URL}/search`, {
            params: {
                part: 'snippet',
                q: lyricsQuery,
                type: 'video',
                maxResults: 10,
                key: apiKey
            }
        });

        const results = response.data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            source: 'youtube',
            cover: item.snippet.thumbnails.default.url
        }));

        // Sort to prefer videos with "lyrics" or "lyric" in title
        return results.sort((a, b) => {
            const aHasLyrics = /lyric/i.test(a.title);
            const bHasLyrics = /lyric/i.test(b.title);
            if (aHasLyrics && !bHasLyrics) return -1;
            if (!aHasLyrics && bHasLyrics) return 1;
            return 0;
        });
    } catch (error) {
        console.error('YouTube search error:', error);
        return [];
    }
}

export async function getYouTubeVideo(id) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    try {
        const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
            params: {
                part: 'snippet',
                id: id,
                key: apiKey
            }
        });

        const item = response.data.items[0];
        if (!item) return null;

        return {
            id: item.id,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            source: 'youtube',
            cover: item.snippet.thumbnails.default.url
        };
    } catch (error) {
        console.error('YouTube video error:', error);
        return null;
    }
}

export async function getYouTubePlaylist(id) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) return null;

    try {
        // First get playlist details for title
        const playlistResponse = await axios.get(`${YOUTUBE_API_URL}/playlists`, {
            params: {
                part: 'snippet',
                id: id,
                key: apiKey
            }
        });

        const playlistTitle = playlistResponse.data.items[0]?.snippet?.title || 'YouTube Playlist';

        let allTracks = [];
        let nextPageToken = null;

        do {
            const itemsResponse = await axios.get(`${YOUTUBE_API_URL}/playlistItems`, {
                params: {
                    part: 'snippet',
                    playlistId: id,
                    maxResults: 50,
                    key: apiKey,
                    pageToken: nextPageToken
                }
            });

            const tracks = itemsResponse.data.items.map(item => ({
                id: item.snippet.resourceId.videoId,
                title: item.snippet.title,
                artist: item.snippet.videoOwnerChannelTitle || item.snippet.channelTitle,
                source: 'youtube',
                cover: item.snippet.thumbnails.default?.url
            }));

            allTracks = [...allTracks, ...tracks];
            nextPageToken = itemsResponse.data.nextPageToken;

            if (allTracks.length > 500) break; // Safety limit
        } while (nextPageToken);

        return {
            name: playlistTitle,
            songs: allTracks
        };
    } catch (error) {
        console.error('YouTube playlist error:', error);
        return null;
    }
}
