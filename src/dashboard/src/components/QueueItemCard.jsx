import React from 'react';
import { MapPin, Briefcase, Calendar, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import QuestionnaireSolver from './QuestionnaireSolver';

export default function QueueItemCard({
     app,
     solverAnswers,
     handleSolverChange,
     submitAnswers,
     isSolverSubmitting,
     requeueLoading,
     requeueApp
}) {
     return (
          <div className="glass-panel hover:bg-slate-900/40 border border-white/[0.04] bg-slate-900/20 rounded-2xl p-5 flex flex-col md:flex-row md:items-start gap-5 transition-all duration-300 hover:scale-[1.005] group shadow-lg">

               {/* Informative details */}
               <div className="flex-1 space-y-4 min-w-0">
                    <div className="space-y-2.5">
                         <h3 className="text-base font-black text-slate-100 group-hover:text-orange-400 transition-colors tracking-tight">
                              {app.title}
                         </h3>

                         {/* Highlight key metadata inside elegant colorful capsules */}
                         <div className="flex flex-wrap items-center gap-2 text-[10px]">
                              {/* Company name pill */}
                              <span className="font-bold text-slate-200 bg-slate-900 border border-white/5 px-2.5 py-0.5 rounded-lg select-none">
                                   {app.company}
                              </span>

                              {/* Location capsule */}
                              {app.location && (
                                   <span className="flex items-center gap-1 bg-indigo-500/5 text-indigo-300 border border-indigo-500/10 px-2.5 py-0.5 rounded-lg select-none">
                                        <MapPin className="w-3 h-3 text-indigo-405" />
                                        {app.location}
                                   </span>
                              )}

                              {/* Experience level capsule */}
                              {app.experience && (
                                   <span className="flex items-center gap-1 bg-purple-500/5 text-purple-305 border border-purple-500/10 px-2.5 py-0.5 rounded-lg select-none">
                                        <Briefcase className="w-3 h-3 text-purple-400" />
                                        {app.experience}
                                   </span>
                              )}

                              {/* Created date capsule */}
                              <span className="flex items-center gap-1 bg-slate-950/60 text-slate-400 border border-white/[0.03] px-2.5 py-0.5 rounded-lg font-mono text-[9px] select-none">
                                   <Calendar className="w-3 h-3 text-slate-500" />
                                   {new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                         </div>
                    </div>

                    {/* Inline error description block */}
                    {app.error_message && (
                         <div className="flex items-start gap-2.5 bg-rose-500/5 rounded-xl p-3.5 border-l-2 border-rose-500/50 text-rose-300 text-xs leading-relaxed max-w-xl shadow-inner">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-rose-400" />
                              <span className="font-bold text-slate-350">{app.error_message}</span>
                         </div>
                    )}

                    {/* Questionnaire Input Solver box */}
                    {app.status === 'NEEDS_USER_INPUT' && app.questions && app.questions.length > 0 && (
                         <div className="mt-2 text-left">
                              <QuestionnaireSolver
                                   questions={app.questions}
                                   appId={app.application_id}
                                   solverAnswers={solverAnswers || {}}
                                   handleSolverChange={handleSolverChange}
                                   submitAnswers={submitAnswers}
                                   isSubmitting={isSolverSubmitting}
                              />
                         </div>
                    )}
               </div>

               {/* Badges column */}
               <div className="flex md:flex-col items-end justify-between md:justify-start gap-4 border-t md:border-t-0 border-white/5 pt-4 md:pt-0 flex-shrink-0 w-full md:w-auto">
                    {/* Status badge with premium look */}
                    {app.status === 'NEEDS_USER_INPUT' || app.status === 'NEEDS_USER_ACTION' ? (
                         <span className="flex items-center gap-1.5 text-[9px] font-black px-3.5 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.15)] animate-pulse uppercase tracking-wider select-none">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                              Action Required
                         </span>
                    ) : app.status === 'APPLIED' ? (
                         <span className="text-[9px] font-black px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider select-none">
                              applied
                         </span>
                    ) : app.status === 'QUEUED' ? (
                         <span className="text-[9px] font-black px-3 py-1 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 uppercase tracking-wider select-none shadow-sm shadow-teal-500/5">
                              queued
                         </span>
                    ) : app.status === 'SKIPPED' ? (
                         <span className="text-[9px] font-medium px-3 py-1 rounded-xl bg-slate-900 border border-white/5 text-slate-500 uppercase tracking-wider select-none">
                              skipped
                         </span>
                    ) : (
                         <span className="text-[9px] font-black px-3 py-1 bg-rose-500/10 text-rose-455 border border-rose-500/10 uppercase tracking-wider select-none">
                              {app.status.toLowerCase()}
                         </span>
                    )}

                    <div className="flex flex-row md:flex-col gap-2 w-full md:w-32 justify-end">
                         {app.status !== 'QUEUED' && app.status !== 'APPLYING' && (
                              <button
                                   disabled={requeueLoading}
                                   onClick={() => requeueApp(app.application_id)}
                                   className="flex-1 bg-slate-900 hover:bg-slate-850 hover:text-indigo-400 text-slate-350 border border-white/5 hover:border-indigo-500/30 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all duration-200 disabled:opacity-50 cursor-pointer active:scale-95 shadow-[0_0_10px_rgba(99,102,241,0.01)]"
                              >
                                   {requeueLoading ? (
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                   ) : (
                                        <RefreshCw className="w-3.5 h-3.5 text-slate-450" />
                                   )}
                                   Requeue
                              </button>
                         )}

                         <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-orange-455 hover:text-orange-400 font-black text-xs flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500/5 to-pink-500/5 hover:from-orange-500/10 border border-orange-500/15 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                         >
                              Naukri Job
                              <ExternalLink className="w-3.5 h-3.5 text-orange-450" />
                         </a>
                    </div>
               </div>

          </div>
     );
}
