"use client";

import React, { useState, useEffect } from 'react';
import { Search, Compass, Library, Heart, User, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { useRouter, useSearchParams } from 'next/navigation';

export const Navbar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [searchValue, setSearchValue] = useState(initialQuery);
  const debouncedSearch = useDebounce(searchValue, 500);

  // Sync state with URL if it changes externally
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

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass h-16 px-4 md:px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="w-6 h-6" />
        </Button>
        <div 
          className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer"
          onClick={() => {
            setSearchValue('');
            router.push('/');
          }}
        >
          Vibecraft
        </div>
      </div>

      <div className="flex-1 max-w-xl px-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input 
            className="pl-10 bg-white/5 border-white/10 focus-visible:ring-primary focus-visible:bg-white/10 transition-all rounded-full h-10"
            placeholder="Search songs, artists, moods..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
        <NavItem icon={<Compass />} label="Explore" active={!searchParams.get('q')} />
        <NavItem icon={<Library />} label="Library" />
        <NavItem icon={<Heart />} label="Liked" />
        <Button variant="ghost" size="icon" className="rounded-full bg-white/5">
          <User className="w-5 h-5" />
        </Button>
      </div>
    </nav>
  );
};

const NavItem = ({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) => (
  <button className={`flex flex-col items-center gap-1 transition-colors ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
    {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
    <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
  </button>
);
