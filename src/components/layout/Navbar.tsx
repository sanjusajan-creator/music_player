"use client";

import React, { useState, useEffect } from 'react';
import { Search, Compass, Library, Heart, X, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

  useEffect(() => {
    setSearchValue(searchParams.get('q') || '');
  }, [searchParams]);

  const handleSearch = () => {
    const trimmed = searchValue.trim();
    if (trimmed) {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/');
    }
    setIsMobileSearchOpen(false);
  };

  const navigateToTab = (tab: string) => {
    setSearchValue('');
    router.push(`/?tab=${tab}`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl h-16 md:h-24 px-6 md:px-12 border-b border-primary/10 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div 
          className="text-2xl md:text-3xl font-black text-primary gold-glow cursor-pointer tracking-tighter uppercase italic"
          onClick={() => navigateToTab('trending')}
        >
          Vibecraft
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-2xl px-12">
        <div className="relative w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-all duration-300" />
          <Input 
            className="pl-14 bg-white/5 border-white/10 focus-visible:ring-primary focus-visible:bg-white/10 transition-all rounded-full h-12 text-sm placeholder:text-muted-foreground/40 font-bold tracking-wide"
            placeholder="Search songs"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-10">
        <Button variant="ghost" size="icon" className="md:hidden text-primary" onClick={() => setIsMobileSearchOpen(true)}>
          <Search className="w-6 h-6" />
        </Button>

        <div className="hidden md:flex items-center gap-10">
          <NavItem icon={<Compass />} label="Explore" active={currentTab === 'trending'} onClick={() => navigateToTab('trending')} />
          <NavItem icon={<Library />} label="Library" active={currentTab === 'library'} onClick={() => navigateToTab('library')} />
          <NavItem icon={<Heart />} label="Liked" active={currentTab === 'liked'} onClick={() => navigateToTab('liked')} />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all p-0 w-10 h-10">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`} />
                  <AvatarFallback className="bg-primary text-black font-black">U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black border-primary/20 text-primary w-64 p-3 rounded-[1.5rem] shadow-2xl" align="end">
              <DropdownMenuLabel className="font-black italic text-sm tracking-widest px-3 py-2">My Sanctuary</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem className="focus:bg-primary focus:text-black rounded-xl cursor-pointer font-bold px-3 py-2.5 transition-all mb-1" onClick={() => navigateToTab('library')}>Profile Archive</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-primary focus:text-black rounded-xl cursor-pointer font-bold px-3 py-2.5 transition-all" onClick={() => navigateToTab('liked')}>Liked Tracks</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-white rounded-xl cursor-pointer font-bold px-3 py-2.5 transition-all">Exit Sanctuary</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 bg-black z-[60] p-6 flex flex-col animate-in fade-in duration-300">
           <div className="flex items-center gap-4 mb-12">
             <Button variant="ghost" size="icon" onClick={() => setIsMobileSearchOpen(false)} className="text-primary active:scale-90">
               <X className="w-8 h-8" />
             </Button>
             <div className="relative flex-1 flex items-center gap-3">
                <Input 
                  autoFocus
                  className="bg-white/5 border-primary/20 focus-visible:ring-primary rounded-full h-14 pr-14 pl-6 text-lg font-bold"
                  placeholder="Search songs"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  size="icon" 
                  className="rounded-full bg-primary text-black h-14 w-14 shrink-0 shadow-lg"
                  onClick={handleSearch}
                >
                  <ArrowRight className="w-7 h-7" />
                </Button>
             </div>
           </div>
           <div className="space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 px-4">Navigation</p>
              <button onClick={() => { navigateToTab('trending'); setIsMobileSearchOpen(false); }} className="w-full text-left py-6 px-4 border-b border-primary/5 text-xl font-black italic flex items-center justify-between group">
                Explore <Compass className="text-primary group-active:scale-125 transition-all" />
              </button>
              <button onClick={() => { navigateToTab('liked'); setIsMobileSearchOpen(false); }} className="w-full text-left py-6 px-4 border-b border-primary/5 text-xl font-black italic flex items-center justify-between group">
                Liked Tracks <Heart className="text-primary group-active:scale-125 transition-all" />
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
    className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-primary scale-110' : 'text-muted-foreground hover:text-primary hover:scale-105'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${active ? 'fill-primary/20' : ''}` })}
    <span className="text-[9px] font-black uppercase tracking-[0.3em]">{label}</span>
  </button>
);