import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  CheckCircle,
  KeyRound,
  GraduationCap,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (user: { name: string; email: string; role: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('author@texforge.io');
  const [password, setPassword] = useState('••••••••••••');
  const [name, setName] = useState('Dr. Aris Thorne');
  const [role, setRole] = useState('Lead Academic Researcher');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide valid email and password.');
      return;
    }

    if (mode === 'signup' && !name) {
      setError('Please enter your full name.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: mode === 'signup' ? name : 'Dr. Aris Thorne',
        email,
        role: mode === 'signup' ? role : 'Lead Academic Researcher',
      });
      onClose();
    }, 600);
  };

  const handleDemoLogin = (demoRole: string, demoName: string, demoEmail: string) => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess({
        name: demoName,
        email: demoEmail,
        role: demoRole,
      });
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border-2 border-slate-700 shadow-2xl overflow-hidden text-slate-100">
        {/* Top Crimson Accent Header Line */}
        <div className="h-1.5 w-full bg-[#D11111]" />

        {/* Header bar */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-[#D11111] flex items-center justify-center font-black text-white text-base">
              TeX
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base tracking-tight leading-none">
                {mode === 'login' ? 'Account Login' : 'Register Academic Account'}
              </h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                TeXForge Scientific Publishing Platform
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 bg-slate-950 border-b border-slate-800 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-3 text-center transition-colors ${
              mode === 'login'
                ? 'bg-slate-900 text-[#D11111] border-b-2 border-[#D11111] font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
            }}
            className={`py-3 text-center transition-colors ${
              mode === 'signup'
                ? 'bg-slate-900 text-[#D11111] border-b-2 border-[#D11111] font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-700/80 text-red-300 text-xs font-mono">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., Dr. Aris Thorne"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#D11111] text-white text-xs font-mono pl-9 pr-3 py-2.5 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                  Academic Role
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="e.g., Associate Professor / PhD Candidate"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#D11111] text-white text-xs font-mono pl-9 pr-3 py-2.5 focus:outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="author@university.edu"
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#D11111] text-white text-xs font-mono pl-9 pr-3 py-2.5 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#D11111] text-white text-xs font-mono pl-9 pr-3 py-2.5 focus:outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-[#D11111] hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center space-x-2 transition-colors"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Dashboard' : 'Complete Registration'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Accounts Helper */}
          <div className="pt-3 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span className="uppercase tracking-wider">Fast Instant Access (1-Click Demo):</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleDemoLogin('Professor of Physics', 'Dr. Aris Thorne', 'aris.thorne@stanford.edu')
                }
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <div className="font-bold text-[11px] text-slate-200 group-hover:text-red-400">
                  Dr. Aris Thorne
                </div>
                <div className="text-[9px] text-slate-400 font-mono">Stanford University</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDemoLogin('PhD Researcher', 'Sophia Chen', 'sophia.chen@mit.edu')
                }
                className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left transition-colors group"
              >
                <div className="font-bold text-[11px] text-slate-200 group-hover:text-red-400">
                  Sophia Chen
                </div>
                <div className="text-[9px] text-slate-400 font-mono">MIT CSAIL Lab</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
