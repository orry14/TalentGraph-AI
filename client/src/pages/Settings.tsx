import React, { useState, useEffect } from 'react';
import { api, ScheduledReport } from '../utils/api';
import { GlassCard } from '../components/GlassCard';
import { Calendar, Trash2, ShieldAlert, Plus, Check } from 'lucide-react';

export const Settings: React.FC = () => {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [reportType, setReportType] = useState('dashboard');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('weekly');
  const [recipients, setRecipients] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    setLoading(true);
    try {
      const data = await api.getScheduledReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load scheduled reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipients.trim()) return;
    
    setSaving(true);
    setSuccess(false);
    try {
      const recipientList = recipients.split(',').map(email => email.trim()).filter(Boolean);
      await api.createScheduledReport({
        report_type: reportType,
        frequency,
        recipient_emails: recipientList,
        filters: {} // Generic empty filters for default scheduled reports
      });
      setSuccess(true);
      setRecipients('');
      fetchSchedules();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to create scheduled report:', err);
      alert('Error creating scheduled report');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled report?')) return;
    try {
      const deleted = await api.deleteScheduledReport(id);
      if (deleted) {
        setReports(reports.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete report:', err);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          Platform Settings
        </h1>
        <p className="text-gray-500 dark:text-gray-400">Configure report automation and platform scheduler rules.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Create Schedule Card */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6">
            <h3 className="text-md font-bold text-slate-100 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Schedule Automated Report
            </h3>
            
            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 py-2.5 px-3 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="dashboard">Executive Dashboard Summary</option>
                  <option value="employees">Employee Workspace Directory</option>
                  <option value="gap-analysis">Skill Gap Analysis</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Frequency</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 py-2.5 px-3 focus:outline-none focus:border-blue-500/50"
                >
                  <option value="weekly">Weekly Export</option>
                  <option value="monthly">Monthly Export</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">Recipient Emails</label>
                <input
                  type="text"
                  placeholder="e.g. manager@workforce.ai, hr@workforce.ai"
                  value={recipients}
                  onChange={(e) => setRecipients(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl text-xs py-2.5 px-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Separate multiple emails with commas.</span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {success ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Report Scheduled!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>{saving ? 'Scheduling...' : 'Add Schedule'}</span>
                  </>
                )}
              </button>
            </form>
          </GlassCard>
        </div>

        {/* Existing Schedules Table */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <h3 className="text-md font-bold text-slate-100 mb-4">Active Automation Schedules</h3>
            
            {loading ? (
              <div className="text-center py-8 text-slate-500 text-sm">Loading active automations...</div>
            ) : reports.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No active report schedules configured.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 uppercase tracking-wider font-semibold">
                      <th className="pb-3">Report</th>
                      <th className="pb-3">Frequency</th>
                      <th className="pb-3">Recipients</th>
                      <th className="pb-3">Next Scheduled Run</th>
                      <th className="pb-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40 text-slate-300">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-900/10">
                        <td className="py-4 font-bold text-slate-200 capitalize">
                          {report.report_type.replace('-', ' ')}
                        </td>
                        <td className="py-4 capitalize">
                          {report.frequency}
                        </td>
                        <td className="py-4 font-mono text-[10px]">
                          {report.recipient_emails.join(', ')}
                        </td>
                        <td className="py-4 text-slate-400">
                          {new Date(report.next_run_at).toLocaleString()}
                        </td>
                        <td className="py-4 text-right">
                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="text-red-400 hover:text-red-300 transition-colors p-1"
                            title="Cancel Schedule"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
