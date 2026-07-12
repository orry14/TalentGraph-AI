import React, { useState, useEffect } from 'react';
import { api, AuditLog } from '../utils/api';
import { Search, ChevronDown, ChevronRight, Filter } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(25);
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  
  // Expanded rows state
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchLogs();
  }, [page, actorFilter, actionFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await api.getAuditLogs({
        page,
        limit,
        actor: actorFilter || undefined,
        action: actionFilter || undefined
      });
      setLogs(response.logs);
      setTotalPages(Math.ceil(response.total / response.limit));
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Audit Logs</h1>
          <p className="text-gray-500 dark:text-gray-400">Track and monitor all system activities and data access.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <Filter size={16} className="mr-2" />
            Filters:
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Filter by Actor ID..." 
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Filter by Action (e.g. upload_resume)" 
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="px-6 py-3 font-medium">Timestamp</th>
                <th className="px-6 py-3 font-medium">Actor</th>
                <th className="px-6 py-3 font-medium">Action</th>
                <th className="px-6 py-3 font-medium">Target</th>
                <th className="px-6 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading logs...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No audit logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${expandedRows.has(log.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                      onClick={() => toggleRow(log.id)}
                    >
                      <td className="px-6 py-3 text-gray-900 dark:text-gray-300 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-white">{log.actor_user_id}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{log.actor_role}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-blue-600 dark:text-blue-400 font-medium">
                        {log.action}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-col">
                          <span className="text-gray-900 dark:text-gray-300 capitalize">{log.target_type}</span>
                          {log.target_id && <span className="text-xs text-gray-500 font-mono">{log.target_id}</span>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right text-gray-400">
                        {expandedRows.has(log.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                    </tr>
                    {expandedRows.has(log.id) && (
                      <tr className="bg-gray-50/50 dark:bg-gray-900/30">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wider">Metadata Payload</div>
                          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg text-xs text-gray-800 dark:text-gray-300 overflow-x-auto border border-gray-200 dark:border-gray-700">
                            {JSON.stringify(log.metadata || {}, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages || 1}
          </div>
          <div className="flex gap-2">
            <button 
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Previous
            </button>
            <button 
              disabled={page >= totalPages}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
