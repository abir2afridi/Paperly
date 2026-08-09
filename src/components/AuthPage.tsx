import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  FileText,
  GitBranch,
  GraduationCap,
  History,
  Lock,
  Mail,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  User,
  UserRound,
  Wand2,
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

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (user: AuthUser) => void;
  onBack: () => void;
}

const FEATURES = [
  { icon: FileText, title: 'Cloud Projects & Autosave', text: 'Projects, files and revisions sync to your account automatically.' },
  { icon: Wand2, title: 'AI Co-authoring', text: 'Ask the assistant to fix errors, rewrite passages or generate BibTeX.' },
  { icon: Sparkles, title: 'WASM LaTeX Compilation', text: 'Compile PDFLATEX / XELATEX / LUALATEX right in the browser.' },
  { icon: MessagesSquare, title: 'Review Comments & Chat', text: 'Leave inline comments and chat with collaborators in real time.' },
  { icon: History, title: 'Version Snapshots', text: 'Save checkpoints of your manuscript and restore any point in time.' },
  { icon: GitBranch, title: 'GitHub Sync', text: 'Push and pull manuscripts straight from your repositories.' },
];

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onLoginSuccess,
  onBack,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
  };

  return (
    <div className="min-h-screen w-full bg-canvas text-ink font-editorial-sans flex">
      {/* Left Brand / Feature Panel */}
      <div className="hidden lg:flex w-[46%] min-w-[420px] flex-col justify-between p-10 bg-ink text-canvas relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 bg-canvas text-ink flex items-center justify-center font-editorial font-bold text-lg">
              TeX
            </div>
            <div>
              <div className="font-editorial font-bold text-lg tracking-tight leading-none">TeXForge</div>
              <div className="text-[10px] font-editorial-mono text-canvas/60 mt-0.5 uppercase tracking-widest">
                Scientific Publishing Platform
              </div>
            </div>
          </div>

          <h2 className="font-editorial font-bold text-3xl mt-10 leading-snug tracking-tight">
            Write. Compile. Publish.
            <br />
            <span className="text-canvas/70">Your manuscripts, everywhere.</span>
          </h2>

          <ul className="mt-8 space-y-4">
            {FEATURES.map(f => (
              <li key={f.title} className="flex items-start space-x-3">
                <div className="w-7 h-7 shrink-0 bg-canvas/10 border border-canvas/20 flex items-center justify-center">
                  <f.icon className="w-3.5 h-3.5 text-canvas" />
                </div>
                <div>
                  <div className="text-sm font-bold text-canvas">{f.title}</div>
                  <div className="text-[11px] text-canvas/60 mt-0.5">{f.text}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 text-[10px] font-editorial-mono text-canvas/50 uppercase tracking-widest">
          Live WASM Compilation · Cloud Autosave · AI Co-authoring
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 px-4 sm:px-8 flex items-center justify-between border-b border-ink/15">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-[11px] font-editorial-mono font-bold uppercase tracking-widest text-ink-muted-2 hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>

          <div className="lg:hidden flex items-center space-x-2">
            <div className="w-6 h-6 bg-ink flex items-center justify-center text-canvas font-editorial font-bold text-xs">
              TeX
            </div>
            <span className="font-editorial font-bold text-sm tracking-tight">TeXForge</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 text-[10px] font-editorial-mono text-ink-muted-2 uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-ink" />
            <span>Encrypted · Row-level security</span>
          </div>
        </header>

        {/* Centered form */}
        <main className="flex-1 flex items-start sm:items-center justify-center p-4 sm:p-8 overflow-y-auto">
          <div className="w-full max-w-md">
            <div className="h-1 w-full bg-ink" />

            <div className="bg-canvas border border-ink/30 border-t-0 overflow-hidden">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-ink/15">
                <h3 className="font-editorial font-bold text-ink text-xl tracking-tight">
                  {mode === 'login' ? 'Welcome back, Author' : 'Create your Academic Account'}
                </h3>
                <p className="text-xs font-editorial-mono text-ink-muted-2 mt-1">
                  {mode === 'login'
                    ? 'Sign in to access your cloud projects and manuscripts.'
                    : 'One account for your papers, projects and revisions.'}
                </p>
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
                      onBack();
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
        </main>
      </div>
    </div>
  );
};