import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { GlassCard } from './GlassCard';
import {
  MessageSquareCode,
  X,
  Send,
  Sparkles,
  User,
  ArrowRight,
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Paperclip,
  Copy,
  RefreshCw,
  Square,
  Trash2,
  Search,
  ChevronDown,
  Settings,
  ThumbsUp,
  ThumbsDown,
  Download,
  Maximize2,
  Minimize2,
  Clock,
  AlertCircle,
  CheckCircle,
  Plus,
  Bot,
} from 'lucide-react';

const API_BASE = '/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reaction?: 'up' | 'down' | null;
  isStreaming?: boolean;
  fileAttachment?: { name: string; type: string };
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

interface ModelOption {
  id: string;
  name: string;
  description: string;
}

interface ChatBotProps {
  setActiveTab?: (tab: string) => void;
}

// ─── Groq model list (fetched from server) ───────────────────────────────────
const DEFAULT_MODELS: ModelOption[] = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Best reasoning' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', description: 'Fastest' },
  { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B', description: 'Deep analysis' },
  { id: 'deepseek-r1-distill-llama-70b', name: 'DeepSeek R1', description: 'Reasoning' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', description: 'Lightweight' },
];

// ─── Markdown renderer ────────────────────────────────────────────────────────
const MarkdownRenderer: React.FC<{ content: string; setActiveTab?: (tab: string) => void }> = ({
  content,
  setActiveTab,
}) => {
  const renderInline = (text: string): React.ReactNode[] => {
    // Bold **text**
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    const codeRegex = /`([^`]+)`/g;
    const italicRegex = /\*(.*?)\*/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const combined = text;

    // Process bold + code + italic inline
    const allPatterns: { regex: RegExp; render: (m: RegExpExecArray) => React.ReactNode }[] = [
      {
        regex: /\*\*(.*?)\*\*/g,
        render: (m) => <strong className="font-bold text-white">{m[1]}</strong>,
      },
      {
        regex: /`([^`]+)`/g,
        render: (m) => (
          <code className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-blue-300 font-mono">
            {m[1]}
          </code>
        ),
      },
      {
        regex: /\*(.*?)\*/g,
        render: (m) => <em className="italic text-slate-300">{m[1]}</em>,
      },
    ];

    // Simple sequential pass – just handle bold for now (nested patterns need a real parser)
    const segments = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
    return segments.map((seg, i) => {
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return <strong key={i} className="font-bold text-white">{seg.slice(2, -2)}</strong>;
      }
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return <code key={i} className="px-1 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-blue-300 font-mono">{seg.slice(1, -1)}</code>;
      }
      if (seg.startsWith('*') && seg.endsWith('*') && !seg.startsWith('**')) {
        return <em key={i} className="italic text-slate-300">{seg.slice(1, -1)}</em>;
      }
      return <span key={i}>{seg}</span>;
    });
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.filter(r => !r.replace(/[\s|:-]/g, '').length === false || r.includes('|'));
    const headerRow = rows[0];
    const dataRows = rows.slice(2); // skip separator

    if (!headerRow) { tableBuffer = []; return; }

    const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
    elements.push(
      <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-xl border border-slate-800">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="bg-slate-900 border-b border-slate-800">
              {headers.map((h, hi) => (
                <th key={hi} className="px-3 py-2 text-left font-extrabold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                  {renderInline(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataRows.map((row, ri) => {
              const cells = row.split('|').map(c => c.trim()).filter(Boolean);
              return (
                <tr key={ri} className="border-b border-slate-900 hover:bg-slate-900/30 transition-colors">
                  {cells.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-slate-300">{renderInline(cell)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
    tableBuffer = [];
  };

  while (i < lines.length) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      flushTable();
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      const code = codeLines.join('\n');

      // Action blocks
      if (lang === 'action') {
        try {
          const action = JSON.parse(code);
          elements.push(
            <div key={i} className="mt-2">
              <button
                onClick={() => {
                  if (action.type === 'navigate' && setActiveTab) {
                    setActiveTab(action.target);
                  }
                }}
                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-bold transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
              >
                <Brain className="w-3.5 h-3.5" />
                {action.label || `Open ${action.target || 'module'}`}
                <ArrowRight className="w-3 h-3 animate-pulse" />
              </button>
            </div>
          );
        } catch {
          // not valid JSON, skip
        }
      } else {
        elements.push(
          <div key={i} className="my-2 rounded-xl overflow-hidden border border-slate-800">
            {lang && (
              <div className="px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[9px] font-bold text-slate-500 uppercase tracking-wider">{lang}</div>
            )}
            <pre className="p-3 bg-slate-950 text-[10px] text-slate-300 overflow-x-auto font-mono leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }
      i++;
      continue;
    }

    // Table rows
    if (line.startsWith('|')) {
      tableBuffer.push(line);
      i++;
      continue;
    } else if (tableBuffer.length > 0) {
      flushTable();
    }

    // Action tags (legacy format)
    if (line.includes('[ACTION:')) {
      const match = line.match(/\[ACTION:\s*(\w+)\s*\|\s*([^\]]+)\]/);
      if (match) {
        const actionType = match[1];
        const paramsStr = match[2];
        const params: Record<string, string> = {};
        paramsStr.split('|').forEach(p => {
          const parts = p.split(':');
          const k = parts[0]?.trim();
          const v = parts.slice(1).join(':')?.trim();
          if (k && v) params[k] = v;
        });
        const label = params['label'] || 'Take Action';
        const target = params['target'];
        elements.push(
          <div key={i} className="mt-2">
            <button
              onClick={() => {
                if ((actionType === 'navigate' || actionType === 'simulate') && target && setActiveTab) {
                  setActiveTab(target === 'simulate' ? 'skill-graph' : target);
                }
              }}
              className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[10px] font-bold transition-all"
            >
              <Brain className="w-3.5 h-3.5" />
              {label}
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        );
        i++;
        continue;
      }
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|_{3,}|\*{3,})$/)) {
      elements.push(<hr key={i} className="border-slate-800 my-3" />);
      i++;
      continue;
    }

    // Headers
    if (line.startsWith('#### ')) {
      elements.push(<h5 key={i} className="font-bold text-[11px] text-slate-200 mt-3 mb-1">{renderInline(line.slice(5))}</h5>);
      i++; continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h4 key={i} className="font-outfit font-bold text-xs text-blue-400 mt-3 mb-1.5 uppercase tracking-wider">{renderInline(line.slice(4))}</h4>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="font-outfit font-extrabold text-sm text-slate-100 mt-4 mb-2">{renderInline(line.slice(3))}</h3>);
      i++; continue;
    }
    if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="font-outfit font-black text-base text-slate-100 mt-4 mb-2">{renderInline(line.slice(2))}</h2>);
      i++; continue;
    }

    // Unordered list
    if (line.match(/^(\s*)([-*•])\s/)) {
      const indent = line.match(/^(\s*)/)![1].length;
      elements.push(
        <div key={i} className="flex items-start gap-2 py-0.5" style={{ paddingLeft: `${indent * 8}px` }}>
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
          <span className="text-[11px] text-slate-300 leading-relaxed">{renderInline(line.replace(/^(\s*)([-*•])\s/, ''))}</span>
        </div>
      );
      i++; continue;
    }

    // Ordered list
    const numMatch = line.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      elements.push(
        <div key={i} className="flex items-start gap-2 py-0.5 ml-1">
          <span className="font-bold text-blue-400 text-[10px] mt-0.5 shrink-0 w-4">{numMatch[1]}.</span>
          <span className="text-[11px] text-slate-300 leading-relaxed">{renderInline(numMatch[2])}</span>
        </div>
      );
      i++; continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-blue-500 pl-3 my-1 text-[11px] text-slate-400 italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
      i++; continue;
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
      i++; continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} className="text-[11px] text-slate-300 leading-relaxed py-0.5">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  flushTable();
  return <div className="space-y-0.5">{elements}</div>;
};

// ─── Typing cursor ────────────────────────────────────────────────────────────
const TypingCursor: React.FC = () => (
  <span className="inline-block w-0.5 h-3.5 bg-blue-400 animate-pulse ml-0.5 align-middle" />
);

// ─── Main ChatBot Component ───────────────────────────────────────────────────
export const ChatBot: React.FC<ChatBotProps> = ({ setActiveTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 'conv-1',
      title: 'New conversation',
      createdAt: new Date(),
      messages: [
        {
          id: 'welcome',
          role: 'assistant',
          content: `### AI Workforce Copilot — Ready

Hello! I'm your intelligent AI Workforce Copilot, powered by **Llama 3.3 70B** via Groq.

I have full access to your **live workforce data** including employees, projects, skill metrics, health scores, and organizational analytics.

**Try asking me:**
- *"Who is our strongest React developer?"*
- *"Which project is at highest risk right now?"*
- *"Generate a learning roadmap for Sarah Chen"*
- *"Who is overallocated across multiple projects?"*
- *"Summarize the executive dashboard insights"*
- *"What are our biggest skill gaps?"*

I can also **execute actions** — assign employees, create projects, navigate to any module, generate reports, and more.`,
          timestamp: new Date(),
        },
      ],
    },
  ]);
  const [activeConvId, setActiveConvId] = useState('conv-1');
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMsgId, setStreamingMsgId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModel, setSelectedModel] = useState('llama-3.3-70b-versatile');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_MODELS);
  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldKeepListeningRef = useRef(false);
  const committedTranscriptRef = useRef('');
  const voiceRestartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep a ref that always points to the current activeConvId for async callbacks
  const activeConvIdRef = useRef(activeConvId);
  useEffect(() => { activeConvIdRef.current = activeConvId; }, [activeConvId]);

  const activeConv = useMemo(
    () => conversations.find(c => c.id === activeConvId)!,
    [conversations, activeConvId]
  );

  const displayMessages = useMemo(() => {
    if (!searchQuery.trim()) return activeConv?.messages || [];
    const q = searchQuery.toLowerCase();
    return (activeConv?.messages || []).filter(m => m.content.toLowerCase().includes(q));
  }, [activeConv, searchQuery]);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isStreaming]);

  // Fetch models
  useEffect(() => {
    fetch(`${API_BASE}/ai/models`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setModels(data); })
      .catch(() => {});
  }, []);

  // Update message in conversation
  const updateMessage = useCallback((convId: string, msgId: string, updater: (m: ChatMessage) => ChatMessage) => {
    setConversations(prev => prev.map(conv =>
      conv.id !== convId ? conv : {
        ...conv,
        messages: conv.messages.map(m => m.id === msgId ? updater(m) : m),
      }
    ));
  }, []);

  const addMessage = useCallback((convId: string, msg: ChatMessage) => {
    setConversations(prev => prev.map(conv =>
      conv.id !== convId ? conv : { ...conv, messages: [...conv.messages, msg] }
    ));
  }, []);

  // Generate title from first user message
  const generateTitle = (text: string) => {
    return text.length > 40 ? text.slice(0, 40) + '…' : text;
  };

  // TTS
  const speakText = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    const plain = text.replace(/[#*`>\[\]]/g, '').replace(/\n+/g, ' ').slice(0, 500);
    const utt = new SpeechSynthesisUtterance(plain);
    utt.rate = 1.1;
    window.speechSynthesis.speak(utt);
  };

  const stopVoiceListening = useCallback(() => {
    shouldKeepListeningRef.current = false;
    if (voiceRestartTimerRef.current) {
      clearTimeout(voiceRestartTimerRef.current);
      voiceRestartTimerRef.current = null;
    }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  }, []);

  // Voice input
  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    if (isListening) {
      stopVoiceListening();
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    shouldKeepListeningRef.current = true;
    committedTranscriptRef.current = input.trim();
    recognition.onresult = (e: any) => {
      let interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript.trim();
        if (!transcript) continue;
        if (e.results[i].isFinal) {
          committedTranscriptRef.current = [
            committedTranscriptRef.current,
            transcript,
          ].filter(Boolean).join(' ');
        } else {
          interimTranscript = [
            interimTranscript,
            transcript,
          ].filter(Boolean).join(' ');
        }
      }
      setInput([
        committedTranscriptRef.current,
        interimTranscript,
      ].filter(Boolean).join(' '));
    };
    recognition.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        shouldKeepListeningRef.current = false;
        setIsListening(false);
      }
    };
    recognition.onend = () => {
      if (!shouldKeepListeningRef.current) {
        setIsListening(false);
        return;
      }
      voiceRestartTimerRef.current = setTimeout(() => {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
          shouldKeepListeningRef.current = false;
        }
      }, 150);
    };
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  useEffect(() => {
    return () => stopVoiceListening();
  }, [stopVoiceListening]);

  // File upload
  const handleFileUpload = async (file: File) => {
    const userMsgId = `msg-${Date.now()}-user`;
    const asstMsgId = `msg-${Date.now()}-asst`;

    addMessage(activeConvId, {
      id: userMsgId,
      role: 'user',
      content: `📎 Analyzing file: **${file.name}**`,
      timestamp: new Date(),
      fileAttachment: { name: file.name, type: file.type },
    });

    const placeHolder: ChatMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    addMessage(activeConvId, placeHolder);
    setStreamingMsgId(asstMsgId);
    setIsStreaming(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('model', selectedModel);
      const res = await fetch(`${API_BASE}/ai/analyze-file`, { method: 'POST', body: formData });
      const data = await res.json();
      const analysis = data.analysis || 'Could not analyze file.';
      updateMessage(activeConvId, asstMsgId, m => ({ ...m, content: analysis, isStreaming: false }));
      speakText(analysis);
    } catch {
      updateMessage(activeConvId, asstMsgId, m => ({
        ...m,
        content: '⚠️ Failed to analyze file. Please try again.',
        isStreaming: false,
      }));
    } finally {
      setIsStreaming(false);
      setStreamingMsgId(null);
    }
  };

  // Typewriter animation: reveal text char-by-char
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runTypewriter = (convId: string, msgId: string, fullText: string) => {
    let i = 0;
    const chunkSize = 4; // reveal N chars at a time for speed
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    typewriterRef.current = setInterval(() => {
      i += chunkSize;
      const partial = fullText.slice(0, i);
      const isDone = i >= fullText.length;
      updateMessage(convId, msgId, m => ({
        ...m,
        content: isDone ? fullText : partial,
        isStreaming: !isDone,
      }));
      if (isDone) {
        clearInterval(typewriterRef.current!);
        typewriterRef.current = null;
        setIsStreaming(false);
        setStreamingMsgId(null);
        speakText(fullText);
      }
    }, 12); // 12ms between chunks → fast but visible
  };

  // Main send
  const handleSend = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || isStreaming) return;
    if (isListening) stopVoiceListening();
    setInput('');

    const userMsgId = `msg-${Date.now()}-u`;
    const asstMsgId = `msg-${Date.now()}-a`;

    // Add user message
    addMessage(activeConvId, {
      id: userMsgId,
      role: 'user',
      content: msgText,
      timestamp: new Date(),
    });

    // Update conv title on first user message
    setConversations(prev => prev.map(conv => {
      if (conv.id !== activeConvId) return conv;
      const isDefault = conv.title === 'New conversation';
      return isDefault ? { ...conv, title: generateTitle(msgText) } : conv;
    }));

    // Add placeholder assistant message
    const placeholder: ChatMessage = {
      id: asstMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    addMessage(activeConvId, placeholder);
    setStreamingMsgId(asstMsgId);
    setIsStreaming(true);

    // Build message history for Groq
    const history = (activeConv?.messages || [])
      .filter(m => m.id !== 'welcome' && m.id !== 'welcome-' + activeConvId)
      .filter(m => m.content.trim() !== '')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));
    history.push({ role: 'user', content: msgText });

    const convId = activeConvIdRef.current;
    const msgId = asstMsgId;
    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          model: selectedModel,
          temperature,
          maxTokens,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errBody.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      const fullResponse: string = data.response || '*(No response received)*';

      // Kick off typewriter reveal
      runTypewriter(convId, msgId, fullResponse);
    } catch (err: any) {
      const errMsg = err.name === 'AbortError'
        ? '*Response stopped by user.*'
        : `⚠️ **Error:** ${err.message || 'Could not reach server at port 5000.'}`;
      updateMessage(convId, msgId, m => ({
        ...m,
        content: errMsg,
        isStreaming: false,
      }));
      setIsStreaming(false);
      setStreamingMsgId(null);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    // Cancel the fetch request
    abortControllerRef.current?.abort();
    // Cancel the typewriter animation
    if (typewriterRef.current) {
      clearInterval(typewriterRef.current);
      typewriterRef.current = null;
    }
    setIsStreaming(false);
    setStreamingMsgId(null);
  };

  const handleRegenerate = async () => {
    const msgs = activeConv?.messages || [];
    const lastUser = [...msgs].reverse().find(m => m.role === 'user');
    if (!lastUser) return;
    // Remove last assistant message
    setConversations(prev => prev.map(conv =>
      conv.id !== activeConvId ? conv : {
        ...conv,
        messages: conv.messages.filter(m => {
          const idx = conv.messages.indexOf(m);
          return !(m.role === 'assistant' && idx === conv.messages.length - 1);
        }),
      }
    ));
    await handleSend(lastUser.content);
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleReaction = (msgId: string, reaction: 'up' | 'down') => {
    updateMessage(activeConvId, msgId, m => ({
      ...m,
      reaction: m.reaction === reaction ? null : reaction,
    }));
  };

  const handleNewConversation = () => {
    const newConv: Conversation = {
      id: `conv-${Date.now()}`,
      title: 'New conversation',
      createdAt: new Date(),
      messages: [
        {
          id: `welcome-${Date.now()}`,
          role: 'assistant',
          content: `### AI Workforce Copilot

Ready for a new conversation. How can I assist you today?`,
          timestamp: new Date(),
        },
      ],
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConvId(newConv.id);
  };

  const handleDeleteConversation = (convId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConvId === convId) {
      setActiveConvId(conversations[0]?.id || 'conv-1');
    }
  };

  const handleExportConversation = () => {
    const text = activeConv.messages
      .map(m => `**${m.role === 'user' ? 'You' : 'AI Copilot'}** (${m.timestamp.toLocaleTimeString()}):\n${m.content}`)
      .join('\n\n---\n\n');
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeConv.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickPrompts = [
    "Who is our strongest React developer?",
    "Which project is at highest risk?",
    "Who is overallocated?",
    "Show me skill gaps",
    "Summarize the dashboard",
    "Which engineers are promotion ready?",
    "Who should I assign to a new AI project?",
    "Generate a hiring roadmap",
  ];

  // Panel dimensions
  const panelWidth = isExpanded ? 'w-[760px]' : 'w-[480px]';
  const panelHeight = isExpanded ? 'h-[85vh]' : 'h-[600px]';

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* FAB */}
      {!isOpen && (
        <div className="relative group">
          <button
            onClick={() => setIsOpen(true)}
            className="h-14 w-14 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center justify-center shadow-[0_4px_25px_rgba(59,130,246,0.4)] hover:scale-110 active:scale-95 transition-all duration-200"
          >
            <Bot className="w-6 h-6" />
          </button>
          <div className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 animate-pulse" />
          <div className="absolute bottom-16 right-0 bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-semibold px-2.5 py-1.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
            AI Workforce Copilot
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`${panelWidth} ${panelHeight} flex flex-col rounded-2xl border border-slate-800 bg-[#090d16] shadow-[0_20px_60px_rgba(0,0,0,0.8)] transition-all duration-300 overflow-hidden`}>

          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="p-3 border-b border-slate-900 flex items-center justify-between bg-slate-950/80 shrink-0 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-outfit font-bold text-xs text-slate-100 leading-none">AI Workforce Copilot</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] text-emerald-400 font-semibold uppercase tracking-wider">
                    {models.find(m => m.id === selectedModel)?.name || 'Llama 3.3'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Search toggle */}
              <button
                onClick={() => setShowSearch(s => !s)}
                className={`p-1.5 rounded-lg transition-colors ${showSearch ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                title="Search messages"
              >
                <Search className="w-3.5 h-3.5" />
              </button>

              {/* Sidebar / conversations */}
              <button
                onClick={() => setShowSidebar(s => !s)}
                className={`p-1.5 rounded-lg transition-colors ${showSidebar ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                title="Conversations"
              >
                <Clock className="w-3.5 h-3.5" />
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(s => !s)}
                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                title="Settings"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* TTS toggle */}
              <button
                onClick={() => setTtsEnabled(s => !s)}
                className={`p-1.5 rounded-lg transition-colors ${ttsEnabled ? 'text-blue-400 bg-blue-500/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900'}`}
                title="Voice output"
              >
                {ttsEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              {/* Expand */}
              <button
                onClick={() => setIsExpanded(e => !e)}
                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-900 rounded-lg transition-colors"
                title={isExpanded ? 'Minimize' : 'Expand'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* Close */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Search bar ─────────────────────────────────────────── */}
          {showSearch && (
            <div className="px-3 py-2 border-b border-slate-900 bg-slate-950/60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-600 absolute left-2.5 top-2" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl text-[11px] pl-8 pr-3 py-1.5 text-slate-300 placeholder:text-slate-600"
                />
              </div>
            </div>
          )}

          {/* ── Settings Panel ─────────────────────────────────────── */}
          {showSettings && (
            <div className="px-4 py-3 border-b border-slate-900 bg-slate-950/80 space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">AI Model</label>
                <select
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl text-[11px] p-2 text-slate-300"
                >
                  {models.map(m => (
                    <option key={m.id} value={m.id}>{m.name} – {m.description}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Temperature: {temperature}
                  </label>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={temperature}
                    onChange={e => setTemperature(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    Max Tokens: {maxTokens}
                  </label>
                  <input
                    type="range" min="256" max="8192" step="256"
                    value={maxTokens}
                    onChange={e => setMaxTokens(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Main Content: Sidebar + Chat ───────────────────────── */}
          <div className="flex flex-1 overflow-hidden">
            {/* Conversation Sidebar */}
            {showSidebar && (
              <div className="w-44 border-r border-slate-900 flex flex-col bg-slate-950/60 shrink-0">
                <div className="p-2 border-b border-slate-900">
                  <button
                    onClick={handleNewConversation}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 rounded-lg text-[10px] font-semibold text-blue-400 transition-colors"
                  >
                    <Plus className="w-3 h-3" /> New Chat
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-0.5 p-1.5">
                  {conversations.map(conv => (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConvId(conv.id)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-[10px] ${conv.id === activeConvId ? 'bg-blue-600/15 text-blue-300' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'}`}
                    >
                      <span className="truncate flex-1">{conv.title}</span>
                      {conversations.length > 1 && (
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-950/20">
              {displayMessages.map((msg, idx) => (
                <div
                  key={msg.id}
                  className={`group flex items-start gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-[9px] font-bold ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 text-slate-400'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble */}
                  <div className={`flex flex-col max-w-[87%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Timestamp */}
                    <span className="text-[8px] text-slate-600 mb-1 px-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div className={`p-3 rounded-2xl border text-left ${
                      msg.role === 'user'
                        ? 'bg-blue-600/15 border-blue-500/25 text-blue-100 rounded-tr-sm'
                        : 'bg-slate-900/60 border-slate-800/60 rounded-tl-sm w-full'
                    }`}>
                      {msg.role === 'user' ? (
                        <p className="text-[11px] font-medium leading-relaxed">{msg.content}</p>
                      ) : (
                        <>
                          <MarkdownRenderer content={msg.content} setActiveTab={setActiveTab} />
                          {msg.isStreaming && streamingMsgId === msg.id && <TypingCursor />}
                        </>
                      )}
                    </div>

                    {/* Message actions (only for assistant, non-streaming) */}
                    {msg.role === 'assistant' && !msg.isStreaming && (
                      <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(msg.content)}
                          className="p-1 text-slate-600 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        {idx === displayMessages.length - 1 && (
                          <button
                            onClick={handleRegenerate}
                            className="p-1 text-slate-600 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                            title="Regenerate"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          onClick={() => handleReaction(msg.id, 'up')}
                          className={`p-1 rounded-lg transition-colors ${msg.reaction === 'up' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'}`}
                          title="Good response"
                        >
                          <ThumbsUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleReaction(msg.id, 'down')}
                          className={`p-1 rounded-lg transition-colors ${msg.reaction === 'down' ? 'text-red-400 bg-red-500/10' : 'text-slate-600 hover:text-slate-300 hover:bg-slate-800'}`}
                          title="Bad response"
                        >
                          <ThumbsDown className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator when streaming starts but no tokens yet */}
              {isStreaming && streamingMsgId && (activeConv?.messages || []).find(m => m.id === streamingMsgId)?.content === '' && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <div className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-2xl rounded-tl-sm flex items-center gap-1.5 py-4">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>
          </div>

          {/* ── Quick Prompts ──────────────────────────────────────── */}
          {!isStreaming && (activeConv?.messages.length || 0) <= 1 && (
            <div className="px-3 pt-2 pb-1 border-t border-slate-900 bg-slate-950/60">
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mb-1.5">Try asking</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {quickPrompts.slice(0, 5).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="shrink-0 px-2.5 py-1.5 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-[9px] font-medium text-slate-400 hover:text-slate-200 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Input Bar ─────────────────────────────────────────── */}
          <div className="p-3 border-t border-slate-900 bg-slate-950/70 shrink-0">
            {/* Action bar */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                {/* File upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.txt,.csv,.md,.json"
                  onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
                />

                {/* Voice input */}
                <button
                  onClick={toggleVoice}
                  className={`p-1.5 rounded-lg transition-colors ${isListening ? 'text-red-400 bg-red-500/10 animate-pulse' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                  title={isListening ? 'Stop listening' : 'Voice input'}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                {/* Export */}
                <button
                  onClick={handleExportConversation}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                  title="Export conversation"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Clear conversation */}
              <button
                onClick={() => {
                  setConversations(prev => prev.map(conv =>
                    conv.id !== activeConvId ? conv : {
                      ...conv,
                      title: 'New conversation',
                      messages: [{
                        id: `welcome-${Date.now()}`,
                        role: 'assistant',
                        content: 'Conversation cleared. How can I help you?',
                        timestamp: new Date(),
                      }],
                    }
                  ));
                }}
                className="text-[9px] text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>

            {/* Textarea + Send */}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                placeholder={isListening ? '🎙️ Listening...' : 'Ask anything about your workforce...'}
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  // Auto-resize
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                disabled={isStreaming}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-blue-500/50 rounded-xl text-[11px] text-slate-100 placeholder:text-slate-600 px-3.5 py-2.5 resize-none overflow-hidden transition-colors disabled:opacity-50 min-h-[38px]"
                style={{ height: '38px' }}
              />

              {isStreaming ? (
                <button
                  onClick={handleStop}
                  className="h-9 w-9 rounded-xl bg-red-600/20 hover:bg-red-600/30 border border-red-500/20 text-red-400 flex items-center justify-center transition-all"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim()}
                  className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white flex items-center justify-center transition-all shadow-[0_0_12px_rgba(59,130,246,0.25)] active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-[8px] text-slate-700 mt-1.5 text-center">
              Shift+Enter for new line · Powered by Groq
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
