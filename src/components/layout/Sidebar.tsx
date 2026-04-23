"use client";

import React, { useState } from 'react';
import { Home, Search, Library, PlusCircle, Heart, ListMusic, Sparkles, Loader2, Wand2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { generateMagicPlaylist } from '@/ai/flows/magic-playlist';
import { toast } from '@/hooks/use-toast';

export const Sidebar = ({ mobile = false }: { mobile?: boolean } = {}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const db = useFirestore();
  
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isMagicLoading, setIsMagicLoading] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState('');
  const [isMagicDialogOpen, setIsMagicDialogOpen] = useState(false);

  const playlistsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(collection(db, 'users', user.uid, 'playlists'), orderBy('createdAt', 'desc'));
  }, [user, db]);

  const { data: playlists } = useCollection(playlistsQuery);

  const handleCreatePlaylist = () => {
    if (!user || !db || !newPlaylistName.trim()) return;
    const colRef = collection(db, 'users', user.uid, 'playlists');
    addDocumentNonBlocking(colRef, {
      name: newPlaylistName,
      createdAt: new Date().toISOString(),
      tracks: []
    });
    setNewPlaylistName('');
  };

  const handleDeletePlaylist = (playlistId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !db) return;
    const playlistRef = doc(db, 'users', user.uid, 'playlists', playlistId);
    deleteDocumentNonBlocking(playlistRef);
    toast({ title: "Archive Deleted", description: "The collection has been purged." });
  };

  const handleMagicPlaylist = async () => {
    if (!user || !db || !magicPrompt.trim()) return;
    setIsMagicLoading(true);
    try {
      const result = await generateMagicPlaylist({ prompt: magicPrompt });
      const colRef = collection(db, 'users', user.uid, 'playlists');
      
      addDocumentNonBlocking(colRef, {
        name: result.playlistName,
        description: result.description,
        createdAt: new Date().toISOString(),
        tracks: result.suggestedTracks.map(t => ({
          id: `ai-${Math.random().toString(36).substr(2, 9)}`, // Temporary IDs until searched
          title: t.title,
          artist: t.artist,
          thumbnail: "https://picsum.photos/seed/magic/400/400"
        }))
      });

      toast({ 
        title: "Magic Manifested", 
        description: `Summoned: ${result.playlistName}` 
      });
      setIsMagicDialogOpen(false);
      setMagicPrompt('');
    } catch (error) {
      toast({ 
        variant: "destructive", 
        title: "Summoning Failed", 
        description: "The Oracle is silent. Try again." 
      });
    } finally {
      setIsMagicLoading(false);
    }
  };

  const navItems = [
    { label: 'Home', icon: <Home />, path: '/' },
    { label: 'Explore', icon: <Search />, path: '/?tab=trending' },
    { label: 'Library', icon: <Library />, path: '/?tab=history' },
  ];

  return (
    <div className={`w-[300px] h-full bg-black border-r border-primary/10 flex flex-col p-4 gap-6 shrink-0 ${mobile ? '' : 'hidden md:flex'}`} >
      <div className="px-4 py-2">
        <h1 
          className="text-3xl font-black text-primary gold-glow font-bold uppercase tracking-tighter cursor-pointer"
          onClick={() => router.push('/')}
        >
          Vibecraft
        </h1>
      </div>

      <nav className="space-y-1">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            className={cn(
              "w-full justify-start gap-4 h-12 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all font-bold uppercase text-xs tracking-widest",
              (pathname === item.path || (item.path.includes('tab') && typeof window !== 'undefined' && window.location.search.includes(item.path.split('=')[1]))) && "text-primary bg-primary/10"
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
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl font-bold text-muted-foreground hover:text-primary uppercase text-xs tracking-widest">
              <PlusCircle className="w-6 h-6" /> Create Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-primary/20 text-primary">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-bold gold-glow uppercase">New Archive</DialogTitle>
              <DialogDescription className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Name your collection</DialogDescription>
            </DialogHeader>
            <Input 
              value={newPlaylistName} 
              onChange={(e) => setNewPlaylistName(e.target.value)} 
              placeholder="e.g. Midnight Jazz" 
              className="bg-white/5 border-white/10"
            />
            <DialogFooter>
              <Button onClick={handleCreatePlaylist} className="bg-primary text-black font-black uppercase tracking-widest rounded-full">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button 
          variant="ghost" 
          className="w-full justify-start gap-4 h-12 rounded-xl font-bold text-muted-foreground hover:text-primary uppercase text-xs tracking-widest"
          onClick={() => router.push('/?tab=liked')}
        >
          <Heart className="w-6 h-6 fill-primary/10" /> Liked Songs
        </Button>

        <Dialog open={isMagicDialogOpen} onOpenChange={setIsMagicDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-4 h-12 rounded-xl font-bold text-primary animate-pulse-gold group uppercase text-xs tracking-widest">
              <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" /> Magic AI Playlist
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-black border-primary/20 text-primary max-w-md">
            <DialogHeader>
              <DialogTitle className="text-3xl font-black font-bold gold-glow uppercase flex items-center gap-3">
                <Wand2 className="w-8 h-8" /> The Oracle
              </DialogTitle>
              <DialogDescription className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em]">Describe a mood, and I shall summon a list.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input 
                value={magicPrompt} 
                onChange={(e) => setMagicPrompt(e.target.value)} 
                placeholder="Dark academia with a hint of rain..." 
                className="bg-white/5 border-white/10 h-14 text-lg"
              />
              <Button 
                onClick={handleMagicPlaylist} 
                disabled={isMagicLoading}
                className="w-full bg-primary text-black font-black h-14 rounded-full text-lg shadow-[0_0_20px_rgba(212,175,55,0.3)] uppercase tracking-widest"
              >
                {isMagicLoading ? <Loader2 className="animate-spin" /> : "Summon Archive"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 mt-4 overflow-hidden flex flex-col gap-2">
        <p className="px-4 text-[10px] font-black uppercase tracking-[0.4em] text-primary/40">Your Playlists</p>
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1">
            {playlists?.map((p) => (
              <div key={p.id} className="group relative">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-10 px-4 text-sm font-bold text-muted-foreground truncate hover:text-primary rounded-lg pr-10 uppercase tracking-tighter"
                >
                  <ListMusic className="w-4 h-4 mr-3 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </Button>
                <button 
                  onClick={(e) => handleDeletePlaylist(p.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-primary/40 hover:text-destructive transition-all p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {(!playlists || playlists.length === 0) && (
              <p className="px-4 py-4 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">No playlists yet.</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};