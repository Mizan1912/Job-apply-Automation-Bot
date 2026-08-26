import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagInput({ tags = [], onChange, placeholder = 'Add item...' }) {
     const [input, setInput] = useState('');

     const handleKeyDown = (e) => {
          if (e.key === 'Enter' || e.key === ',') {
               e.preventDefault();
               addTag();
          }
     };

     const addTag = () => {
          const trimmed = input.trim();
          if (trimmed) {
               // Avoid duplicates
               if (!tags.includes(trimmed)) {
                    onChange([...tags, trimmed]);
               }
               setInput('');
          }
     };

     const removeTag = (indexToRemove) => {
          onChange(tags.filter((_, i) => i !== indexToRemove));
     };

     return (
          <div className="w-full bg-slate-900/60 border border-slate-800 focus-within:border-orange-500/50 rounded-xl p-2 transition-all duration-200 flex flex-wrap gap-2 items-center min-h-[42px] ring-1 ring-white/[0.03]">
               {/* Capsules list */}
               {tags.map((tag, index) => (
                    <span
                         key={index}
                         className="flex items-center gap-1 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 text-orange-400 font-medium px-2.5 py-1 rounded-lg text-xs hover:border-orange-500/40 hover:from-orange-500/15 transition-all animate-scaleIn select-none"
                    >
                         {tag}
                         <button
                              type="button"
                              onClick={() => removeTag(index)}
                              className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
                         >
                              <X className="w-3 h-3" />
                         </button>
                    </span>
               ))}

               {/* Styled text box inside list wrapper */}
               <div className="flex-1 min-w-[120px] flex items-center gap-1.5 ml-1">
                    <input
                         type="text"
                         value={input}
                         onChange={(e) => setInput(e.target.value)}
                         onKeyDown={handleKeyDown}
                         onBlur={addTag}
                         placeholder={tags.length === 0 ? placeholder : ''}
                         className="w-full bg-transparent text-xs text-slate-200 placeholder-slate-500 outline-none border-none focus:ring-0 p-0"
                    />
                    {input.trim() && (
                         <button
                              type="button"
                              onClick={addTag}
                              className="text-orange-500 hover:text-orange-450 p-1 flex items-center justify-center cursor-pointer"
                              title="Add tag"
                         >
                              <Plus className="w-3.5 h-3.5" />
                         </button>
                    )}
               </div>
          </div>
     );
}
