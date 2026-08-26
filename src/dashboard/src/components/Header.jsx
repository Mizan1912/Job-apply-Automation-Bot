import React from 'react';
import { RefreshCw, Send, Loader2 } from 'lucide-react';

export default function Header({
     title,
     isWorkerRunning,
     runLoading,
     applyLoading,
     triggerRun,
     triggerApply
}) {
     return (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-zinc-800 pb-5 mb-8">
               {/* Top Left: Title */}
               <div>
                    <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                         {title}
                    </h1>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                         Job crawler indexing engine & automated submission supervisor.
                    </p>
               </div>

               {/* Top Right: Actions & State Pulses */}
               <div className="flex flex-wrap items-center gap-3">
                    {/* Active daemon status capsule */}
                    <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-[10px] select-none text-zinc-400 font-bold uppercase tracking-wider">
                         <span className="relative flex h-2 w-2 mr-1">
                              {isWorkerRunning ? (
                                   <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                   </>
                              ) : (
                                   <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-700"></span>
                              )}
                         </span>
                         {isWorkerRunning ? 'Worker Active' : 'Worker Idle'}
                    </div>

                    {/* CTA 1: Force Search & Apply (Vercel-style clean white button) */}
                    <button
                         onClick={triggerRun}
                         disabled={isWorkerRunning || runLoading}
                         className="bg-white hover:bg-zinc-200 text-zinc-950 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-[0.98] outline-none"
                    >
                         {runLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-950" />
                         ) : (
                              <RefreshCw className="w-3.5 h-3.5 text-zinc-950" />
                         )}
                         <span>Search & Apply</span>
                    </button>

                    {/* CTA 2: Force Process Queue (Slate-charcoal dark button) */}
                    <button
                         onClick={triggerApply}
                         disabled={isWorkerRunning || applyLoading}
                         className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 px-4 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] outline-none"
                    >
                         {applyLoading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                         ) : (
                              <Send className="w-3.5 h-3.5 text-zinc-400" />
                         )}
                         <span>Process Queue</span>
                    </button>
               </div>
          </div>
     );
}
