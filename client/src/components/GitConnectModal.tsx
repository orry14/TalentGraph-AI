import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Github, Gitlab, Loader2, Sparkles } from 'lucide-react';

interface GitConnectModalProps {
  platform: 'github' | 'gitlab';
  onConnect: (username: string) => Promise<void>;
  onClose: () => void;
}

export const GitConnectModal: React.FC<GitConnectModalProps> = ({ platform, onConnect, onClose }) => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setLoading(true);
    setError('');
    try {
      await onConnect(username.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || `Failed to link ${platform === 'github' ? 'GitHub' : 'GitLab'} account.`);
    } finally {
      setLoading(false);
    }
  };

  const isGitHub = platform === 'github';

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 border border-slate-700/50 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/40">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isGitHub ? 'bg-purple-500/20 text-purple-400' : 'bg-orange-500/20 text-orange-400'
            }`}>
              {isGitHub ? <Github className="w-5 h-5" /> : <Gitlab className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-outfit font-bold text-white">
                Connect {isGitHub ? 'GitHub' : 'GitLab'}
              </h3>
              <p className="text-xs text-slate-400">Import verified tech skills</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-sm text-slate-300 space-y-2">
            <p>
              By linking your {isGitHub ? 'GitHub' : 'GitLab'} account, Nexus will pull:
            </p>
            <ul className="list-disc pl-5 text-xs text-slate-400 space-y-1">
              <li>Language breakdown from your public repositories</li>
              <li>Commit volume, PR review events, and code contributions</li>
              <li>Organization associations and repositories</li>
            </ul>
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-2.5 mt-2">
              <Sparkles className="w-4.5 h-4.5 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-300 font-medium">
                Verified skills carry higher match weighting in the AI Staffing Engine optimizer.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wide">
              {isGitHub ? 'GitHub Username' : 'GitLab Username'}
            </label>
            <input
              type="text"
              required
              disabled={loading}
              placeholder={isGitHub ? 'e.g. octocat' : 'e.g. gitlab-user'}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all font-outfit"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 p-3 rounded-xl">
              {error}
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className={`flex-1 py-3 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-white ${
                isGitHub ? 'bg-purple-600 hover:bg-purple-500' : 'bg-orange-600 hover:bg-orange-500'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
                </>
              ) : (
                'Verify & Connect'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
