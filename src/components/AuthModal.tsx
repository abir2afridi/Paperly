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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60">
      <div className="relative w-full max-w-md bg-canvas border border-ink/30 overflow-hidden text-ink font-editorial-sans">
        {/* Top Obsidian Accent Header Line */}
        <div className="h-1 w-full bg-ink" />

        {/* Header bar */}
        <div className="px-6 pt-5 pb-4 border-b border-ink/15 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-ink flex items-center justify-center text-canvas font-editorial font-bold text-base">
              TeX
            </div>
            <div>
              <h3 className="font-editorial font-bold text-ink text-base tracking-tight leading-none">
                {mode === 'login' ? 'Account Login' : 'Register Academic Account'}
              </h3>
              <p className="text-[11px] font-editorial-mono text-ink-muted-2 mt-0.5">
                TeXForge Scientific Publishing Platform
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted-2 hover:text-ink hover:bg-paper transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 border-b border-ink/15 text-xs font-bold uppercase tracking-wider">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
            }}
            className={`py-3 text-center transition-colors border-b-2 ${
              mode === 'login'
                ? 'bg-ink text-canvas border-ink font-bold'
                : 'bg-paper text-ink-muted-2 hover:text-ink border-transparent'
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
            className={`py-3 text-center transition-colors border-b-2 ${
              mode === 'signup'
                ? 'bg-ink text-canvas border-ink font-bold'
                : 'bg-paper text-ink-muted-2 hover:text-ink border-transparent'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-paper border border-ink/30 text-ink-muted-2 text-xs font-editorial-mono">
              {error}
            </div>
          )}

          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-[11px] font-editorial-mono text-ink-muted-2 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-ink-muted-2 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g., Dr. Aris Thorne"
                    className="w-full bg-canvas border border-ink/20 focus:border-ink text-ink text-xs font-editorial-mono pl-9 pr-3 py-2.5 focus:outline-none placeholder:text-ink-muted-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-editorial-mono text-ink-muted-2 uppercase tracking-wider mb-1">
                  Academic Role
                </label>
                <div className="relative">
                  <GraduationCap className="w-4 h-4 text-ink-muted-2 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    placeholder="e.g., Associate Professor / PhD Candidate"
                    className="w-full bg-canvas border border-ink/20 focus:border-ink text-ink text-xs font-editorial-mono pl-9 pr-3 py-2.5 focus:outline-none placeholder:text-ink-muted-2"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-editorial-mono text-ink-muted-2 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-muted-2 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="author@university.edu"
                className="w-full bg-canvas border border-ink/20 focus:border-ink text-ink text-xs font-editorial-mono pl-9 pr-3 py-2.5 focus:outline-none placeholder:text-ink-muted-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-editorial-mono text-ink-muted-2 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-ink-muted-2 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-canvas border border-ink/20 focus:border-ink text-ink text-xs font-editorial-mono pl-9 pr-3 py-2.5 focus:outline-none placeholder:text-ink-muted-2"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-ink hover:opacity-90 text-canvas font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-opacity"
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
          <div className="pt-3 border-t border-ink/15 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-editorial-mono text-ink-muted-2">
              <span className="uppercase tracking-wider">Fast Instant Access (1-Click Demo):</span>
              <ShieldCheck className="w-3.5 h-3.5 text-ink" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleDemoLogin('Professor of Physics', 'Dr. Aris Thorne', 'aris.thorne@stanford.edu')
                }
                className="p-2 bg-paper hover:bg-paper-deep border border-ink/20 text-left transition-colors group"
              >
                <div className="font-bold text-[11px] text-ink group-hover:underline">
                  Dr. Aris Thorne
                </div>
                <div className="text-[9px] text-ink-muted-2 font-editorial-mono">Stanford University</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDemoLogin('PhD Researcher', 'Sophia Chen', 'sophia.chen@mit.edu')
                }
                className="p-2 bg-paper hover:bg-paper-deep border border-ink/20 text-left transition-colors group"
              >
                <div className="font-bold text-[11px] text-ink group-hover:underline">
                  Sophia Chen
                </div>
                <div className="text-[9px] text-ink-muted-2 font-editorial-mono">MIT CSAIL Lab</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
