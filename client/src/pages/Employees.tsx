import React, { useState, useEffect } from 'react';
import { GlassCard } from '../components/GlassCard';
import { SkeletonCard, SkeletonList } from '../components/LoadingSkeleton';
import { SuccessionSimulator } from '../components/SuccessionSimulator';
import { SemanticSearch } from '../components/SemanticSearch';
import { GitConnectModal } from '../components/GitConnectModal';
import { Employee, api, LearningRecommendation, PromotionEvaluation } from '../utils/api';
import {
  Search,
  UploadCloud,
  Briefcase,
  Compass,
  Star,
  Award,
  Sparkles,
  BookOpen,
  Calendar,
  ChevronRight,
  RefreshCw,
  Plus,
  FileText,
  Github,
  Gitlab,
  BadgeCheck
} from 'lucide-react';

interface EmployeesProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  refreshStats: () => void;
}

export const Employees: React.FC<EmployeesProps> = ({
  employees,
  setEmployees,
  refreshStats
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [isDraggingResume, setIsDraggingResume] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isUpdatingRecs, setIsUpdatingRecs] = useState(false);
  const [isUpdatingPromotion, setIsUpdatingPromotion] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [gitConnectPlatform, setGitConnectPlatform] = useState<'github' | 'gitlab' | null>(null);

  const handleOpenGitConnect = (platform: 'github' | 'gitlab') => {
    setGitConnectPlatform(platform);
  };

  const handleConnectGit = async (username: string) => {
    if (!selectedEmployee) return;
    try {
      const updatedEmp = await api.connectGit(selectedEmployee.id, gitConnectPlatform!, username);
      setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
      setSelectedEmployee(updatedEmp);
    } catch (err: any) {
      console.error(err);
      throw err;
    }
  };

  // Set initial selected employee
  useEffect(() => {
    if (employees.length > 0 && !selectedId) {
      setSelectedId(employees[0].id);
    }
  }, [employees]);

  // Fetch full employee details including AI recommendations & evaluations
  useEffect(() => {
    if (!selectedId) return;

    const fetchDetails = async () => {
      setIsLoadingProfile(true);
      try {
        const fullProfile = await api.getEmployeeById(selectedId);
        setSelectedEmployee(fullProfile);
      } catch (err) {
        console.error('Error fetching employee details:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchDetails();
  }, [selectedId, employees]);

  // Handle resume uploading
  const processResumeFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files).filter(Boolean);
    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError(null);
    setUploadStage(`Uploading ${selectedFiles.length} resume${selectedFiles.length > 1 ? 's' : ''}`);

    try {
      setTimeout(() => setUploadStage('Extracting text'), 250);
      setTimeout(() => setUploadStage('Parsing resume JSON'), 650);
      setTimeout(() => setUploadStage('Generating AI profile'), 1000);
      if (selectedFiles.length === 1) {
        const newEmp = await api.uploadResume(selectedFiles[0]);
        setEmployees(prev => [newEmp, ...prev]);
        setSelectedId(newEmp.id);
      } else {
        const result = await api.uploadResumes(selectedFiles);
        setEmployees(prev => [...result.employees, ...prev]);
        if (result.employees[0]) setSelectedId(result.employees[0].id);
        if (result.failures.length) {
          setUploadError(`${result.failures.length} file(s) failed. ${result.failures[0].error}`);
        }
      }
      refreshStats();
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Failed to process resume');
    } finally {
      setIsUploading(false);
      setUploadStage('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await processResumeFiles(e.target.files);
    e.target.value = '';
  };

  // Re-run AI Learning recommendations
  const handleRegenRecs = async () => {
    if (!selectedEmployee) return;
    setIsUpdatingRecs(true);
    try {
      const newRecs = await api.regenerateRecommendations(selectedEmployee.id);
      setSelectedEmployee(prev => prev ? { ...prev, learningRecommendations: newRecs } : null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingRecs(false);
    }
  };

  // Re-evaluate Promotion Readiness
  const handleRegenPromotion = async () => {
    if (!selectedEmployee) return;
    setIsUpdatingPromotion(true);
    try {
      const newEval = await api.regeneratePromotion(selectedEmployee.id);
      setSelectedEmployee(prev => prev ? { ...prev, promotionEvaluation: newEval } : null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingPromotion(false);
    }
  };

  // Filter logic
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.technicalSkills.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = ['All', 'Engineering', 'Data Science', 'Product', 'Design'];

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await api.exportReport('employees', { searchQuery, selectedDept }, format);
    } catch (err) {
      console.error(err);
      alert('Export failed');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-140px)] overflow-hidden">
      {/* Left panel: Employee list & upload */}
      <div className="lg:col-span-4 flex flex-col h-full space-y-6 overflow-hidden">
        {/* Resume Upload Box */}
        <GlassCard className="p-4 shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-outfit font-bold text-sm text-slate-200">Resume Intelligence</h4>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleExport('csv')}
                className="px-2 py-1 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-[9px] font-bold transition-all"
              >
                CSV
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="px-2 py-1 bg-slate-900/50 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg text-[9px] font-bold transition-all"
              >
                PDF
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mb-3">Upload resumes to parse structured JSON and generate candidate profiles automatically</p>

          <label
            onDragOver={e => {
              e.preventDefault();
              setIsDraggingResume(true);
            }}
            onDragLeave={() => setIsDraggingResume(false)}
            onDrop={e => {
              e.preventDefault();
              setIsDraggingResume(false);
              processResumeFiles(e.dataTransfer.files);
            }}
            className={`border border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-200 ${
            isUploading || isDraggingResume
              ? 'border-blue-500/40 bg-blue-500/5' 
              : 'border-slate-800 hover:border-blue-500/30 hover:bg-slate-900/30'
          }`}>
            <input
              type="file"
              accept=".pdf,.txt,.docx,.zip,.png,.jpg,.jpeg,.webp"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {isUploading ? (
              <div className="flex flex-col items-center space-y-2 py-2">
                <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                <span className="text-[10px] font-bold text-blue-400">{uploadStage || 'AI Parsing Resume...'}</span>
                <div className="h-1.5 w-40 bg-slate-900 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 bg-blue-500 animate-pulse rounded-full" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-1.5 py-1">
                <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-blue-400" />
                <span className="text-xs font-semibold text-slate-300">Upload or Drop Resumes</span>
                <span className="text-[9px] text-slate-600">PDF, DOCX, TXT, ZIP, image resumes | multiple files</span>
              </div>
            )}
          </label>
          {uploadError && (
            <p className="text-[10px] text-red-400 mt-2 font-medium">{uploadError}</p>
          )}
        </GlassCard>

        {/* Filter controls */}
        <div className="space-y-3 shrink-0 z-40">
          <SemanticSearch onSelectEmployee={setSelectedId} />

          <div className="flex space-x-1 overflow-x-auto pb-1">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  selectedDept === dept
                    ? 'bg-blue-600/10 text-blue-400 border-blue-500/20'
                    : 'bg-transparent text-slate-400 border-transparent hover:bg-slate-900/50 hover:text-slate-200'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => setSelectedId(emp.id)}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 flex items-center justify-between border ${
                  selectedId === emp.id
                    ? 'bg-blue-600/10 border-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.04)]'
                    : 'bg-slate-900/20 border-slate-900/40 hover:bg-slate-900/40 hover:border-slate-800/80'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-slate-400 text-xs shadow-inner">
                    {emp.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">{emp.name}</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">{emp.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-semibold text-slate-400 bg-slate-900/80 py-1 px-2 border border-slate-800/50 rounded-lg">
                    {emp.department}
                  </span>
                  <p className="text-[9px] text-slate-500 mt-1 font-semibold">{emp.experienceYears} yrs exp</p>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-10 glass-panel rounded-2xl">
              <span className="text-xs text-slate-500 font-medium">No workforce match found.</span>
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Details Workspace */}
      <div className="lg:col-span-8 h-full overflow-hidden flex flex-col">
        {isLoadingProfile ? (
          <SkeletonCard />
        ) : selectedEmployee ? (
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-8">
            {/* Header profile summary card */}
            <GlassCard glow className="bg-gradient-to-br from-slate-950 to-slate-900/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-[0_0_20px_rgba(59,130,246,0.3)]">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h3 className="font-outfit font-extrabold text-xl text-slate-100">{selectedEmployee.name}</h3>
                      <span className="inline-flex px-2.5 py-0.5 rounded-full bg-blue-500/10 text-[9px] font-bold text-blue-400 uppercase tracking-wide border border-blue-500/10">
                        {selectedEmployee.department}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 font-semibold">{selectedEmployee.role}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{selectedEmployee.email}</p>
                    <div className="flex gap-2 mt-2">
                      {selectedEmployee.github_username ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/10 px-2 py-0.5 rounded font-medium">
                          <Github className="w-3 h-3" /> @{selectedEmployee.github_username}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenGitConnect('github')}
                          className="inline-flex items-center gap-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-bold transition-all"
                        >
                          <Github className="w-3 h-3" /> Connect GitHub
                        </button>
                      )}

                      {selectedEmployee.gitlab_username ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-orange-500/10 text-orange-400 border border-orange-500/10 px-2 py-0.5 rounded font-medium">
                          <Gitlab className="w-3 h-3" /> @{selectedEmployee.gitlab_username}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenGitConnect('gitlab')}
                          className="inline-flex items-center gap-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 px-2 py-0.5 rounded font-bold transition-all"
                        >
                          <Gitlab className="w-3 h-3" /> Connect GitLab
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6 bg-slate-900/40 border border-slate-900 p-3 rounded-xl">
                  <div className="text-center">
                    <span className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Experience</span>
                    <span className="text-sm font-black text-slate-200 mt-0.5 block">{selectedEmployee.experienceYears} yrs</span>
                  </div>
                  <div className="h-6 w-px bg-slate-800" />
                  <div className="text-center">
                    <span className="block text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Performance</span>
                    <span className="text-sm font-black text-slate-200 mt-0.5 block">{selectedEmployee.performanceRating} / 5.0</span>
                  </div>
                </div>
              </div>

              {/* Bio Profile summary */}
              <div className="mt-5 pt-5 border-t border-slate-900 flex justify-between items-end gap-4">
                <div className="flex-1">
                  <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">AI Profile Insights</h5>
                  <p className="text-xs text-slate-300 leading-relaxed italic">
                    "{selectedEmployee.profileSummary}"
                  </p>
                </div>
                <button
                  onClick={() => setShowSimulator(true)}
                  className="shrink-0 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Career Simulator
                </button>
              </div>
            </GlassCard>

            {showSimulator && (
              <SuccessionSimulator
                employee={selectedEmployee}
                onClose={() => setShowSimulator(false)}
              />
            )}

            {/* Middle: Skills & Experience Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Technical skills */}
              <GlassCard>
                <h4 className="font-outfit font-bold text-sm text-slate-200 mb-4 flex items-center space-x-2">
                  <Briefcase className="w-4 h-4 text-blue-400" />
                  <span>Technical Expertise Mapping</span>
                </h4>
                <div className="space-y-3.5">
                  {selectedEmployee.technicalSkills.map((skill, index) => (
                    <div key={index} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-slate-300 flex items-center gap-1.5">
                          {skill.name}
                          {skill.source === 'github_verified' && (
                            <span className="inline-flex items-center text-emerald-400 animate-pulse" title="GitHub Verified Skill">
                              <BadgeCheck className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </span>
                        <span className="text-blue-400 font-bold">{skill.proficiency} / 5</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/40">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: `${(skill.proficiency / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Soft Skills & Certs */}
              <div className="space-y-6">
                {/* Soft Skills */}
                <GlassCard>
                  <h4 className="font-outfit font-bold text-sm text-slate-200 mb-3.5 flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    <span>Behavioral Competencies</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmployee.softSkills.map((skill, index) => (
                      <span
                        key={index}
                        className="text-[10px] font-semibold px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:border-indigo-500/20 hover:text-slate-300 transition-colors"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </GlassCard>

                {/* Certifications & Projects */}
                <GlassCard>
                  <h4 className="font-outfit font-bold text-sm text-slate-200 mb-3 flex items-center space-x-2">
                    <Award className="w-4 h-4 text-emerald-400" />
                    <span>Certifications & active workloads</span>
                  </h4>
                  <div className="space-y-4">
                    {selectedEmployee.certifications.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Accreditations</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedEmployee.certifications.map((cert, index) => (
                            <span
                              key={index}
                              className="text-[10px] font-medium px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/10 text-emerald-400 rounded"
                            >
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Assigned Workstreams</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedEmployee.currentProjects.length > 0 ? (
                          selectedEmployee.currentProjects.map((proj, index) => (
                            <span
                              key={index}
                              className="text-[10px] font-medium px-2 py-0.5 bg-slate-900 text-slate-300 border border-slate-800 rounded"
                            >
                              {proj}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-600">Unassigned (Available)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </div>

            {/* Row 3: AI Career Roadmap (Learning recommendations) */}
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-outfit font-bold text-sm text-slate-200 flex items-center space-x-2">
                  <BookOpen className="w-4.5 h-4.5 text-blue-400" />
                  <span>AI Upskilling Recommendation & Roadmap</span>
                </h4>
                <button
                  onClick={handleRegenRecs}
                  disabled={isUpdatingRecs}
                  className="text-[10px] font-bold text-slate-400 hover:text-blue-400 flex items-center space-x-1 bg-slate-900 border border-slate-800 py-1 px-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isUpdatingRecs ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>

              {selectedEmployee.learningRecommendations && selectedEmployee.learningRecommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedEmployee.learningRecommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-4 bg-slate-900/30 border border-slate-900 hover:border-slate-800/80 rounded-xl space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <h5 className="text-xs font-bold text-slate-200 leading-snug">{rec.courseName}</h5>
                          <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                            rec.type === 'certification'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10'
                              : rec.type === 'project'
                              ? 'bg-violet-500/10 text-violet-400 border border-violet-500/10'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/10'
                          }`}>
                            {rec.type}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{rec.description}</p>
                      </div>

                      <div className="pt-2.5 border-t border-slate-900/50 space-y-2">
                        <div className="flex items-center text-[10px] text-slate-400">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                          <span>Timeline: **{rec.timeline}**</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Roadmap Path</span>
                          <ul className="space-y-1 text-[9px] text-slate-400">
                            {rec.roadmap.map((step, idx) => (
                              <li key={idx} className="flex items-center space-x-1.5">
                                <ChevronRight className="w-3 h-3 text-blue-500 shrink-0" />
                                <span className="truncate">{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  Click regenerate to run AI and draft a custom career training roadmap.
                </div>
              )}
            </GlassCard>

            {/* Row 4: AI Promotion Readiness Evaluation */}
            <GlassCard glow className="border-indigo-500/10 bg-gradient-to-r from-indigo-950/10 to-slate-950">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-outfit font-bold text-sm text-slate-200 flex items-center space-x-2">
                  <Sparkles className="w-4.5 h-4.5 text-indigo-400 animate-pulse" />
                  <span>AI Promotion Readiness Index</span>
                </h4>
                <button
                  onClick={handleRegenPromotion}
                  disabled={isUpdatingPromotion}
                  className="text-[10px] font-bold text-slate-400 hover:text-indigo-400 flex items-center space-x-1 bg-slate-900 border border-slate-800 py-1 px-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isUpdatingPromotion ? 'animate-spin' : ''}`} />
                  <span>Regenerate</span>
                </button>
              </div>

              {selectedEmployee.promotionEvaluation ? (
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Gauge */}
                  <div className="md:w-1/3 flex flex-col items-center justify-center p-4 bg-slate-900/35 border border-slate-900/60 rounded-xl relative overflow-hidden">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2">Readiness Score</span>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                      {/* Circle track */}
                      <svg className="w-full h-full transform -rotate-90">
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="#1e293b"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        <circle
                          cx="48"
                          cy="48"
                          r="40"
                          stroke="url(#indigoGrad)"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 40}
                          strokeDashoffset={2 * Math.PI * 40 * (1 - selectedEmployee.promotionEvaluation.promotionScore / 100)}
                          strokeLinecap="round"
                        />
                        <defs>
                          <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="100%" stopColor="#4f46e5" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute flex flex-col items-center">
                        <span className="text-xl font-black text-white">{selectedEmployee.promotionEvaluation.promotionScore}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Evaluation Text & Improvement recommendations */}
                  <div className="md:w-2/3 space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide">Analysis & Reasoning</span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedEmployee.promotionEvaluation.reasoning}
                      </p>
                    </div>

                    {selectedEmployee.promotionEvaluation.areasToImprove.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Identified Growth Areas</span>
                        <ul className="space-y-1 text-xs text-slate-400">
                          {selectedEmployee.promotionEvaluation.areasToImprove.map((area, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 mt-1.5" />
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500">
                  Click regenerate to trigger AI promotion readiness metrics.
                </div>
              )}
            </GlassCard>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center glass-panel rounded-2xl">
            <span className="text-slate-500 text-sm">Select an employee to open their profile.</span>
          </div>
        )}
      </div>

      {gitConnectPlatform && (
        <GitConnectModal
          platform={gitConnectPlatform}
          onConnect={handleConnectGit}
          onClose={() => setGitConnectPlatform(null)}
        />
      )}
    </div>
  );
};
