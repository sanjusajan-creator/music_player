
"use client";

import React from 'react';
import { Home, Search, Library, PlusCircle, Heart, ListMusic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export const Sidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();

  const playlistsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'users', user.uid, 'playlists'), orderBy('createdAt', 'desc'));
  }, [user, db]);

  const { data: playlists } = useCollection(playlistsQuery);

  const navItems = [
    { label: 'Home', icon: <Home />, path: '/' },
    { label: 'Search', icon: <Search />, path: '/search' },
    { label: 'Library', icon: <Library />, path: '/library' },
  ];

  return (
    <div className="w-[300px] h-full bg-black border-r border-primary/10 flex flex-col p-4 gap-6 shrink-0 hidden md:flex">
      <div className="px-4 py-2">
        <h1 
          className="text-3xl font-black text-primary gold-glow italic uppercase tracking-tighter cursor-pointer"
          onClick={() => router.push('/')}
        >
          Vibecraft
        </h1>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.path}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-4 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all font-bold",
              pathname === item.path && "text-primary bg-primary/10"
            )}
            onClick={() => router.push(item.path)}
          >
            {React.cloneElement(item.icon as React.ReactElement, { className: 'w-6 h-6' })}
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="flex flex-col gap-4 mt-4">
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">My Collections</p>
        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl font-bold text-muted-foreground hover:text-primary">
          <PlusCircle className="w-6 h-6" /> Create Playlist
        </Button>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-4 h-12 rounded-xl font-bold text-muted-foreground hover:text-primary"
          onClick={() => router.push('/?tab=liked')}
        >
          <Heart className="w-6 h-6 fill-primary/10" /> Liked Songs
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl font-bold text-primary animate-pulse-gold">
          <Sparkles className="w-6 h-6" /> Magic AI Playlist
        </Button>
      </div>

      <div className="flex-1 mt-4 overflow-hidden flex flex-col gap-2">
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Your Playlists</p>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {playlists?.map((p) => (
              <Button
                key={p.id}
                variant="ghost"
                className="w-full justify-start h-10 px-4 text-sm font-bold text-muted-foreground truncate hover:text-primary rounded-lg"
                onClick={() => router.push(`/playlist/${p.id}`)}
              >
                <ListMusic className="w-4 h-4 mr-3 shrink-0" />
                <span className="truncate">{p.name}</span>
              </Button>
            ))}
            {(!playlists || playlists.length === 0) && (
              <p className="px-4 py-4 text-[10px] italic text-muted-foreground/40">No playlists yet.</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
