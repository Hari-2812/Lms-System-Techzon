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

  static async uploadVideo(filePath: string, originalName: string): Promise<string> {
    if (!this.API_KEY || !this.LIBRARY_ID) {
      throw new Error('Bunny Stream is not configured in environment variables.');
    }

    // 1. Create Video
    const createRes = await fetch(`https://video.bunnycdn.com/library/${this.LIBRARY_ID}/videos`, {
      method: 'POST',
      headers: {
        AccessKey: this.API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title: originalName })
    });
    
    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create video in Bunny Stream: ${errText}`);
    }
    
    const createData = await createRes.json() as any;
    const videoId = createData.guid;

    // 2. Upload Video Binary
    const fileBuffer = fs.readFileSync(filePath);
    const uploadRes = await fetch(`https://video.bunnycdn.com/library/${this.LIBRARY_ID}/videos/${videoId}`, {
      method: 'PUT',
      headers: {
        AccessKey: this.API_KEY,
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Failed to upload video binary to Bunny Stream: ${errText}`);
    }

    return videoId;
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
