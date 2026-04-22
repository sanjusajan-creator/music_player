"use client";

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useYouTubeSearch } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, TrendingUp, History, Sparkles } from 'lucide-react';

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

  return (
    <main className="min-h-screen gradient-bg pb-32">
      <Navbar />
      <YouTubePlayer />
      
      <div className="max-w-7xl mx-auto px-4 pt-24">
        {query ? (
          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Sparkles className="text-primary" />
              Results for &quot;{query}&quot;
            </h2>
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="aspect-square bg-white/5 animate-pulse rounded-xl" />
                ))}
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
            {/* Hero Section */}
            <div className="relative rounded-3xl overflow-hidden h-[400px] flex flex-col justify-end p-8 md:p-12">
               <div className="absolute inset-0 -z-10">
                 <img 
                    src="https://picsum.photos/seed/vibes/1200/800" 
                    className="w-full h-full object-cover" 
                    alt="Hero"
                    data-ai-hint="concert music"
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
               </div>
               <div className="max-w-2xl">
                 <span className="text-primary font-bold uppercase tracking-widest text-xs mb-4 block">Recommended for you</span>
                 <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">Craft Your Perfect Vibe.</h1>
                 <p className="text-lg text-muted-foreground mb-8">Search from millions of tracks on YouTube and enjoy a premium, ad-aware listening experience.</p>
               </div>
            </div>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="trending" className="w-full">
              <TabsList className="glass bg-transparent border-none p-1 mb-8">
                <TabsTrigger value="trending" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                  <TrendingUp className="w-4 h-4 mr-2" /> Trending
                </TabsTrigger>
                <TabsTrigger value="new" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                  <Music2 className="w-4 h-4 mr-2" /> New Releases
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white">
                  <History className="w-4 h-4 mr-2" /> Recently Played
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="trending">
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   {/* This would normally fetch trending tracks */}
                   <PlaceholderGrid />
                 </div>
              </TabsContent>
              <TabsContent value="new">
                 <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                   <PlaceholderGrid />
                 </div>
              </TabsContent>
              <TabsContent value="history">
                 <div className="text-center py-20 glass rounded-3xl">
                   <p className="text-muted-foreground">Your listening history will appear here.</p>
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
    <div key={i} className="group glass-card p-3 rounded-xl flex flex-col gap-3">
       <div className="aspect-square bg-white/5 rounded-lg overflow-hidden relative">
          <img 
            src={`https://picsum.photos/seed/${i + 50}/400/400`} 
            className="w-full h-full object-cover opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
            alt="Placeholder"
          />
       </div>
       <div className="h-4 w-3/4 bg-white/10 rounded" />
       <div className="h-3 w-1/2 bg-white/5 rounded" />
    </div>
  ));
}