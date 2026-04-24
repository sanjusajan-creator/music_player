
"use client";

import React, { useState, useEffect } from 'react';
import { usePlayerStore, AudioQuality, StreamingMode } from '@/store/usePlayerStore';
import { 
  Settings, Volume2, Music, Type, Shuffle, 
  Database, Trash2, CloudOff, Info, ChevronRight,
  HardDrive, Zap, Headphones, Languages
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

export const SettingsView = () => {
  const { settings, updateSettings, currentTrack } = usePlayerStore();
  const [cachedCount, setCachedCount] = useState(0);

  useEffect(() => {
    // Simulate cache count from localStorage
    const count = Object.keys(localStorage).filter(k => k.startsWith('vibecraft-')).length;
    setCachedCount(count);
  }, []);

  const clearCache = () => {
    // Clear only specific cache keys
    const keys = Object.keys(localStorage).filter(k => k.startsWith('vibecraft-search-'));
    keys.forEach(k => localStorage.removeItem(k));
    setCachedCount(0);
    toast({ title: "Sanctuary Cleared", description: "Local archives have been reset." });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="space-y-2">
        <h1 className="text-4xl md:text-6xl font-black text-white gold-glow uppercase tracking-tighter">Sanctuary Core</h1>
        <p className="text-[10px] text-primary/40 font-black uppercase tracking-[0.5em]">Adjusting the Sovereign Manifestation</p>
      </header>

      {/* Playback Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-primary">
          <Zap className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em]">Playback Engine</h2>
        </div>
        
        <div className="bg-white/5 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          <SettingsItem 
            icon={<Headphones />} 
            title="Audio Quality" 
            description="Manifest high-fidelity bitstreams"
          >
            <Select 
              value={settings.audioQuality} 
              onValueChange={(v) => updateSettings({ audioQuality: v as AudioQuality })}
            >
              <SelectTrigger className="w-[120px] bg-black/40 border-primary/20 text-xs font-black uppercase">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-900 border-primary/10 text-white font-black uppercase text-[10px]">
                <SelectItem value="low">Low (64k)</SelectItem>
                <SelectItem value="medium">Medium (128k)</SelectItem>
                <SelectItem value="high">High (320k)</SelectItem>
                <SelectItem value="auto">Auto</SelectItem>
              </SelectContent>
            </Select>
          </SettingsItem>

          <SettingsItem 
            icon={<Languages />} 
            title="Data Saver" 
            description="Automatically reduce quality tiers"
          >
            <Switch 
              checked={settings.dataSaver} 
              onCheckedChange={(v) => updateSettings({ dataSaver: v })} 
              className="data-[state=checked]:bg-primary"
            />
          </SettingsItem>

          <SettingsItem 
            icon={<Shuffle />} 
            title="Autoplay" 
            description="Manifest similar tracks when queue ends"
          >
            <Switch 
              checked={settings.autoplaySimilar} 
              onCheckedChange={(v) => updateSettings({ autoplaySimilar: v })} 
              className="data-[state=checked]:bg-primary"
            />
          </SettingsItem>
        </div>
      </section>

      {/* Lyrics Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-primary">
          <Type className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em]">The Scroll (Lyrics)</h2>
        </div>
        
        <div className="bg-white/5 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          <SettingsItem 
            icon={<Music />} 
            title="Show Lyrics" 
            description="Manifest the Oracle's scroll"
            disabled={currentTrack && !currentTrack.hasLyrics}
          >
            <Switch 
              checked={settings.showLyrics} 
              onCheckedChange={(v) => updateSettings({ showLyrics: v })} 
              className="data-[state=checked]:bg-primary"
            />
          </SettingsItem>

          <SettingsItem 
            icon={<Type />} 
            title="Auto-Scroll" 
            description="Synchronize scroll with playback"
          >
            <Switch 
              checked={settings.autoScrollLyrics} 
              onCheckedChange={(v) => updateSettings({ autoScrollLyrics: v })} 
              className="data-[state=checked]:bg-primary"
            />
          </SettingsItem>
        </div>
      </section>

      {/* Cache Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 text-primary">
          <Database className="w-5 h-5" />
          <h2 className="text-sm font-black uppercase tracking-[0.3em]">Sanctuary Vault</h2>
        </div>
        
        <div className="bg-white/5 rounded-3xl border border-white/5 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <HardDrive className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-white font-black uppercase tracking-tighter">Local Archives</span>
                <span className="text-[10px] font-black text-primary/40 uppercase tracking-widest">{cachedCount} Manifestations Cached</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              onClick={clearCache} 
              className="text-red-500 hover:text-red-400 font-black uppercase text-[10px] tracking-widest gap-2"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </Button>
          </div>
        </div>
      </section>

      {/* Info Section */}
      <footer className="pt-10 flex flex-col items-center gap-4 opacity-20">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em]">Vibecraft v3.0 | AMOLED Gold Edition</span>
        </div>
        <p className="text-[8px] font-black uppercase tracking-widest text-center">Built for High-Fidelity Manifestation using the Sovereign JioSaavn & YouTube Hybrid Engine.</p>
      </footer>
    </div>
  );
};

const SettingsItem = ({ 
  icon, 
  title, 
  description, 
  children, 
  disabled = false 
}: { 
  icon: React.ReactNode, 
  title: string, 
  description: string, 
  children: React.ReactNode,
  disabled?: boolean
}) => (
  <div className={`p-6 flex items-center justify-between transition-opacity ${disabled ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
    <div className="flex gap-4 items-center">
      <div className="text-primary/60">{icon}</div>
      <div className="flex flex-col">
        <span className="text-sm font-black text-white uppercase tracking-tighter">{title}</span>
        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{description}</span>
      </div>
    </div>
    {children}
  </div>
);
