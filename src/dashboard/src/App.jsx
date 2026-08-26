import React, { useState, useEffect } from 'react';
import {
     LayoutDashboard,
     Layers,
     Settings,
     AlertTriangle,
     Bot,
     Globe,
     Cpu
} from 'lucide-react';

import Header from './components/Header';
import StatsCards from './components/StatsCards';
import RecentActivity from './components/RecentActivity';
import QueueExplorer from './components/QueueExplorer';
import BotConfigurationForm from './components/BotConfigurationForm';

export default function App() {
     const [activeTab, setActiveTab] = useState('dashboard');
     const [queueFilter, setQueueFilter] = useState('ALL');

     // Stats Counters state
     const [stats, setStats] = useState({
          total: 0,
          applied: 0,
          waiting: 0,
          queued: 0,
          failed: 0,
          dryRun: true,
          isWorkerRunning: false
     });

     const [applications, setApplications] = useState([]);
     const [settings, setSettings] = useState({});
     const [settingsLoading, setSettingsLoading] = useState(false);
     const [settingsSavedMsg, setSettingsSavedMsg] = useState('');
     const [searchText, setSearchText] = useState('');
     const [solverAnswers, setSolverAnswers] = useState({});

     // Loading triggers
     const [runLoading, setRunLoading] = useState(false);
     const [applyLoading, setApplyLoading] = useState(false);
     const [requeueLoading, setRequeueLoading] = useState({});
     const [solverSubmitLoading, setSolverSubmitLoading] = useState({});

     // Fetch metrics data from APIs
     const fetchStats = async () => {
          try {
               const res = await fetch('/api/stats');
               if (res.ok) {
                    const data = await res.json();
                    setStats(data);
               }
          } catch (err) {
               console.error('Error fetching stats:', err);
          }
     };

     const fetchApplications = async () => {
          try {
               const res = await fetch('/api/applications');
               if (res.ok) {
                    const data = await res.json();
                    setApplications(data);
               }
          } catch (err) {
               console.error('Error fetching applications:', err);
          }
     };

     const fetchSettings = async () => {
          setSettingsLoading(true);
          try {
               const res = await fetch('/api/settings');
               if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
               }
          } catch (err) {
               console.error('Error fetching settings:', err);
          } finally {
               setSettingsLoading(false);
          }
     };

     useEffect(() => {
          fetchStats();
          fetchApplications();
          fetchSettings();

          const interval = setInterval(() => {
               fetchStats();
               fetchApplications();
          }, 5000);

          return () => clearInterval(interval);
     }, []);

     // Actions
     const triggerRun = async () => {
          if (stats.isWorkerRunning || runLoading) return;
          setRunLoading(true);
          try {
               const res = await fetch('/api/trigger-run', { method: 'POST' });
               if (res.ok) {
                    const data = await res.json();
                    alert(data.message || 'Triggered crawler search run in background.');
                    fetchStats();
               } else {
                    const errData = await res.json();
                    alert(`Failed: ${errData.error}`);
               }
          } catch (err) {
               alert(`Network error: ${err.message}`);
          } finally {
               setRunLoading(false);
          }
     };

     const triggerApply = async () => {
          if (stats.isWorkerRunning || applyLoading) return;
          setApplyLoading(true);
          try {
               const res = await fetch('/api/trigger-apply', { method: 'POST' });
               if (res.ok) {
                    const data = await res.json();
                    alert(data.message || 'Triggered application worker in background.');
                    fetchStats();
               } else {
                    const errData = await res.json();
                    alert(`Failed: ${errData.error}`);
               }
          } catch (err) {
               alert(`Network error: ${err.message}`);
          } finally {
               setApplyLoading(false);
          }
     };

     const requeueApp = async (appId) => {
          setRequeueLoading(prev => ({ ...prev, [appId]: true }));
          try {
               const res = await fetch('/api/applications/requeue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: appId })
               });
               if (res.ok) {
                    fetchStats();
                    fetchApplications();
               } else {
                    alert('Failed to requeue application.');
               }
          } catch (err) {
               alert(`Error requeuing: ${err.message}`);
          } finally {
               setRequeueLoading(prev => ({ ...prev, [appId]: false }));
          }
     };

     const handleSolverChange = (appId, questionId, val) => {
          setSolverAnswers(prev => ({
               ...prev,
               [appId]: {
                    ...prev[appId] || {},
                    [questionId]: val
               }
          }));
     };

     const submitAnswers = async (e, appId, questions) => {
          e.preventDefault();
          const appAnswers = solverAnswers[appId] || {};

          const payloadAnswers = [];
          for (const q of questions) {
               const ansVal = appAnswers[q.id]?.trim();
               if (!ansVal) {
                    alert(`Please fill in: "${q.question_text}"`);
                    return;
               }
               payloadAnswers.push({
                    questionId: q.id,
                    answerText: ansVal
               });
          }

          setSolverSubmitLoading(prev => ({ ...prev, [appId]: true }));
          try {
               const res = await fetch('/api/applications/answer', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ applicationId: appId, answers: payloadAnswers })
               });

               if (res.ok) {
                    setSolverAnswers(prev => {
                         const next = { ...prev };
                         delete next[appId];
                         return next;
                    });
                    fetchStats();
                    fetchApplications();
               } else {
                    alert('Failed to submit questionnaire answers.');
               }
          } catch (err) {
               alert(`Submission error: ${err.message}`);
          } finally {
               setSolverSubmitLoading(prev => ({ ...prev, [appId]: false }));
          }
     };

     const handleSettingChange = (key, val) => {
          setSettings(prev => ({ ...prev, [key]: val }));
     };

     const saveSettings = async (e) => {
          e.preventDefault();
          setSettingsLoading(true);
          setSettingsSavedMsg('');
          try {
               const res = await fetch('/api/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(settings)
               });
               if (res.ok) {
                    setSettingsSavedMsg('Settings saved overrides updated!');
                    fetchStats();
                    fetchSettings();
                    setTimeout(() => setSettingsSavedMsg(''), 5500);
               } else {
                    alert('Failed to save settings overrides.');
               }
          } catch (err) {
               alert(`Network error saving settings: ${err.message}`);
          } finally {
               setSettingsLoading(false);
          }
     };

     // Navigations listings
     const navItems = [
          { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
          { id: 'queue', label: 'Applications Queue', icon: Layers },
          { id: 'config', label: 'Bot Overrides', icon: Settings },
     ];

     // Map header title
     const getHeaderTitle = () => {
          if (activeTab === 'dashboard') return 'Monitor Overview';
          if (activeTab === 'queue') return 'Queue Management';
          if (activeTab === 'config') return 'System Configuration Settings';
          return 'N-Bot Dashboard';
     };

     return (
          <div className="flex min-h-screen bg-zinc-950 text-zinc-50 font-sans">

               {/* LEFT COLUMN: Vertical Sidebar Panel */}
               <aside className="w-72 border-r border-zinc-800 bg-zinc-900/30 flex flex-col justify-between flex-shrink-0 select-none">

                    {/* Top: Branding and Navigation */}
                    <div className="p-8 space-y-10">
                         {/* Logo Section */}
                         <div className="flex items-center gap-3.5">
                              <div className="p-2.5 bg-zinc-800 border border-zinc-700/80 rounded-xl">
                                   <Bot className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                   <h2 className="text-base font-extrabold text-zinc-50 tracking-wider font-mono">
                                        N-BOT AUTOMATION
                                   </h2>
                                   <span className="text-xs text-zinc-400 font-semibold">v1.2.0 production</span>
                              </div>
                         </div>

                         {/* Navigation Links */}
                         <nav className="space-y-2">
                              {navItems.map((item) => {
                                   const Icon = item.icon;
                                   const isActive = activeTab === item.id;
                                   return (
                                        <button
                                             key={item.id}
                                             onClick={() => setActiveTab(item.id)}
                                             className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer ${isActive
                                                       ? 'bg-zinc-800 text-white border-l-2 border-white pl-5 shadow-md'
                                                       : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/40'
                                                  }`}
                                        >
                                             <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-550'}`} />
                                             <span>{item.label}</span>
                                        </button>
                                   );
                              })}
                         </nav>
                    </div>

                    {/* Bottom: Daemon Info Indicator Panel */}
                    <div className="p-6 border-t border-zinc-800/80 bg-zinc-950/40 text-xs text-zinc-400 space-y-3">
                         <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                   <Globe className="w-4 h-4 text-zinc-400" />
                                   <span>Host Address:</span>
                              </span>
                              <span className="font-mono text-sm text-zinc-200">port 3000</span>
                         </div>
                         <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                   <Cpu className="w-4 h-4 text-zinc-400" />
                                   <span>Daemon Engine:</span>
                              </span>
                              <span className="font-mono text-sm text-zinc-200 uppercase font-bold">
                                   {stats.dryRun ? 'Simulator' : 'Live Agent'}
                              </span>
                         </div>
                    </div>

               </aside>

               {/* RIGHT COLUMN: Client Contents Pane */}
               <main className="flex-1 p-10 overflow-y-auto max-w-7xl mx-auto w-full">
                    {/* Consolidated SaaS Header with trigger buttons */}
                    <Header
                         title={getHeaderTitle()}
                         isWorkerRunning={stats.isWorkerRunning}
                         runLoading={runLoading}
                         applyLoading={applyLoading}
                         triggerRun={triggerRun}
                         triggerApply={triggerApply}
                    />

                    {/* Main tabs panels updates */}
                    {activeTab === 'dashboard' && (
                         <div className="space-y-8 animate-fadeIn">
                              {/* Stats numbers counts */}
                              <StatsCards stats={stats} />

                              {/* Warning alert if applications waiting */}
                              {stats.waiting > 0 && (
                                   <section className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                                        <div className="space-y-1">
                                             <span className="text-sm font-bold text-amber-300">
                                                  {stats.waiting} Job Application{stats.waiting > 1 ? 's require' : ' requires'} verification or replies
                                             </span>
                                             <p className="text-xs text-zinc-400">
                                                  The browser encountered questions during crawl. Please proceed to the{' '}
                                                  <button
                                                       onClick={() => { setActiveTab('queue'); setQueueFilter('NEEDS_USER_INPUT'); }}
                                                       className="text-amber-400 font-bold underline hover:text-amber-300 cursor-pointer"
                                                  >
                                                       queue manager
                                                  </button>{' '}
                                                  to supply answers and unlock automation threads.
                                             </p>
                                        </div>
                                   </section>
                              )}

                              {/* Logs activity registry */}
                              <RecentActivity
                                   applications={applications}
                                   fetchApplications={fetchApplications}
                              />
                         </div>
                    )}

                    {activeTab === 'queue' && (
                         <QueueExplorer
                              applications={applications}
                              queueFilter={queueFilter}
                              setQueueFilter={setQueueFilter}
                              searchText={searchText}
                              setSearchText={setSearchText}
                              solverAnswers={solverAnswers}
                              handleSolverChange={handleSolverChange}
                              submitAnswers={submitAnswers}
                              solverSubmitLoading={solverSubmitLoading}
                              requeueLoading={requeueLoading}
                              requeueApp={requeueApp}
                         />
                    )}

                    {activeTab === 'config' && (
                         <BotConfigurationForm
                              settings={settings}
                              handleSettingChange={handleSettingChange}
                              saveSettings={saveSettings}
                              fetchSettings={fetchSettings}
                              settingsLoading={settingsLoading}
                              settingsSavedMsg={settingsSavedMsg}
                         />
                    )}
               </main>

          </div>
     );
}
