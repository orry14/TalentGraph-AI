import React, { useState } from 'react';
import { api, Employee, SimulationResult } from '../utils/api';
import { GlassCard } from './GlassCard';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ArrowRight, UserMinus, ArrowUpCircle, Briefcase, ChevronRight, Play, Users } from 'lucide-react';

interface SuccessionSimulatorProps {
  employee: Employee;
  onClose: () => void;
}

export const SuccessionSimulator: React.FC<SuccessionSimulatorProps> = ({ employee, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [action, setAction] = useState<'promotion' | 'departure' | 'transfer'>('departure');

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const res = await api.runSimulation({
        action,
        targetEmployeeId: employee.id,
        newRole: action === 'promotion' ? `VP of ${employee.department}` : undefined,
        newDepartment: action === 'transfer' ? 'Innovation Labs' : undefined
      });
      setResult(res);
    } catch (err) {
      console.error(err);
      alert('Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await api.exportReport('simulation', {
        action,
        targetEmployeeId: employee.id
      }, format);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-outfit font-bold text-white">AI Career Simulator</h2>
              <p className="text-sm text-slate-400">Target: {employee.name} ({employee.role})</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-2.5 py-1.5 bg-slate-950/80 hover:bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition-all"
                >
                  Export PDF
                </button>
              </div>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-lg font-bold ml-2">
              ✕
            </button>
          </div>
        </div>

        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
          {!result && (
            <div className="max-w-md mx-auto space-y-6 py-10">
              <div className="text-center">
                <h3 className="text-lg font-bold text-slate-200 mb-2">Select Simulation Scenario</h3>
                <p className="text-sm text-slate-500">
                  Forecast organizational impact, skill gaps, and successor readiness before making personnel changes.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => setAction('promotion')}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    action === 'promotion' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <ArrowUpCircle className={action === 'promotion' ? 'text-emerald-400' : 'text-slate-400'} />
                  <div className="text-left">
                    <h4 className="font-bold text-slate-200">Simulate Promotion</h4>
                    <p className="text-xs text-slate-500">Promote to next leadership tier</p>
                  </div>
                </button>

                <button
                  onClick={() => setAction('departure')}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    action === 'departure' ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <UserMinus className={action === 'departure' ? 'text-red-400' : 'text-slate-400'} />
                  <div className="text-left">
                    <h4 className="font-bold text-slate-200">Simulate Resignation</h4>
                    <p className="text-xs text-slate-500">Employee leaves the company</p>
                  </div>
                </button>

                <button
                  onClick={() => setAction('transfer')}
                  className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                    action === 'transfer' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <Briefcase className={action === 'transfer' ? 'text-blue-400' : 'text-slate-400'} />
                  <div className="text-left">
                    <h4 className="font-bold text-slate-200">Simulate Transfer</h4>
                    <p className="text-xs text-slate-500">Move to a different department</p>
                  </div>
                </button>
              </div>

              <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Run Simulation <Play className="w-4 h-4" /></>
                )}
              </button>
            </div>
          )}

          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="text-center">
                  <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Delta Capability</p>
                  <div className="flex items-center justify-center gap-2">
                    <h3 className={`text-3xl font-black ${result.deltaCapability < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {result.deltaCapability > 0 ? '+' : ''}{result.deltaCapability.toFixed(1)}%
                    </h3>
                  </div>
                </GlassCard>
                <GlassCard className="text-center">
                  <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Impacted Projects</p>
                  <h3 className="text-3xl font-black text-amber-400">{result.impactedProjects.length}</h3>
                </GlassCard>
                <GlassCard className="text-center">
                  <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Missing Skills</p>
                  <h3 className="text-3xl font-black text-red-400">{result.missingSkills.length}</h3>
                </GlassCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-blue-400" />
                    Impact Analysis
                  </h3>
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Capability Index</span>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-slate-300">{result.beforeStats.capabilityScore}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className={result.afterStats.capabilityScore < result.beforeStats.capabilityScore ? 'text-red-400' : 'text-emerald-400'}>
                            {result.afterStats.capabilityScore}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm">Headcount</span>
                        <div className="flex items-center gap-2 text-sm font-bold">
                          <span className="text-slate-300">{result.beforeStats.headcount}</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                          <span className={result.afterStats.headcount < result.beforeStats.headcount ? 'text-red-400' : 'text-slate-300'}>
                            {result.afterStats.headcount}
                          </span>
                        </div>
                      </div>
                    </div>

                    {result.missingSkills.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <h4 className="text-xs font-bold text-red-400 uppercase mb-2">Capability Lost</h4>
                        <div className="flex flex-wrap gap-2">
                          {result.missingSkills.map((s, i) => (
                            <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 text-[10px] rounded-md font-bold">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.financialImpact && (
                      <div className="mt-4 pt-4 border-t border-slate-700">
                        <h4 className="text-xs font-bold text-emerald-400 uppercase mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Financial Impact</h4>
                        <p className="text-xs text-slate-300 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg leading-relaxed">
                          {result.financialImpact}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-slate-200 mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    AI Recommended Successors
                  </h3>
                  {result.recommendedSuccessors.length === 0 ? (
                    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                      <p className="text-slate-400 text-sm">No internal successors found with matching skill profile.</p>
                      <button className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-white transition-colors">
                        Open Requisition
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {result.recommendedSuccessors.map((s, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-xl p-3 border border-slate-700 flex items-center justify-between group hover:border-slate-500 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                {s.employee.name.charAt(0)}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-slate-200">{s.employee.name}</p>
                               <p className="text-xs text-slate-500">{s.employee.role}</p>
                             </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-emerald-400">{s.matchScore.toFixed(0)}% Match</p>
                            <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              s.readiness === 'Ready Now' ? 'bg-emerald-500/20 text-emerald-300' :
                              s.readiness === 'Ready 1-2 Yrs' ? 'bg-amber-500/20 text-amber-300' :
                              'bg-red-500/20 text-red-300'
                            }`}>
                              {s.readiness}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <button
                   onClick={() => setResult(null)}
                   className="px-4 py-2 text-slate-400 hover:text-white text-sm mr-3"
                >
                   Run Another Scenario
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// I need to import Users from lucide-react, I will add it to the import above.
