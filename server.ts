import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import yts from "yt-search";
import ytdl from "@distube/ytdl-core";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // JioSaavn API Proxy
  const SAAVN_API_BASE = "https://saavn.me/api";

  app.get("/api/search/songs", async (req, res) => {
    try {
      const { query, page = 1, limit = 20 } = req.query;
      const response = await axios.get(`${SAAVN_API_BASE}/search/songs`, {
        params: { query, page, limit }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Saavn API Error (Search):", error.message);
      res.status(500).json({ error: "Failed to fetch songs", details: error.message });
    }
  });

  app.get("/api/songs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const response = await axios.get(`${SAAVN_API_BASE}/songs`, {
        params: { id }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Saavn API Error (Details):", error.message);
      res.status(500).json({ error: "Failed to fetch song details", details: error.message });
    }
  });

  app.get("/api/trending", async (req, res) => {
    try {
      const response = await axios.get(`${SAAVN_API_BASE}/search/songs`, {
        params: { query: "trending", limit: 20 }
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Saavn API Error (Trending):", error.message);
      res.status(500).json({ error: "Failed to fetch trending", details: error.message });
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

  // YouTube Music Search (using yt-search with music filter hints)
  app.get("/api/youtube-music/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) return res.status(400).json({ error: "Query is required" });
      
      // Append "music" to query for better results if not already there
      const musicQuery = query.toString().toLowerCase().includes("music") ? query : `${query} music`;
      const results = await yts(musicQuery as string);
      
      const songs = results.videos.slice(0, 20).map(v => ({
        id: v.videoId,
        name: v.title,
        primaryArtists: v.author.name,
        image: [{ quality: "high", link: v.thumbnail }],
        duration: v.seconds,
        type: "youtube-music",
        downloadUrl: [{ quality: "high", link: `/api/youtube/stream?id=${v.videoId}` }]
      }));
      
      res.json({ data: { results: songs } });
    } catch (error: any) {
      console.error("YouTube Music Search Error:", error.message);
      res.status(500).json({ error: "YouTube Music search failed" });
    }
  });

  // YouTube Stream Proxy
  app.get("/api/youtube/stream", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "ID is required" });

      // Set appropriate headers for audio streaming
      res.setHeader('Content-Type', 'audio/mpeg');
      
      const stream = ytdl(id as string, {
        quality: 'highestaudio',
        filter: 'audioonly',
        highWaterMark: 1 << 25 // 32MB buffer
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
