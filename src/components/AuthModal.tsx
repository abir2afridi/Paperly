import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  GraduationCap,
  UserRound,
} from 'lucide-react';
import { signUpWithEmail, signInWithEmail, signInWithGoogle } from '../services/db';
import { isSupabaseConfigured } from '../services/supabase';
import { getAvatarUrl } from '../services/avatar';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError('');
    setNotice('');
    setIsLoading(true);
    const result = await signInWithGoogle();
    setIsLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    // Redirect to Google happens automatically; session return is handled
    // by the auth state listener (Google avatar_url flows into the profile).
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (!email || !password) {
      setError('Please provide valid email and password.');
      return;
    }
    if (mode === 'signup' && !name) {
      setError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    if (mode === 'signup') {
      const result = await signUpWithEmail(email, password, name, role);
      if (!result.ok) {
        setError(result.error);
        setIsLoading(false);
        return;
      }
      const avatarUrl = getAvatarUrl(email);
      if (result.data.session) {
        onLoginSuccess({
          id: result.data.session.user.id,
          name,
          email,
          role: role || 'Academic Researcher',
          avatarUrl,
        });
        onClose();
      } else {
        // Account created — try signing in right away (works when confirmation is off).
        const autoLogin = await signInWithEmail(email, password);
        if (autoLogin.ok) {
          const u = autoLogin.data.user;
          onLoginSuccess({
            id: u.id,
            name: name || email.split('@')[0],
            email,
            role: role || 'Academic Researcher',
            avatarUrl,
          });
          onClose();
        } else {
          setNotice('Registration successful! Please check your email to confirm your account, then sign in.');
          setMode('login');
        }
      }
      setIsLoading(false);
      return;
    }

    const result = await signInWithEmail(email, password);
    if (!result.ok) {
      setError(result.error);
      setIsLoading(false);
      return;
    }
    const user = result.data.user;
    const metadata = user.user_metadata || {};
    onLoginSuccess({
      id: user.id,
      name: (metadata.display_name as string) || email.split('@')[0],
      email,
      role: (metadata.academic_role as string) || 'Academic Researcher',
      avatarUrl: getAvatarUrl(email),
    });
    setIsLoading(false);
    onClose();
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
              setNotice('');
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
              setNotice('');
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

          {notice && (
            <div className="p-3 bg-paper border border-ink/30 text-ink text-xs font-editorial-mono flex items-start space-x-2">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{notice}</span>
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
                placeholder="Minimum 6 characters"
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

          {/* Google Sign-In (real Google account photo) */}
          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleSignIn}
            className="w-full py-3 bg-paper hover:bg-paper-deep border border-ink/25 text-ink font-bold text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center space-x-3 text-[10px] font-editorial-mono text-ink-muted-2 uppercase tracking-wider">
            <div className="h-px flex-1 bg-ink/15" />
            <span>or continue with email</span>
            <div className="h-px flex-1 bg-ink/15" />
          </div>

          {/* Local / Guest Mode Helper */}
          <div className="pt-3 border-t border-ink/15 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-editorial-mono text-ink-muted-2">
              <span className="uppercase tracking-wider">No account needed:</span>
              <ShieldCheck className="w-3.5 h-3.5 text-ink" />
            </div>
            <button
              type="button"
              onClick={() => {
                setError('');
                onClose();
              }}
              className="w-full p-2 bg-paper hover:bg-paper-deep border border-ink/20 flex items-center justify-center space-x-2 text-[11px] font-bold text-ink uppercase tracking-wider transition-colors"
            >
              <UserRound className="w-4 h-4" />
              <span>Continue as Guest (Local Mode)</span>
            </button>
            {!isSupabaseConfigured && (
              <p className="text-[10px] font-editorial-mono text-ink-muted-2">
                Cloud sync is not configured. Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env to enable accounts.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
