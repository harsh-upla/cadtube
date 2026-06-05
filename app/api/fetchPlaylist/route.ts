import youtubedl from 'youtube-dl-exec';

const playlistUrl = 'https://www.youtube.com/playlist?list=PLBCF2DAC6FFB574DE';

async function getPlaylistInfo() {
  try {
    const data = await youtubedl(playlistUrl, {
      dumpSingleJson: true,
      flatPlaylist: true,      // Fast extraction: only grabs metadata, doesn't parse every single video file
      noCheckCertificates: true,
      noWarnings: true
    });

  } catch (error) {
    console.error('Failed to fetch playlist:', error);
  }
}

getPlaylistInfo()
