import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { safeTitle } from '@/utils/roundFigures';

// Define a maximum execution time to prevent infinite zombies (e.g., 2 hours)
const MAX_EXECUTION_TIME_MS = 2 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    // 1. Get the parameters from the URL query string
    const { searchParams } = new URL(request.url);
    const audiourl = searchParams.get('audiourl');
    const filename = searchParams.get('title') || 'audio';

    // ==========================================
    // CHECK 1: Strict URL Validation
    // ==========================================
    if (!audiourl) {
      return NextResponse.json({ error: 'Missing audiourl parameter' }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(audiourl);
      // STRICTLY allow only http and https. 
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({ error: 'Malformed URL provided' }, { status: 400 });
    }

    // Sanitize the filename for safe browser downloading
    const safeFilename = safeTitle(filename) + '.mp3';

    // 2. Spawn FFmpeg process for AUDIO ONLY
    const ffmpegProcess = spawn('ffmpeg', [
      '-y',
      '-i', audiourl,            
      '-vn',                  // Crucial: Drops the video stream entirely
      '-c:a', 'libmp3lame',   // Encodes the audio track to MP3
      '-b:a', '192k',         // Sets a solid audio bitrate (192kbps)
      '-f', 'mp3',            // Forces the output format to be MP3
      '-'                     // Pipes output to standard out
    ]);

    // ==========================================
    // CHECK 2: Absolute Kill Switch Helper
    // ==========================================
    let isCleanedUp = false;
    const killProcess = (reason: string) => {
      if (!isCleanedUp && !ffmpegProcess.killed) {
        console.log(`[FFmpeg] Killing process. Reason: ${reason}`);
        ffmpegProcess.kill('SIGKILL');
        isCleanedUp = true;
      }
    };

    // ==========================================
    // CHECK 3: Max Duration Timeout
    // ==========================================
    const timeoutId = setTimeout(() => {
      killProcess('Max execution time reached (Zombie Prevention)');
    }, MAX_EXECUTION_TIME_MS);

    // ==========================================
    // CHECK 4: Request Abort Signal (Client Disconnect)
    // ==========================================
    request.signal.addEventListener('abort', () => {
      killProcess('Client aborted request / disconnected');
      clearTimeout(timeoutId);
    });

    // 3. Create a web-compatible ReadableStream
    const responseStream = new ReadableStream({
      start(controller) {
        ffmpegProcess.stdout.on('data', (chunk) => {
          try {
            controller.enqueue(chunk);
          } catch (e) {
            killProcess('Stream controller error during enqueue');
          }
        });

        ffmpegProcess.stdout.on('end', () => {
          console.log('[FFmpeg] Stream ended successfully.');
          killProcess('Standard completion');
          clearTimeout(timeoutId);
          try { controller.close(); } catch (e) {}
        });

        ffmpegProcess.on('error', (err) => {
          console.error('[FFmpeg] Process error:', err);
          killProcess('Process error');
          clearTimeout(timeoutId);
          try { controller.error(err); } catch (e) {}
        });
      },
      
      cancel() {
        killProcess('ReadableStream cancelled by consumer');
        clearTimeout(timeoutId);
      }
    });

    // 4. Return the stream directly to the browser
    return new NextResponse(responseStream, {
      headers: {
        'Content-Type': 'audio/mpeg', // Updated from video/mp4
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Transfer-Encoding': 'chunked', 
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });

  } catch (error: any) {
    console.error('Streaming API error:', error);
    return NextResponse.json({ error: 'Failed to initialize stream', details: error.message }, { status: 500 });
  }
}