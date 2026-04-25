"use client";

import React, { Suspense, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSaavnSearch, useTrending, useMusicHome } from '@/hooks/useYouTube';
import { SearchResult } from '@/components/search/SearchResult';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { Player } from '@/components/player/Player';
import { YouTubePlayer } from '@/components/player/YouTubePlayer';
import { SettingsView } from '@/components/settings/SettingsView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { Loader2, LayoutGrid, List, Play, TrendingUp, Sparkles, Music, Heart, FolderOpen } from 'lucide-react';
import { useUser, useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { usePlayerStore, LayoutMode } from '@/store/usePlayerStore';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';

const queryClient = new QueryClient();

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
  const router = useRouter();
  const { settings, updateSettings } = usePlayerStore();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const currentTab = searchParams.get('tab') || 'home';
  const searchQuery = searchParams.get('q') || '';
  const detailId = searchParams.get('id');

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
    updateSettings({ layoutMode: settings.layoutMode === 'grid' ? 'list' : 'grid' });
  };

  if (isUserLoading) return <div className="h-screen w-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

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
        
        <ScrollArea className="flex-1 h-full">
          <div className="p-4 md:p-8 max-w-7xl mx-auto pb-44 md:pb-32">
            <div className="flex justify-end mb-6 px-2">
              <Button variant="ghost" size="sm" onClick={toggleLayout} className="bg-primary/5 hover:bg-primary/20 text-primary border border-primary/10 rounded-full gap-2 px-4 h-10">
                {settings.layoutMode === 'grid' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                <span className="text-[10px] font-black uppercase tracking-widest">Switch View</span>
              </Button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={currentTab + searchQuery + detailId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
                {currentTab === 'home' && <HomeView layoutMode={settings.layoutMode} />}
                {currentTab === 'search' && <SearchResultsView query={searchQuery} layoutMode={settings.layoutMode} />}
                {currentTab === 'settings' && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </ScrollArea>
        <Player />
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
            (trending || []).map((track, i) => <SearchResult key={track.id} track={track} results={trending} index={i} />)
          }
        </div>
      </section>

      {homeLoading ? <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary" /></div> :
        homeData?.map((sec: any, i: number) => (
          <section key={i}>
            <h3 className="text-xl font-black text-primary/60 mb-6 uppercase tracking-widest gold-glow">{sec.title}</h3>
            <div className={cn("grid gap-4", layoutMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5" : "grid-cols-1")}>
              {sec.items.map((track: any, j: number) => <SearchResult key={track.id} track={track} results={sec.items} index={j} />)}
            </div>
          </section>
        ))
      }
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
        {(data?.results || []).map((track: any, i: number) => <SearchResult key={track.id} track={track} results={data.results} index={i} />)}
      </div>
    </div>
  );
}
