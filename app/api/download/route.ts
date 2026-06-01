import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { safeTitle } from '@/utils/roundFigures';

// Define a maximum execution time to prevent infinite zombies (e.g., 2 hours)
const MAX_EXECUTION_TIME_MS = 2 * 60 * 60 * 1000;

export async function GET(request: Request) {
  try {
    // 1. Get the parameters from the URL query string
    const { searchParams } = new URL(request.url);
    const videoUrl = searchParams.get('videoUrl');
    const filename = searchParams.get('title') || 'video';

    // ==========================================
    // CHECK 1: Strict URL Validation
    // ==========================================
    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl parameter' }, { status: 400 });
    }

    try {
      const parsedUrl = new URL(videoUrl);
      // STRICTLY allow only http and https. 
      // This prevents SSRF and local file reading (e.g., file://, unix://, tcp://)
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 });
      }
    } catch (err) {
      return NextResponse.json({ error: 'Malformed URL provided' }, { status: 400 });
    }

    // Sanitize the filename for safe browser downloading
    const safeFilename = safeTitle(filename) + '.mp4';

    // 2. Spawn FFmpeg process
    const ffmpegProcess = spawn('ffmpeg', [
      '-y',
      '-i', videoUrl,            
      '-c', 'copy',              
      '-bsf:a', 'aac_adtstoasc',  
      '-f', 'mp4',               
      '-movflags', 'frag_keyframe+empty_moov', 
      '-'                        
    ]);

    // ==========================================
    // CHECK 2: Absolute Kill Switch Helper
    // ==========================================
    let isCleanedUp = false;
    const killProcess = (reason: string) => {
      if (!isCleanedUp && !ffmpegProcess.killed) {
        console.log(`[FFmpeg] Killing process. Reason: ${reason}`);
        // SIGKILL forces the OS to terminate the process immediately
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
    // This catches network drops/tab closures much more reliably than stream.cancel()
    request.signal.addEventListener('abort', () => {
      killProcess('Client aborted request / disconnected');
      clearTimeout(timeoutId);
    });

    // 3. Create a web-compatible ReadableStream
    const responseStream = new ReadableStream({
      start(controller) {
        ffmpegProcess.stdout.on('data', (chunk) => {
          // If the stream is still active, enqueue data
          try {
            controller.enqueue(chunk);
          } catch (e) {
            // If the controller errors out (e.g., browser buffer full/closed), kill process
            killProcess('Stream controller error during enqueue');
          }
        });

        ffmpegProcess.stdout.on('end', () => {
          console.log('[FFmpeg] Stream ended successfully.');
          killProcess('Standard completion');
          clearTimeout(timeoutId);
          try { controller.close(); } catch (e) {}
        });

        // Handle process errors specifically
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
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${safeFilename}"`,
        'Transfer-Encoding': 'chunked', 
        // Optional but recommended: Tell browsers not to cache this stream
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    });

  } catch (error: any) {
    console.error('Streaming API error:', error);
    return NextResponse.json({ error: 'Failed to initialize stream', details: error.message }, { status: 500 });
  }
}