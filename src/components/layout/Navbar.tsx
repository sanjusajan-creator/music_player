import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Sidebar } from "@/components/layout/Sidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";

import {
  Search,
  Menu,
  Compass,
  Heart,
  History,
  X,
  ArrowRight,
  LogOut,
} from "lucide-react";

import {
  getAuth,
  signOut
} from "firebase/auth";

import { useUser } from "@/hooks/useUser"; // adjust if path differs

import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";

export const Navbar: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const { user } = useUser();
  const auth = getAuth();

  const initialQuery = searchParams.get("q") || "";
  const currentTab = searchParams.get("tab") || "trending";

  const [searchValue, setSearchValue] = useState(initialQuery);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

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
          className="text-2xl md:text-3xl font-black text-primary gold-glow cursor-pointer tracking-tighter uppercase leading-none"
          onClick={() => navigateToTab("trending")}
        >
          VIBECRAFT
        </div>
      </div>

      {/* DESKTOP SEARCH */}
      <div className="hidden md:flex flex-1 max-w-xl px-12">
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
      <div className="flex items-center gap-4 md:gap-8">

        {/* MOBILE SEARCH */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-primary h-10 w-10 p-0"
          onClick={() => setIsMobileSearchOpen(true)}
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* MOBILE MENU */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden text-primary"
          onClick={() => setIsMobileSidebarOpen(true)}
        >
          <Menu className="w-6 h-6" />
        </Button>

        {/* DESKTOP NAV */}
        <div className="hidden md:flex items-center gap-8">
          <NavItem
            icon={<Compass />}
            label="Explore"
            active={currentTab === "trending" && !initialQuery}
            onClick={() => navigateToTab("trending")}
          />
          <NavItem
            icon={<Heart />}
            label="Liked"
            active={currentTab === "liked"}
            onClick={() => navigateToTab("liked")}
          />
          <NavItem
            icon={<History />}
            label="History"
            active={currentTab === "history"}
            onClick={() => navigateToTab("history")}
          />
        </div>

        {/* USER MENU */}
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

              <DropdownMenuItem
                onClick={() => navigateToTab("history")}
              >
                History Archive
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigateToTab("liked")}
              >
                Liked Tracks
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-primary/10" />

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Exit Sanctuary
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* MOBILE SEARCH OVERLAY */}
      {isMobileSearchOpen && (
        <div className="fixed inset-0 bg-black z-[100] p-6 flex flex-col">
          <div className="flex items-center gap-4 mb-10">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileSearchOpen(false)}
            >
              <X className="w-8 h-8" />
            </Button>

            <div className="flex-1 flex items-center gap-2">
              <Input
                autoFocus
                className="flex-1"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && handleSearch()
                }
              />

              <Button onClick={handleSearch}>
                <ArrowRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavItem = ({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) => (
  <button onClick={onClick}>
    {icon}
    <span>{label}</span>
  </button>
);