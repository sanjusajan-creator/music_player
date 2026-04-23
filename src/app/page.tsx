"use client";

import React, { Suspense, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useYouTubeSearch } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, Sparkles, LogIn, Heart, 
  Loader2, Mail, Lock, UserPlus, History, X, FolderOpen, Music2, Plus
} from 'lucide-react';
import { useUser, useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { getRelatedVideos } from '@/lib/youtube';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
          <p className="text-primary/40 font-black uppercase tracking-[0.3em] text-[10px]">Vibecraft Loading...</p>
        </div>
      }>
        <HomeContent />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}

const ORACLE_SEEDS = [
  'Billboard Hot 100 2025',
  'AMOLED Gold Chill Mix',
  'Cyberpunk Synthwave 2077',
  'Midnight Jazz Sanctuary',
  'High Fidelity Soul Classics',
  'Deep House Manifestation',
  'Acoustic Gold Sessions',
  'Orchestral Cinematic Epic',
  'Underground Techno Vault',
  'Lofi Hip Hop Sanctuary'
];

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setQueue, hasHydrated } = usePlayerStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const searchQuery = searchParams.get('q') || '';

  // Dynamic discovery: Seed changes on every mount
  const randomTrend = useMemo(() => {
    return ORACLE_SEEDS[Math.floor(Math.random() * ORACLE_SEEDS.length)];
  }, []);

  // Initialize Liked Songs as Queue on mount - Non-blocking background fetch
  useEffect(() => {
    if (user && db && hasHydrated) {
      const fetchLikedAsQueue = async () => {
        try {
          const likedRef = collection(db, 'users', user.uid, 'likedSongs');
          const q = query(likedRef, orderBy('likedAt', 'desc'), limit(50));
          const snap = await getDocs(q);
          const tracks = snap.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title,
            artist: doc.data().artist,
            thumbnail: doc.data().thumbnailUrl,
            duration: doc.data().durationSeconds
          }));
          if (tracks.length > 0) {
            setQueue(tracks);
          }
        } catch (e) {
          console.error("Queue initialization failed", e);
        }
      };
      fetchLikedAsQueue();
    }
  }, [user?.uid, db, hasHydrated, setQueue]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Requirements", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    setIsAuthLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      toast({ title: "Welcome", description: "Your sanctuary awaits." });
    } catch (error: any) {
      toast({ title: "Auth Error", description: error.message || "Authentication failed.", variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const clearSearch = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  if (isUserLoading) {
    return (
      <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="text-primary/40 font-black uppercase tracking-[0.3em] text-[10px]">Verifying Identity...</p>
      </div>
    );
  }

  if (!isUserLoading && (!user || !user.email)) {
    return (
      <main className="min-h-[100dvh] w-screen bg-black flex flex-col items-center justify-center p-4 md:p-12 text-center gradient-bg overflow-y-auto no-scrollbar relative">
        <div className="w-full max-w-lg space-y-8 animate-in fade-in zoom-in duration-500 z-10 py-12 flex flex-col justify-center min-h-[60vh]">
          <header className="mb-10">
            <h1 className="text-5xl md:text-8xl font-black text-primary gold-glow mb-4 tracking-tighter uppercase leading-none">VIBECRAFT</h1>
            <p className="text-primary/40 uppercase tracking-[0.5em] text-[10px] md:text-xs font-black">High-Fidelity Sanctuary</p>
          </header>

          <form onSubmit={handleAuth} className="bg-white/5 border border-primary/20 p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-2xl space-y-8 backdrop-blur-xl w-full">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/60 border-primary/20 pl-14 h-14 md:h-16 rounded-xl md:rounded-2xl focus-visible:ring-primary text-primary font-black placeholder:text-primary/20"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/60 border-primary/20 pl-14 h-14 md:h-16 rounded-xl md:rounded-2xl focus-visible:ring-primary text-primary font-black placeholder:text-primary/20"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isAuthLoading}
              className="w-full bg-primary text-black font-black h-14 md:h-16 rounded-xl md:rounded-2xl text-lg md:text-xl hover:bg-white transition-all shadow-[0_0_40px_rgba(212,175,55,0.3)] uppercase tracking-[0.2em]"
            >
              {isAuthLoading ? <Loader2 className="animate-spin" /> : (
                isLogin ? <><LogIn className="mr-3 w-5 h-5" /> Enter Sanctuary</> : <><UserPlus className="mr-3 w-5 h-5" /> Create Archive</>
              )}
            </Button>

            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary/40 hover:text-primary text-[10px] md:text-xs uppercase font-black tracking-[0.4em] transition-colors w-full"
            >
              {isLogin ? "Need a new archive? Sign up" : "Already registered? Log in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-black overflow-hidden relative">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-black relative overflow-hidden h-full">
        <Navbar />
        
        <YouTubePlayer />

        <div className="flex-1 overflow-y-auto no-scrollbar pt-20 md:pt-32 pb-40 gradient-bg h-full">
          <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
            <header className="mb-12 flex flex-col gap-6">
              <div className="min-w-0 flex-1">
                <h2 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-black text-primary gold-glow tracking-tighter mb-4 truncate leading-none uppercase">
                  {searchQuery ? "Archives" : `Welcome, `}
                  <span className="text-white opacity-80">{searchQuery ? ` Found` : (user?.email?.split('@')[0] || 'User')}</span>
                </h2>
                <div className="flex items-center gap-6">
                  <p className="text-primary/40 text-[10px] md:text-xs font-black uppercase tracking-[0.4em]">
                    {searchQuery ? `Matching search for: "${searchQuery}"` : "The Oracle is watching."}
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={clearSearch}
                      className="h-8 px-4 text-primary hover:bg-primary/10 border border-primary/20 rounded-full text-[10px] uppercase font-black tracking-widest shrink-0"
                    >
                      <X className="w-3 h-3 mr-2" /> Clear
                    </Button>
                  )}
                </div>
              </div>
            </header>

            <div className="mt-4">
              {searchQuery ? (
                <SearchResultsView query={searchQuery} />
              ) : (
                <DashboardTabs userId={user!.uid} randomSeed={randomTrend} />
              )}
            </div>
          </div>
        </div>
        <Player />
      </main>
    </div>
  );
}

function SearchResultsView({ query }: { query: string }) {
  const { data: results, isLoading } = useYouTubeSearch(query);

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
      {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-[2rem]" />)}
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
      {results?.map((track) => (
        <SearchResult key={track.id} track={track} />
      ))}
      {(!results || results.length === 0) && (
        <div className="col-span-full text-center py-32 border-2 border-dashed border-primary/10 rounded-[4rem] bg-primary/5">
           <p className="text-primary/40 font-black uppercase tracking-[0.4em] text-[10px]">No archives found in the cosmic void.</p>
        </div>
      )}
    </div>
  );
}

function DashboardTabs({ userId, randomSeed }: { userId: string, randomSeed: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'trending';
  const history = usePlayerStore(s => s.history);
  const currentTrack = usePlayerStore(s => s.currentTrack);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    if (currentTrack) {
      getRelatedVideos(currentTrack.id).then(setRecommendations);
    }
  }, [currentTrack]);
  
  const { data: trendingResults, isLoading: isTrendingLoading } = useYouTubeSearch(activeTab === 'trending' ? randomSeed : '');

  const handleTabChange = useCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    params.delete('q'); 
    router.push(`/?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="w-full overflow-x-auto no-scrollbar mb-12 flex">
        <TabsList className="bg-white/5 border border-primary/10 p-1.5 rounded-full h-14 flex items-center shrink-0 w-max min-w-0 flex-nowrap">
          <TabsTrigger value="trending" className="rounded-full px-4 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-2 md:gap-3 shrink-0">
            <TrendingUp className="w-4 h-4" /> Trending
          </TabsTrigger>
          <TabsTrigger value="for-you" className="rounded-full px-4 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-2 md:gap-3 shrink-0">
            <Sparkles className="w-4 h-4" /> For You
          </TabsTrigger>
          <TabsTrigger value="local" className="rounded-full px-4 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-2 md:gap-3 shrink-0">
            <FolderOpen className="w-4 h-4" /> Local
          </TabsTrigger>
          <TabsTrigger value="liked" className="rounded-full px-4 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-2 md:gap-3 shrink-0">
            <Heart className="w-4 h-4" /> Liked
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-4 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-2 md:gap-3 shrink-0">
            <History className="w-4 h-4" /> History
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="focus-visible:ring-0">
        <TabsContent value="trending" className="m-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
            {isTrendingLoading ? (
              [...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-[2rem]" />)
            ) : (
              trendingResults?.map((track) => (
                <SearchResult key={track.id} track={track} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="for-you" className="m-0">
          {recommendations.length > 0 ? (
            <div className="space-y-16">
              <section>
                <h3 className="text-xl font-black gold-glow mb-8 uppercase tracking-[0.5em] text-primary">Discovery Mix</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-10">
                  {recommendations.map(t => <SearchResult key={t.id} track={t} />)}
                </div>
              </section>
            </div>
          ) : (
            <div className="text-center py-32 border-2 border-dashed border-primary/10 rounded-[4rem] bg-primary/5">
              <Sparkles className="w-16 h-16 text-primary/20 mx-auto mb-8" />
              <p className="text-primary/40 font-black text-[10px] uppercase tracking-[0.5em]">Initiate playback to unlock discovery.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="local" className="m-0">
          <LocalArchivesView />
        </TabsContent>

        <TabsContent value="liked" className="m-0">
          <LikedSongsList userId={userId} />
        </TabsContent>

        <TabsContent value="history" className="m-0">
          {history.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-10">
              {history.map(t => <SearchResult key={t.id} track={t} />)}
            </div>
          ) : (
            <div className="text-center py-32 border-2 border-dashed border-primary/10 rounded-[4rem] bg-primary/5">
              <History className="w-16 h-16 text-primary/20 mx-auto mb-8" />
              <p className="text-primary/40 font-black text-[10px] uppercase tracking-[0.5em]">No history remains in the sanctuary.</p>
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}

function LocalArchivesView() {
  const { localTracks, setLocalTracks } = usePlayerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modern Folder Access API
  const handleSummonArchives = async () => {
    try {
      // Check for Folder Access API support (Chrome/Edge)
      if ('showDirectoryPicker' in window) {
        const directoryHandle = await (window as any).showDirectoryPicker();
        const newTracks: Track[] = [];
        
        const recursiveScan = async (handle: any) => {
          for await (const entry of handle.values()) {
            if (entry.kind === 'file') {
              const file = await entry.getFile();
              if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
                newTracks.push({
                  id: `local-${Math.random().toString(36).substr(2, 9)}`,
                  title: file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " "),
                  artist: "Local Archive",
                  thumbnail: "https://picsum.photos/seed/local/400/400",
                  isLocal: true,
                  localFile: file
                });
              }
            } else if (entry.kind === 'directory') {
              await recursiveScan(entry);
            }
          }
        };

        await recursiveScan(directoryHandle);
        
        if (newTracks.length > 0) {
          setLocalTracks([...localTracks, ...newTracks]);
          toast({ 
            title: "Archives Summoned", 
            description: `Manifested ${newTracks.length} local archives.` 
          });
        }
      } else {
        // Fallback to traditional input
        fileInputRef.current?.click();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("Local Summoning Failed", err);
        toast({ variant: "destructive", title: "Access Denied", description: "The Oracle could not reach your system files." });
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newTracks: Track[] = Array.from(files)
      .filter(file => file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|ogg)$/i))
      .map(file => {
        const title = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        return {
          id: `local-${Math.random().toString(36).substr(2, 9)}`,
          title: title,
          artist: "Local Archive",
          thumbnail: "https://picsum.photos/seed/local/400/400",
          isLocal: true,
          localFile: file
        };
      });

    if (newTracks.length > 0) {
      setLocalTracks([...localTracks, ...newTracks]);
      toast({ 
        title: "Archives Summoned", 
        description: `${newTracks.length} tracks added to your local collection.` 
      });
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-primary gold-glow uppercase tracking-tighter">Local Sanctuary</h3>
          <p className="text-[10px] text-primary/40 font-black uppercase tracking-[0.3em]">Manifest your system's audio archives</p>
        </div>
        <Button 
          onClick={handleSummonArchives}
          className="bg-primary text-black font-black rounded-full px-8 h-12 uppercase tracking-widest hover:bg-white transition-all shadow-lg w-full md:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Summon Folder
        </Button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          multiple 
          accept="audio/*" 
          onChange={handleFileSelect} 
        />
      </div>

      {localTracks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
          {localTracks.map((track) => (
            <SearchResult key={track.id} track={track} />
          ))}
        </div>
      ) : (
        <div 
          className="text-center py-40 border-2 border-dashed border-primary/10 rounded-[4rem] bg-primary/5 cursor-pointer group hover:bg-primary/10 transition-all"
          onClick={handleSummonArchives}
        >
          <Music2 className="w-16 h-16 text-primary/20 mx-auto mb-8 group-hover:scale-110 transition-transform" />
          <p className="text-primary/40 font-black text-[10px] uppercase tracking-[0.5em] px-6">The local archive is silent. Click to summon your music folder.</p>
        </div>
      )}
    </div>
  );
}

function LikedSongsList({ userId }: { userId: string }) {
  const db = useFirestore();
  const q = useMemoFirebase(() => {
    if (!userId || !db) return null;
    return query(
      collection(db, 'users', userId, 'likedSongs'),
      orderBy('likedAt', 'desc'),
      limit(50)
    );
  }, [userId, db]);

  const { data: likedDocs, isLoading } = useCollection(q);

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 md:gap-10">
      {[...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-[2rem]" />)}
    </div>
  );

  if (!likedDocs || likedDocs.length === 0) {
    return (
      <div className="text-center py-32 border-2 border-dashed border-primary/10 rounded-[4rem] bg-primary/5">
        <Heart className="w-16 h-16 text-primary/20 mx-auto mb-8" />
        <p className="text-primary/40 font-black text-[10px] uppercase tracking-[0.5em]">Your gold collection is empty.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
      {likedDocs.map((doc: any) => (
        <SearchResult key={doc.id} track={{
          id: doc.id,
          title: doc.title || "Unknown Title",
          artist: doc.artist || "Unknown Artist",
          thumbnail: doc.thumbnailUrl || "https://picsum.photos/seed/music/400/400",
          duration: doc.durationSeconds || 0
        }} />
      ))}
    </div>
  );
}
