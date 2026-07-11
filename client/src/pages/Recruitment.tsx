import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../components/GlassCard';
import { api, HiringDrive, RecruitmentCandidate, RecruitmentDashboard } from '../utils/api';
import {
  UploadCloud,
  Briefcase,
  Users,
  CheckCircle,
  XCircle,
  Calendar,
  Award,
  Search,
  Download,
  Sparkles,
  FileText,
  Plus,
  Filter,
  Brain,
  MessageSquare,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const splitList = (value: string) => value.split(',').map(item => item.trim()).filter(Boolean);

const emptyForm = {
  hiringName: 'Software Engineer Trainee',
  description: 'Campus hiring for high-potential engineering graduates.',
  company: 'TalentGraph',
  department: 'Engineering',
  role: 'Software Engineer Trainee',
  source: 'Campus Placement',
  employmentType: 'Full-time',
  location: 'Hybrid',
  salary: 'Campus band',
  experience: '0-1 years',
  hiringDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString().slice(0, 10),
  maximumCandidates: 100,
  requiredSkills: 'React, Node.js, Python, SQL, Git, Communication',
  preferredSkills: 'AI, ERP, CRM, Machine Learning, Web Development',
  minimumCgpa: 7,
  degree: 'B.Tech',
  branches: 'Computer Science, Information Technology, Electronics',
  graduationYear: '2026',
  preferredColleges: 'Mar Baselios College, MBCET',
  requiredCertifications: '',
  projectKeywords: 'AI, ERP, CRM, Machine Learning, Web Development',
  portfolioRequired: false,
  githubRequired: false,
  languages: 'English',
  interviewRounds: 'Resume Screen, Technical Interview, HR Interview',
  priority: 'High' as const,
  status: 'Open' as const,
};

export const Recruitment: React.FC = () => {
  const [dashboard, setDashboard] = useState<RecruitmentDashboard | null>(null);
  const [drives, setDrives] = useState<HiringDrive[]>([]);
  const [selectedDriveId, setSelectedDriveId] = useState('');
  const [candidates, setCandidates] = useState<RecruitmentCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentCandidate | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadRecruitment = async (driveId?: string) => {
    setIsLoading(true);
    try {
      const [dash, loadedDrives] = await Promise.all([
        api.getRecruitmentDashboard(),
        api.getHiringDrives(),
      ]);
      const activeDriveId = driveId || selectedDriveId || loadedDrives[0]?.id || '';
      const loadedCandidates = await api.getRecruitmentCandidates(activeDriveId || undefined);
      setDashboard(dash);
      setDrives(loadedDrives);
      setSelectedDriveId(activeDriveId);
      setCandidates(loadedCandidates);
      setSelectedCandidate(loadedCandidates[0] || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load recruitment data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecruitment();
  }, []);

  const selectedDrive = drives.find(d => d.id === selectedDriveId);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const statusOk = statusFilter === 'All' || candidate.status === statusFilter || candidate.aiScore.classification === statusFilter;
      return statusOk;
    });
  }, [candidates, statusFilter]);

  const createDrive = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const drive = await api.createHiringDrive({
        ...form,
        requiredSkills: splitList(form.requiredSkills),
        preferredSkills: splitList(form.preferredSkills),
        branches: splitList(form.branches),
        preferredColleges: splitList(form.preferredColleges),
        requiredCertifications: splitList(form.requiredCertifications),
        projectKeywords: splitList(form.projectKeywords),
        languages: splitList(form.languages),
        interviewRounds: splitList(form.interviewRounds),
      });
      setDrives(prev => [drive, ...prev.filter(d => d.id !== drive.id)]);
      setSelectedDriveId(drive.id);
      await loadRecruitment(drive.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create hiring drive');
    } finally {
      setIsCreating(false);
    }
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const selected = Array.from(files).filter(file => file);
    if (!selected.length || !selectedDriveId) return;
    setIsUploading(true);
    setError(null);
    setUploadStage(`Uploading ${selected.length} resume${selected.length > 1 ? 's' : ''}`);
    try {
      setTimeout(() => setUploadStage('Extracting resume text'), 250);
      setTimeout(() => setUploadStage('Parsing candidate profiles'), 650);
      setTimeout(() => setUploadStage('Running AI match analysis'), 1000);
      const result = await api.uploadRecruitmentResumes(selectedDriveId, selected);
      setCandidates(prev => [...result.candidates, ...prev].sort((a, b) => b.aiScore.overallMatchScore - a.aiScore.overallMatchScore));
      setSelectedCandidate(result.candidates[0] || selectedCandidate);
      if (result.failures.length) {
        setError(`${result.failures.length} file(s) could not be processed. ${result.failures[0].error}`);
      }
      const dash = await api.getRecruitmentDashboard();
      setDashboard(dash);
    } catch (err: any) {
      setError(err.message || 'Failed to upload resumes');
    } finally {
      setIsUploading(false);
      setUploadStage('');
    }
  };

  const searchCandidates = async () => {
    if (!query.trim()) {
      await loadRecruitment(selectedDriveId);
      return;
    }
    setIsLoading(true);
    try {
      const results = await api.searchRecruitmentCandidates(query, selectedDriveId);
      setCandidates(results);
      setSelectedCandidate(results[0] || null);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (status: string) => {
    if (!selectedCandidate) return;
    const updated = await api.updateCandidateStatus(selectedCandidate.id, status);
    setSelectedCandidate(updated);
    setCandidates(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const kpis: [string, string | number, LucideIcon][] = [
    ['Active Hiring Drives', dashboard?.activeHiringDrives || 0, Briefcase],
    ['Candidates Applied', dashboard?.candidatesApplied || 0, Users],
    ['Shortlisted', dashboard?.shortlisted || 0, CheckCircle],
    ['Rejected', dashboard?.rejected || 0, XCircle],
    ['Interview Scheduled', dashboard?.interviewScheduled || 0, Calendar],
    ['Offer Sent', dashboard?.offerSent || 0, Award],
    ['Offer Accepted', dashboard?.offerAccepted || 0, Sparkles],
    ['Avg Match Score', `${dashboard?.averageMatchScore || 0}%`, Brain],
  ];

  return (
    <div className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map(([label, value, KpiIcon]) => {
          return (
            <GlassCard key={String(label)} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">{label}</span>
                <KpiIcon className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-2xl font-black text-slate-100 mt-2">{value}</p>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-4 space-y-6">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-outfit font-bold text-sm text-slate-200">Hiring Drives</h3>
              <Plus className="w-4 h-4 text-blue-400" />
            </div>
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {drives.map(drive => (
                <button
                  key={drive.id}
                  onClick={() => loadRecruitment(drive.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${selectedDriveId === drive.id ? 'bg-blue-600/10 border-blue-500/25' : 'bg-slate-900/30 border-slate-800/60 hover:border-slate-700'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">{drive.hiringName}</span>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">{drive.status}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">{drive.source} | {drive.role}</p>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="font-outfit font-bold text-sm text-slate-200 mb-3">Create Hiring Campaign</h3>
            <div className="grid grid-cols-1 gap-2">
              {(['hiringName', 'company', 'department', 'role', 'source', 'location', 'salary', 'experience', 'degree', 'graduationYear'] as const).map(key => (
                <input
                  key={key}
                  value={String(form[key])}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-200 placeholder:text-slate-600"
                  placeholder={key}
                />
              ))}
              <textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-200 min-h-16"
                placeholder="Description"
              />
              {(['requiredSkills', 'preferredSkills', 'branches', 'preferredColleges', 'requiredCertifications', 'projectKeywords', 'languages', 'interviewRounds'] as const).map(key => (
                <input
                  key={key}
                  value={String(form[key])}
                  onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-200"
                  placeholder={`${key} comma separated`}
                />
              ))}
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={form.minimumCgpa}
                  onChange={e => setForm(prev => ({ ...prev, minimumCgpa: Number(e.target.value) }))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-200"
                  placeholder="Minimum CGPA"
                />
                <input
                  type="number"
                  value={form.maximumCandidates}
                  onChange={e => setForm(prev => ({ ...prev, maximumCandidates: Number(e.target.value) }))}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-200"
                  placeholder="Maximum Candidates"
                />
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.portfolioRequired} onChange={e => setForm(prev => ({ ...prev, portfolioRequired: e.target.checked }))} />
                  Portfolio required
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={form.githubRequired} onChange={e => setForm(prev => ({ ...prev, githubRequired: e.target.checked }))} />
                  GitHub required
                </label>
              </div>
              <button
                onClick={createDrive}
                disabled={isCreating}
                className="mt-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                {isCreating ? 'Creating...' : 'Create Hiring Drive'}
              </button>
            </div>
          </GlassCard>
        </div>

        <div className="xl:col-span-8 space-y-6">
          <GlassCard className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="font-outfit font-bold text-base text-slate-100">{selectedDrive?.hiringName || 'Recruitment Pipeline'}</h3>
                <p className="text-xs text-slate-500 mt-1">{selectedDrive?.description || 'Create a drive or import resumes to start ranking candidates.'}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href="/api/recruitment/export.csv"
                  className="px-3 py-2 rounded-lg border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-[10px] font-bold flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV
                </a>
              </div>
            </div>

            <label
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                uploadFiles(e.dataTransfer.files);
              }}
              className={`mt-4 border border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${isUploading ? 'border-blue-500/40 bg-blue-500/5' : 'border-slate-800 hover:border-blue-500/30 hover:bg-slate-900/30'}`}
            >
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.zip,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={e => e.target.files && uploadFiles(e.target.files)}
                disabled={isUploading || !selectedDriveId}
              />
              <UploadCloud className={`w-8 h-8 ${isUploading ? 'text-blue-400 animate-pulse' : 'text-slate-400'}`} />
              <span className="text-sm font-bold text-slate-200 mt-2">{isUploading ? uploadStage : 'Bulk Resume Import'}</span>
              <span className="text-[10px] text-slate-600 mt-1">Drag and drop 100+ resumes, ZIP files, or select multiple files</span>
              {isUploading && <div className="mt-3 h-1.5 w-64 bg-slate-900 rounded-full overflow-hidden"><div className="h-full w-2/3 bg-blue-500 rounded-full animate-pulse" /></div>}
            </label>
          </GlassCard>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <GlassCard className="xl:col-span-3 p-4">
              <div className="flex flex-col md:flex-row gap-2 md:items-center justify-between mb-4">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-600" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchCandidates(); }}
                    placeholder="Find React developers with AI projects"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-[11px] text-slate-200"
                  />
                </div>
                <button onClick={searchCandidates} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold">Search</button>
                <div className="flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-2 py-2 text-[10px] text-slate-300">
                    {['All', 'Strong Match', 'Good Match', 'Average', 'Weak Match', 'Rejected', 'Interview Scheduled', 'Offer Sent', 'Offer Accepted'].map(status => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="text-xs text-slate-500 py-8 text-center">Loading candidates...</div>
                ) : filteredCandidates.length ? filteredCandidates.map(candidate => (
                  <button
                    key={candidate.id}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`w-full p-3 rounded-xl border text-left transition-colors ${selectedCandidate?.id === candidate.id ? 'bg-blue-600/10 border-blue-500/25' : 'bg-slate-900/25 border-slate-800/60 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{candidate.parsedProfile.fullName}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">{candidate.parsedProfile.education.college || candidate.parsedProfile.education.degree || candidate.fileName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-blue-400">{candidate.aiScore.overallMatchScore}%</p>
                        <p className="text-[9px] text-slate-500">{candidate.status}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {candidate.parsedProfile.skills.all.slice(0, 5).map(skill => (
                        <span key={skill} className="text-[9px] px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400">{skill}</span>
                      ))}
                    </div>
                  </button>
                )) : (
                  <div className="text-xs text-slate-500 py-8 text-center">No candidates found for this drive.</div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="xl:col-span-2 p-4">
              {selectedCandidate ? (
                <div className="space-y-5">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-outfit font-bold text-lg text-slate-100">{selectedCandidate.parsedProfile.fullName}</h3>
                        <p className="text-[10px] text-slate-500 mt-1">{selectedCandidate.parsedProfile.email || 'No email'} | {selectedCandidate.parsedProfile.phone || 'No phone'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black text-blue-400">{selectedCandidate.aiScore.overallMatchScore}%</p>
                        <p className="text-[9px] text-slate-500">Match</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 mt-4 leading-relaxed">{selectedCandidate.parsedProfile.profileSummary}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    {[
                      ['Skill', selectedCandidate.aiScore.skillMatch],
                      ['CGPA', selectedCandidate.aiScore.cgpaMatch],
                      ['Project', selectedCandidate.aiScore.projectMatch],
                      ['Education', selectedCandidate.aiScore.educationMatch],
                    ].map(([label, score]) => (
                      <div key={String(label)} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60">
                        <span className="text-slate-500 font-bold uppercase">{label}</span>
                        <p className="text-slate-100 font-black text-base mt-1">{score}%</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2"><Brain className="w-3.5 h-3.5 text-blue-400" /> AI Explanation</h4>
                    <ul className="space-y-1.5">
                      {selectedCandidate.aiScore.reasons.map(reason => (
                        <li key={reason} className="text-[10px] text-slate-400 flex gap-2"><span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-blue-400 shrink-0" />{reason}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <h4 className="text-[10px] font-bold text-emerald-400 uppercase mb-2">Matching Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidate.aiScore.matchingSkills.map(skill => <span key={skill} className="text-[9px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/10">{skill}</span>)}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold text-red-400 uppercase mb-2">Missing Skills</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedCandidate.aiScore.missingSkills.map(skill => <span key={skill} className="text-[9px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/10">{skill}</span>)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Interview Questions</h4>
                    <ul className="space-y-1.5">
                      {selectedCandidate.aiScore.recommendedInterviewQuestions.map(question => (
                        <li key={question} className="text-[10px] text-slate-400 leading-relaxed">- {question}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-blue-400" /> Projects</h4>
                    <div className="space-y-1.5">
                      {(selectedCandidate.parsedProfile.projects.length ? selectedCandidate.parsedProfile.projects : ['No explicit project section detected.']).slice(0, 5).map(project => (
                        <p key={project} className="text-[10px] text-slate-500 leading-relaxed">{project}</p>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-900">
                    {['Interview Scheduled', 'Offer Sent', 'Offer Accepted', 'Rejected'].map(status => (
                      <button key={status} onClick={() => updateStatus(status)} className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold text-slate-300">
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[420px] flex items-center justify-center text-xs text-slate-500">
                  Select a candidate to open the AI profile.
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};
