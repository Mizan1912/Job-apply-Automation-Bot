import React from 'react';
import { LayoutDashboard, Layers, Settings } from 'lucide-react';

export default function Navigation({ activeTab, setActiveTab }) {
     // Configured navigation items
     const navItems = [
          { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
          { id: 'queue', label: 'Applications Queue', icon: Layers },
          { id: 'config', label: 'Bot Overrides', icon: Settings },
     ];

     return (
          <nav className="flex items-center gap-1.5 bg-slate-950/40 p-1.5 border border-white/[0.04] rounded-2xl mb-8 max-w-md shadow-inner relative">
               {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                         <button
                              key={item.id}
                              onClick={() => setActiveTab(item.id)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 relative overflow-hidden select-none cursor-pointer ${isActive
                                        ? 'bg-slate-900 border border-white/[0.05] text-orange-450 shadow-md shadow-slate-950/40'
                                        : 'text-slate-400 hover:text-slate-200 border border-transparent hover:bg-slate-900/20'
                                   }`}
                         >
                              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 text-orange-405' : 'text-slate-500'}`} />
                              <span>{item.label}</span>
                              {isActive && (
                                   <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-gradient-to-r from-orange-500 to-pink-500 rounded-full" />
                              )}
                         </button>
                    );
               })}
          </nav>
     );
}
