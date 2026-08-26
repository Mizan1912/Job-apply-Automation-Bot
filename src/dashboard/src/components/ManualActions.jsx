import React from 'react';
import { Play, Send, RefreshCw, AlertCircle } from 'lucide-react';

export default function ManualActions({ isWorkerRunning, runLoading, applyLoading, triggerRun, triggerApply }) {
     return (
          <section className="glass-panel hover:ring-white/10 transition-all duration-300 rounded-2xl p-6 border border-white/[0.04] bg-slate-900/30 gap-6 space-y-4">
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                         <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                              <Play className="w-4 h-4 text-orange-400" />
                              Manual Action Triggers
                         </h2>
                         <p className="text-[10px] text-slate-450 mt-0.5">
                              Force crawl searches on naukri portals or process pending applications list immediately.
                         </p>
                    </div>

                    {/* Improved Actions buttons layout: Rectangular rounded-xl shape, custom border glow, shadow effects */}
                    <div className="flex flex-wrap items-center gap-3">
                         {/* Action 1: Search & Process */}
                         <button
                              onClick={triggerRun}
                              disabled={isWorkerRunning || runLoading}
                              className="flex-1 sm:flex-initial bg-gradient-to-r from-orange-500 via-pink-500 to-rose-500 hover:from-orange-600 hover:via-pink-600 hover:to-rose-600 text-slate-950 px-5 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(249,115,22,0.15)] hover:shadow-[0_0_25px_rgba(249,115,22,0.35)] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 cursor-pointer"
                         >
                              {runLoading ? (
                                   <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                              ) : (
                                   <RefreshCw className="w-4 h-4 text-slate-950" />
                              )}
                              Force Search & Apply
                         </button>

                         {/* Action 2: Process Queue */}
                         <button
                              onClick={triggerApply}
                              disabled={isWorkerRunning || applyLoading}
                              className="flex-1 sm:flex-initial bg-slate-900/80 hover:bg-slate-850 hover:text-indigo-400 text-slate-200 border border-white/5 hover:border-indigo-500/30 px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 cursor-pointer shadow-[0_0_10px_rgba(99,102,241,0.02)] hover:shadow-[0_0_20px_rgba(99,102,241,0.12)]"
                         >
                              {applyLoading ? (
                                   <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                   <Send className="w-4 h-4 text-slate-400" />
                              )}
                              Force Process Queue
                         </button>
                    </div>
               </div>

               {isWorkerRunning && (
                    <div className="flex items-center gap-2.5 bg-orange-500/5 text-orange-400 text-xs p-3.5 rounded-xl border border-orange-500/10 animate-pulse">
                         <AlertCircle className="w-4 h-4 flex-shrink-0" />
                         <span>A background task is currently active. Action triggers are safety locked.</span>
                    </div>
               )}
          </section>
     );
}
