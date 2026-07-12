import React from 'react';
import { GlassCard } from '../components/GlassCard';
import { SkillGapReport, api } from '../utils/api';
import {
  TrendingUp,
  AlertOctagon,
  UserPlus,
  BookOpen,
  ArrowRight,
  TrendingDown,
  CheckCircle2
} from 'lucide-react';

interface GapAnalysisProps {
  report: SkillGapReport;
}

export const GapAnalysis: React.FC<GapAnalysisProps> = ({ report }) => {
  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await api.exportReport('gap-analysis', {}, format);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Warning Banner if any critical gaps exist */}
      {report.weaknesses.length > 0 && (
        <GlassCard className="border-amber-500/10 bg-amber-950/5 flex items-center justify-between">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-amber-600/15 text-amber-500 rounded-xl shrink-0">
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="font-outfit font-bold text-sm text-slate-200">Critical Core Competency Gaps Detected</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-4xl leading-relaxed">
                The AI workforce engine has identified **{report.weaknesses.length} target skills** where current organization average levels fall below benchmarks. Core vulnerabilities include **{report.weaknesses.slice(0, 3).join(', ')}**. Addressing these gaps via upskilling roadmaps or strategic hires is recommended to maintain product development speeds.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Main Grid: Target Comparison vs Hiring/Upskilling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Target comparison table list */}
        <GlassCard className="lg:col-span-7 space-y-5">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h4 className="font-outfit font-bold text-base text-slate-200">Target Competencies vs Current Levels</h4>
              <p className="text-xs text-slate-500">Comparing current workforce averages against industry-standard future roadmap targets</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleExport('csv')}
                className="px-3 py-1.5 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-3 py-1.5 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all"
              >
                Export PDF
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {report.gaps.map(gap => {
              const diffText = gap.difference > 0 ? `+${gap.difference}` : gap.difference;
              return (
                <div
                  key={gap.skillName}
                  className="p-4 bg-slate-900/20 border border-slate-900 hover:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
                >
                  <div className="flex items-center space-x-3 md:w-1/3">
                    <div className={`p-2 rounded-lg shrink-0 ${
                      gap.status === 'critical'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/10'
                        : gap.status === 'moderate'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                    }`}>
                      {gap.status === 'healthy' ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : gap.status === 'critical' ? (
                        <TrendingDown className="w-4.5 h-4.5" />
                      ) : (
                        <TrendingUp className="w-4.5 h-4.5" strokeDasharray="3" />
                      )}
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">{gap.skillName}</h5>
                      <span className={`text-[8px] font-extrabold uppercase px-1 rounded ${
                        gap.status === 'critical'
                          ? 'bg-red-500/10 text-red-400'
                          : gap.status === 'moderate'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {gap.status}
                      </span>
                    </div>
                  </div>

                  {/* Progress comparisons */}
                  <div className="flex-1 space-y-1 md:px-4">
                    <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                      <span>Org Avg: **{gap.currentAvg}**</span>
                      <span>Target: **{gap.target}**</span>
                    </div>
                    <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/40 relative">
                      {/* Target marker */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-slate-700 z-10"
                        style={{ left: `${(gap.target / 5) * 100}%` }}
                        title={`Target: ${gap.target}`}
                      />
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          gap.status === 'critical'
                            ? 'bg-red-500'
                            : gap.status === 'moderate'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${(gap.currentAvg / 5) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right shrink-0 md:w-20">
                    <span className={`text-xs font-black ${
                      gap.status === 'critical'
                        ? 'text-red-400'
                        : gap.status === 'moderate'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {diffText}
                    </span>
                    <span className="block text-[8px] font-bold text-slate-600 uppercase tracking-wide">Variance</span>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Right side panel: Hiring & Upskilling recommendations */}
        <div className="lg:col-span-5 space-y-6">
          {/* Hiring Recommendations */}
          <GlassCard>
            <h4 className="font-outfit font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <UserPlus className="w-4.5 h-4.5 text-blue-400" />
              <span>AI Hiring Recommendations</span>
            </h4>
            <div className="space-y-3">
              {report.hiringRecommendations.length > 0 ? (
                report.hiringRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-blue-600/5 border border-blue-500/10 rounded-xl text-xs text-slate-300 leading-relaxed"
                  >
                    {rec}
                  </div>
                ))
              ) : (
                <div className="p-3.5 bg-emerald-600/5 border border-emerald-500/10 rounded-xl text-xs text-slate-300 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No external hiring recommended. Organization competency core is healthy.</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Internal Upskilling suggestions */}
          <GlassCard>
            <h4 className="font-outfit font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <BookOpen className="w-4.5 h-4.5 text-indigo-400" />
              <span>AI Upskilling suggestions</span>
            </h4>
            <div className="space-y-4">
              {report.upskillingSuggestions.length > 0 ? (
                report.upskillingSuggestions.map((rec, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-slate-900/30 border border-slate-900 rounded-xl space-y-2.5"
                  >
                    <div className="flex justify-between items-start">
                      <h5 className="text-xs font-bold text-slate-200">{rec.skill} Upskilling</h5>
                      <span className="text-[9px] text-indigo-400 font-semibold uppercase tracking-wider">Internal Path</span>
                    </div>

                    <div className="text-[10px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-900">
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Suggested Training Course</span>
                      <span className="font-semibold text-slate-300">{rec.suggestedCourse}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-wider">Nominated for Upskilling</span>
                      <div className="flex flex-wrap gap-1">
                        {rec.candidates.map(name => (
                          <span
                            key={name}
                            className="text-[9px] font-semibold px-2 py-0.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-md"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  No upskilling suggestions required.
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
