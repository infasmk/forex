import { Song } from "./types";

export const getHighQualityImage = (song: Song) => {
  if (!song.image || song.image.length === 0) return "https://picsum.photos/seed/music/500/500";
  const link = song.image[song.image.length - 1].link;
  // SoundCloud artwork usually has -large.jpg, we can replace it with -t500x500.jpg for higher quality
  if (link && link.includes("-large.jpg")) {
    return link.replace("-large.jpg", "-t500x500.jpg");
  }
  return link;
};

export const getHighQualityDownload = (song: Song) => {
  if (song.type === "soundcloud") return song.url;
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
