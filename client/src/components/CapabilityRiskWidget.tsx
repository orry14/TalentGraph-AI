import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { api, CapabilityRisk } from '../utils/api';
import { AlertTriangle, TrendingDown, UserX, Github, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const CapabilityRiskWidget: React.FC = () => {
  const [risks, setRisks] = useState<CapabilityRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<CapabilityRisk | null>(null);

  useEffect(() => {
    const fetchRisks = async () => {
      try {
        const data = await api.getCapabilityRisks();
        setRisks(data);
      } catch (err) {
        console.error('Failed to load capability risks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRisks();
  }, []);

  if (loading) {
    return (
      <GlassCard className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="flex flex-col justify-between min-h-[380px] relative">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-outfit font-bold text-base text-slate-200 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Capability Risks (SPOF)
            </h4>
            <p className="text-xs text-slate-500">Single Points of Failure & Flight Risks</p>
          </div>
          <span className="text-xs font-bold px-2 py-1 bg-slate-800 rounded-md text-slate-400">
            {risks.length} Risks Detected
          </span>
        </div>

        {risks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500">
            <span className="text-sm">No critical risks detected.</span>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
            {risks.map((risk, idx) => {
              const isCritical = risk.riskLevel === 'Critical';
              const isHigh = risk.riskLevel === 'High';
              return (
                <div
                  key={idx}
                  onClick={() => setSelectedRisk(risk)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 ${
                    isCritical
                      ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
                      : isHigh
                      ? 'bg-orange-500/10 border-orange-500/30 hover:border-orange-500/50'
                      : 'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        isCritical ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {risk.employee.name.charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
                          {risk.employee.name}
                          {risk.isGitVerified && (
                            <span className="inline-flex text-purple-400" title="Verified by Git log analysis (code-maat)">
                              <Github className="w-3.5 h-3.5 animate-pulse" />
                            </span>
                          )}
                        </h5>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          {risk.skill} Expert
                          {risk.isGitVerified && (
                            <span className="text-[10px] bg-purple-500/15 text-purple-300 px-1 rounded font-semibold border border-purple-500/20">git-verified</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        isCritical ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'
                      }`}>
                        {risk.riskLevel} Risk
                      </span>
                      <p className="text-[10px] mt-1 text-slate-400 flex items-center justify-end gap-1">
                        <TrendingDown className="w-3 h-3" /> Flight Score: {risk.flightRiskScore.toFixed(1)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedRisk && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute inset-0 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-5 z-10 flex flex-col"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Risk Profile: {selectedRisk.employee.name}
                {selectedRisk.isGitVerified && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">
                    <Github className="w-3 h-3" /> git-verified
                  </span>
                )}
              </h3>
              <button
                onClick={() => setSelectedRisk(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 space-y-4 text-sm">
              <div>
                <strong className="text-slate-400 block text-xs">Vulnerable Capability</strong>
                <span className="text-slate-200">{selectedRisk.skill} (Only Expert)</span>
              </div>
              
              <div>
                <strong className="text-slate-400 block text-xs">Impact Assessment</strong>
                <div className="flex items-center gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`h-1.5 w-6 rounded-full ${i < selectedRisk.capabilityImpact ? 'bg-orange-500' : 'bg-slate-700'}`} />
                  ))}
                </div>
              </div>

              <div>
                <strong className="text-slate-400 block text-xs">AI Recommendation</strong>
                <p className="text-orange-400 mt-1">{selectedRisk.recommendedAction}</p>
              </div>

              <div>
                <strong className="text-slate-400 block text-xs">Potential Successors (Knowledge Transfer)</strong>
                <ul className="mt-1 space-y-1">
                  {selectedRisk.alternativeCandidates.map((alt, i) => (
                    <li key={i} className="text-slate-300 flex items-center gap-2">
                      <UserX className="w-3 h-3 text-blue-400" /> {alt}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};
