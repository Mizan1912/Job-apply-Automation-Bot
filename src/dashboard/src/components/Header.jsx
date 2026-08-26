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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-zinc-800 pb-6 mb-10">
               {/* Top Left: Title */}
               <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">
                         {title}
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1.5">
                         Job crawler indexing engine & automated submission supervisor.
                    </p>
               </div>

               {/* Top Right: Actions & State Pulses */}
               <div className="flex flex-wrap items-center gap-4">
                    {/* Active daemon status capsule */}
                    <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-xs select-none text-zinc-300 font-bold uppercase tracking-wider shadow-inner">
                         <span className="relative flex h-2.5 w-2.5 mr-1.5">
                              {isWorkerRunning ? (
                                   <>
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                   </>
                              ) : (
                                   <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-zinc-700"></span>
                              )}
                         </span>
                         {isWorkerRunning ? 'Worker Active' : 'Worker Idle'}
                    </div>

                    {/* CTA 1: Force Search & Apply (Vercel-style clean white button) */}
                    <button
                         onClick={triggerRun}
                         disabled={isWorkerRunning || runLoading}
                         className="bg-white hover:bg-zinc-200 text-zinc-950 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] outline-none"
                    >
                         {runLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                         ) : (
                              <RefreshCw className="w-4 h-4 text-zinc-950" />
                         )}
                         <span>Search & Apply</span>
                    </button>

                    {/* CTA 2: Force Process Queue (Slate-charcoal dark button) */}
                    <button
                         onClick={triggerApply}
                         disabled={isWorkerRunning || applyLoading}
                         className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-100 px-5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer active:scale-[0.98] shadow-sm outline-none"
                    >
                         {applyLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                         ) : (
                              <Send className="w-4 h-4 text-zinc-400" />
                         )}
                         <span>Process Queue</span>
                    </button>
               </div>
          </div>
     );
}
