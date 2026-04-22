
"use client";

import React from 'react';
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

export default function AppWrapper() {
  return (
    <QueryClientProvider client={queryClient}>
      <Home />
      <Toaster />
    </QueryClientProvider>
  );
}

function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const activeTab = searchParams.get('tab') || 'trending';
  
  const { data: results, isLoading: isSearchLoading } = useYouTubeSearch(searchQuery);
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
        <h1 className="text-6xl font-black text-primary gold-glow mb-4 tracking-tighter">VIBECRAFT</h1>
        <p className="text-muted-foreground mb-8 max-w-md">Experience music in its most elegant form. True black, metallic gold, and ad-aware technology.</p>
        <Button onClick={handleLogin} className="bg-primary text-black font-bold h-14 px-10 rounded-full text-lg hover:bg-accent transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)]">
          <LogIn className="mr-2" /> Enter the Sanctuary
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-foreground pb-32 overflow-x-hidden gradient-bg">
      <Navbar />
      <YouTubePlayer />
      
      <div className="max-w-7xl mx-auto px-4 pt-24 md:pt-28">
        {searchQuery ? (
          <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-primary uppercase tracking-widest">
              <Sparkles className="w-5 h-5" /> Results: {searchQuery}
            </h2>
            {isSearchLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-primary/5 animate-pulse rounded-2xl border border-primary/10" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {results?.map((track) => (
                  <SearchResult key={track.id} track={track} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-12">
            {/* Hero Section - Visible only on Trending */}
            {activeTab === 'trending' && (
              <div className="relative rounded-[2.5rem] overflow-hidden h-[35vh] md:h-[45vh] min-h-[300px] flex flex-col justify-end p-8 md:p-12 border border-primary/20 shadow-2xl">
                 <img src="https://picsum.photos/seed/gold-luxury/1200/800" className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale" alt="Hero" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                 <div className="relative z-10 max-w-2xl">
                   <h1 className="text-5xl md:text-7xl font-black text-primary gold-glow leading-none mb-4 uppercase italic">The Golden Standard.</h1>
                   <p className="text-muted-foreground text-sm md:text-lg max-w-md">Your personalized music sanctuary. Optimized for mobile, ad-aware, and strictly premium.</p>
                 </div>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
              <TabsList className="bg-white/5 border border-white/10 p-1 mb-8 rounded-full h-14 w-full md:w-auto overflow-x-auto no-scrollbar">
                <TabsTrigger value="trending" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-bold flex gap-2">
                  <TrendingUp className="w-4 h-4" /> Trending
                </TabsTrigger>
                <TabsTrigger value="liked" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-bold flex gap-2">
                  <Heart className="w-4 h-4" /> Liked
                </TabsTrigger>
                <TabsTrigger value="library" className="rounded-full px-8 data-[state=active]:bg-primary data-[state=active]:text-black font-bold flex gap-2">
                  <Library className="w-4 h-4" /> Library
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="trending" className="mt-0">
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
                   <PlaceholderGrid />
                 </div>
              </TabsContent>

              <TabsContent value="liked" className="mt-0">
                 <LikedSongsList userId={user?.uid} />
              </TabsContent>

              <TabsContent value="library" className="mt-0">
                 <div className="text-center py-24 border border-dashed border-primary/20 rounded-[3rem] bg-primary/5">
                   <Library className="w-12 h-12 text-primary/40 mx-auto mb-4" />
                   <p className="text-primary/60 font-medium text-lg italic">Your personal archive is being prepared.</p>
                 </div>
              </TabsContent>
            </Tabs>
          </section>
        )}
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
    <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
      {[...Array(5)].map((_, i) => <div key={i} className="aspect-square bg-primary/5 animate-pulse rounded-2xl" />)}
    </div>
  );

  if (!likedDocs || likedDocs.length === 0) {
    return (
      <div className="text-center py-24 border border-dashed border-primary/20 rounded-[3rem] bg-primary/5">
        <Heart className="w-12 h-12 text-primary/40 mx-auto mb-4" />
        <p className="text-primary/60 font-medium text-lg italic">No gold found here yet. Start liking tracks!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-in fade-in duration-700">
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

function PlaceholderGrid() {
  return [...Array(12)].map((_, i) => (
    <div key={i} className="bg-white/5 p-4 rounded-[2rem] border border-white/5 hover:border-primary/20 transition-all group cursor-pointer shadow-lg">
       <div className="aspect-square bg-black rounded-2xl overflow-hidden relative border border-primary/5 mb-3">
          <img src={`https://picsum.photos/seed/${i + 200}/400/400`} className="w-full h-full object-cover opacity-40 grayscale group-hover:opacity-80 group-hover:scale-110 transition-all duration-500" alt="art" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-60" />
       </div>
       <div className="h-3 w-3/4 bg-primary/20 rounded-full mb-2" />
       <div className="h-2 w-1/2 bg-white/10 rounded-full" />
    </div>
  ));
}
