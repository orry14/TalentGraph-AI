import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  TrendingUp,
  GitMerge,
  Sparkles,
  Database,
  FolderGit,
  UserSearch
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  orgCapabilityScore: number | null;
  onResetDB: () => void;
  resetLoading: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  orgCapabilityScore,
  onResetDB,
  resetLoading
}) => {
  const { user } = useAuth();

  const navigation = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'employees', name: 'Employee Workspace', icon: Users },
    { id: 'recruitment', name: 'Recruitment', icon: UserSearch },
    { id: 'projects', name: 'Projects', icon: FolderGit },
    { id: 'staffing', name: 'Project Staffing Engine', icon: Briefcase },
    { id: 'gap-analysis', name: 'Skill Gap Analysis', icon: TrendingUp },
    { id: 'skill-graph', name: 'AI Skill Graph', icon: GitMerge },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex relative overflow-hidden bg-grid-pattern">
      {/* Decorative gradient blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Sidebar */}
      <aside className="w-72 border-r border-slate-900 bg-slate-950/80 backdrop-blur-xl flex flex-col z-30 shrink-0">
        <div className="p-6 border-b border-slate-900/60 flex items-center space-x-3">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl shadow-[0_0_15px_rgba(59,130,246,0.3)]">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-outfit font-bold text-xl tracking-tight text-white">TalentGraph</h1>
            <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Workforce Intelligence</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.05)]'
                    : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* Database reset helper */}
        <div className="px-6 py-3 border-t border-slate-900/60">
          <button
            onClick={onResetDB}
            disabled={resetLoading}
            className="w-full flex items-center justify-center space-x-2 text-xs py-2 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-300 border border-slate-800/80 rounded-lg transition-all duration-200 disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            <span>{resetLoading ? 'Resetting...' : 'Reset Seed Database'}</span>
          </button>
        </div>

        {/* Footer profile info */}
        <div className="p-4 border-t border-slate-900/60 bg-slate-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900/30 border border-slate-900/50">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-white text-sm uppercase shadow-inner">
                {user?.name.slice(0, 2)}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-200 leading-tight">{user?.name}</p>
                <p className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">{user?.role}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-900/60 bg-slate-950/40 backdrop-blur-xl flex items-center justify-between px-8 z-20 shrink-0">
          <div>
            <h2 className="font-outfit font-semibold text-lg text-slate-200">
              {navigation.find(n => n.id === activeTab)?.name}
            </h2>
          </div>

          {/* Org score badge */}
          <div className="flex items-center space-x-6">
            {orgCapabilityScore !== null && (
              <div className="flex items-center space-x-2.5 py-1.5 px-3 bg-slate-900/80 border border-slate-800 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.05)]">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Org Capability Index</span>
                <div className="h-4 w-px bg-slate-800" />
                <span className="font-outfit font-extrabold text-sm text-blue-400 animate-pulse">
                  {orgCapabilityScore}%
                </span>
              </div>
            )}
            <div className="text-xs font-medium text-slate-500 flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Platform Core Online</span>
            </div>
          </div>
        </header>

        {/* Content Page wrapper */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
};
