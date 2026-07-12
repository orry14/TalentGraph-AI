import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { CapabilityRiskWidget } from '../components/CapabilityRiskWidget';
import { DashboardStats, api } from '../utils/api';
import {
  Users,
  Compass,
  Star,
  Award,
  ArrowUpRight,
  Sparkles,
  AlertTriangle,
  Search,
  Activity,
  MapPin,
  TrendingUp,
  BrainCircuit,
  MessageSquareCode,
  FolderGit,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

interface DashboardProps {
  stats: DashboardStats;
  setActiveTab?: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ stats, setActiveTab }) => {
  const [predictiveReport, setPredictiveReport] = useState<any | null>(null);
  const [loadingPredictive, setLoadingPredictive] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Fetch predictive report
  useEffect(() => {
    const fetchPredictive = async () => {
      setLoadingPredictive(true);
      try {
        const data = await api.getPredictiveReport();
        setPredictiveReport(data);
      } catch (err) {
        console.error('Failed to load predictive stats:', err);
      } finally {
        setLoadingPredictive(false);
      }
    };
    fetchPredictive();
  }, []);

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-xl backdrop-blur-md">
          <p className="text-xs font-bold text-slate-200 mb-1">{label}</p>
          {payload.map((item: any, idx: number) => (
            <p key={idx} className="text-xs font-semibold" style={{ color: item.color || item.fill }}>
              {item.name}: {item.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await api.exportReport('dashboard', {}, format);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Header / Executive Assist */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-slate-900/60 backdrop-blur-md">
        <div>
          <h3 className="font-outfit font-extrabold text-lg text-slate-100 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-400" />
            Executive Command Center
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">TalentGraph workforce intelligence operating system control hub.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-2 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-850 rounded-xl text-xs font-bold transition-all"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-3 py-2 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-850 rounded-xl text-xs font-bold transition-all"
            >
              Export PDF
            </button>
          </div>

          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Query department capabilities..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              className="w-full bg-slate-950/80 border border-slate-800 rounded-xl text-xs py-2 pl-9 pr-4 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/50"
            />
          </div>
          <button
            onClick={() => {
              if (setActiveTab) setActiveTab('employees');
            }}
            className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-all shrink-0"
          >
            Skill Search
          </button>
        </div>
      </div>

      {/* Top Banner KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard hoverGlow className="flex items-center space-x-5">
          <div className="p-3.5 bg-blue-600/10 text-blue-400 rounded-2xl border border-blue-500/10">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Headcount</p>
            <h3 className="font-outfit font-extrabold text-2xl text-slate-100 mt-1">{stats.totalEmployees}</h3>
          </div>
        </GlassCard>

        <GlassCard hoverGlow className="flex items-center space-x-5">
          <div className="p-3.5 bg-violet-600/10 text-violet-400 rounded-2xl border border-violet-500/10">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Experience</p>
            <h3 className="font-outfit font-extrabold text-2xl text-slate-100 mt-1">{stats.avgExperience} yrs</h3>
          </div>
        </GlassCard>

        <GlassCard hoverGlow className="flex items-center space-x-5">
          <div className="p-3.5 bg-emerald-600/10 text-emerald-400 rounded-2xl border border-emerald-500/10">
            <Star className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Performance</p>
            <h3 className="font-outfit font-extrabold text-2xl text-slate-100 mt-1">{stats.avgPerformance}/5.0</h3>
          </div>
        </GlassCard>

        <GlassCard glow className="bg-gradient-to-br from-blue-900/20 to-indigo-900/15 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Workforce Capability</p>
              <h3 className="font-outfit font-extrabold text-3xl text-white mt-1.5">{stats.capabilityScore}%</h3>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-dashed border-blue-500/30 flex items-center justify-center font-bold text-white text-xs animate-spin-slow">
              OS
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Financial Intelligence Row */}
      {predictiveReport?.benchCostIntelligence && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="flex flex-col justify-between col-span-1 md:col-span-1 border-emerald-500/30 bg-emerald-950/10">
            <div>
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Current Bench Cost</p>
              <h3 className="font-outfit font-extrabold text-4xl text-emerald-100 mt-2">
                ₹{predictiveReport.benchCostIntelligence.currentBenchCost.toLocaleString('en-IN')}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2">Monthly idle cost (Total cost rates of unallocated capacity)</p>
            </div>
            <div className="mt-6">
              <h5 className="text-xs font-bold text-slate-300 mb-2 border-b border-emerald-500/20 pb-1">Cost by Department</h5>
              <div className="space-y-2.5 mt-3">
                {predictiveReport.benchCostIntelligence.costByDepartment.map((dept: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{dept.department}</span>
                    <span className="text-slate-200 font-bold">₹{dept.cost.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="col-span-1 md:col-span-2 flex flex-col justify-between">
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-emerald-400" />
                Bench Cost Trend (6mo Forecast)
              </h4>
              <p className="text-[10px] text-slate-500">Predicted financial impact of unallocated resources based on current project end dates.</p>
            </div>
            <div className="h-48 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictiveReport.benchCostIntelligence.benchCostTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <XAxis dataKey="period" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9 }} tickFormatter={(val) => `₹${(val/1000)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Projected Cost (₹)" stroke="#10b981" fill="rgba(16, 185, 129, 0.15)" strokeWidth={2} />
                  <Area type="monotone" dataKey="upperConfidence" stroke="transparent" fill="rgba(16, 185, 129, 0.05)" />
                  <Area type="monotone" dataKey="lowerConfidence" stroke="transparent" fill="rgba(16, 185, 129, 0.05)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Row 2: Attrition Forecast & Skill Decay Area Charts */}
      {predictiveReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <GlassCard className="flex flex-col justify-between min-h-[350px]">
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-4.5 h-4.5 text-red-400" />
                Attrition Risk Forecast (6mo)
              </h4>
              <p className="text-[10px] text-slate-500">Predicted disengagement trends with 95% confidence intervals</p>
            </div>
            <div className="h-60 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictiveReport.attrition.attritionTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="period" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Risk Score" stroke="#ef4444" fill="rgba(239, 68, 68, 0.15)" strokeWidth={2} />
                  <Area type="monotone" dataKey="upperConfidence" name="Upper Limit" stroke="rgba(239, 68, 68, 0.1)" fill="rgba(239, 68, 68, 0.05)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col justify-between min-h-[350px]">
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                <Activity className="w-4.5 h-4.5 text-orange-400" />
                Skill Decay Risk Projection
              </h4>
              <p className="text-[10px] text-slate-500">Forecast of technical knowledge decay rates across fast-moving tech</p>
            </div>
            <div className="h-60 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictiveReport.skillDecay.timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="period" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Decay Rate" stroke="#f97316" fill="rgba(249, 115, 22, 0.15)" strokeWidth={2} />
                  <Area type="monotone" dataKey="upperConfidence" name="Upper Limit" stroke="rgba(249, 115, 22, 0.1)" fill="rgba(249, 115, 22, 0.05)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard className="flex flex-col justify-between min-h-[350px]">
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                <Compass className="w-4.5 h-4.5 text-violet-400" />
                Bench & Utilization Forecast
              </h4>
              <p className="text-[10px] text-slate-500">Utilization metrics calculated against active workstreams</p>
            </div>
            <div className="h-60 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={predictiveReport.benchUtilization.sixMonthForecast} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="period" stroke="#475569" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#475569" tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name="Utilization" stroke="#8b5cf6" fill="rgba(139, 92, 246, 0.15)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

        </div>
      )}

      {/* Row 2.5: Portfolio Health & Project Activity Cockpit */}
      {stats.projectStats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Health and Health Distribution */}
          <GlassCard className="flex flex-col justify-between min-h-[350px]">
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                <FolderGit className="w-4.5 h-4.5 text-blue-400" />
                Portfolio Health & Distribution
              </h4>
              <p className="text-[10px] text-slate-500">Aggregate execution health index across all active corporate projects.</p>
            </div>
            
            {/* Health Score circle display */}
            <div className="flex items-center justify-around my-4">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 border-[4px] border-blue-500/20 border-t-blue-500 rounded-full flex flex-col items-center justify-center font-outfit font-black text-lg text-slate-100 relative">
                  {stats.portfolioHealth}%
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-2 text-center">Portfolio Health</span>
              </div>

              {/* Health Distribution List */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500 shrink-0" />
                  <span>Excellent: <strong>{stats.healthDistribution?.excellent || 0}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-blue-500 shrink-0" />
                  <span>Healthy: <strong>{stats.healthDistribution?.healthy || 0}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-yellow-500 shrink-0" />
                  <span>Warning: <strong>{stats.healthDistribution?.warning || 0}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-orange-500 shrink-0" />
                  <span>High Risk: <strong>{stats.healthDistribution?.highRisk || 0}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded bg-red-500 shrink-0" />
                  <span>Critical: <strong>{stats.healthDistribution?.critical || 0}</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-900 flex justify-between items-center text-[10px] text-slate-500">
              <span>Active: <strong>{stats.projectStats?.activeProjects || 0}</strong></span>
              <span>Total Budget: <strong>${stats.projectStats?.totalBudget?.toLocaleString() || 0}</strong></span>
            </div>
          </GlassCard>

          {/* High Risk Projects Alert Desk */}
          <GlassCard className="flex flex-col justify-between min-h-[350px]">
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                High Risk Projects
              </h4>
              <p className="text-[10px] text-slate-500">Projects with health index below 60 requiring immediate resource injections.</p>
            </div>

            <div className="space-y-2.5 my-4 flex-1 overflow-y-auto max-h-[220px] pr-1">
              {!stats.projectStats?.highRiskProjects || stats.projectStats.highRiskProjects.length === 0 ? (
                <div className="text-[10px] text-slate-600 text-center py-10">All active projects currently meet healthy baseline metrics (&ge;60).</div>
              ) : (
                stats.projectStats.highRiskProjects.map((proj: any) => (
                  <div
                    key={proj.id}
                    onClick={() => {
                      if (setActiveTab) setActiveTab('projects');
                    }}
                    className="p-3 bg-red-950/5 border border-red-900/10 hover:border-red-900/20 rounded-xl cursor-pointer transition-all flex justify-between items-center"
                  >
                    <div>
                      <h5 className="text-[11px] font-bold text-slate-200">{proj.name}</h5>
                      <span className="text-[8px] px-1.5 py-0.5 bg-red-500/10 text-red-400 border border-red-500/10 rounded mt-1.5 inline-block uppercase font-black tracking-wider">
                        {proj.healthLevel || 'High Risk'}
                      </span>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-rose-500 block">{proj.healthScore}% Health</span>
                      <span className="text-[8px] text-slate-500 block hover:underline mt-0.5">Diagnose &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-900">
              <button
                onClick={() => {
                  if (setActiveTab) setActiveTab('projects');
                }}
                className="w-full text-center text-[10px] font-bold text-blue-400 hover:underline"
              >
                Inspect Portfolio Registry
              </button>
            </div>
          </GlassCard>

          {/* Upcoming Project Milestones */}
          <GlassCard className="flex flex-col justify-between min-h-[350px]">
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-violet-400" />
                Upcoming Milestones
              </h4>
              <p className="text-[10px] text-slate-500">Timeline checkpoints and delivery targets due in the next 30 days.</p>
            </div>

            <div className="space-y-2.5 my-4 flex-1 overflow-y-auto max-h-[220px] pr-1">
              {!stats.upcomingMilestones || stats.upcomingMilestones.length === 0 ? (
                <div className="text-[10px] text-slate-600 text-center py-10">No upcoming milestones due within current sprints.</div>
              ) : (
                stats.upcomingMilestones.map((m: any) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-900/30 border border-slate-900 rounded-xl flex justify-between items-center"
                  >
                    <div className="min-w-0">
                      <h5 className="text-[10px] font-bold text-slate-200 truncate">{m.name}</h5>
                      <span className="text-[8px] text-slate-500 mt-1 block uppercase font-bold truncate">
                        Project: {m.projectName}
                      </span>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-violet-400 block">{m.dueDate}</span>
                      <span className="text-[8px] text-slate-500 block truncate mt-0.5">Owner: {m.ownerName}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-900 text-center">
              <button
                onClick={() => {
                  if (setActiveTab) setActiveTab('projects');
                }}
                className="text-[10px] font-bold text-violet-400 hover:underline"
              >
                Open Projects Timeline
              </button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Row 3: Command Layout: Digital Twin Mini Map & AI Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Digital Twin Mini Map */}
        <GlassCard className="lg:col-span-2 min-h-[350px] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center">
              <h4 className="font-outfit font-bold text-base text-slate-200">Digital Twin Mini Map</h4>
              <button
                onClick={() => {
                  if (setActiveTab) setActiveTab('skill-graph');
                }}
                className="text-[10px] font-bold text-blue-400 hover:underline flex items-center gap-1"
              >
                Open Full Twin View <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Clickable diagram representing the management hierarchy and reporting lines.</p>
          </div>

          <div className="h-64 mt-4 bg-slate-950/60 border border-slate-900 rounded-2xl p-4 flex items-center justify-center relative overflow-hidden">
            {/* Visual representation of nodes */}
            <div className="flex flex-col items-center gap-8 z-10">
              <div className="px-4 py-2 bg-blue-600/20 border border-blue-500/40 rounded-lg text-slate-200 text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.15)] cursor-pointer" onClick={() => { if (setActiveTab) setActiveTab('skill-graph'); }}>
                Alex Rivera (Staff Engineer)
              </div>
              <div className="flex gap-4">
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300">
                  Sarah Chen (ML)
                </div>
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300">
                  Elena Rostova (FE)
                </div>
                <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] text-slate-300">
                  Aisha Rahman (DevOps)
                </div>
              </div>
            </div>
            {/* Grid line patterns */}
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
          </div>
        </GlassCard>

        {/* AI Action Alerts Panel */}
        <GlassCard className="flex flex-col justify-between min-h-[350px]">
          <div>
            <h4 className="font-outfit font-bold text-base text-slate-200 flex items-center gap-1.5">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Executive AI Alerts
            </h4>
            <p className="text-xs text-slate-500">Live capability alerts and mitigation strategies</p>
          </div>

          <div className="space-y-4 my-4 flex-1 overflow-y-auto max-h-[250px] custom-scrollbar pr-1">
            {predictiveReport?.recommendations.map((rec: any, idx: number) => (
              <div
                key={idx}
                className="p-3 bg-slate-900/35 border border-slate-900 rounded-xl hover:border-slate-800 transition-all flex gap-3"
              >
                <div className="mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-orange-400 block shrink-0" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-200">{rec.title}</span>
                    <span className="text-[8px] font-black uppercase text-orange-400">{rec.impact} Impact</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Row 4: Capability Risk and Spotlight Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Capability Risk Widget */}
        <div className="lg:col-span-2">
          <CapabilityRiskWidget />
        </div>

        {/* Quick Actions Hub */}
        <GlassCard className="flex flex-col justify-between min-h-[350px]">
          <div>
            <h4 className="font-outfit font-bold text-base text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-5 h-5 text-blue-400" />
              Quick Analytics Actions
            </h4>
            <p className="text-xs text-slate-500">Run quick structural and strategic updates</p>
          </div>

          <div className="space-y-3.5 my-4 flex-1">
            <button
              onClick={() => {
                if (setActiveTab) setActiveTab('skill-graph');
              }}
              className="w-full p-3 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <span className="text-xs font-bold text-slate-200 block">Open Digital Twin Sandbox</span>
                <span className="text-[9px] text-slate-500 mt-0.5 block">Trigger layoffs, transfers or dept merges</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
            </button>

            <button
              onClick={() => {
                if (setActiveTab) setActiveTab('staffing');
              }}
              className="w-full p-3 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 rounded-xl text-left transition-all flex items-center justify-between group"
            >
              <div>
                <span className="text-xs font-bold text-slate-200 block">Staffing Optimizer Studio</span>
                <span className="text-[9px] text-slate-500 mt-0.5 block">Mathematically allocate and optimize teams</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition-colors" />
            </button>
          </div>
        </GlassCard>
      </div>

    </div>
  );
};

