import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { SkeletonTable } from '../components/LoadingSkeleton';
import { ConflictResolverModal } from '../components/ConflictResolverModal';
import { api, Project, Employee } from '../utils/api';
import {
  Briefcase,
  Layers,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Users,
  Settings2,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export const Staffing: React.FC = () => {
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  // Form fields (customizable)
  const [projectName, setProjectName] = useState('');
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('');
  const [teamSize, setTeamSize] = useState(3);
  const [durationMonths, setDurationMonths] = useState(6);
  const [budget, setBudget] = useState(100000);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Slider Weights
  const [weights, setWeights] = useState({
    skillMatchWeight: 40,
    deliveryRiskWeight: 20,
    costWeight: 15,
    benchImpactWeight: 15,
    knowledgeDistWeight: 10
  });

  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [showConflicts, setShowConflicts] = useState(false);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await api.exportReport('staffing', {
        projectName,
        requiredSkills: requiredSkillsInput.split(',').map(s => s.trim()).filter(Boolean),
        teamSize,
        durationMonths
      }, format);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  // Common tags
  const skillTags = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker', 'Kubernetes', 'Terraform', 'SQL', 'LLMs', 'Figma', 'UX/UI Design', 'Next.js', 'Redis', 'GraphQL'];

  // Load projects list
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const list = await api.getProjects();
        setProjectsList(list);
        if (list.length > 0) {
          handleSelectProject(list[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadProjects();
  }, []);

  const handleSelectProject = (proj: Project) => {
    setSelectedProjectId(proj.id);
    setProjectName(proj.name);
    setRequiredSkillsInput(proj.requiredSkills.join(', '));
    setTeamSize(proj.teamSize);
    setDurationMonths(proj.durationMonths);
    setBudget(proj.budget || 100000);
    setPriority(proj.priority || 'Medium');
  };

  const handleSelectChange = (id: string) => {
    const found = projectsList.find(p => p.id === id);
    if (found) {
      handleSelectProject(found);
    }
  };

  const handleWeightChange = (key: string, val: number) => {
    setWeights(prev => ({ ...prev, [key]: val }));
  };

  const runOptimization = async (projId: string) => {
    if (!projId) return;
    setIsLoading(true);
    
    // Scale weights to float representation (0.0 to 1.0)
    const scaleWeights = {
      skillMatchWeight: weights.skillMatchWeight / 100,
      deliveryRiskWeight: weights.deliveryRiskWeight / 100,
      costWeight: weights.costWeight / 100,
      benchImpactWeight: weights.benchImpactWeight / 100,
      knowledgeDistWeight: weights.knowledgeDistWeight / 100
    };

    try {
      const data = await api.optimizeStaffing({
        projectId: projId,
        weights: scaleWeights
      });
      setRecommendation(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Run optimization automatically when selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId) {
      runOptimization(selectedProjectId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    await runOptimization(selectedProjectId);
  };

  const handleTagClick = (tag: string) => {
    if (requiredSkillsInput.includes(tag)) {
      setRequiredSkillsInput(prev => 
        prev.split(',').map(s => s.trim()).filter(s => s !== tag).join(', ')
      );
    } else {
      setRequiredSkillsInput(prev => {
        const cleaned = prev.trim();
        return cleaned ? `${cleaned}, ${tag}` : tag;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start h-[calc(100vh-140px)] overflow-hidden">
      
      {/* Left panel: Form & Optimizer Weights */}
      <div className="lg:col-span-4 h-full overflow-y-auto flex flex-col gap-6 pr-1 pb-6 shrink-0">
        
        {/* Project Selector Card */}
        <GlassCard className="space-y-4 p-5">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-outfit font-extrabold text-base text-slate-200 mb-1">Staffing Optimizer Studio</h3>
              <p className="text-xs text-slate-500">Calculate optimal project teams using mathematical resource constraint optimization.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowConflicts(true)}
              className="shrink-0 p-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl transition-colors flex items-center justify-center group"
              title="Resolve Cross-Project Conflicts"
            >
              <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="space-y-3 border-t border-slate-900 pt-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Select Seed Project</label>
              <select
                value={selectedProjectId}
                onChange={e => handleSelectChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl text-xs p-2.5 text-slate-300"
              >
                {projectsList.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </GlassCard>

        {/* Weights Sliders Card */}
        <GlassCard className="space-y-4 p-5">
          <h4 className="font-outfit font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Settings2 className="w-4 h-4 text-blue-400" />
            Optimizer Constraints Weights
          </h4>

          <div className="space-y-4">
            {/* Skill Match */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-slate-400">
                <span>Skill Competency Match</span>
                <span className="font-bold text-slate-200">{weights.skillMatchWeight}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={weights.skillMatchWeight}
                onChange={e => handleWeightChange('skillMatchWeight', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Delivery Risk */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-slate-400">
                <span>Delivery Risk Mitigation</span>
                <span className="font-bold text-slate-200">{weights.deliveryRiskWeight}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={weights.deliveryRiskWeight}
                onChange={e => handleWeightChange('deliveryRiskWeight', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Cost optimization */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-slate-400">
                <span>Cost / Budget Efficiency</span>
                <span className="font-bold text-slate-200">{weights.costWeight}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={weights.costWeight}
                onChange={e => handleWeightChange('costWeight', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Bench Impact */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-slate-400">
                <span>Bench Reservation Impact</span>
                <span className="font-bold text-slate-200">{weights.benchImpactWeight}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={weights.benchImpactWeight}
                onChange={e => handleWeightChange('benchImpactWeight', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Knowledge distribution */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-medium text-slate-400">
                <span>Knowledge Sharing & Mentorship</span>
                <span className="font-bold text-slate-200">{weights.knowledgeDistWeight}%</span>
              </div>
              <input
                type="range" min="0" max="100" value={weights.knowledgeDistWeight}
                onChange={e => handleWeightChange('knowledgeDistWeight', parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={isLoading || !projectName}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-[0_4px_15px_rgba(59,130,246,0.25)]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Running Optimizer...' : 'Solve Staffing Constraints'}</span>
            </button>
          </div>
        </GlassCard>

      </div>

      {/* Right panel: Matching Results */}
      <div className="lg:col-span-8 h-full overflow-y-auto space-y-6 pb-8 pr-1">
        {isLoading ? (
          <SkeletonTable />
        ) : recommendation ? (
          <div className="space-y-6">
            
            {/* Overall Score Banner */}
            <GlassCard glow className="bg-gradient-to-r from-blue-950/20 to-indigo-950/20 border-blue-500/10 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.25)] text-sm">
                  {recommendation.overallScore}%
                </div>
                <div>
                  <h4 className="font-outfit font-extrabold text-sm text-slate-200">Mathematical Optimization Score</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Aggregate linear constraint matching score across all weights</p>
                </div>
                {recommendation.projectedMargin !== undefined && (
                  <div className="ml-6 border-l border-slate-700/50 pl-6 hidden sm:block">
                    <h4 className="font-outfit font-bold text-xs text-slate-400 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Projected Margin
                    </h4>
                    <p className={`font-bold text-lg mt-0.5 ${recommendation.projectedMargin >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {recommendation.projectedMargin >= 0 ? '+' : ''}₹{recommendation.projectedMargin.toLocaleString('en-IN')}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('csv')}
                    className="px-2 py-1.5 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-[10px] font-bold transition-all"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="px-2 py-1.5 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-[10px] font-bold transition-all"
                  >
                    PDF
                  </button>
                </div>
                <div className="text-right border-l border-slate-800/80 pl-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Selected Target</span>
                  <span className="text-xs font-bold text-slate-200 mt-1 block">{recommendation.projectName}</span>
                </div>
              </div>
            </GlassCard>

            {/* Reasoning block */}
            <GlassCard className="bg-slate-900/25 border-slate-900">
              <h5 className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                AI Optimization Reasoning
              </h5>
              <p className="text-xs text-slate-400 leading-relaxed mt-2">{recommendation.reasoning}</p>
            </GlassCard>

            {/* Nominated Primary Candidates */}
            <GlassCard>
              <h4 className="font-outfit font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Mathematically Nominated Primary Team</span>
              </h4>
              <div className="space-y-3.5">
                {recommendation.recommendedTeam.map((cand: any) => (
                  <div
                    key={cand.employee.id}
                    className="p-4 bg-slate-900/30 border border-slate-900 hover:border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-blue-400 text-sm">
                        {cand.employee.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2.5">
                          <h5 className="text-xs font-bold text-slate-200">{cand.employee.name}</h5>
                          {cand.role && (
                            <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10">
                              {cand.role}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{cand.employee.role} | {cand.employee.department}</p>
                      </div>
                    </div>

                    {/* Breakdown radar indicators */}
                    <div className="flex-1 max-w-sm md:px-4 grid grid-cols-5 gap-2 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] text-slate-500 uppercase font-bold">Skills</span>
                        <span className="text-[10px] text-slate-300 font-bold mt-0.5">{cand.scores.skillMatch}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] text-slate-500 uppercase font-bold">Risk</span>
                        <span className="text-[10px] text-slate-300 font-bold mt-0.5">{cand.scores.deliveryRisk}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] text-slate-500 uppercase font-bold">Cost</span>
                        <span className="text-[10px] text-slate-300 font-bold mt-0.5">{cand.scores.cost}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] text-slate-500 uppercase font-bold">Bench</span>
                        <span className="text-[10px] text-slate-300 font-bold mt-0.5">{cand.scores.benchImpact}%</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[7px] text-slate-500 uppercase font-bold">Mentorship</span>
                        <span className="text-[10px] text-slate-300 font-bold mt-0.5">{cand.scores.knowledgeDistribution}%</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-row md:flex-col justify-between items-center md:items-end">
                      <span className="text-xs font-black text-slate-200">{cand.overallFitScore}% Fit</span>
                      <span className="text-[9px] text-slate-500 font-medium">Exp: {cand.employee.experienceYears} Years</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Backups & Alternatives grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Backups */}
              <GlassCard>
                <h4 className="font-outfit font-bold text-xs text-slate-400 uppercase tracking-wider mb-3.5">
                  Suggested Backup Candidates
                </h4>
                <div className="space-y-3">
                  {recommendation.backupTeam.map((backup: any) => (
                    <div
                      key={backup.employee.id}
                      className="flex items-center justify-between p-2.5 bg-slate-900/20 border border-slate-900 rounded-xl hover:border-slate-800/80 transition-colors"
                    >
                      <div>
                        <h5 className="text-xs font-bold text-slate-300">{backup.employee.name}</h5>
                        <p className="text-[9px] text-slate-500">{backup.employee.role} | {backup.employee.department}</p>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-900 py-1 px-2 border border-slate-800 rounded">
                        {backup.overallFitScore}% Match
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Alternative ups-kill list */}
              <GlassCard>
                <h4 className="font-outfit font-bold text-xs text-slate-400 uppercase tracking-wider mb-3.5">
                  Alternative Candidates (Requires Upskilling)
                </h4>
                <div className="space-y-3">
                  {recommendation.alternativeTeam.length === 0 ? (
                    <span className="text-[10px] text-slate-500">No alternative profiles suited for this composition.</span>
                  ) : (
                    recommendation.alternativeTeam.map((alt: any) => (
                      <div
                        key={alt.employee.id}
                        className="p-2.5 bg-slate-900/20 border border-slate-900 rounded-xl hover:border-slate-800/80 transition-all flex flex-col gap-2"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h5 className="text-xs font-bold text-slate-300">{alt.employee.name}</h5>
                            <p className="text-[9px] text-slate-500">{alt.employee.role}</p>
                          </div>
                          <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/10">
                            {alt.overallFitScore}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <span className="text-[7.5px] uppercase font-bold text-slate-500 w-full mb-0.5 block">Required target courses:</span>
                          {alt.upskillRequirement.map((req: string) => (
                            <span key={req} className="text-[8px] bg-slate-950 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                              {req}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </GlassCard>

            </div>

            {/* Hiring suggestions */}
            {recommendation.hiringRequired.length > 0 && (
              <GlassCard className="border-red-500/10 bg-red-950/5">
                <h4 className="font-outfit font-bold text-xs text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  Target External Hiring Required
                </h4>
                <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                  No internal resources contain qualifying proficiencies for these technical constraints. We suggest immediate external recruiting requisitions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recommendation.hiringRequired.map((skill: string) => (
                    <span key={skill} className="text-[9px] font-extrabold px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/25 text-red-400 rounded-lg uppercase tracking-wider">
                      Recruit: {skill}
                    </span>
                  ))}
                </div>
              </GlassCard>
            )}

          </div>
        ) : (
          <div className="h-full flex items-center justify-center glass-panel rounded-2xl p-10 text-center">
            <div>
              <Briefcase className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <span className="text-slate-500 text-xs font-medium block">Select project settings on the left to calculate mathematical staffing optimizations.</span>
            </div>
          </div>
        )}
      </div>

      {showConflicts && (
        <ConflictResolverModal onClose={() => setShowConflicts(false)} />
      )}
    </div>
  );
};
