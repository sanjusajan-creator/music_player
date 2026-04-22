
"use client";

import React, { useState, useEffect } from 'react';
import { Search, Compass, Library, Heart, User, Menu, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const initialQuery = searchParams.get('q') || '';
  const currentTab = searchParams.get('tab') || 'trending';
  
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const debouncedSearch = useDebounce(searchValue, 500);

  useEffect(() => {
    setSearchValue(searchParams.get('q') || '');
  }, [searchParams]);

  useEffect(() => {
    if (debouncedSearch !== undefined) {
      const currentQ = searchParams.get('q') || '';
      if (debouncedSearch !== currentQ) {
        if (debouncedSearch) {
          router.push(`/?q=${encodeURIComponent(debouncedSearch)}`);
        } else if (currentQ !== '') {
          router.push('/');
        }
      }
    }
  }, [debouncedSearch, router, searchParams]);

  const navigateToTab = (tab: string) => {
    setSearchValue('');
    router.push(`/?tab=${tab}`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl h-16 md:h-20 px-4 md:px-8 border-b border-primary/10 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div 
          className="text-2xl font-black text-primary gold-glow cursor-pointer tracking-tighter uppercase italic"
          onClick={() => navigateToTab('trending')}
        >
          Vibecraft
        </div>
      </div>

      {/* Desktop Search */}
      <div className="hidden md:flex flex-1 max-w-xl px-8">
        <div className="relative w-full group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-colors" />
          <Input 
            className="pl-12 bg-white/5 border-white/10 focus-visible:ring-primary focus-visible:bg-white/10 transition-all rounded-full h-11 text-sm placeholder:text-muted-foreground/50"
            placeholder="Search the archive..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-6">
        {/* Mobile Search Toggle */}
        <Button variant="ghost" size="icon" className="md:hidden text-primary" onClick={() => setIsMobileSearchOpen(true)}>
          <Search className="w-5 h-5" />
        </Button>

        <div className="hidden md:flex items-center gap-6">
          <NavItem icon={<Compass />} label="Explore" active={currentTab === 'trending'} onClick={() => navigateToTab('trending')} />
          <NavItem icon={<Library />} label="Library" active={currentTab === 'library'} onClick={() => navigateToTab('library')} />
          <NavItem icon={<Heart />} label="Liked" active={currentTab === 'liked'} onClick={() => navigateToTab('liked')} />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`} />
                  <AvatarFallback className="bg-primary text-black font-bold">U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black border-primary/20 text-primary w-56 p-2 rounded-2xl" align="end">
              <DropdownMenuLabel className="font-black italic">My Sanctuary</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem className="focus:bg-primary focus:text-black rounded-lg cursor-pointer" onClick={() => navigateToTab('library')}>Profile</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-primary focus:text-black rounded-lg cursor-pointer" onClick={() => navigateToTab('liked')}>Liked Tracks</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-white rounded-lg cursor-pointer">Log Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Mobile Search Overlay */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 bg-black z-[60] p-4 flex flex-col animate-in fade-in duration-200">
           <div className="flex items-center gap-4 mb-8">
             <Button variant="ghost" size="icon" onClick={() => setIsMobileSearchOpen(false)} className="text-primary">
               <X className="w-6 h-6" />
             </Button>
             <div className="relative flex-1">
                <Input 
                  autoFocus
                  className="bg-white/5 border-primary/20 focus-visible:ring-primary rounded-full h-12"
                  placeholder="Find your vibe..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
             </div>
           </div>
           <div className="space-y-4">
              <p className="text-xs font-black uppercase tracking-widest text-primary/40">Quick Access</p>
              <button onClick={() => { navigateToTab('trending'); setIsMobileSearchOpen(false); }} className="w-full text-left py-4 border-b border-primary/5 text-lg font-bold flex items-center justify-between">
                Explore <Compass className="text-primary" />
              </button>
              <button onClick={() => { navigateToTab('liked'); setIsMobileSearchOpen(false); }} className="w-full text-left py-4 border-b border-primary/5 text-lg font-bold flex items-center justify-between">
                Liked <Heart className="text-primary" />
              </button>
           </div>
        </div>
      )}
    </nav>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-primary hover:scale-105'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: `w-5 h-5 ${active ? 'fill-primary/20' : ''}` })}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);
