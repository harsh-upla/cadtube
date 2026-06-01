import { safeTitle } from "@/utils/roundFigures";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { NextRequest, NextResponse } from "next/server";

// ----------------------------------------------------------------------
// HELPER: Strict URL Validation
// Ensures we don't pass malicious or broken strings to the FFmpeg process
// ----------------------------------------------------------------------
const isValidHttpUrl = (urlString: string | null): boolean => {
  if (!urlString) return false;

  try {
    return urlString.includes("http://") || urlString.includes("https://");
  } catch (error) {
    return false;
  }
};

// ----------------------------------------------------------------------
// MAIN ROUTE HANDLER
// ----------------------------------------------------------------------
export async function GET(req: NextRequest): Promise<NextResponse> {
    const searchParams = req.nextUrl.searchParams;
    const videoUrl = searchParams.get("videourl");
    const audioUrl = searchParams.get("audiourl");
    const title = searchParams.get("title");

    const safeTitleStr = safeTitle(String(title));
  
  // 1. Validate Inputs (Prevent bad data from crashing FFmpeg)
  if (!isValidHttpUrl(videoUrl) || !isValidHttpUrl(audioUrl)) {
    return NextResponse.json(
      {
        error: "Invalid or missing URLs.",
        details:
          "Both 'videoUrl' and 'audioUrl' must be valid HTTP/HTTPS URLs.",
      },
      { status: 400 },
    );
  }

  // We can safely cast to string here because of the validation above
  const safeVideoUrl = videoUrl as string;
  const safeAudioUrl = audioUrl as string;

  // 2. Spawn the FFmpeg Process
  // Note: child_process.spawn is safe from shell injection by default
  // because it does not run inside a shell unless { shell: true } is passed.
  const ffmpeg: ChildProcessWithoutNullStreams = spawn("ffmpeg", [
    "-i",
    safeVideoUrl, // Input 1
    "-i",
    safeAudioUrl, // Input 2
    "-c:v",
    "copy", // Copy video stream (Low CPU)
    "-c:a",
    "aac", // Re-encode audio to standard AAC
    "-movflags",
    "frag_keyframe+empty_moov", // REQUIRED for streaming MP4
    "-f",
    "mp4", // Output format
    "pipe:1", // Send output to stdout
  ]);

  // 3. Handle Client Disconnects (The "Anti-Zombie" mechanism)
  // If the user closes the browser tab, Next.js triggers this abort signal.
  req.signal.addEventListener("abort", () => {
    if (!ffmpeg.killed) {
      console.log("⚠️ Client aborted request. Killing FFmpeg...");
      ffmpeg.kill("SIGKILL"); // SIGKILL forces the OS to terminate it immediately
    }
  });

  // 4. Create the Readable Stream for the Response
  const stream = new ReadableStream({
    start(controller) {
      // Track if we've closed the stream to prevent "Controller already closed" errors
      let isStreamClosed = false;

      const safeCloseController = () => {
        if (!isStreamClosed) {
          isStreamClosed = true;
          try {
            controller.close();
          } catch (e) {
            /* Ignore */
          }
        }
      };

      // PIPE DATA: Send FFmpeg's binary output to the client browser
      ffmpeg.stdout.on("data", (chunk: Buffer) => {
        if (!isStreamClosed) {
          controller.enqueue(chunk);
        }
      });

      // CLEANUP: FFmpeg finished successfully
      ffmpeg.stdout.on("end", () => {
        safeCloseController();
      });

      // ERROR HANDLING: FFmpeg process failed to start or crashed
      ffmpeg.on("error", (error: Error) => {
        console.error("❌ FFmpeg Spawn Error:", error.message);
        if (!isStreamClosed) {
          isStreamClosed = true;
          try {
            controller.error(error);
          } catch (e) {
            /* Ignore */
          }
        }
        if (!ffmpeg.killed) ffmpeg.kill("SIGKILL");
      });

      // LOGGING: Capture FFmpeg's internal stderr logs for debugging
      // FFmpeg writes ALL its logs (even non-errors) to stderr.
      ffmpeg.stderr.on("data", (data: Buffer) => {
        const logMsg = data.toString();
        // Optional: Comment this out in production if it clutters your logs too much
        // console.log("[FFmpeg Log]:", logMsg);

        // If FFmpeg hits a fatal error (like a 403 Forbidden from YouTube), it logs it here
        if (logMsg.toLowerCase().includes("http error 403")) {
          console.error("🚨 YouTube blocked the request (403 Forbidden).");
        }
      });

      // EXIT CODES: Monitor how the process actually died
      ffmpeg.on("close", (code: number | null) => {
        if (code !== 0 && code !== 255) {
          // Code 0 = Success. Code 255 = Killed manually (which we do on abort).
          // Anything else means FFmpeg crashed unexpectedly.
          console.error(`⚠️ FFmpeg exited abnormally with code: ${code}`);
        }
        safeCloseController();
      });
    },

    // FALLBACK CANCEL: If the Web Stream API tries to cancel the stream
    cancel() {
      if (!ffmpeg.killed) {
        console.log("🛑 Stream cancelled by reader. Killing FFmpeg...");
        ffmpeg.kill("SIGKILL");
      }
    },
  });

  // 5. Return the stream to the client
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-store, no-cache, must-revalidate", // Prevent browser caching issues
      "Content-Disposition": `attachment; filename="${safeTitleStr}.mp4"`,
    },
  });
}
