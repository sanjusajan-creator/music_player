"use client";

import React, { useState, useEffect } from 'react';
import { Search, Compass, Library, Heart, X, ArrowRight, LogOut, History } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useAuth } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from 'firebase/auth';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Sidebar } from '@/components/layout/Sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const auth = useAuth();
  const initialQuery = searchParams.get('q') || '';
  const currentTab = searchParams.get('tab') || 'trending';
  
  const [searchValue, setSearchValue] = useState(initialQuery);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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

  const handleLogout = () => signOut(auth);

  const navigateToTab = (tab: string) => {
    setSearchValue('');
    router.push(`/?tab=${tab}`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-3xl h-16 md:h-24 px-4 md:px-12 border-b border-primary/20 flex items-center justify-between">
      <div className="flex items-center gap-4 shrink-0">
        <div 
          className="text-2xl md:text-3xl font-black text-primary gold-glow cursor-pointer tracking-tighter uppercase"
          onClick={() => navigateToTab('trending')}
        >
          VIBECRAFT
        </div>
      </div>

      <div className="hidden md:flex flex-1 max-w-xl px-12">
        <div className="relative w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-all duration-300" />
          <Input 
            className="pl-14 bg-white/5 border-primary/20 focus-visible:ring-primary focus-visible:bg-white/10 transition-all rounded-full h-12 text-sm placeholder:text-muted-foreground/40 font-black tracking-wide"
            placeholder="Search the archives"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-8">
        <Button variant="ghost" size="icon" className="md:hidden text-primary" onClick={() => setIsMobileSearchOpen(true)}>
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="md:hidden text-primary" onClick={() => setIsMobileSidebarOpen(true)}>
          <Menu className="w-6 h-6" />
        </Button>

        <div className="hidden md:flex items-center gap-8">
          <NavItem icon={<Compass />} label="Explore" active={currentTab === 'trending' && !initialQuery} onClick={() => navigateToTab('trending')} />
          <NavItem icon={<Heart />} label="Liked" active={currentTab === 'liked'} onClick={() => navigateToTab('liked')} />
          <NavItem icon={<History />} label="History" active={currentTab === 'history'} onClick={() => navigateToTab('history')} />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all p-0 w-8 h-8 md:w-10 md:h-10">
                <Avatar className="h-full w-full">
                  <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`} />
                  <AvatarFallback className="bg-primary text-black font-black">U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-black border-primary/20 text-primary w-64 p-3 rounded-[1.5rem] shadow-2xl" align="end">
              <DropdownMenuLabel className="font-black text-sm tracking-widest px-3 py-2 uppercase">My Sanctuary</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem className="focus:bg-primary focus:text-black rounded-xl cursor-pointer font-black px-3 py-2.5 transition-all mb-1 uppercase text-xs" onClick={() => navigateToTab('history')}>History Archive</DropdownMenuItem>
              <DropdownMenuItem className="focus:bg-primary focus:text-black rounded-xl cursor-pointer font-black px-3 py-2.5 transition-all mb-1 uppercase text-xs" onClick={() => navigateToTab('liked')}>Liked Tracks</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem className="text-destructive focus:bg-destructive focus:text-white rounded-xl cursor-pointer font-black px-3 py-2.5 transition-all uppercase text-xs" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Exit Sanctuary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 bg-black z-[100] p-6 flex flex-col animate-in fade-in slide-in-from-top duration-300">
           <div className="flex items-center gap-4 mb-10">
             <Button variant="ghost" size="icon" onClick={() => setIsMobileSearchOpen(false)} className="text-primary">
               <X className="w-8 h-8" />
             </Button>
             <div className="flex-1 flex items-center gap-2">
                <Input 
                  autoFocus
                  className="flex-1 bg-white/5 border-primary/30 focus-visible:ring-primary rounded-full h-14 px-6 text-lg font-black"
                  placeholder="Search the archives"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button 
                  size="icon" 
                  className="rounded-full bg-primary text-black h-14 w-14 shrink-0 shadow-lg"
                  onClick={handleSearch}
                >
                  <ArrowRight className="w-6 h-6" />
                </Button>
             </div>
           </div>
           <div className="space-y-6">
              <p className="text-[10px] font-black uppercase tracking-[0.5em] text-primary/40 px-4">Sanctuary Paths</p>
              <button onClick={() => { navigateToTab('trending'); setIsMobileSearchOpen(false); }} className="w-full text-left py-5 px-6 rounded-2xl bg-white/5 border border-primary/5 text-xl font-black flex items-center justify-between group uppercase tracking-widest">
                Explore <Compass className="text-primary" />
              </button>
              <button onClick={() => { navigateToTab('liked'); setIsMobileSearchOpen(false); }} className="w-full text-left py-5 px-6 rounded-2xl bg-white/5 border border-primary/5 text-xl font-black flex items-center justify-between group uppercase tracking-widest">
                Liked <Heart className="text-primary" />
              </button>
              <button onClick={() => { navigateToTab('history'); setIsMobileSearchOpen(false); }} className="w-full text-left py-5 px-6 rounded-2xl bg-white/5 border border-primary/5 text-xl font-black flex items-center justify-between group uppercase tracking-widest">
                History <Library className="text-primary" />
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
    className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-primary scale-110' : 'text-primary/40 hover:text-primary hover:scale-105'}`}
  >
    {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${active ? 'fill-primary/20' : ''}` })}
    <span className="text-[9px] font-black uppercase tracking-[0.4em]">{label}</span>
  </button>
);