import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  Download, 
  Heart, 
  Music, 
  TrendingUp, 
  Library,
  MoreHorizontal,
  X,
  Maximize2,
  Minimize2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactPlayer from "react-player";
import { Song, SearchResponse } from "./types";
import { getHighQualityImage, getHighQualityDownload, formatDuration } from "./utils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"trending" | "search" | "library">("trending");

  const playerRef = useRef<any>(null);

  useEffect(() => {
    fetchTrending();
  }, []);

  const fetchTrending = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/trending");
      if (!res.ok) throw new Error("Failed to fetch trending");
      const data = await res.json();
      if (data && data.data && data.data.results) {
        setSongs(data.data.results);
      } else if (data && data.results) {
        setSongs(data.results);
      } else {
        console.warn("Unexpected API response structure", data);
      }
      setActiveTab("trending");
    } catch (error) {
      console.error("Failed to fetch trending", error);
    } finally {
      setIsLoading(false);
    }
  };

  const [searchSource, setSearchSource] = useState<"saavn" | "youtube" | "youtube-music">("saavn");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const endpoint = searchSource === "saavn" 
        ? `/api/search/songs?query=${encodeURIComponent(searchQuery)}`
        : searchSource === "youtube"
        ? `/api/youtube/search?query=${encodeURIComponent(searchQuery)}`
        : `/api/youtube-music/search?query=${encodeURIComponent(searchQuery)}`;

      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      if (data && data.data && data.data.results) {
        setSongs(data.data.results);
      } else if (data && data.results) {
        setSongs(data.results);
      } else {
        console.warn("Unexpected API response structure", data);
      }
      setActiveTab("search");
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setIsPlaying(true);
  };

  const togglePlay = () => setIsPlaying(!isPlaying);

  const handleProgress = (state: any) => {
    setProgress(state.playedSeconds);
  };

  const handleDuration = (dur: number) => {
    setDuration(dur);
  };

  const handleDownload = (song: Song) => {
    const url = getHighQualityDownload(song);
    if (url) {
      const link = document.createElement("a");
      link.href = url;
      link.download = `${song.name}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const Player = ReactPlayer as any;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 atmosphere z-0" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-20 lg:w-64 glass border-r border-white/5 flex flex-col p-4 gap-8">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-[var(--color-accent)] rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Music className="text-white" size={24} />
            </div>
            <span className="hidden lg:block font-serif text-xl italic font-bold tracking-tight">Bloomee</span>
          </div>

          <nav className="flex flex-col gap-2">
            <button 
              onClick={() => { setActiveTab("trending"); fetchTrending(); }}
              className={cn(
                "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                activeTab === "trending" ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              <TrendingUp size={20} />
              <span className="hidden lg:block font-medium">Trending</span>
            </button>
            <button 
              onClick={() => setActiveTab("search")}
              className={cn(
                "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                activeTab === "search" ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              <Search size={20} />
              <span className="hidden lg:block font-medium">Search</span>
            </button>
            <button 
              onClick={() => setActiveTab("library")}
              className={cn(
                "flex items-center gap-4 p-3 rounded-xl transition-all duration-200",
                activeTab === "library" ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
              )}
            >
              <Library size={20} />
              <span className="hidden lg:block font-medium">Library</span>
            </button>
          </nav>
        </aside>

        {/* Main View */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header / Search */}
          <header className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col gap-3 w-full max-w-xl">
              <form onSubmit={handleSearch} className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input 
                  type="text"
                  placeholder={`Search on ${searchSource === "saavn" ? "JioSaavn" : searchSource === "youtube" ? "YouTube" : "YouTube Music"}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 transition-all placeholder:text-white/20"
                />
              </form>
              <div className="flex items-center gap-2 px-1">
                <button 
                  onClick={() => setSearchSource("saavn")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    searchSource === "saavn" ? "bg-[var(--color-accent)] text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  JioSaavn
                </button>
                <button 
                  onClick={() => setSearchSource("youtube")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    searchSource === "youtube" ? "bg-[var(--color-accent)] text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  YouTube
                </button>
                <button 
                  onClick={() => setSearchSource("youtube-music")}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-medium transition-all",
                    searchSource === "youtube-music" ? "bg-[var(--color-accent)] text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  YouTube Music
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                <img src="https://picsum.photos/seed/user/100/100" alt="Avatar" referrerPolicy="no-referrer" />
              </div>
            </div>
          </header>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 no-scrollbar pb-32">
            <div className="max-w-6xl mx-auto">
              <header className="mb-8">
                <h2 className="text-4xl font-serif italic font-bold mb-2">
                  {activeTab === "trending" ? "Trending Now" : activeTab === "search" ? "Search Results" : "Your Library"}
                </h2>
                <p className="text-white/50">Discover the latest hits and your favorite tracks.</p>
              </header>

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square bg-white/5 rounded-2xl mb-3" />
                      <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  <AnimatePresence mode="popLayout">
                    {songs.map((song) => (
                      <motion.div
                        key={song.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        whileHover={{ y: -5 }}
                        className="group relative"
                      >
                        <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-2xl">
                          <img 
                            src={getHighQualityImage(song)} 
                            alt={song.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                            <button 
                              onClick={() => playSong(song)}
                              className="w-12 h-12 bg-[var(--color-accent)] rounded-full flex items-center justify-center text-white shadow-xl hover:scale-110 transition-transform"
                            >
                              <Play fill="currentColor" size={20} />
                            </button>
                            <button 
                              onClick={() => handleDownload(song)}
                              className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                            >
                              <Download size={18} />
                            </button>
                          </div>
                        </div>
                        <h3 className="font-medium truncate text-white/90 group-hover:text-[var(--color-accent)] transition-colors">{song.name}</h3>
                        <p className="text-sm text-white/40 truncate">{song.primaryArtists}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Player Bar */}
      <AnimatePresence>
        {currentSong && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50 transition-all duration-500",
              isPlayerExpanded ? "h-screen" : "h-24"
            )}
          >
            <div className={cn(
              "h-full glass border-t border-white/10 flex flex-col",
              isPlayerExpanded ? "p-8" : "px-6"
            )}>
              {isPlayerExpanded ? (
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
                  <div className="flex justify-between items-center mb-8">
                    <button onClick={() => setIsPlayerExpanded(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <Minimize2 size={24} />
                    </button>
                    <span className="font-serif italic text-xl">Now Playing</span>
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <MoreHorizontal size={24} />
                    </button>
                  </div>

                  <div className="flex-1 flex flex-col md:flex-row items-center gap-12 py-8">
                    <motion.div 
                      layoutId="player-art"
                      className="w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(255,78,0,0.3)]"
                    >
                      <img 
                        src={getHighQualityImage(currentSong)} 
                        alt={currentSong.name} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </motion.div>

                    <div className="flex-1 flex flex-col justify-center text-center md:text-left">
                      <motion.h2 layoutId="player-title" className="text-5xl font-serif font-bold mb-4">{currentSong.name}</motion.h2>
                      <motion.p layoutId="player-artist" className="text-2xl text-white/50 mb-8">{currentSong.primaryArtists}</motion.p>
                      
                      <div className="flex items-center justify-center md:justify-start gap-8 mb-12">
                        <button className="text-white/40 hover:text-white transition-colors"><Heart size={28} /></button>
                        <button onClick={() => handleDownload(currentSong)} className="text-white/40 hover:text-white transition-colors"><Download size={28} /></button>
                      </div>

                      {/* Expanded Controls */}
                      <div className="space-y-6">
                        <div className="space-y-2">
                          <div className="relative h-1.5 bg-white/10 rounded-full overflow-hidden cursor-pointer">
                            <div 
                              className="absolute h-full bg-[var(--color-accent)]" 
                              style={{ width: `${(progress / duration) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-white/40 font-mono">
                            <span>{formatDuration(progress)}</span>
                            <span>{formatDuration(duration)}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-center gap-10">
                          <button className="text-white/40 hover:text-white"><SkipBack size={32} /></button>
                          <button 
                            onClick={togglePlay}
                            className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            {isPlaying ? <Pause fill="currentColor" size={32} /> : <Play fill="currentColor" size={32} className="ml-1" />}
                          </button>
                          <button className="text-white/40 hover:text-white"><SkipForward size={32} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between h-full">
                  <div className="flex items-center gap-4 w-1/3">
                    <motion.div 
                      layoutId="player-art"
                      onClick={() => setIsPlayerExpanded(true)}
                      className="w-14 h-14 rounded-xl overflow-hidden cursor-pointer shadow-lg"
                    >
                      <img src={getHighQualityImage(currentSong)} alt={currentSong.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </motion.div>
                    <div className="flex flex-col min-w-0">
                      <motion.h4 layoutId="player-title" className="font-medium truncate text-white/90">{currentSong.name}</motion.h4>
                      <motion.p layoutId="player-artist" className="text-xs text-white/40 truncate">{currentSong.primaryArtists}</motion.p>
                    </div>
                    <button className="ml-2 text-white/30 hover:text-white transition-colors"><Heart size={18} /></button>
                  </div>

                  <div className="flex flex-col items-center gap-2 w-1/3">
                    <div className="flex items-center gap-6">
                      <button className="text-white/40 hover:text-white transition-colors"><SkipBack size={20} /></button>
                      <button 
                        onClick={togglePlay}
                        className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                      >
                        {isPlaying ? <Pause fill="currentColor" size={20} /> : <Play fill="currentColor" size={20} className="ml-0.5" />}
                      </button>
                      <button className="text-white/40 hover:text-white transition-colors"><SkipForward size={20} /></button>
                    </div>
                    <div className="w-full max-w-md flex items-center gap-3">
                      <span className="text-[10px] text-white/30 font-mono w-8 text-right">{formatDuration(progress)}</span>
                      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-[var(--color-accent)]" 
                          style={{ width: `${(progress / duration) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/30 font-mono w-8">{formatDuration(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-6 w-1/3">
                    <div className="flex items-center gap-2">
                      <Volume2 size={18} className="text-white/40" />
                      <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-white/60" style={{ width: `${volume * 100}%` }} />
                      </div>
                    </div>
                    <button onClick={() => setIsPlayerExpanded(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <Maximize2 size={18} className="text-white/40" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Player */}
      {currentSong && (
        <div className="hidden">
          <Player
            ref={playerRef}
            url={getHighQualityDownload(currentSong) || ""}
            playing={isPlaying}
            volume={volume}
            onProgress={handleProgress}
            onDuration={handleDuration}
            onEnded={() => setIsPlaying(false)}
          />
        </div>
      )}
    </div>
  );
}
