import { NextResponse } from "next/server";
import os from "os";
import path from "path";
// import youtubedl from "youtube-dl-exec";
import { create } from "youtube-dl-exec";

// Detect the operating system
const isWindows = os.platform() === "win32";

const binaryPath = isWindows
  ? // Local Windows path (bypasses Next.js virtual /ROOT/ pathing)
    path.join(
      process.cwd(),
      "node_modules",
      "youtube-dl-exec",
      "bin",
      "yt-dlp.exe",
    )
  : // Production Ubuntu VPS path (uses global installation)
    "/usr/local/bin/yt-dlp";

// 2. Create a custom instance of youtube-dl-exec pointing exactly to that file
const youtubedl = create(binaryPath);

export async function POST(request: Request) {
  const body = await request.json();
  const videoUrl = body.url;

  // 1. Construct the absolute path manually using process.cwd()
  // process.cwd() always points to the root of your Next.js project (D:\Github Projects\cadtube\cadtube)

  if (!videoUrl) {
    return NextResponse.json(
      { error: "A YouTube URL is required" },
      { status: 400 },
    );
  }

  try {
    // Fetch the raw metadata
    const rawData = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      // Use the dedicated options instead of addHeader
      referer: "youtube.com",
      userAgent:
        '"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"',
    });

    /* 
   // 1. Extract the basic video information
    const videoInfo = {
      id: rawData.id,
      title: rawData.title,
      thumbnail: rawData.thumbnail,
      duration: rawData.duration_string, // e.g., "14:23"
      channel: rawData.uploader,
    };

    // 2. Filter and map the available formats into a clean structure
    const availableFormats = rawData.formats
      // Filter out raw streaming protocols (like m3u8) to keep standard file formats
      .filter((format: any) => ["mp4", "webm", "m4a"].includes(format.ext))
      .map((format: any) => {
        // Determine the type of stream
        const hasVideo = format.vcodec !== "none";
        const hasAudio = format.acodec !== "none";

        let type = "Unknown";
        if (!hasVideo && hasAudio) type = "Audio Only";
        if (hasVideo && !hasAudio) type = "Video Only (No Sound)";
        if (hasVideo && hasAudio) type = "Pre-Merged Video + Audio";

        // Calculate filesize in MB if available
        const filesizeMB = format.filesize
          ? (format.filesize / 1024 / 1024).toFixed(2) + " MB"
          : "Unknown Size";

        return {
          formatId: format.format_id,
          ext: format.ext,
          quality: format.format_note || format.resolution || "Unknown Quality",
          type: type,
          size: filesizeMB,
          hasVideo,
          hasAudio,
        };
      })
      // Sort by quality (highest to lowest generally)
      .reverse();
*/

    return NextResponse.json(
      {
        info: rawData,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Error fetching YouTube data:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch video data",
        details: error.message || String(error),
      },
      { status: 500 },
    );
  }
}
