
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Compass, Heart, History, X, ArrowRight, LogOut, FolderOpen } from "lucide-react";
import { getAuth, signOut } from "firebase/auth";
import { useUser } from "@/firebase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useUser();
  const auth = getAuth();

  const initialQuery = searchParams.get("q") || "";
  const currentTab = searchParams.get("tab") || "trending";

  const [searchValue, setSearchValue] = useState(initialQuery);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  useEffect(() => {
    setSearchValue(searchParams.get("q") || "");
  }, [searchParams]);

  const handleSearch = () => {
    const trimmed = searchValue.trim();
    if (trimmed) {
      router.push(`/?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/");
    }
    setIsMobileSearchOpen(false);
  };

  const handleLogout = () => signOut(auth);

  const navigateToTab = (tab: string) => {
    setSearchValue("");
    router.push(`/?tab=${tab}`);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-[60] bg-black/95 backdrop-blur-3xl h-16 md:h-24 px-4 md:px-12 border-b border-primary/20 flex items-center justify-between">
      
      {/* LOGO */}
      <div className="flex items-center gap-4 shrink-0">
        <div 
          className="text-xl sm:text-2xl md:text-3xl font-black text-primary gold-glow cursor-pointer tracking-tighter uppercase leading-none shrink-0"
          onClick={() => navigateToTab('trending')}
        >
          VIBECRAFT
        </div>
      </div>

      {/* DESKTOP SEARCH (Strategy #2: Only on Enter) */}
      <div className="hidden md:flex flex-1 max-w-xl px-4 lg:px-12">
        <div className="relative w-full group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 group-focus-within:text-primary transition-all duration-300" />
          <Input
            className="pl-14 bg-white/5 border-primary/20 focus-visible:ring-primary focus-visible:bg-white/10 transition-all rounded-full h-12 text-sm placeholder:text-muted-foreground/40 font-black tracking-wide"
            placeholder="Search the archives"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div className="flex items-center gap-2 sm:gap-4 md:gap-8 shrink-0">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-primary h-10 w-10 p-0" 
          onClick={() => setIsMobileSearchOpen(true)}
        >
          <Search className="w-5 h-5" />
        </Button>

        <div className="hidden md:flex items-center gap-8">
          <NavItem
            icon={<Compass className="w-5 h-5" />}
            label="Explore"
            active={currentTab === "trending" && !initialQuery}
            onClick={() => navigateToTab("trending")}
          />
          <NavItem
            icon={<FolderOpen className="w-5 h-5" />}
            label="Local"
            active={currentTab === "local"}
            onClick={() => navigateToTab("local")}
          />
          <NavItem
            icon={<Heart className="w-5 h-5" />}
            label="Liked"
            active={currentTab === "liked"}
            onClick={() => navigateToTab("liked")}
          />
          <NavItem
            icon={<History className="w-5 h-5" />}
            label="History"
            active={currentTab === "history"}
            onClick={() => navigateToTab("history")}
          />
        </div>

        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all p-0 w-8 h-8 md:w-10 md:h-10 shrink-0"
              >
                <Avatar className="h-full w-full">
                  <AvatarImage
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                  />
                  <AvatarFallback className="bg-primary text-black font-black">
                    U
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className="bg-black border-primary/20 text-primary w-64 p-3 rounded-[1.5rem] shadow-2xl"
              align="end"
            >
              <DropdownMenuLabel className="font-black text-sm tracking-widest px-3 py-2 uppercase">
                My Sanctuary
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem onClick={() => navigateToTab("local")} className="font-bold uppercase text-[10px] tracking-widest">
                <FolderOpen className="w-4 h-4 mr-2" /> Local Archives
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToTab("history")} className="font-bold uppercase text-[10px] tracking-widest">
                <History className="w-4 h-4 mr-2" /> History Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigateToTab("liked")} className="font-bold uppercase text-[10px] tracking-widest">
                <Heart className="w-4 h-4 mr-2" /> Liked Tracks
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/10" />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive font-bold uppercase text-[10px] tracking-widest">
                <LogOut className="w-4 h-4 mr-2" /> Exit Sanctuary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {isMobileSearchOpen && (
        <div className="fixed inset-0 bg-black z-[100] p-6 flex flex-col animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4 mb-10">
            <Button variant="ghost" size="icon" className="text-primary" onClick={() => setIsMobileSearchOpen(false)}>
              <X className="w-8 h-8" />
            </Button>
            <div className="flex-1 flex items-center gap-2 relative">
              <Input
                autoFocus
                className="flex-1 bg-white/5 border-primary/20 h-14 rounded-2xl font-black text-primary placeholder:text-primary/20"
                placeholder="Search archives..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button size="icon" onClick={handleSearch} className="bg-primary text-black rounded-xl h-14 w-14 shrink-0">
                <ArrowRight className="w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavItem = ({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void; }) => (
  <button onClick={onClick} className={`flex items-center gap-3 transition-all duration-300 group ${active ? 'text-primary' : 'text-primary/40 hover:text-primary'}`}>
    <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
    <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>{label}</span>
  </button>
);
