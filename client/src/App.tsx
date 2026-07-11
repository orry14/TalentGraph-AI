import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ChatBot } from './components/ChatBot';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Staffing } from './pages/Staffing';
import { GapAnalysis } from './pages/GapAnalysis';
import { SkillGraph } from './pages/SkillGraph';
import { Projects } from './pages/Projects';
import { Recruitment } from './pages/Recruitment';
import { api, Employee, Project, DashboardStats, SkillGapReport } from './utils/api';
import { SkeletonTable } from './components/LoadingSkeleton';

function AppContent() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // App Core Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gapReport, setGapReport] = useState<SkillGapReport | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Fetch all core dataset
  const fetchAllData = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [empData, projData, statsData, gapData] = await Promise.all([
        api.getEmployees(),
        api.getProjects(),
        api.getDashboardStats(),
        api.getGapAnalysis()
      ]);
      setEmployees(empData);
      setProjects(projData);
      setStats(statsData);
      setGapReport(gapData);
    } catch (err) {
      console.error('Failed to load platform data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated]);

  // Reset database back to seed template
  const handleResetDB = async () => {
    if (!window.confirm('Are you sure you want to reset the database to initial template values? This will wipe uploaded records.')) return;
    
    setResetLoading(true);
    try {
      await api.resetDatabase();
      await fetchAllData();
      alert('Database restored successfully.');
    } catch (err: any) {
      alert('Failed to reset database: ' + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  // Removed Login rendering
  // Active view routing
  const renderContent = () => {
    if (isLoading && !stats) {
      return (
        <div className="space-y-6">
          <SkeletonTable />
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return stats ? <Dashboard stats={stats} setActiveTab={setActiveTab} /> : null;
      case 'employees':
        return (
          <Employees
            employees={employees}
            setEmployees={setEmployees}
            refreshStats={fetchAllData}
          />
        );
      case 'staffing':
        return <Staffing />;
      case 'projects':
        return <Projects />;
      case 'recruitment':
        return <Recruitment />;
      case 'gap-analysis':
        return gapReport ? <GapAnalysis report={gapReport} /> : null;
      case 'skill-graph':
        return <SkillGraph employees={employees} projects={projects} />;
      default:
        return stats ? <Dashboard stats={stats} /> : null;
    }
  };

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      orgCapabilityScore={stats ? stats.capabilityScore : null}
      onResetDB={handleResetDB}
      resetLoading={resetLoading}
    >
      {renderContent()}
      
      {/* Global Floating AI Copilot */}
      <ChatBot setActiveTab={setActiveTab} />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
