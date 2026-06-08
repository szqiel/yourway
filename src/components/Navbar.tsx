"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, Compass, Gear, User } from "@phosphor-icons/react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navItems = [
    { name: "Dashboard", path: "/dashboard", icon: BookOpen },
    { name: "Forge Path", path: "/generate", icon: Compass },
    { name: "Codex Profile", path: "/profile", icon: Gear },
  ];

  return (
    <header className="w-full border-[3px] border-black p-4 bg-panel-dark shadow-[4px_4px_0_0_#0c0d10] rounded-md flex flex-col md:flex-row items-center justify-between gap-4 select-none">
      {/* Brand Logo */}
      <div 
        onClick={() => router.push("/")}
        className="flex items-center gap-3 cursor-pointer group"
      >
        <div className="w-8 h-8 border-[3px] border-black flex items-center justify-center font-mono font-black text-sm bg-retro-amber text-black shadow-[2px_2px_0_0_#000] group-hover:bg-retro-cyan transition-colors">
          Y
        </div>
        <span className="font-pixel text-xl tracking-wider text-white group-hover:text-retro-cyan transition-colors uppercase font-bold">
          YOURWAY
        </span>
      </div>

      {/* Navigation Buttons */}
      <nav className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`active-press font-pixel px-4 py-1.5 text-sm uppercase tracking-wide border-2 border-black rounded transition-all cursor-pointer flex items-center gap-2 ${
                isActive
                  ? "bg-retro-cyan text-black font-bold shadow-[2px_2px_0_0_#000] translate-y-0"
                  : "bg-[#262b35] text-text-muted hover:text-white hover:border-retro-amber"
              }`}
            >
              <Icon size={14} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* User Session HUD Badge */}
      <div className="flex items-center gap-2 font-mono text-[10px] bg-[#121317] border border-black px-3 py-1.5 rounded text-text-muted">
        <User size={12} className={user ? "text-retro-green" : "text-retro-amber"} />
        <span className="uppercase font-bold tracking-wider font-pixel text-xs">
          {user ? `USER: ${user.email}` : "SLOT: GUEST SESSION"}
        </span>
      </div>
    </header>
  );
}
