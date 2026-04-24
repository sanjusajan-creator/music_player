
"use client";

import React, { useState } from 'react';
import { Home, Search, Library, Heart, Plus, ListMusic, Sparkles, FolderOpen, Music2, Trash2, Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export const Sidebar = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';
  const { user } = useUser();
  const db = useFirestore();

  const playlistsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'users', user.uid, 'playlists'), orderBy('createdAt', 'desc'));
  }, [user, db]);

  const { data: playlists } = useCollection(playlistsQuery);

  const navigate = (tab: string) => {
    router.push(`/?tab=${tab}`);
  };

  const handleCreatePlaylist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    const colRef = collection(db, 'users', user.uid, 'playlists');
    addDocumentNonBlocking(colRef, {
      name: `New Playlist #${(playlists?.length || 0) + 1}`,
      createdAt: new Date().toISOString(),
      tracks: []
    });
    toast({ title: "Playlist Created", description: "Your archive expands." });
  };

  const handleDeletePlaylist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    deleteDocumentNonBlocking(doc(db, 'users', user.uid, 'playlists', id));
  };

  return (
    <div className="w-64 h-full bg-black flex flex-col p-2 gap-2 shrink-0 hidden md:flex">
      {/* Top Section */}
      <div className="bg-white/5 rounded-xl p-2 space-y-1">
        <SidebarItem 
          icon={<Home />} 
          label="Home" 
          active={currentTab === 'home'} 
          onClick={() => navigate('home')} 
        />
        <SidebarItem 
          icon={<Search />} 
          label="Search" 
          active={currentTab === 'search'} 
          onClick={() => navigate('search')} 
        />
        <SidebarItem 
          icon={<Settings />} 
          label="Settings" 
          active={currentTab === 'settings'} 
          onClick={() => navigate('settings')} 
        />
      </div>

      {/* Library Section */}
      <div className="bg-white/5 rounded-xl flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <button className="flex items-center gap-3 text-muted-foreground hover:text-white transition-all font-black text-sm uppercase tracking-widest">
            <Library className="w-6 h-6" /> Your Library
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 rounded-full" onClick={handleCreatePlaylist}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="px-2 pb-2 flex flex-wrap gap-2">
          <LibraryBadge label="Playlists" onClick={() => {}} />
          <LibraryBadge label="Artists" onClick={() => {}} />
          <LibraryBadge label="Albums" onClick={() => {}} />
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            <SidebarItem 
              icon={<Heart className="fill-primary text-primary" />} 
              label="Liked Songs" 
              active={currentTab === 'liked'} 
              onClick={() => navigate('liked')} 
            />
            <SidebarItem 
              icon={<FolderOpen className="text-blue-400" />} 
              label="Local Archives" 
              active={currentTab === 'local'} 
              onClick={() => navigate('local')} 
            />
            
            <div className="py-2" />

            {playlists?.map((p) => (
              <div key={p.id} className="group relative">
                <SidebarItem 
                  icon={<ListMusic />} 
                  label={p.name} 
                  active={false} 
                  onClick={() => {}} 
                />
                <button 
                  onClick={(e) => handleDeletePlaylist(p.id, e)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={cn(
      "spotify-sidebar-item",
      active && "active text-white"
    )}
  >
    {React.cloneElement(icon as React.ReactElement, { className: 'w-6 h-6' })}
    <span className="text-xs uppercase tracking-widest truncate">{label}</span>
  </div>
);

const LibraryBadge = ({ label, onClick }: { label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full transition-all text-white/80"
  >
    {label}
  </button>
);
