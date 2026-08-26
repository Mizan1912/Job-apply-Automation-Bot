import React from 'react';
import { Layers, CheckCircle2, HelpCircle, RefreshCw, AlertOctagon } from 'lucide-react';

export default function StatsCards({ stats }) {
     const cards = [
          {
               label: 'Total Discovered',
               value: stats.total,
               icon: Layers,
               theme: 'from-purple-500/5 to-indigo-500/5 border-purple-500/20 text-purple-400 bg-purple-500/10 shadow-purple-500/5',
               desc: 'Accrued system database index records count'
          },
          {
               label: 'Successfully Applied',
               value: stats.applied,
               icon: CheckCircle2,
               theme: 'from-emerald-500/5 to-teal-500/5 border-emerald-500/20 text-emerald-400 bg-emerald-500/10 shadow-emerald-500/5',
               desc: 'Completed corporate applications processed'
          },
          {
               label: 'Needs User Input',
               value: stats.waiting,
               icon: HelpCircle,
               theme: 'from-amber-500/5 to-yellow-550/5 border-amber-500/20 text-amber-400 bg-amber-500/10 shadow-amber-500/5',
               desc: 'Forms containing critical pending questions',
               badgePulse: stats.waiting > 0
          },
          {
               label: 'Currently Queued',
               value: stats.queued,
               icon: RefreshCw,
               theme: 'from-cyan-500/5 to-sky-500/5 border-cyan-500/20 text-cyan-400 bg-cyan-500/10 shadow-cyan-500/5',
               desc: 'Jobs pending submission triggers',
               spin: stats.isWorkerRunning
          },
          {
               label: 'Failed Processing',
               value: stats.failed,
               icon: AlertOctagon,
               theme: 'from-rose-500/5 to-red-500/5 border-rose-500/20 text-rose-455 bg-rose-500/10 shadow-rose-500/5',
               desc: 'Playwright errors or timeout exceptions'
          }
     ];

     return (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
               {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                         <div
                              key={idx}
                              className={`glass-panel rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between min-h-[140px] relative bg-slate-900/30 ${card.theme} hover:shadow-lg`}
                         >
                              <div className="flex items-start justify-between">
                                   <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                                        {card.label}
                                   </span>
                                   <div className={`p-2 rounded-xl border border-white/[0.04] ${card.bg}`}>
                                        <Icon className={`w-4 h-4 ${card.spin ? 'animate-spin text-cyan-400' :
                                                  card.badgePulse ? 'animate-pulse' : ''
                                             }`} />
                                   </div>
                              </div>

                              <div className="mt-4 space-y-1">
                                   <span className="text-2xl font-black font-mono tracking-tight text-white block">
                                        {card.value}
                                   </span>
                                   <p className="text-[9px] text-slate-500 font-medium leading-normal">
                                        {card.desc}
                                   </p>
                              </div>

                              {/* Glowing spot overlay */}
                              <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-white/2 rounded-full blur-xl pointer-events-none" />
                         </div>
                    );
               })}
          </div>
     );
}
