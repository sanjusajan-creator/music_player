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
import { TrendingUp, Sparkles, LogIn, Heart, Music2, Loader2, Mail, Lock, UserPlus } from 'lucide-react';
import { useUser, useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { query, collection, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

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
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // FORCE LOGIN GATE: Ensure email presence
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
      toast({ 
        title: "Auth Error", 
        description: error.message || "Authentication failed.", 
        variant: "destructive" 
      });
    } finally {
      setIsAuthLoading(false);
    }
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
            <h1 className="text-6xl md:text-7xl font-black text-primary gold-glow mb-4 tracking-tighter uppercase italic">VIBECRAFT</h1>
            <p className="text-muted-foreground uppercase tracking-[0.4em] text-[10px] font-bold">The Sanctuary of High-Fidelity</p>
          </header>

          <form onSubmit={handleAuth} className="bg-white/5 border border-primary/20 p-10 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  type="email" 
                  placeholder="Email Address" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-black/40 border-primary/20 pl-12 h-14 rounded-2xl focus-visible:ring-primary text-primary placeholder:text-primary/20"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                <Input 
                  type="password" 
                  placeholder="Password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black/40 border-primary/20 pl-12 h-14 rounded-2xl focus-visible:ring-primary text-primary placeholder:text-primary/20"
                />
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isAuthLoading}
              className="w-full bg-primary text-black font-black h-16 rounded-2xl text-lg hover:bg-accent transition-all shadow-[0_0_30px_rgba(212,175,55,0.2)] uppercase tracking-widest"
            >
              {isAuthLoading ? <Loader2 className="animate-spin" /> : (
                isLogin ? <><LogIn className="mr-3 w-5 h-5" /> Enter Sanctuary</> : <><UserPlus className="mr-3 w-5 h-5" /> Create Archive</>
              )}
            </Button>

            <button 
              type="button" 
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary/40 hover:text-primary text-[10px] uppercase font-black tracking-widest transition-colors"
            >
              {isLogin ? "Need an archive? Sign up" : "Already a member? Log in"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="flex h-[100dvh] w-screen bg-black overflow-hidden selection:bg-primary/30 selection:text-white relative">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-black relative overflow-hidden h-[100dvh]">
        <Suspense fallback={<div className="h-24 bg-black/80 animate-pulse" />}>
          <Navbar />
        </Suspense>
        <YouTubePlayer />
        <div className="flex-1 overflow-y-auto no-scrollbar pt-24 pb-32 gradient-bg px-6 md:px-12 h-full">
          <div className="max-w-7xl mx-auto">
            <header className="mb-12">
              <h2 className="text-4xl md:text-6xl font-black text-primary gold-glow italic tracking-tighter mb-4">
                Welcome, <span className="text-white opacity-80">{user?.email?.split('@')[0] || 'Traveler'}</span>
              </h2>
              <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.3em]">Curation for your late-night sessions.</p>
            </header>

            <Suspense fallback={<div className="h-64 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}>
              <DashboardTabs userId={user!.uid} />
            </Suspense>
          </div>
        </div>
        <Player />
      </main>
    </div>
  );
}

function DashboardTabs({ userId }: { userId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const activeTab = searchParams.get('tab') || 'trending';
  
  const effectiveQuery = searchQuery || (activeTab === 'trending' ? 'Global Top Hits 2025' : '');
  const { data: results, isLoading: isSearchLoading } = useYouTubeSearch(effectiveQuery);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    if (searchQuery) params.delete('q');
    router.push(`/?${params.toString()}`);
  };

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full h-12 mb-12 w-fit">
        <TabsTrigger value="trending" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[9px] tracking-[0.2em] flex gap-2">
          <TrendingUp className="w-3.5 h-3.5" /> Trending
        </TabsTrigger>
        <TabsTrigger value="liked" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[9px] tracking-[0.2em] flex gap-2">
          <Heart className="w-3.5 h-3.5" /> Liked
        </TabsTrigger>
        <TabsTrigger value="library" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[9px] tracking-[0.2em] flex gap-2">
          <Music2 className="w-3.5 h-3.5" /> Discovery
        </TabsTrigger>
      </TabsList>

      <TabsContent value="trending" className="mt-0 focus-visible:ring-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 md:gap-10">
          {isSearchLoading ? (
            [...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-3xl" />)
          ) : (
            results?.map((track) => (
              <SearchResult key={track.id} track={track} />
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="liked" className="mt-0 focus-visible:ring-0">
        <LikedSongsList userId={userId} />
      </TabsContent>

      <TabsContent value="library" className="mt-0 focus-visible:ring-0">
        <div className="text-center py-20 border-2 border-dashed border-primary/10 rounded-[3rem] bg-primary/5">
          <Sparkles className="w-16 h-16 text-primary/20 mx-auto mb-6" />
          <p className="text-primary/40 font-black text-xs italic uppercase tracking-[0.4em]">Personalized Discovery Awaiting...</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}

function LikedSongsList({ userId }: { userId: string }) {
  const db = useFirestore();
  const q = useMemoFirebase(() => {
    if (!userId || !db) return null;
    return query(
      collection(db, 'users', userId, 'likedSongs'),
      orderBy('likedAt', 'desc')
    );
  }, [userId, db]);

  const { data: likedDocs, isLoading } = useCollection(q);

  if (isLoading) return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8">
      {[...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-3xl" />)}
    </div>
  );

  if (!likedDocs || likedDocs.length === 0) {
    return (
      <div className="text-center py-24 border-2 border-dashed border-primary/10 rounded-[3rem] bg-primary/5">
        <Heart className="w-16 h-16 text-primary/20 mx-auto mb-6" />
        <p className="text-primary/40 font-black text-[10px] italic uppercase tracking-[0.4em]">Your gold collection is empty.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-8">
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