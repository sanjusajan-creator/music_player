"use client";

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSaavnSearch, useSaavnDetails } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { 
  TrendingUp, Sparkles, Heart, 
  Loader2, FolderOpen, History, Music2, Plus, Play, Disc, User, ListMusic
} from 'lucide-react';
import { useUser, useAuth, useMemoFirebase, useFirestore, useCollection } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { usePlayerStore, Track } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 15,
    },
  },
});

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
          <p className="text-primary/40 font-black uppercase tracking-[0.3em] text-[10px]">Manifesting Sanctuary...</p>
        </div>
      }>
        <HomeContent />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const db = useFirestore();
  const searchParams = useSearchParams();
  const { setLikedTracks, hasHydrated } = usePlayerStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const currentTab = searchParams.get('tab') || 'home';
  const searchQuery = searchParams.get('q') || '';
  const detailType = searchParams.get('type') as any;
  const detailId = searchParams.get('id');

  useEffect(() => {
    if (user && db && hasHydrated) {
      const syncLiked = async () => {
        try {
          const likedRef = collection(db, 'users', user.uid, 'likedSongs');
          const snap = await getDocs(query(likedRef, limit(100)));
          setLikedTracks(snap.docs.map(doc => doc.id));
        } catch (e) {}
      };
      syncLiked();
    }
  }, [user?.uid, db, hasHydrated, setLikedTracks]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsAuthLoading(true);
    try {
      if (isLogin) await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      toast({ title: "Auth Error", description: error.message, variant: "destructive" });
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (isUserLoading) return (
    <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
    </div>
  );

  if (!user) return (
    <main className="min-h-[100dvh] w-screen bg-black flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      <div className="w-full max-w-md space-y-12 animate-in fade-in zoom-in duration-700">
        <header>
          <h1 className="text-6xl font-black text-primary gold-glow tracking-tighter uppercase leading-none">VIBECRAFT</h1>
          <p className="text-primary/40 uppercase tracking-[0.5em] text-[10px] font-black mt-4">Premium Gold Sanctuary</p>
        </header>

        <form onSubmit={handleAuth} className="bg-white/5 border border-primary/20 p-8 rounded-[2rem] space-y-6 backdrop-blur-xl shadow-2xl">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black/60 border-primary/20 h-14 rounded-xl text-primary font-black placeholder:text-primary/20" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-black/60 border-primary/20 h-14 rounded-xl text-primary font-black placeholder:text-primary/20" />
          <Button type="submit" disabled={isAuthLoading} className="w-full bg-primary text-black font-black h-14 rounded-xl text-lg hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)] uppercase tracking-widest">
            {isAuthLoading ? <Loader2 className="animate-spin" /> : (isLogin ? "Enter Sanctuary" : "Create Archive")}
          </Button>
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary/40 hover:text-primary text-[10px] uppercase font-black tracking-widest transition-colors w-full">
            {isLogin ? "Need a new archive? Sign up" : "Already registered? Log in"}
          </button>
        </form>
      </div>
    </main>
  );

  return (
    <div className="flex h-[100dvh] w-screen bg-black overflow-hidden select-none">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-black relative">
        <Navbar />
        <YouTubePlayer />
        
        <ScrollArea className="flex-1">
          <div className="p-6 md:p-8 max-w-7xl mx-auto pb-32">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTab + searchQuery + detailId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {currentTab === 'home' && <HomeView />}
                {currentTab === 'search' && <SearchResultsView query={searchQuery} />}
                {currentTab === 'liked' && <LikedSongsView userId={user.uid} />}
                {currentTab === 'local' && <LocalArchivesView />}
                {currentTab === 'detail' && detailType && detailId && <DetailView type={detailType} id={detailId} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
        <Player />
      </main>
    </div>
  );
}

function HomeView() {
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-3xl font-black text-white mb-6 gold-glow">{greeting}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <GreetingCard label="Gold Hits" icon={<TrendingUp className="text-primary" />} />
          <GreetingCard label="Liked Songs" icon={<Heart className="text-pink-500 fill-current" />} />
          <GreetingCard label="Magic Mix" icon={<Sparkles className="text-blue-400" />} />
          <GreetingCard label="Local Vault" icon={<FolderOpen className="text-orange-400" />} />
          <GreetingCard label="History" icon={<History className="text-green-400" />} />
        </div>
      </section>

      <SectionLayout title="Fresh Manifestations" query="Latest Hits" />
      <SectionLayout title="Gold Trending" query="Trending Music" />
      <SectionLayout title="Melodic Sanctuaries" query="Relaxing Music" />
    </div>
  );
}

function SectionLayout({ title, query }: { title: string, query: string }) {
  const { data, isLoading } = useSaavnSearch(query);
  const songs = data?.songs?.results || [];
  
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-black text-white hover:text-primary cursor-pointer transition-all uppercase tracking-tighter">{title}</h3>
        <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white">Show all</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {isLoading ? [...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />) :
          songs.slice(0, 5).map((track: any) => (
            <SearchResult key={track.id} track={{
              id: track.id,
              title: track.title,
              artist: track.primaryArtists,
              thumbnail: track.image?.[2]?.url || track.image?.[1]?.url,
              album: track.album,
              isSaavn: true
            }} />
          ))
        }
      </div>
    </section>
  );
}

function SearchResultsView({ query }: { query: string }) {
  const { data: results, isLoading } = useSaavnSearch(query);
  
  if (isLoading) return (
    <div className="space-y-12">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="h-8 w-48 bg-white/5 animate-pulse rounded-md" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, j) => <div key={j} className="aspect-square bg-white/5 animate-pulse rounded-xl" />)}
          </div>
        </div>
      ))}
    </div>
  );

  if (!results) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4 text-muted-foreground">
      <Music2 className="w-16 h-16 opacity-20" />
      <p className="text-[10px] font-black uppercase tracking-widest">Search the archives for gold</p>
    </div>
  );

  return (
    <div className="space-y-12">
      {results.songs?.results?.length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter gold-glow">Top Songs</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {results.songs.results.map((t: any) => (
              <SearchResult key={t.id} track={{
                id: t.id,
                title: t.title,
                artist: t.primaryArtists,
                thumbnail: t.image?.[2]?.url,
                album: t.album,
                isSaavn: true
              }} />
            ))}
          </div>
        </section>
      )}

      {results.albums?.results?.length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter gold-glow">Albums</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {results.albums.results.map((a: any) => (
              <CategoryCard key={a.id} label={a.title} image={a.image?.[2]?.url} type="albums" id={a.id} subtitle={a.artist} />
            ))}
          </div>
        </section>
      )}

      {results.artists?.results?.length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter gold-glow">Artists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {results.artists.results.map((ar: any) => (
              <CategoryCard key={ar.id} label={ar.title} image={ar.image?.[2]?.url} type="artists" id={ar.id} isCircle />
            ))}
          </div>
        </section>
      )}

      {results.playlists?.results?.length > 0 && (
        <section>
          <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tighter gold-glow">Playlists</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {results.playlists.results.map((p: any) => (
              <CategoryCard key={p.id} label={p.title} image={p.image?.[2]?.url} type="playlists" id={p.id} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DetailView({ type, id }: { type: 'albums' | 'playlists' | 'artists', id: string }) {
  const { data, isLoading } = useSaavnDetails(type, id);
  const { setQueue } = usePlayerStore();

  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  if (!data) return null;

  const songs = data.songs || data.topSongs || [];
  const handlePlayAll = () => {
    const queue = songs.map((s: any) => ({
      id: s.id,
      title: s.title || s.name,
      artist: s.primaryArtists || s.artists?.primary?.[0]?.name || data.title,
      thumbnail: s.image?.[2]?.url || data.image?.[2]?.url,
      album: data.title || data.name,
      isSaavn: true
    }));
    setQueue(queue);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row items-end gap-8 bg-gradient-to-b from-primary/20 to-transparent p-8 rounded-[3rem] border border-primary/5">
        <img src={data.image?.[2]?.url} className={cn("w-64 h-64 shadow-2xl object-cover gold-border-glow", type === 'artists' ? "rounded-full" : "rounded-2xl")} alt="cover" />
        <div className="space-y-4 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">{type.slice(0, -1)}</p>
          <h1 className="text-5xl md:text-8xl font-black text-white gold-glow tracking-tighter leading-none">{data.title || data.name}</h1>
          <div className="flex items-center gap-6 mt-4">
             <Button onClick={handlePlayAll} className="bg-primary text-black font-black uppercase tracking-widest rounded-full px-10 h-14 hover:scale-105 transition-all shadow-[0_0_30px_rgba(212,175,55,0.3)]"><Play className="w-6 h-6 fill-current mr-2" /> Play All</Button>
             <div className="flex flex-col">
                <span className="text-sm font-black text-white/80">{songs.length} Manifestations</span>
                <span className="text-[10px] uppercase font-black text-muted-foreground">{data.year || data.language || "Public Archive"}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-[32px_1fr_1fr_48px] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-white/5">
          <span>#</span>
          <span>Title</span>
          <span className="hidden md:block">Album</span>
          <span></span>
        </div>
        <div className="flex flex-col gap-1">
          {songs.map((s: any, i: number) => (
            <TrackRow key={s.id} track={{
              id: s.id,
              title: s.title || s.name,
              artist: s.primaryArtists || s.artists?.primary?.[0]?.name || data.title,
              thumbnail: s.image?.[2]?.url || data.image?.[1]?.url,
              album: data.title || data.name,
              isSaavn: true
            }} index={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TrackRow({ track, index }: { track: Track, index: number }) {
  const { setCurrentTrack, currentTrack, isPlaying } = usePlayerStore();
  const isActive = currentTrack?.id === track.id;
  
  return (
    <div 
      onClick={() => setCurrentTrack(track)} 
      className={cn(
        "grid grid-cols-[32px_1fr_1fr_48px] items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-all group cursor-pointer border border-transparent",
        isActive && "bg-white/10 border-primary/20"
      )}
    >
      <div className="flex items-center justify-center">
        {isActive && isPlaying ? (
          <div className="flex items-end gap-0.5 h-3">
             <div className="w-0.5 h-full bg-primary animate-bounce" style={{ animationDelay: '0s' }} />
             <div className="w-0.5 h-2/3 bg-primary animate-bounce" style={{ animationDelay: '0.2s' }} />
             <div className="w-0.5 h-1/2 bg-primary animate-bounce" style={{ animationDelay: '0.4s' }} />
          </div>
        ) : (
          <span className={cn("text-sm font-black text-muted-foreground group-hover:text-primary transition-colors", isActive && "text-primary")}>{index}</span>
        )}
      </div>
      <div className="flex items-center gap-4 min-w-0">
        <img src={track.thumbnail} className="w-10 h-10 rounded shadow-md object-cover shrink-0" alt="t" />
        <div className="flex flex-col min-w-0">
          <p className={cn("text-sm font-black truncate uppercase tracking-tighter", isActive ? "text-primary" : "text-white")}>{track.title}</p>
          <p className="text-[10px] text-muted-foreground font-black truncate uppercase tracking-widest">{track.artist}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground font-black hidden md:block uppercase tracking-widest truncate">{track.album}</p>
      <button className="opacity-0 group-hover:opacity-100 transition-all text-primary flex justify-center"><Play className="w-5 h-5 fill-current" /></button>
    </div>
  );
}

const GreetingCard = ({ label, icon }: { label: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-all rounded-md overflow-hidden cursor-pointer group pr-4 h-20 border border-white/5 shadow-lg">
    <div className="w-20 h-20 bg-white/5 flex items-center justify-center shrink-0 shadow-xl border-r border-white/5">{React.cloneElement(icon as React.ReactElement, { className: 'w-10 h-10' })}</div>
    <span className="text-sm font-black text-white truncate flex-1 uppercase tracking-tighter">{label}</span>
    <button className="w-10 h-10 bg-primary rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hidden md:flex"><Play className="w-6 h-6 text-black fill-current" /></button>
  </div>
);

const CategoryCard = ({ label, image, subtitle, type, id, isCircle }: { label: string, image?: string, subtitle?: string, type: string, id: string, isCircle?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  return (
    <div 
      onClick={() => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'detail');
        params.set('type', type);
        params.set('id', id);
        router.push(`/?${params.toString()}`);
      }}
      className="spotify-card flex flex-col gap-4 group"
    >
      <div className={cn("relative aspect-square overflow-hidden shadow-2xl", isCircle ? "rounded-full" : "rounded-xl")}>
        <img src={image} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="c" />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        {!isCircle && (
          <button className="absolute bottom-3 right-3 w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-2xl translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <Play className="fill-black text-black w-6 h-6 ml-1" />
          </button>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-black text-white truncate uppercase tracking-tighter gold-glow group-hover:text-primary transition-colors">{label}</p>
        {subtitle && <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest truncate">{subtitle}</p>}
      </div>
    </div>
  );
};

function LikedSongsView({ userId }: { userId: string }) {
  const db = useFirestore();
  const q = useMemoFirebase(() => {
    if (!userId || !db) return null;
    return query(collection(db, 'users', userId, 'likedSongs'), orderBy('likedAt', 'desc'), limit(50));
  }, [userId, db]);
  const { data: likedDocs } = useCollection(q);
  return (
    <div className="space-y-10">
      <div className="flex items-end gap-8 bg-gradient-to-b from-indigo-600/30 to-transparent p-8 rounded-[3rem] border border-indigo-500/10">
        <div className="w-64 h-64 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-2xl shadow-2xl flex items-center justify-center gold-border-glow">
          <Heart className="w-32 h-32 text-white fill-current animate-pulse-gold" />
        </div>
        <div className="space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Collection</p>
          <h2 className="text-5xl md:text-8xl font-black text-white gold-glow tracking-tighter leading-none">Liked Songs</h2>
          <p className="text-sm font-black text-white/40 uppercase tracking-widest">{likedDocs?.length || 0} Saved Manifestations</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {likedDocs?.map((doc: any) => (
          <SearchResult key={doc.id} track={{
            id: doc.id,
            title: doc.title,
            artist: doc.artist,
            thumbnail: doc.thumbnailUrl,
            duration: doc.durationSeconds,
            album: "Liked Songs"
          }} />
        ))}
      </div>
    </div>
  );
}

function LocalArchivesView() {
  const { localTracks, setLocalTracks } = usePlayerStore();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSummon = async () => {
    if ('showDirectoryPicker' in window) {
      const handle = await (window as any).showDirectoryPicker();
      const tracks: Track[] = [];
      for await (const entry of handle.values()) {
        if (entry.kind === 'file') {
          const file = await entry.getFile();
          if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|m4a|ogg)$/i)) {
            tracks.push({
              id: `local-${Math.random().toString(36).substr(2, 9)}`,
              title: file.name.replace(/\.[^/.]+$/, ""),
              artist: "Local Archive",
              thumbnail: "https://picsum.photos/seed/local/400/400",
              isLocal: true,
              localFile: file
            });
          }
        }
      }
      setLocalTracks([...localTracks, ...tracks]);
    } else {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex justify-between items-end bg-gradient-to-b from-orange-500/20 to-transparent p-8 rounded-[3rem] border border-orange-500/10">
        <div>
          <h2 className="text-5xl md:text-7xl font-black text-white gold-glow tracking-tighter uppercase leading-none">Local Vault</h2>
          <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mt-4">System archives manifested</p>
        </div>
        <Button onClick={handleSummon} className="bg-orange-500 text-black font-black uppercase tracking-widest rounded-full px-10 h-14 hover:scale-105 transition-all shadow-[0_0_30px_rgba(249,115,22,0.3)]">Summon Folder</Button>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {localTracks.map(t => <SearchResult key={t.id} track={t} />)}
        {localTracks.length === 0 && (
          <div onClick={handleSummon} className="col-span-full py-40 border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/5 transition-all group">
            <FolderOpen className="w-24 h-24 text-muted-foreground/10 group-hover:text-primary/20 transition-colors" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Click to unlock local vault</p>
          </div>
        )}
      </div>
    </div>
  );
}
