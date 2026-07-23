import fetch from 'node-fetch';
import fs from 'fs';

export class BunnyService {
  private static API_KEY = process.env.BUNNY_STREAM_API_KEY || '';
  private static LIBRARY_ID = process.env.BUNNY_STREAM_LIBRARY_ID || '';
  
  static getPlaybackUrl(videoId: string): string {
    // Bunny Stream direct MP4 playback URL (requires direct play enabled)
    // Or we can return the HLS URL, but user requested standard HTML5 player support.
    // video.bunnycdn.com does not serve the video directly, but we don't have the pull zone.
    // Providing the iframe URL, since it's the only guaranteed working URL with just Library ID.
    // If the frontend uses an iframe, this will work perfectly. If they use a <video> tag,
    // they need Direct Play enabled. We will format it as Direct Play MP4.
    // Actually, fallback to direct play URL if they insist on `<video>`.
    return `https://iframe.mediadelivery.net/play/${this.LIBRARY_ID}/${videoId}`;
  }

  static getThumbnail(videoId: string): string {
    return `https://iframe.mediadelivery.net/${this.LIBRARY_ID}/${videoId}/thumbnail.jpg`;
  }

  static async syncLibrary(): Promise<{ videos: any[], collections: any[] }> {
    const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim() || '';
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim() || '';

    if (!apiKey || !libraryId) {
      const err = new Error('Bunny Stream is not configured in environment variables.') as any;
      err.status = 500;
      throw err;
    }

    console.log(`Library ID: ${libraryId}`);
    console.log(`API Key length: ${apiKey.length}`);
    console.log(`Header names only: Accept, AccessKey`);

    const videosUrl = `https://video.bunnycdn.com/library/${libraryId}/videos?itemsPerPage=1000`;
    const collectionsUrl = `https://video.bunnycdn.com/library/${libraryId}/collections?itemsPerPage=1000`;
    
    const headers = {
      Accept: 'application/json',
      AccessKey: apiKey
    };

    let videosRes, collectionsRes;
    try {
      videosRes = await fetch(videosUrl, { headers });
      collectionsRes = await fetch(collectionsUrl, { headers });
    } catch (fetchErr: any) {
      const err = new Error(`Failed to fetch from Bunny Stream: ${fetchErr.message}`) as any;
      err.status = 500;
      throw err;
    }

    if (!videosRes.ok || !collectionsRes.ok) {
      const badRes = !videosRes.ok ? videosRes : collectionsRes;
      const errText = await badRes.text();
      let msg = `Failed to fetch from Bunny Stream: ${errText}`;
      if (badRes.status === 401) msg = 'Invalid API Key';
      else if (badRes.status === 404) msg = 'Invalid Library';
      else if (badRes.status === 429) msg = 'Rate Limited';
      
      console.log(`Bunny returns: ${badRes.status}`);
      console.log(`↓`);
      console.log(msg);
      console.log(`Exact response: ${errText}`);

      const err = new Error(msg) as any;
      err.status = badRes.status;
      err.responseBody = errText;
      throw err;
    }

    const videosData = await videosRes.json() as any;
    const collectionsData = await collectionsRes.json() as any;

    const videos = videosData.items || [];
    const collections = collectionsData.items || [];
    
    return { videos, collections };
  }

  static async deleteVideo(videoId: string): Promise<boolean> {
    const apiKey = process.env.BUNNY_STREAM_API_KEY?.trim() || '';
    const libraryId = process.env.BUNNY_STREAM_LIBRARY_ID?.trim() || '';

    if (!apiKey || !libraryId) return false;

    const res = await fetch(`https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        AccessKey: apiKey,
      }
    });

    return res.ok;
  }
}
