import React from 'react';
import { RefreshCw, Activity, MapPin, AlertCircle, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function RecentActivity({ applications, fetchApplications }) {
     return (
          <section className="glass-panel rounded-2xl p-8 border border-white/[0.04] bg-slate-900/30 shadow-lg">
               <div className="flex items-center justify-between border-b border-white/5 pb-5 mb-5">
                    <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2.5">
                         <div className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/20 text-orange-400 shadow-inner">
                              <Activity className="w-4.5 h-4.5" />
                         </div>
                         <span>Recent activity logs</span>
                    </h2>
                    <button
                         onClick={fetchApplications}
                         className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
                         title="Refresh activities list"
                    >
                         <RefreshCw className="w-4.5 h-4.5" />
                    </button>
               </div>

               <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                    {applications.slice(0, 10).map((app) => (
                         <div
                              key={app.application_id}
                              className="pt-4 first:pt-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 group hover:bg-white/[0.015] -mx-3 px-4 py-3.5 rounded-2xl transition-all"
                         >
                              {/* Title and location capsules details highlights */}
                              <div className="space-y-2.5 min-w-0 flex-1">
                                   <span className="text-base font-bold text-slate-100 block truncate group-hover:text-orange-405 transition-colors tracking-tight">
                                        {app.title}
                                   </span>

                                   <div className="flex flex-wrap items-center gap-2.5 text-xs">
                                        {/* Company capsule */}
                                        <span className="font-bold text-slate-200 bg-slate-900 border border-white/5 px-3 py-1 rounded-lg select-none">
                                             {app.company}
                                        </span>

                                        {/* Location capsule highlight */}
                                        {app.location && (
                                             <span className="flex items-center gap-1.5 bg-indigo-500/5 text-indigo-305 border border-indigo-500/10 px-3 py-1 rounded-lg select-none">
                                                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                                                  {app.location}
                                             </span>
                                        )}
                                   </div>
                              </div>

                              {/* Badge & Dates column */}
                              <div className="flex items-center justify-between sm:justify-end gap-3.5 flex-shrink-0">
                                   {/* Highlight NEEDS_USER_INPUT/NEEDS_USER_ACTION status badge with warning glow */}
                                   {app.status === 'NEEDS_USER_INPUT' || app.status === 'NEEDS_USER_ACTION' ? (
                                        <span className="flex items-center gap-1.5 text-[10px] font-black px-3.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-550/30 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse uppercase tracking-wider relative select-none">
                                             <AlertCircle className="w-4 h-4 text-rose-400" />
                                             Action Required
                                        </span>
                                   ) : app.status === 'APPLIED' ? (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider select-none">
                                             <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                             Applied
                                        </span>
                                   ) : app.status === 'QUEUED' ? (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-wider select-none">
                                             <Clock className="w-4 h-4 text-teal-400" />
                                             Queued
                                        </span>
                                   ) : app.status === 'SKIPPED' ? (
                                        <span className="text-[10px] font-medium px-3 py-1.5 rounded-xl bg-slate-900 border border-white/5 text-slate-500 uppercase tracking-wider select-none">
                                             Skipped
                                        </span>
                                   ) : (
                                        <span className="flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-455 border border-rose-500/20 uppercase tracking-wider select-none">
                                             <XCircle className="w-4 h-4 text-rose-455" />
                                             Failed
                                        </span>
                                   )}

                                   <span className="text-xs text-slate-400 font-bold font-mono select-none">
                                        {new Date(app.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                   </span>
                              </div>
                         </div>
                    ))}

                    {applications.length === 0 && (
                         <div className="text-center text-xs text-slate-500 py-12">
                              No application events indexed yet. Run crawler searches to register items.
                         </div>
                    )}
               </div>
          </section>
     );
}
