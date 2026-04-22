
"use client";

import React, { Suspense } from 'react';
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
import { TrendingUp, Sparkles, LogIn, Heart, Library, Music2 } from 'lucide-react';
import { useUser, useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { query, collection, orderBy } from 'firebase/firestore';

const queryClient = new QueryClient();

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen bg-black flex flex-col items-center justify-center">
          <Sparkles className="animate-spin text-primary w-12 h-12 mb-4" />
          <p className="text-primary/40 font-black uppercase tracking-[0.3em] text-[10px]">Vibecraft Loading...</p>
        </div>
      }>
        <Home />
      </Suspense>
      <Toaster />
    </QueryClientProvider>
  );
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const activeTab = searchParams.get('tab') || 'trending';
  
  const effectiveQuery = searchQuery || (activeTab === 'trending' ? 'Global Top Hits 2025' : '');
  const { data: results, isLoading: isSearchLoading } = useYouTubeSearch(effectiveQuery);
  
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  const handleLogin = () => signInAnonymously(auth);

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', value);
    if (searchQuery) params.delete('q');
    router.push(`/?${params.toString()}`);
  };

  if (!user && !isUserLoading) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-6xl md:text-8xl font-black text-primary gold-glow mb-4 tracking-tighter uppercase italic">VIBECRAFT</h1>
        <p className="text-muted-foreground mb-8 max-w-md uppercase tracking-[0.4em] text-[10px] font-bold">The Sanctuary of High-Fidelity</p>
        <Button onClick={handleLogin} className="bg-primary text-black font-black h-16 px-12 rounded-full text-lg hover:bg-accent transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] uppercase tracking-widest">
          <LogIn className="mr-3 w-5 h-5" /> Enter Sanctuary
        </Button>
      </main>
    );
  }

  return (
    <div className="flex h-screen bg-black overflow-hidden selection:bg-primary/30 selection:text-white">
      <Sidebar />
      
      <main className="flex-1 flex flex-col min-w-0 bg-black relative">
        <Navbar />
        <YouTubePlayer />
        
        <div className="flex-1 overflow-y-auto no-scrollbar pt-24 pb-32 gradient-bg px-6 md:px-12">
          <div className="max-w-7xl mx-auto">
            <header className="mb-12">
              <h2 className="text-4xl md:text-6xl font-black text-primary gold-glow italic tracking-tighter mb-4">
                Good Evening, <span className="text-white opacity-80">{user?.displayName || 'Traveler'}</span>
              </h2>
              <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.3em]">Curation for your late-night sessions.</p>
            </header>

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
                <LikedSongsList userId={user?.uid} />
              </TabsContent>

              <TabsContent value="library" className="mt-0 focus-visible:ring-0">
                <div className="text-center py-20 border-2 border-dashed border-primary/10 rounded-[3rem] bg-primary/5">
                  <Sparkles className="w-16 h-16 text-primary/20 mx-auto mb-6" />
                  <p className="text-primary/40 font-black text-xs italic uppercase tracking-[0.4em]">AI Radio Generating...</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <Player />
      </main>
    </div>
  );
}

function LikedSongsList({ userId }: { userId?: string }) {
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
