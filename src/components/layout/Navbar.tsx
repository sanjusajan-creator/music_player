"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, User, LogOut } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { useUser } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const auth = getAuth();

  const currentTab = searchParams.get("tab") || "home";
  const [searchValue, setSearchValue] = useState(searchParams.get("q") || "");
  
  useEffect(() => {
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = () => {
    const trimmed = searchValue.trim();
    if (trimmed) {
      router.push(`/?tab=search&q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/?tab=search");
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <nav className="sticky top-0 z-40 h-16 px-6 flex items-center justify-between bg-black/90 backdrop-blur-xl border-b border-primary/20">
      <div className="flex items-center gap-4">
        <div className="flex gap-2">
          <NavArrow icon={<ChevronLeft />} onClick={() => router.back()} />
          <NavArrow icon={<ChevronRight />} onClick={() => router.forward()} />
        </div>

        {currentTab === 'search' && (
          <div className="relative group ml-4 w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/60 group-focus-within:text-primary transition-all" />
            <Input
              className="pl-12 bg-white/5 border-primary/20 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all rounded-full h-10 text-sm placeholder:text-primary/20 font-black text-primary"
              placeholder="What do you want to play?"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 bg-black border border-primary/20 hover:scale-105 transition-all p-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`} />
                  <AvatarFallback className="bg-primary text-black font-black">U</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-neutral-900 border-primary/20 text-primary w-48 p-1">
              <DropdownMenuItem className="focus:bg-primary/10 p-2 cursor-pointer rounded-sm flex items-center gap-3 font-black">
                <User className="w-4 h-4" /> PROFILE
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="focus:bg-red-500/10 p-2 cursor-pointer rounded-sm flex items-center gap-3 text-red-500 font-black">
                <LogOut className="w-4 h-4" /> LOG OUT
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
};

const NavArrow = ({ icon, onClick }: { icon: React.ReactNode, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="h-8 w-8 bg-black rounded-full flex items-center justify-center text-primary/40 hover:text-primary border border-primary/20 transition-all"
  >
    {React.cloneElement(icon as React.ReactElement<{className?: string}>, { className: 'w-5 h-5' })}
  </button>
);
