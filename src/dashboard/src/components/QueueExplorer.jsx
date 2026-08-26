import React from 'react';
import { Search, Layers, RefreshCw } from 'lucide-react';
import QueueItemCard from './QueueItemCard';

export default function QueueExplorer({
     applications,
     queueFilter,
     setQueueFilter,
     searchText,
     setSearchText,
     solverAnswers,
     handleSolverChange,
     submitAnswers,
     solverSubmitLoading,
     requeueLoading,
     requeueApp
}) {
     const filteredApps = applications.filter(app => {
          const matchesFilter = queueFilter === 'ALL' || app.status === queueFilter;
          const matchesSearch =
               searchText === '' ||
               app.title.toLowerCase().includes(searchText.toLowerCase()) ||
               app.company.toLowerCase().includes(searchText.toLowerCase()) ||
               (app.location && app.location.toLowerCase().includes(searchText.toLowerCase()));
          return matchesFilter && matchesSearch;
     });

     const categories = [
          { id: 'ALL', label: 'All Jobs' },
          { id: 'QUEUED', label: 'Queued' },
          { id: 'APPLIED', label: 'Applied' },
          { id: 'NEEDS_USER_INPUT', label: 'Needs input' },
          { id: 'FAILED', label: 'Failed' },
          { id: 'SKIPPED', label: 'Skipped' }
     ];

     return (
          <div className="space-y-6 animate-fadeIn">
               {/* Search and Filters navigation bar */}
               <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-950/20 p-4 border border-white/[0.03] rounded-2xl">
                    {/* Chips filters */}
                    <div className="flex flex-wrap gap-1.5 matches-scrollbar">
                         {categories.map((c) => (
                              <button
                                   key={c.id}
                                   onClick={() => setQueueFilter(c.id)}
                                   className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${queueFilter === c.id
                                             ? 'bg-gradient-to-r from-orange-500/10 to-pink-500/10 text-orange-400 border-orange-500/30 shadow-md shadow-orange-500/2'
                                             : 'bg-slate-900/60 border-slate-850 hover:border-slate-750 text-slate-400 hover:text-slate-205'
                                        }`}
                              >
                                   {c.label}
                              </button>
                         ))}
                    </div>

                    {/* Search Input bar */}
                    <div className="relative w-full md:max-w-xs">
                         <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                         <input
                              type="text"
                              placeholder="Search job title, company, town..."
                              value={searchText}
                              onChange={(e) => setSearchText(e.target.value)}
                              className="w-full bg-slate-900/60 border border-slate-850 hover:border-slate-750 focus:border-orange-500/50 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-colors ring-1 ring-white/[0.01]"
                         />
                    </div>
               </div>

               {/* Cards list */}
               <div className="space-y-4">
                    {filteredApps.map((app) => (
                         <QueueItemCard
                              key={app.application_id}
                              app={app}
                              solverAnswers={solverAnswers[app.application_id]}
                              handleSolverChange={handleSolverChange}
                              submitAnswers={submitAnswers}
                              isSolverSubmitting={solverSubmitLoading[app.application_id]}
                              requeueLoading={requeueLoading[app.application_id]}
                              requeueApp={requeueApp}
                         />
                    ))}

                    {filteredApps.length === 0 && (
                         <div className="text-center text-slate-500 py-16 bg-slate-900/10 border border-white/[0.03] border-dashed rounded-2xl">
                              <Layers className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                              <span className="text-sm font-semibold block text-slate-400">No applications indexed</span>
                              <p className="text-[10px] text-slate-500 mt-1">Refine your keyword search tags or adjust active filters above.</p>
                         </div>
                    )}
               </div>
          </div>
     );
}
