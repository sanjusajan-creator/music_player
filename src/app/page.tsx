"use client";

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSaavnSearch, useTrending, useMusicHome, useArtistSearch, useAlbumSearch, usePlaylistSearch } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { SettingsView } from '@/components/settings/SettingsView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Loader2, LayoutGrid, List } from 'lucide-react';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { usePlayerStore, LayoutMode } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

const LAYOUT_TOGGLE_TABS = new Set(['home', 'search', 'liked', 'local', 'artist', 'album', 'playlist']);

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={<div className="h-screen w-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
        <HomeContent />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const searchParams = useSearchParams();
  const hasHydrated = usePlayerStore((state) => state.hasHydrated);
  const layoutMode = usePlayerStore((state) => state.settings.layoutMode);
  const updateSettings = usePlayerStore((state) => state.updateSettings);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const currentTab = searchParams.get('tab') || 'home';
  const searchQuery = searchParams.get('q') || '';
  const shouldShowLayoutToggle = LAYOUT_TOGGLE_TABS.has(currentTab);

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

  const toggleLayout = () => {
    updateSettings({ layoutMode: layoutMode === 'grid' ? 'list' : 'grid' });
  };

  if (isUserLoading || !hasHydrated) return <div className="h-screen w-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

  if (!user) return (
    <main className="min-h-screen w-screen bg-black flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-md space-y-12">
        <h1 className="text-6xl font-black text-primary gold-glow tracking-tighter uppercase">VIBECRAFT</h1>
        <form onSubmit={handleAuth} className="bg-white/5 border border-primary/20 p-8 rounded-[2rem] space-y-6">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black border-primary/20 h-14 rounded-xl text-primary font-black" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-black border-primary/20 h-14 rounded-xl text-primary font-black" />
          <Button type="submit" disabled={isAuthLoading} className="w-full bg-primary text-black font-black h-14 rounded-xl text-lg uppercase tracking-widest">
            {isAuthLoading ? <Loader2 className="animate-spin" /> : (isLogin ? "Enter Sanctuary" : "Create Archive")}
          </Button>
          <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:text-white text-[10px] uppercase font-black tracking-widest transition-colors w-full">
            {isLogin ? "Need a new archive? Sign up" : "Already registered? Log in"}
          </button>
        </form>
      </div>
    </main>
  );

  return (
    <div className="flex h-screen w-screen bg-black overflow-hidden relative text-primary">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-black relative h-full">
        <Navbar />
        <YouTubePlayer />
        
        <ScrollArea className="flex-1 h-full w-full">
          <div className="p-4 md:p-8 max-w-7xl mx-auto pb-44 md:pb-32">
            <AnimatePresence mode="wait">
              {shouldShowLayoutToggle && (
                <div className="flex justify-end mb-6 px-2">
                  <Button variant="ghost" size="sm" onClick={toggleLayout} className="bg-primary/5 hover:bg-primary/20 text-primary border border-primary/10 rounded-full gap-2 px-4 h-10">
                    {layoutMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                    <span className="text-[10px] font-black uppercase tracking-widest">Switch View</span>
                  </Button>
                </div>
              )}

              <motion.div 
                key={currentTab + searchQuery} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                transition={{ duration: 0.2 }}
              >
                {currentTab === 'home' && <HomeView layoutMode={layoutMode} />}
                {currentTab === 'search' && <SearchResultsView query={searchQuery} layoutMode={layoutMode} />}
                {currentTab === 'settings' && <SettingsView />}
                {currentTab === 'liked' && <LikedView layoutMode={layoutMode} />}
                {currentTab === 'local' && <LocalView layoutMode={layoutMode} />}
                {currentTab === 'artist' && <ArtistView layoutMode={layoutMode} />}
                {currentTab === 'album' && <AlbumView layoutMode={layoutMode} />}
                {currentTab === 'playlist' && <PlaylistView layoutMode={layoutMode} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
        <Player />
        <MobileNav />
      </main>
    </div>
  );
}

function HomeView({ layoutMode }: { layoutMode: LayoutMode }) {
  const { data: trending, isLoading: trendingLoading } = useTrending();
  const { data: homeData, isLoading: homeLoading } = useMusicHome();

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-3xl font-black text-primary mb-8 gold-glow uppercase tracking-tighter">Manifesting Trending</h2>
        <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
          {trendingLoading ? [...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-2xl" />) :
            (trending || []).map((track: any, i: number) => <SearchResult key={track.id} track={track} results={trending} index={i} />)
          }
        </div>
      </section>

      {homeLoading ? (
        <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
      ) : (
        homeData?.map((sec: any, i: number) => (
          <section key={i}>
            <h3 className="text-xl font-black text-primary/60 mb-6 uppercase tracking-widest gold-glow">{sec.title}</h3>
            <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
              {sec.items.map((track: any, j: number) => <SearchResult key={track.id} track={track} results={sec.items} index={j} />)}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function SearchResultsView({ query, layoutMode }: { query: string, layoutMode: LayoutMode }) {
const { data, isLoading } = useSaavnSearch(query);
  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-primary uppercase tracking-tighter gold-glow">Archives for "{query}"</h2>
      <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
        {(data?.results || []).map((track: any, i: number) => <SearchResult key={track.id} track={track} results={data?.results || []} index={i} />)}
      </div>
    </div>
  );
}

function LikedView({ layoutMode }: { layoutMode: LayoutMode }) {
  const { user } = useUser();
  const db = useFirestore();
  
  const likedQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'users', user.uid, 'likedSongs'), orderBy('likedAt', 'desc'));
  }, [user, db]);

  const { data: likedSongs, isLoading: likedLoading } = useCollection(likedQuery);

  if (!user) return <div className="text-center py-20 text-primary/40 uppercase font-black text-sm tracking-widest">Sign in to view your Liked Songs</div>;
  if (likedLoading) return <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  if (!likedSongs || likedSongs.length === 0) return <div className="text-center py-20 text-primary/40 uppercase font-black text-sm tracking-widest">Your liked archive is empty. Fill it with resonance.</div>;

  const tracks = likedSongs.map((doc: any) => ({
    id: doc.id,
    title: doc.title,
    artist: doc.artist,
    thumbnail: doc.thumbnailUrl,
    duration: doc.durationSeconds,
    source: doc.source || 'youtube',
    isYouTube: doc.source !== 'jiosaavn' && doc.source !== 'gaana',
    videoId: doc.id
  }));

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-black text-primary uppercase tracking-tighter gold-glow">Liked Songs</h2>
      <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
        {tracks.map((track, i) => <SearchResult key={track.id} track={track as any} results={tracks} index={i} />)}
      </div>
    </div>
  );
}

function LocalView({ layoutMode }: { layoutMode: LayoutMode }) {
  const localTracks = usePlayerStore(state => state.localTracks);
  const setLocalTracks = usePlayerStore(state => state.setLocalTracks);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    const newTracks = files.map(file => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Device",
      thumbnail: "/default-art.png",
      isLocal: true,
      localFile: file,
      source: 'local' as const
    }));

    setLocalTracks([...localTracks, ...newTracks] as any);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-primary uppercase tracking-tighter gold-glow">Local Archives</h2>
        <div className="relative">
          <Input 
            type="file" 
            accept="audio/mpeg, audio/flac, audio/wav, audio/ogg" 
            multiple 
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
          />
          <Button className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/30 w-full md:w-auto h-12 uppercase font-black tracking-widest text-[10px]">
            Import Local Tracks
          </Button>
        </div>
      </div>
      
      {localTracks.length === 0 ? (
         <div className="text-center py-20 text-primary/40 uppercase font-black text-sm tracking-widest flex flex-col items-center gap-4">
            <span className="text-4xl opacity-20">📁</span>
            Import local resonance from your device
         </div>
      ) : (
        <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
          {localTracks.map((track, i) => <SearchResult key={track.id} track={track} results={localTracks} index={i} />)}
        </div>
      )}
    </div>
  );
}

function ArtistView({ layoutMode }: { layoutMode: LayoutMode }) {
  const searchParams = useSearchParams();
  const artistId = searchParams.get('id') || '';
  const { data, isLoading } = useArtistSearch(artistId);
  
  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  if (!data) return <div className="text-center py-20 text-primary/40 uppercase font-black text-sm tracking-widest">Artist not found</div>;
  
  const tracks = data.tracks || [];
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <img src={data.thumbnail} alt={data.name} className="w-24 h-24 rounded-full object-cover shadow-lg" />
        <div>
          <p className="text-xs font-black uppercase text-primary/60 tracking-widest">Artist</p>
          <h2 className="text-3xl font-black text-primary gold-glow uppercase tracking-tighter">{data.name}</h2>
          <p className="text-xs font-black text-primary/40 uppercase tracking-widest">{tracks.length} tracks</p>
        </div>
      </div>
      <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
        {tracks.map((track: any, i: number) => <SearchResult key={track.id} track={track} results={tracks} index={i} />)}
      </div>
    </div>
  );
}

function AlbumView({ layoutMode }: { layoutMode: LayoutMode }) {
  const searchParams = useSearchParams();
  const albumId = searchParams.get('id') || '';
  const { data, isLoading } = useAlbumSearch(albumId);
  
  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  if (!data) return <div className="text-center py-20 text-primary/40 uppercase font-black text-sm tracking-widest">Album not found</div>;
  
  const tracks = data.tracks || [];
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <img src={data.thumbnail} alt={data.title} className="w-32 h-32 rounded-lg object-cover shadow-lg" />
        <div>
          <p className="text-xs font-black uppercase text-primary/60 tracking-widest">Album</p>
          <h2 className="text-3xl font-black text-primary gold-glow uppercase tracking-tighter">{data.title}</h2>
          <p className="text-xs font-black text-primary/40 uppercase tracking-widest">{data.artist}</p>
        </div>
      </div>
      <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
        {tracks.map((track: any, i: number) => <SearchResult key={track.id} track={track} results={tracks} index={i} />)}
      </div>
    </div>
  );
}

function PlaylistView({ layoutMode }: { layoutMode: LayoutMode }) {
  const searchParams = useSearchParams();
  const playlistId = searchParams.get('id') || '';
  const { data, isLoading } = usePlaylistSearch(playlistId);
  
  if (isLoading) return <div className="h-96 flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  if (!data) return <div className="text-center py-20 text-primary/40 uppercase font-black text-sm tracking-widest">Playlist not found</div>;
  
  const tracks = data.tracks || [];
  
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <img src={data.thumbnail} alt={data.title} className="w-32 h-32 rounded-lg object-cover shadow-lg" />
        <div>
          <p className="text-xs font-black uppercase text-primary/60 tracking-widest">Playlist</p>
          <h2 className="text-3xl font-black text-primary gold-glow uppercase tracking-tighter">{data.title}</h2>
          <p className="text-xs font-black text-primary/40 uppercase tracking-widest">{tracks.length} tracks</p>
        </div>
      </div>
      <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
        {tracks.map((track: any, i: number) => <SearchResult key={track.id} track={track} results={tracks} index={i} />)}
      </div>
    </div>
  );
}


