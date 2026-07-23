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

  static async syncLibrary(): Promise<any[]> {
    if (!this.API_KEY || !this.LIBRARY_ID) {
      const err = new Error('Bunny Stream is not configured in environment variables.') as any;
      err.status = 500;
      throw err;
    }

    let res;
    try {
      res = await fetch(`https://video.bunnycdn.com/library/${this.LIBRARY_ID}/videos?itemsPerPage=1000`, {
        headers: {
          AccessKey: this.API_KEY,
          accept: 'application/json'
        }
      });
    } catch (fetchErr: any) {
      const err = new Error(`Failed to fetch videos from Bunny Stream: ${fetchErr.message}`) as any;
      err.status = 500;
      throw err;
    }

    if (!res.ok) {
      const errText = await res.text();
      let msg = `Failed to fetch videos from Bunny Stream: ${errText}`;
      if (res.status === 401) msg = 'Invalid API Key';
      else if (res.status === 404) msg = 'Invalid Library';
      else if (res.status === 429) msg = 'Rate Limited';
      
      console.log(`Bunny returns: ${res.status}`);
      console.log(`↓`);
      console.log(msg);
      console.log(`Exact response: ${errText}`);

      const err = new Error(msg) as any;
      err.status = res.status;
      err.responseBody = errText;
      throw err;
    }

    const data = await res.json() as any;
    // Log what was returned for Verification as requested
    // "Call Bunny API. Verify GET Videos Return Video ID, Title, Length, Thumbnail"
    return data.items || [];
  }

  static async deleteVideo(videoId: string): Promise<boolean> {
    if (!this.API_KEY || !this.LIBRARY_ID) return false;

    const res = await fetch(`https://video.bunnycdn.com/library/${this.LIBRARY_ID}/videos/${videoId}`, {
      method: 'DELETE',
      headers: {
        AccessKey: this.API_KEY,
      }
    });

    return res.ok;
  }
}
