
"use client";

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useYouTubeSearch } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Sparkles, LogIn, Heart, Library } from 'lucide-react';
import { useUser, useAuth, useCollection, useMemoFirebase, useFirestore } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { query, collection, orderBy } from 'firebase/firestore';

const queryClient = new QueryClient();

/**
 * AppWrapper handles the Suspense boundary required for useSearchParams
 * and the QueryClient provider.
 */
export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Suspense fallback={
        <div className="min-h-screen bg-black flex flex-col items-center justify-center">
          <Sparkles className="animate-spin text-primary w-12 h-12 mb-4" />
          <p className="text-primary/40 font-black uppercase tracking-[0.3em] text-[10px]">Entering Sanctuary...</p>
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
  
  const effectiveQuery = searchQuery || (activeTab === 'trending' ? 'Top Hits 2024' : '');
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
        <p className="text-muted-foreground mb-8 max-w-md uppercase tracking-[0.4em] text-[10px] font-bold">Midnight & Gold Sanctuary</p>
        <Button onClick={handleLogin} className="bg-primary text-black font-black h-16 px-12 rounded-full text-lg hover:bg-accent transition-all shadow-[0_0_30px_rgba(212,175,55,0.4)] uppercase tracking-widest">
          <LogIn className="mr-3 w-5 h-5" /> Enter
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-foreground pb-32 overflow-x-hidden gradient-bg">
      <Navbar />
      <YouTubePlayer />
      
      <div className="max-w-7xl mx-auto px-6 pt-24 md:pt-32">
        <section className="space-y-12">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
              <TabsList className="bg-white/5 border border-white/10 p-1 rounded-full h-14 w-full md:w-auto overflow-x-auto no-scrollbar backdrop-blur-md">
                <TabsTrigger value="trending" className="rounded-full h-full px-10 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.2em] flex gap-2 transition-all">
                  <TrendingUp className="w-3.5 h-3.5" /> Trending
                </TabsTrigger>
                <TabsTrigger value="liked" className="rounded-full h-full px-10 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.2em] flex gap-2 transition-all">
                  <Heart className="w-3.5 h-3.5" /> Liked
                </TabsTrigger>
                <TabsTrigger value="library" className="rounded-full h-full px-10 data-[state=active]:bg-primary data-[state=active]:text-black font-black uppercase text-[10px] tracking-[0.2em] flex gap-2 transition-all">
                  <Library className="w-3.5 h-3.5" /> Library
                </TabsTrigger>
              </TabsList>

              {searchQuery && (
                <div className="flex items-center gap-3 text-primary/80 bg-primary/5 px-6 py-3 rounded-full border border-primary/20 text-[10px] font-black uppercase tracking-[0.2em] italic animate-in fade-in slide-in-from-right-4">
                  <Sparkles className="w-4 h-4" /> Result for: {searchQuery}
                </div>
              )}
            </div>
            
            <TabsContent value="trending" className="mt-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {isSearchLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                  {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-primary/5 animate-pulse rounded-[2rem] border border-primary/10" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8">
                  {results?.map((track) => (
                    <SearchResult key={track.id} track={track} />
                  ))}
                  {(!results || results.length === 0) && (
                    <div className="col-span-full py-32 text-center opacity-40">
                      <p className="italic font-black tracking-[0.3em] uppercase text-xs">The archive is silent. Try another search.</p>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="liked" className="mt-0">
               <LikedSongsList userId={user?.uid} />
            </TabsContent>

            <TabsContent value="library" className="mt-0">
               <div className="text-center py-32 border-2 border-dashed border-primary/10 rounded-[4rem] bg-primary/5">
                 <Library className="w-16 h-16 text-primary/20 mx-auto mb-6" />
                 <p className="text-primary/40 font-black text-sm italic uppercase tracking-[0.4em]">Personal Archive Empty</p>
               </div>
            </TabsContent>
          </Tabs>
        </section>
      </div>

      <Player />
    </main>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
      {[...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-primary/5 animate-pulse rounded-[2rem]" />)}
    </div>
  );

  if (!likedDocs || likedDocs.length === 0) {
    return (
      <div className="text-center py-32 border-2 border-dashed border-primary/10 rounded-[4rem] bg-primary/5">
        <Heart className="w-16 h-16 text-primary/20 mx-auto mb-6" />
        <p className="text-primary/40 font-black text-sm italic uppercase tracking-[0.4em]">No Gold Found. Add some tracks.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-8 animate-in fade-in duration-1000">
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
