import React from 'react';
import { Clock, Sliders, Search, User, AlertCircle, Save, Undo, RefreshCw, HelpCircle } from 'lucide-react';
import TagInput from './TagInput';

export default function BotConfigurationForm({
     settings,
     handleSettingChange,
     saveSettings,
     fetchSettings,
     settingsLoading,
     settingsSavedMsg
}) {
     // Convert comma-separated string configs to arrays for TagInput
     const keywordsArray = settings.keywords
          ? settings.keywords.split(',').map(x => x.trim()).filter(Boolean)
          : [];

     const locationsArray = settings.locations
          ? settings.locations.split(',').map(x => x.trim()).filter(Boolean)
          : [];

     const expArray = settings.experience_filter_ids
          ? settings.experience_filter_ids.split(',').map(x => x.trim()).filter(Boolean)
          : [];

     // Update backend string by joining array items with comma
     const handleKeywordsChange = (tags) => {
          handleSettingChange('keywords', tags.join(', '));
     };

     const handleLocationsChange = (tags) => {
          handleSettingChange('locations', tags.join(', '));
     };

     const handleExpChange = (tags) => {
          // Keep experience IDs cleaned as integers string list
          const cleanedTags = tags.map(t => t.trim()).filter(t => !isNaN(t));
          handleSettingChange('experience_filter_ids', cleanedTags.join(', '));
     };

     return (
          <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
               {/* Configuration Header */}
               <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 border-b border-white/5 pb-6">
                    <div>
                         <h2 className="text-2xl font-extrabold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent flex items-center gap-2.5">
                              <Sliders className="w-6 h-6 text-orange-450" />
                              Control panel settings overrides
                         </h2>
                         <p className="text-sm text-slate-400 mt-1.5">
                              Configure SQLite override triggers. Form inputs shadow your default `.env` properties dynamically.
                         </p>
                    </div>

                    {settingsSavedMsg && (
                         <div className="bg-emerald-500/10 text-emerald-400 text-sm px-5 py-2.5 rounded-xl border border-emerald-500/20 font-bold animate-fadeIn shadow-sm">
                              {settingsSavedMsg}
                         </div>
                    )}
               </div>

               <form onSubmit={saveSettings} className="space-y-8">
                    {/* Section 1: Job Search Criteria (Keywords & Cities) */}
                    <div className="glass-panel hover:ring-white/10 transition-all duration-300 rounded-3xl p-8 border border-white/[0.04] bg-slate-900/30 gap-6 space-y-6">
                         <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                              <div className="p-2.5 bg-gradient-to-br from-orange-500/10 to-pink-500/10 rounded-xl border border-orange-500/10">
                                   <Search className="w-5 h-5 text-orange-400" />
                              </div>
                              <div>
                                   <h3 className="text-base font-bold text-slate-200">Scraper Search Criteria</h3>
                                   <p className="text-xs text-slate-405">Define job queries, Target locations, and matching parameters.</p>
                              </div>
                         </div>

                         <div className="grid grid-cols-1 gap-6">
                              <div className="space-y-2">
                                   <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                             Job Match Keywords
                                             <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">Tag list</span>
                                        </label>
                                        <span className="text-xs text-slate-500 hover:text-slate-400 cursor-help flex items-center gap-1.5 font-medium select-none">
                                             Type text & press Enter / comma
                                             <HelpCircle className="w-3.5 h-3.5" />
                                        </span>
                                   </div>
                                   <TagInput
                                        tags={keywordsArray}
                                        onChange={handleKeywordsChange}
                                        placeholder="e.g. Node.js, React, Frontend, Full Stack"
                                   />
                              </div>

                              <div className="space-y-2">
                                   <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                        Target Cities / Locations
                                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold">Tag list</span>
                                   </label>
                                   <TagInput
                                        tags={locationsArray}
                                        onChange={handleLocationsChange}
                                        placeholder="e.g. Bangalore, Remote, Hybrid, Pune"
                                   />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                   <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                             <label className="text-sm font-bold text-slate-300">
                                                  Experience Level Filter IDs
                                             </label>
                                             <span className="text-xs text-slate-500 hover:text-slate-450 cursor-help flex items-center gap-1.5">
                                                  0=0 Yrs, 1=1 Yrs, etc.
                                             </span>
                                        </div>
                                        <TagInput
                                             tags={expArray}
                                             onChange={handleExpChange}
                                             placeholder="e.g. 0, 1, 2, 3"
                                        />
                                   </div>
                                   <div className="space-y-2">
                                        <label className="block text-sm font-bold text-slate-300 mb-1.5">
                                             Dry Run Mode (Simulate Applications)
                                        </label>
                                        <select
                                             value={settings.dry_run || 'true'}
                                             onChange={(e) => handleSettingChange('dry_run', e.target.value)}
                                             className="w-full bg-slate-900/60 border border-slate-850 hover:border-slate-750 focus:border-orange-500/50 rounded-xl px-4 py-3.5 text-sm outline-none text-slate-200 transition-colors cursor-pointer ring-1 ring-white/[0.02] min-h-[46px]"
                                        >
                                             <option value="true">Simulation Mode (Do not click Submit)</option>
                                             <option value="false">Live Application Mode (Fully Automated Submission)</option>
                                        </select>
                                   </div>
                              </div>
                         </div>
                    </div>

                    {/* Section 2: Automated Schedule Configs */}
                    <div className="glass-panel hover:ring-white/10 transition-all duration-300 rounded-3xl p-8 border border-white/[0.04] bg-slate-900/30 gap-6 space-y-6">
                         <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                              <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-xl border border-indigo-500/10">
                                   <Clock className="w-5 h-5 text-indigo-400" />
                              </div>
                              <div>
                                   <h3 className="text-base font-bold text-slate-200">Execution Schedule</h3>
                                   <p className="text-xs text-slate-405">Set up cron timings and daily crawling caps.</p>
                              </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Morning Run Time (Asia/Kolkata)</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 10:30"
                                        value={settings.schedule_time_1 || ''}
                                        onChange={(e) => handleSettingChange('schedule_time_1', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Afternoon Run Time (Asia/Kolkata)</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 13:00"
                                        value={settings.schedule_time_2 || ''}
                                        onChange={(e) => handleSettingChange('schedule_time_2', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Work Days (Cron Day pattern)</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 1-5 (Mon-Fri) or 1,3,5"
                                        value={settings.schedule_days || ''}
                                        onChange={(e) => handleSettingChange('schedule_days', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Max Apps / Scheduled Run</label>
                                   <input
                                        type="number"
                                        placeholder="e.g. 20"
                                        value={settings.max_applications_per_run || ''}
                                        onChange={(e) => handleSettingChange('max_applications_per_run', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Max Apps / Allowed Day</label>
                                   <input
                                        type="number"
                                        placeholder="e.g. 40"
                                        value={settings.max_applications_per_day || ''}
                                        onChange={(e) => handleSettingChange('max_applications_per_day', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Min/Max Delay (ms)</label>
                                   <div className="flex gap-2.5">
                                        <input
                                             type="number"
                                             placeholder="Min"
                                             value={settings.min_delay || ''}
                                             onChange={(e) => handleSettingChange('min_delay', e.target.value)}
                                             className="w-1/2 bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                        />
                                        <input
                                             type="number"
                                             placeholder="Max"
                                             value={settings.max_delay || ''}
                                             onChange={(e) => handleSettingChange('max_delay', e.target.value)}
                                             className="w-1/2 bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                        />
                                   </div>
                              </div>
                         </div>
                    </div>

                    {/* Section 3: Personal Profile Resilience overrides */}
                    <div className="glass-panel hover:ring-white/10 transition-all duration-300 rounded-3xl p-8 border border-white/[0.04] bg-slate-900/30 gap-6 space-y-6">
                         <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                              <div className="p-2.5 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-xl border border-emerald-500/10">
                                   <User className="w-5 h-5 text-emerald-400" />
                              </div>
                              <div>
                                   <h3 className="text-base font-bold text-slate-200">Personal Information (Form Auto-Fills)</h3>
                                   <p className="text-xs text-slate-405">These override values fill text inputs, notice periods, and uploads during live applications.</p>
                              </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Full Name</label>
                                   <input
                                        type="text"
                                        placeholder="John Doe"
                                        value={settings.my_name || ''}
                                        onChange={(e) => handleSettingChange('my_name', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Email Address</label>
                                   <input
                                        type="email"
                                        placeholder="john.doe@example.com"
                                        value={settings.my_email || ''}
                                        onChange={(e) => handleSettingChange('my_email', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Phone Number</label>
                                   <input
                                        type="tel"
                                        placeholder="9876543210"
                                        value={settings.my_phone || ''}
                                        onChange={(e) => handleSettingChange('my_phone', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Total Experience (Years)</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 3.5"
                                        value={settings.my_total_experience || ''}
                                        onChange={(e) => handleSettingChange('my_total_experience', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Current Salary (LPA)</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 500000"
                                        value={settings.my_current_salary || ''}
                                        onChange={(e) => handleSettingChange('my_current_salary', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Expected Salary (LPA)</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 800000"
                                        value={settings.my_expected_salary || ''}
                                        onChange={(e) => handleSettingChange('my_expected_salary', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Notice Period</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 30 Days"
                                        value={settings.my_notice_period || ''}
                                        onChange={(e) => handleSettingChange('my_notice_period', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Resume File Path (Local PDF)</label>
                                   <input
                                        type="text"
                                        placeholder="C:\Users\John\Documents\Resume.pdf"
                                        value={settings.my_resume_path || ''}
                                        onChange={(e) => handleSettingChange('my_resume_path', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-305">City Location</label>
                                   <input
                                        type="text"
                                        placeholder="Pune"
                                        value={settings.my_location || ''}
                                        onChange={(e) => handleSettingChange('my_location', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all"
                                   />
                              </div>
                         </div>
                    </div>

                    {/* Section 4: Telegram Bot Notifications credentials */}
                    <div className="glass-panel hover:ring-white/10 transition-all duration-300 rounded-3xl p-8 border border-white/[0.04] bg-slate-900/30 gap-6 space-y-6">
                         <div className="flex items-center gap-3.5 border-b border-white/5 pb-4">
                              <div className="p-2.5 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/10">
                                   <AlertCircle className="w-5 h-5 text-indigo-400" />
                              </div>
                              <div>
                                   <h3 className="text-base font-bold text-slate-200">Telegram Notification Credentials</h3>
                                   <p className="text-xs text-slate-405">Set tokens to receive question solver prompts and run summaries remotely.</p>
                              </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Telegram Bot Token API Key</label>
                                   <input
                                        type="password"
                                        placeholder="Bot Token Key..."
                                        value={settings.telegram_bot_token || ''}
                                        onChange={(e) => handleSettingChange('telegram_bot_token', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                              <div className="space-y-2">
                                   <label className="block text-sm font-bold text-slate-300">Telegram User Chat ID</label>
                                   <input
                                        type="text"
                                        placeholder="e.g. 198754125"
                                        value={settings.telegram_chat_id || ''}
                                        onChange={(e) => handleSettingChange('telegram_chat_id', e.target.value)}
                                        className="w-full bg-slate-900/60 border border-slate-850 focus:border-orange-500/40 focus:ring-1 focus:ring-orange-500/20 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none transition-all font-mono"
                                   />
                              </div>
                         </div>
                    </div>

                    {/* Buttons submission panel */}
                    <div className="flex items-center gap-5 pt-6 border-t border-white/5">
                         <button
                              type="submit"
                              disabled={settingsLoading}
                              className="bg-gradient-to-r from-orange-500 to-pink-650 hover:from-orange-600 hover:to-pink-700 text-slate-950 font-bold px-6 py-3.5 rounded-xl text-sm flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-orange-500/10"
                         >
                              {settingsLoading ? (
                                   <RefreshCw className="w-5 h-5 animate-spin" />
                              ) : (
                                   <Save className="w-5 h-5" />
                              )}
                              Save Configuration Overrides
                         </button>
                         <button
                              type="button"
                              onClick={fetchSettings}
                              disabled={settingsLoading}
                              className="bg-slate-900 hover:bg-slate-850 border border-white/10 text-slate-300 font-bold px-6 py-3.5 rounded-xl text-sm flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                         >
                              <Undo className="w-5 h-5" />
                              Discard Changes
                         </button>
                    </div>
               </form>
          </div>
     );
}
