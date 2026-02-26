import { Song } from "./types";

export const getHighQualityImage = (song: Song) => {
  if (!song.image || song.image.length === 0) return "https://picsum.photos/500/500?grayscale";
  return song.image[song.image.length - 1].link;
};

export const getHighQualityDownload = (song: Song) => {
  if (!song.downloadUrl || song.downloadUrl.length === 0) return null;
  const link = song.downloadUrl[song.downloadUrl.length - 1].link;
  // If it's a relative API path (like our YouTube proxy), return it as is
  if (link.startsWith("/api/")) return link;
  return link;
};

export const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
