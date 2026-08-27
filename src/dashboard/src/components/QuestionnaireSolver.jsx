import React from 'react';
import { Clock, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function QuestionnaireSolver({ questions, appId, solverAnswers, handleSolverChange, submitAnswers, isSubmitting }) {
     return (
          <form
               onSubmit={(e) => submitAnswers(e, appId, questions)}
               className="bg-amber-500/[0.03] border border-amber-500/20 rounded-2xl p-5 max-w-xl space-y-4 shadow-md backdrop-blur-sm relative overflow-hidden"
          >
               {/* Visual background ambient highlight */}
               <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-xl pointer-events-none rounded-full" />

               <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
                    <div className="p-1 px-1.5 bg-amber-550/15 text-amber-500 rounded-lg border border-amber-500/20">
                         <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                         <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                              Interactive Questionnaire Solver
                         </h4>
                         <p className="text-[9px] text-slate-500 mt-0.5">Please supply answers to resume automated submission.</p>
                    </div>
               </div>

               <div className="space-y-4">
                    {questions.map((q) => {
                         let parsedOptions = null;
                         if (q.options) {
                              try {
                                   parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
                              } catch (e) {
                                   console.error("Failed to parse options for question: " + q.id, e);
                              }
                         }

                         const isRadio = q.question_type === 'radio' && Array.isArray(parsedOptions) && parsedOptions.length > 0;
                         const isSelect = q.question_type === 'select' && Array.isArray(parsedOptions) && parsedOptions.length > 0;

                         return (
                              <div key={q.id} className="space-y-2">
                                   <div className="flex items-center justify-between">
                                        <label className="block text-xs font-semibold text-slate-300">
                                             {q.question_text}
                                        </label>
                                        {q.question_type && q.question_type !== 'text' && (
                                             <span className="text-[9px] bg-slate-800/80 text-amber-400 border border-slate-700/40 px-1.5 py-0.5 rounded uppercase font-mono tracking-wider scale-90">
                                                  {q.question_type}
                                             </span>
                                        )}
                                   </div>

                                   {isRadio ? (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                             {parsedOptions.map((opt) => (
                                                  <button
                                                       key={opt}
                                                       type="button"
                                                       onClick={() => handleSolverChange(appId, q.id, opt)}
                                                       className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${solverAnswers[q.id] === opt
                                                                 ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-sm shadow-amber-500/10'
                                                                 : 'bg-zinc-900/60 border-slate-850 hover:border-slate-800 text-slate-350'
                                                            }`}
                                                  >
                                                       {opt}
                                                  </button>
                                             ))}
                                        </div>
                                   ) : isSelect ? (
                                        <select
                                             required
                                             value={solverAnswers[q.id] || ''}
                                             onChange={(e) => handleSolverChange(appId, q.id, e.target.value)}
                                             className="w-full bg-slate-900/60 border border-slate-850 hover:border-slate-800 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-all"
                                        >
                                             <option value="" disabled className="text-slate-500 bg-zinc-950">
                                                  Select an option...
                                             </option>
                                             {parsedOptions.map((opt) => (
                                                  <option key={opt} value={opt} className="bg-zinc-950 text-slate-200">
                                                       {opt}
                                                  </option>
                                             ))}
                                        </select>
                                   ) : (
                                        <input
                                             type="text"
                                             required
                                             value={solverAnswers[q.id] || ''}
                                             onChange={(e) => handleSolverChange(appId, q.id, e.target.value)}
                                             placeholder="Enter answer (e.g. Yes, 2 Years, Immediate)..."
                                             className="w-full bg-slate-900/60 border border-slate-850 hover:border-slate-800 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-all placeholder-slate-650"
                                        />
                                   )}
                              </div>
                         );
                    })}
               </div>

               <div className="pt-2">
                    <button
                         type="submit"
                         disabled={isSubmitting}
                         className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/5 text-bold"
                    >
                         {isSubmitting ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                         ) : (
                              <CheckCircle className="w-3.5 h-3.5" />
                         )}
                         Submit Reply & Enqueue
                    </button>
               </div>
          </form>
     );
}
