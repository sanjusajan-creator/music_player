"use client";

import React, { Suspense, useState, useEffect } from 'react';
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
  Loader2, Mail, Lock, UserPlus, History, X
} from 'lucide-react';
import { useUser, useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { query, collection, orderBy, limit } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getRelatedVideos } from '@/lib/youtube';

const queryClient = new QueryClient();

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

function HomeContent() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';

  const showLogin = !isUserLoading && (!user || !user.email);

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

  const clearSearch = () => {
    router.push('/');
  };

  if (isUserLoading) {
    return (
      <div className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="text-primary/40 font-black uppercase tracking-[0.3em] text-[10px]">Verifying Identity...</p>
      </div>
    );
  }

  if (showLogin) {
    return (
      <main className="h-[100dvh] w-screen bg-black flex flex-col items-center justify-center p-6 text-center gradient-bg overflow-hidden relative">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500 z-10">
          <header>
            <h1 className="text-6xl md:text-8xl font-black text-primary gold-glow mb-4 tracking-tighter uppercase leading-none">VIBECRAFT</h1>
            <p className="text-primary/40 uppercase tracking-[0.5em] text-[10px] font-black">High-Fidelity Sanctuary</p>
          </header>

          <form onSubmit={handleAuth} className="bg-white/5 border border-primary/20 p-8 md:p-12 rounded-[3rem] shadow-2xl space-y-8">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/60 border-primary/20 pl-14 h-16 rounded-2xl focus-visible:ring-primary text-primary font-black placeholder:text-primary/20"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/60 border-primary/20 pl-14 h-16 rounded-2xl focus-visible:ring-primary text-primary font-black placeholder:text-primary/20"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isAuthLoading}
              className="w-full bg-primary text-black font-black h-16 rounded-2xl text-xl hover:bg-white transition-all shadow-[0_0_40px_rgba(212,175,55,0.3)] uppercase tracking-[0.2em]"
            >
              {isAuthLoading ? <Loader2 className="animate-spin" /> : (
                isLogin ? <><LogIn className="mr-3 w-5 h-5" /> Enter Sanctuary</> : <><UserPlus className="mr-3 w-5 h-5" /> Create Archive</>
              )}
            </Button>

            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary/40 hover:text-primary text-[10px] uppercase font-black tracking-[0.4em] transition-colors"
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
                <h2 className="text-4xl md:text-6xl lg:text-7xl font-black text-primary gold-glow tracking-tighter mb-4 truncate leading-none uppercase">
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
                <DashboardTabs userId={user!.uid} />
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

function DashboardTabs({ userId }: { userId: string }) {
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
  
  const trendingQuery = 'Billboard Hot 100 2025';
  const { data: trendingResults, isLoading: isTrendingLoading } = useYouTubeSearch(activeTab === 'trending' ? trendingQuery : '');

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    params.delete('q'); 
    router.push(`/?${params.toString()}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="w-full overflow-x-auto no-scrollbar mb-12 flex">
        <TabsList className="bg-white/5 border border-primary/10 p-1.5 rounded-full h-14 flex items-center shrink-0 w-max">
          <TabsTrigger value="trending" className="rounded-full px-6 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-3 shrink-0">
            <TrendingUp className="w-4 h-4" /> Trending
          </TabsTrigger>
          <TabsTrigger value="for-you" className="rounded-full px-6 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-3 shrink-0">
            <Sparkles className="w-4 h-4" /> For You
          </TabsTrigger>
          <TabsTrigger value="liked" className="rounded-full px-6 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-3 shrink-0">
            <Heart className="w-4 h-4" /> Liked
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-full px-6 md:px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.3em] flex gap-3 shrink-0">
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
