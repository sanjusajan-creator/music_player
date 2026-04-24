"use client";

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useYouTubeSearch } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { 
  TrendingUp, Sparkles, LogIn, Heart, 
  Loader2, Mail, Lock, UserPlus, History, FolderOpen, Music2, Plus
} from 'lucide-react';
import { useUser, useAuth, useMemoFirebase, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { query, collection, orderBy, limit, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { usePlayerStore, Track } from '@/store/usePlayerStore';

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

  // Greetings logic
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  // Gold Collection Synchronization
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
          <p className="text-primary/40 uppercase tracking-[0.5em] text-[10px] font-black mt-4">Pure Gold Sanctuary</p>
        </header>

        <form onSubmit={handleAuth} className="bg-white/5 border border-primary/20 p-8 rounded-[2rem] space-y-6 backdrop-blur-xl">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-black/60 border-primary/20 h-14 rounded-xl text-primary font-black" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-black/60 border-primary/20 h-14 rounded-xl text-primary font-black" />
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
        
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-10">
            
            {/* View Transitions */}
            {currentTab === 'home' && (
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

                <SectionLayout title="Recommended for You" query="Top Billboard 2025" />
                <SectionLayout title="Manifest Your Vibe" query="Lofi Hip Hop chill" />
              </div>
            )}

            {currentTab === 'search' && (
              <div className="space-y-10">
                <header>
                  <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Search</h2>
                  <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Manifest from the archives</p>
                </header>
                {searchQuery ? <SearchResultsView query={searchQuery} /> : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                    <CategoryCard label="Pop" color="bg-pink-600" />
                    <CategoryCard label="Hip-Hop" color="bg-orange-600" />
                    <CategoryCard label="Rock" color="bg-red-600" />
                    <CategoryCard label="Jazz" color="bg-blue-600" />
                  </div>
                )}
              </div>
            )}

            {currentTab === 'liked' && (
              <div className="space-y-10">
                 <div className="flex items-end gap-6 bg-gradient-to-b from-primary/20 to-transparent p-8 rounded-[2rem]">
                    <div className="w-48 h-48 bg-gradient-to-br from-indigo-600 to-primary rounded-xl shadow-2xl flex items-center justify-center">
                      <Heart className="w-24 h-24 text-white fill-current" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-white mb-2">Playlist</p>
                      <h2 className="text-6xl md:text-8xl font-black text-white gold-glow tracking-tighter">Liked Songs</h2>
                    </div>
                 </div>
                 <LikedSongsList userId={user.uid} />
              </div>
            )}

            {currentTab === 'local' && (
               <div className="space-y-10"><LocalArchivesView /></div>
            )}

          </div>
        </div>
        <Player />
      </main>
    </div>
  );
}

function SectionLayout({ title, query }: { title: string, query: string }) {
  const { data } = useYouTubeSearch(query);
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-black text-white hover:underline cursor-pointer transition-all">{title}</h3>
        <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-white">Show all</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {data?.slice(0, 5).map(track => <SearchResult key={track.id} track={track} />)}
        {!data && [...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />)}
      </div>
    </section>
  );
}

function SearchResultsView({ query }: { query: string }) {
  const { data: results, isLoading } = useYouTubeSearch(query);
  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />)}
    </div>
  );
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
      {results?.map(track => <SearchResult key={track.id} track={track} />)}
    </div>
  );
}

const GreetingCard = ({ label, icon }: { label: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-4 bg-white/5 hover:bg-white/10 transition-all rounded-md overflow-hidden cursor-pointer group pr-4 h-20 border border-white/5">
    <div className="w-20 h-20 bg-white/5 flex items-center justify-center shrink-0 shadow-xl">{React.cloneElement(icon as React.ReactElement, { className: 'w-10 h-10' })}</div>
    <span className="text-sm font-black text-white truncate flex-1 uppercase tracking-tighter">{label}</span>
    <button className="w-10 h-10 bg-primary rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hidden md:flex"><Plus className="w-6 h-6 text-black" /></button>
  </div>
);

const CategoryCard = ({ label, color }: { label: string, color: string }) => (
  <div className={cn(color, "aspect-square rounded-xl p-4 relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-all")}>
    <span className="text-2xl font-black text-white tracking-tighter uppercase">{label}</span>
    <div className="absolute -bottom-2 -right-4 w-24 h-24 bg-white/20 rotate-12 blur-2xl" />
  </div>
);

function LikedSongsList({ userId }: { userId: string }) {
  const db = useFirestore();
  const q = useMemoFirebase(() => {
    if (!userId || !db) return null;
    return query(collection(db, 'users', userId, 'likedSongs'), orderBy('likedAt', 'desc'), limit(50));
  }, [userId, db]);
  const { data: likedDocs } = useCollection(q);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
      {likedDocs?.map((doc: any) => (
        <SearchResult key={doc.id} track={{
          id: doc.id,
          title: doc.title,
          artist: doc.artist,
          thumbnail: doc.thumbnailUrl,
          duration: doc.durationSeconds
        }} />
      ))}
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
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-white gold-glow">Local Archives</h2>
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">Manifest system archives</p>
        </div>
        <Button onClick={handleSummon} className="bg-primary text-black font-black uppercase tracking-widest rounded-full px-8">Add Folder</Button>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        {localTracks.map(t => <SearchResult key={t.id} track={t} />)}
        {localTracks.length === 0 && (
          <div onClick={handleSummon} className="col-span-full py-40 border-2 border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-all">
            <Music2 className="w-16 h-16 text-muted-foreground/20" />
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Click to summon local folder</p>
          </div>
        )}
      </div>
    </div>
  );
}
