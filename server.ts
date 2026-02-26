import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import yts from "yt-search";
import ytdl from "@distube/ytdl-core";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: process.env.NODE_ENV, 
    vercel: process.env.VERCEL,
    engine: "YouTube Only"
  });
});

// Unified Search (YouTube)
app.get("/api/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const results = await yts(query as string);
    const songs = results.videos.slice(0, 25).map(v => ({
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
    console.error("Search Error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// Trending (YouTube)
app.get("/api/trending", async (req, res) => {
  try {
    const results = await yts({ query: "trending music", hl: "en", gl: "US" });
    const songs = results.videos.slice(0, 25).map(v => ({
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
    console.error("Trending Error:", error.message);
    res.status(500).json({ error: "Failed to fetch trending content" });
  }
});

// YouTube Stream Proxy
app.get("/api/youtube/stream", async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID is required" });

  try {
    // Check if video is playable
    const info = await ytdl.getInfo(id as string);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    
    if (!format) {
      throw new Error("No suitable audio format found");
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = ytdl(id as string, {
      format: format,
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // SPA fallback: serve index.html for any non-API routes
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api")) {
        return res.status(404).json({ error: "API route not found" });
      }
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath);
    });
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();
