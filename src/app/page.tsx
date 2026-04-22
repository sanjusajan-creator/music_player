"use client";

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useYouTubeSearch } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, TrendingUp, History, Sparkles, LogIn } from 'lucide-react';
import { useUser, useAuth, useFirestore, useCollection } from '@/firebase';
import { signInAnonymously } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { usePlayerStore } from '@/store/usePlayerStore';
import { getFirestore, collection } from 'firebase/firestore'; // Moved import to top

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
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const { data: results, isLoading } = useYouTubeSearch(query);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const { setLikedTracks } = usePlayerStore();
  
  // Sync liked songs from Firebase
  const likedSongsQuery = React.useMemo(() => {
    if (!user) return null;
    const db = getFirestore(); // Use global getter if useFirestore fails or needs params
    return collection(db, 'users', user.uid, 'likedSongs');
  }, [user]);

  // Use the hook with memoized query
  // Since we need to get raw data, we'll manually fetch or use the hook properly
  // For simplicity here, we'll handle login
  
  const handleLogin = () => signInAnonymously(auth);

  if (!user && !isUserLoading) {
    return (
      <main className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-6xl font-black text-primary gold-glow mb-4">VIBECRAFT</h1>
        <p className="text-muted-foreground mb-8 max-w-md">Experience music in its most elegant form. True black, metallic gold, and ad-aware technology.</p>
        <Button onClick={handleLogin} className="bg-primary text-black font-bold h-14 px-10 rounded-full text-lg hover:bg-accent transition-all">
          <LogIn className="mr-2" /> Enter the Sanctuary
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-foreground pb-32 overflow-x-hidden">
      <Navbar />
      <YouTubePlayer />
      
      <div className="max-w-7xl mx-auto px-4 pt-24">
        {query ? (
          <section>
            <h2 className="text-xl font-black mb-6 flex items-center gap-2 text-primary uppercase tracking-widest">
              <Sparkles className="w-5 h-5" /> Results: {query}
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => <div key={i} className="aspect-square bg-primary/5 animate-pulse rounded-xl border border-primary/10" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {results?.map((track) => (
                  <SearchResult key={track.id} track={track} />
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="space-y-12">
            <div className="relative rounded-[2rem] overflow-hidden h-[40vh] min-h-[300px] flex flex-col justify-end p-8 border border-primary/20">
               <img src="https://picsum.photos/seed/gold/1200/800" className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale" alt="Hero" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
               <div className="relative z-10 max-w-xl">
                 <h1 className="text-4xl md:text-6xl font-black text-primary gold-glow leading-none mb-4 uppercase">The Golden Standard.</h1>
                 <p className="text-muted-foreground text-sm md:text-base">Your personalized music sanctuary. Optimized for mobile, ad-aware, and strictly premium.</p>
               </div>
            </div>

            <Tabs defaultValue="trending" className="w-full">
              <TabsList className="bg-primary/5 border border-primary/20 p-1 mb-8 rounded-full h-12">
                <TabsTrigger value="trending" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Trending</TabsTrigger>
                <TabsTrigger value="liked" className="rounded-full px-6 data-[state=active]:bg-primary data-[state=active]:text-black">Liked</TabsTrigger>
              </TabsList>
              
              <TabsContent value="trending">
                 <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                   <PlaceholderGrid />
                 </div>
              </TabsContent>
              <TabsContent value="liked">
                 <div className="text-center py-20 border border-dashed border-primary/20 rounded-3xl">
                   <p className="text-primary/60 font-medium">Your curated sanctuary will appear here.</p>
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

function PlaceholderGrid() {
  return [...Array(6)].map((_, i) => (
    <div key={i} className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex flex-col gap-3 group">
       <div className="aspect-square bg-black rounded-lg overflow-hidden relative border border-primary/5">
          <img src={`https://picsum.photos/seed/${i + 100}/400/400`} className="w-full h-full object-cover opacity-30 grayscale group-hover:opacity-60 transition-all" alt="art" />
       </div>
       <div className="h-3 w-3/4 bg-primary/20 rounded" />
    </div>
  ));
}