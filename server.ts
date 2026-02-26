import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import yts from "yt-search";
import ytdl from "@distube/ytdl-core";

export const app = express();
app.use(express.json());

const SOUNDCLOUD_CLIENT_ID = process.env.SOUNDCLOUD_CLIENT_ID;

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV, vercel: process.env.VERCEL });
});

// SoundCloud Search
app.get("/api/soundcloud/search", async (req, res) => {
  const { query, limit = 20 } = req.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    if (!SOUNDCLOUD_CLIENT_ID) {
      throw new Error("SoundCloud Client ID not configured");
    }

    const response = await axios.get(`https://api-v2.soundcloud.com/search/tracks`, {
      params: {
        q: query,
        client_id: SOUNDCLOUD_CLIENT_ID,
        limit: limit,
        offset: 0
      },
      timeout: 8000
    });

    const songs = response.data.collection.map((track: any) => ({
      id: track.id.toString(),
      name: track.title,
      primaryArtists: track.user.username,
      image: [{ quality: "high", link: track.artwork_url || track.user.avatar_url }],
      duration: Math.floor(track.duration / 1000),
      type: "soundcloud",
      url: track.permalink_url,
      downloadUrl: [{ quality: "high", link: track.permalink_url }]
    }));

    res.json({ data: { results: songs } });
  } catch (error: any) {
    console.error("SoundCloud Search Error, falling back to YouTube:", error.message);
    // Fallback to YouTube Search
    try {
      const results = await yts(query as string);
      const songs = results.videos.slice(0, 20).map(v => ({
        id: v.videoId,
        name: v.title,
        primaryArtists: v.author.name,
        image: [{ quality: "high", link: v.thumbnail }],
        duration: v.seconds,
        type: "youtube",
        downloadUrl: [{ quality: "high", link: `/api/youtube/stream?id=${v.videoId}` }]
      }));
      res.json({ data: { results: songs } });
    } catch (ytError: any) {
      res.status(500).json({ error: "Search failed on all platforms", details: ytError.message });
    }
  }
});

// SoundCloud Trending (Popular tracks)
app.get("/api/trending", async (req, res) => {
  try {
    if (!SOUNDCLOUD_CLIENT_ID) {
      // Fallback to YouTube trending if SoundCloud is not configured
      const results = await yts("trending music");
      const songs = results.videos.slice(0, 20).map(v => ({
        id: v.videoId,
        name: v.title,
        primaryArtists: v.author.name,
        image: [{ quality: "high", link: v.thumbnail }],
        duration: v.seconds,
        type: "youtube",
        downloadUrl: [{ quality: "high", link: `/api/youtube/stream?id=${v.videoId}` }]
      }));
      return res.json({ data: { results: songs } });
    }

    const response = await axios.get(`https://api-v2.soundcloud.com/featured_tracks/top/all-music`, {
      params: {
        client_id: SOUNDCLOUD_CLIENT_ID,
        limit: 20
      },
      timeout: 8000
    });

    const songs = response.data.collection.map((track: any) => ({
      id: track.id.toString(),
      name: track.title,
      primaryArtists: track.user.username,
      image: [{ quality: "high", link: track.artwork_url || track.user.avatar_url }],
      duration: Math.floor(track.duration / 1000),
      type: "soundcloud",
      url: track.permalink_url,
      downloadUrl: [{ quality: "high", link: track.permalink_url }]
    }));

    res.json({ data: { results: songs } });
  } catch (error: any) {
    console.error("Trending Error:", error.message);
    // Final fallback to YouTube
    try {
      const results = await yts("trending music");
      const songs = results.videos.slice(0, 20).map(v => ({
        id: v.videoId,
        name: v.title,
        primaryArtists: v.author.name,
        image: [{ quality: "high", link: v.thumbnail }],
        duration: v.seconds,
        type: "youtube",
        downloadUrl: [{ quality: "high", link: `/api/youtube/stream?id=${v.videoId}` }]
      }));
      res.json({ data: { results: songs } });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch trending" });
    }
  }
});

// YouTube Search
app.get("/api/youtube/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: "Query is required" });
    
    const results = await yts(query as string);
    const songs = results.videos.slice(0, 20).map(v => ({
      id: v.videoId,
      name: v.title,
      primaryArtists: v.author.name,
      image: [{ quality: "high", link: v.thumbnail }],
      duration: v.seconds,
      type: "youtube",
      downloadUrl: [{ quality: "high", link: `/api/youtube/stream?id=${v.videoId}` }]
    }));
    
    res.json({ data: { results: songs } });
  } catch (error: any) {
    console.error("YouTube Search Error:", error.message);
    res.status(500).json({ error: "YouTube search failed" });
  }
});

// YouTube Stream Proxy
app.get("/api/youtube/stream", async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: "ID is required" });

    res.setHeader('Content-Type', 'audio/mpeg');
    
    const stream = ytdl(id as string, {
      quality: 'highestaudio',
      filter: 'audioonly',
      highWaterMark: 1 << 25
    });

    stream.on('error', (err) => {
      console.error("Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).send("Streaming failed");
      }
    });

    stream.pipe(res);
  } catch (error: any) {
    console.error("YouTube Stream Error:", error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to get stream URL" });
    }
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
