"use client";

import React from 'react';
import { Home, Search, Heart, Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

export const MobileNav = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'home';

  const navigate = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/?${params.toString()}`);
  };

  const navItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'liked', icon: Heart, label: 'Liked' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-black border-t border-primary/20 z-[70] flex items-center justify-around md:hidden px-4">
      {navItems.map(({ id, icon: Icon, label }) => {
        const isActive = currentTab === id;
        // For Heart icon we probably only want fill if active
        // But for Home, Search, Settings they might not support fill cleanly from lucide without explicit props or it might look bad, 
        // so we just color it.
        return (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full transition-all",
              isActive ? "text-primary gold-glow" : "text-primary/40 hover:text-primary/80"
            )}
          >
            <Icon className={cn("w-5 h-5 mb-1", isActive && id === 'liked' ? "fill-primary" : "")} />
            <span className="text-[9px] font-black uppercase tracking-widest leading-none">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
