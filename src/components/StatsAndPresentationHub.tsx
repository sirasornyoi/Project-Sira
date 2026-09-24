import React, { useState } from 'react';
import { DashboardPage } from './DashboardPage';
import { PresentationPage } from './PresentationPage';
import { BarChart3, Presentation } from 'lucide-react';

interface StatsAndPresentationHubProps {
  initialSubTab?: 'stats' | 'presentation';
}

export const StatsAndPresentationHub: React.FC<StatsAndPresentationHubProps> = ({
  initialSubTab = 'stats'
}) => {
  const [subTab, setSubTab] = useState<'stats' | 'presentation'>(initialSubTab);

  return (
    <div className="space-y-4" id="stats-and-presentation-hub">
      {/* Master Top Hub Navigation Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface border border-border dark:border-slate-800 p-2.5 px-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {subTab === 'stats' ? <BarChart3 size={18} /> : <Presentation size={18} />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-fg flex items-center gap-2">
              สถิติและสรุปนำเสนอ (Analytics & Executive Presentation)
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {subTab === 'stats'
                ? 'ระบบสถิติ แดชบอร์ดติดตามหน้างานบำรุงรักษา MTTR & ภาระงานช่าง'
                : 'ศูนย์ควบคุมและวิเคราะห์นำเสนอระดับผู้บริหาร & รายงานเปรียบเทียบมาตรฐาน'}
            </p>
          </div>
        </div>

        {/* Master Sub-Tab Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-1 rounded-xl gap-1 shrink-0">
          <button
            id="tab-btn-stats-dashboard"
            onClick={() => setSubTab('stats')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === 'stats'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <BarChart3 size={14} />
            <span>📊 ระบบสถิติ & แดชบอร์ด</span>
          </button>
          
          <button
            id="tab-btn-presentation-summary"
            onClick={() => setSubTab('presentation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              subTab === 'presentation'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-900'
            }`}
          >
            <Presentation size={14} />
            <span>📑 สรุปนำเสนอผู้บริหาร</span>
          </button>
        </div>
      </div>

      {/* Render Active View */}
      {subTab === 'stats' ? <DashboardPage /> : <PresentationPage />}
    </div>
  );
};
