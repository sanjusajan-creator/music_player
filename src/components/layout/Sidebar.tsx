"use client";

import React from 'react';
import { Home, Search, Library, Heart, Plus, ListMusic, FolderOpen, Trash2, Settings } from 'lucide-react';
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
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/?${params.toString()}`);
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
    <div className="w-64 h-full bg-black flex flex-col p-2 gap-2 shrink-0 hidden md:flex border-r border-primary/20">
      {/* Top Section */}
      <div className="bg-black space-y-1">
        <SidebarItem 
          icon={<Home />} 
          label="HOME" 
          active={currentTab === 'home'} 
          onClick={() => navigate('home')} 
        />
        <SidebarItem 
          icon={<Search />} 
          label="SEARCH" 
          active={currentTab === 'search'} 
          onClick={() => navigate('search')} 
        />
        <SidebarItem 
          icon={<Settings />} 
          label="SETTINGS" 
          active={currentTab === 'settings'} 
          onClick={() => navigate('settings')} 
        />
      </div>

      {/* Library Section */}
      <div className="bg-black flex-1 flex flex-col min-h-0 overflow-hidden mt-4">
        <div className="p-4 flex items-center justify-between">
          <button className="flex items-center gap-3 text-primary/60 hover:text-primary transition-all font-black text-xs uppercase tracking-widest">
            <Library className="w-6 h-6" /> YOUR LIBRARY
          </button>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5 rounded-full" onClick={handleCreatePlaylist}>
            <Plus className="w-5 h-5 text-primary" />
          </Button>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            <SidebarItem 
              icon={<Heart className="fill-primary text-primary" />} 
              label="LIKED SONGS" 
              active={currentTab === 'liked'} 
              onClick={() => navigate('liked')} 
            />
            <SidebarItem 
              icon={<FolderOpen className="text-primary" />} 
              label="LOCAL ARCHIVES" 
              active={currentTab === 'local'} 
              onClick={() => navigate('local')} 
            />
            
            <div className="py-4" />

            {playlists?.map((p) => (
              <div key={p.id} className="group relative">
                <SidebarItem 
                  icon={<ListMusic className="text-primary/60" />} 
                  label={p.name.toUpperCase()} 
                  active={false} 
                  onClick={() => {}} 
                />
                <button 
                  onClick={(e) => handleDeletePlaylist(p.id, e)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-primary/40 hover:text-red-500 transition-all"
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
      "flex items-center gap-4 px-4 py-3 transition-all rounded-lg cursor-pointer font-black text-xs uppercase tracking-widest",
      active ? "text-primary bg-primary/10 gold-glow" : "text-primary/40 hover:text-primary hover:bg-white/5"
    )}
  >
    {React.cloneElement(icon as React.ReactElement, { className: cn('w-6 h-6', active ? 'text-primary' : 'text-primary/40') })}
    <span className="truncate">{label}</span>
  </div>
);
