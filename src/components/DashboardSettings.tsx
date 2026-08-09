import React, { useEffect, useState } from 'react';
import {
  User,
  KeyRound,
  Palette,
  Sparkles,
  Info,
  Check,
  Save,
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import { THEMES, ThemeId } from '../services/themeService';
import { changePassword, updateUserProfile } from '../services/db';

export interface DashboardSettingsProps {
  user: { name: string; email: string; role: string; avatarUrl?: string };
  isCloudUser: boolean;
  activeThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
  onOpenAiSettings: () => void;
  onOpenAbout: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export const DashboardSettings: React.FC<DashboardSettingsProps> = ({
  user,
  isCloudUser,
  activeThemeId,
  onSelectTheme,
  onOpenAiSettings,
  onOpenAbout,
}) => {
  const [displayName, setDisplayName] = useState(user.name);
  const [academicRole, setAcademicRole] = useState(user.role);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordState, setPasswordState] = useState<SaveState>('idle');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setDisplayName(user.name);
    setAcademicRole(user.role);
  }, [user.name, user.role]);

  useEffect(() => {
    if (!avatarUrl && user.avatarUrl) setAvatarUrl(user.avatarUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.avatarUrl]);

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setSaveState('error');
      setSaveError('Display name cannot be empty.');
      return;
    }
    setSaveState('saving');
    setSaveError('');
    const result = await updateUserProfile({
      displayName: displayName.trim(),
      academicRole: academicRole.trim() || 'Academic Researcher',
      avatarUrl: avatarUrl.trim() || null,
    });
    if (result.ok) {
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2500);
    } else {
      setSaveState('error');
      setSaveError(result.error);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      setPasswordState('error');
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordState('error');
      setPasswordError('Passwords do not match.');
      return;
    }
    setPasswordState('saving');
    setPasswordError('');
    const result = await changePassword(newPassword);
    if (result.ok) {
      setPasswordState('saved');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordState('idle'), 2500);
    } else {
      setPasswordState('error');
      setPasswordError(result.error);
    }
  };

  const sectionTitle = (icon: React.ReactNode, title: string, subtitle: string) => (
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 bg-ink text-canvas flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h2 className="font-editorial text-lg font-bold text-ink uppercase tracking-wider">{title}</h2>
        <p className="text-ink-muted-2 text-xs font-editorial-mono">{subtitle}</p>
      </div>
    </div>
  );

  const SaveButton: React.FC<{ state: SaveState; onClick: () => void; label: string; disabled?: boolean }> = ({
    state,
    onClick,
    label,
    disabled,
  }) => (
    <button
      onClick={onClick}
      disabled={disabled || state === 'saving'}
      className="px-4 py-2 bg-ink hover:opacity-90 disabled:opacity-40 text-canvas font-bold text-xs uppercase tracking-widest flex items-center space-x-2 transition-opacity"
    >
      {state === 'saved' ? (
        <>
          <Check className="w-3.5 h-3.5" />
          <span>Saved</span>
        </>
      ) : state === 'saving' ? (
        <span>Saving…</span>
      ) : (
        <>
          <Save className="w-3.5 h-3.5" />
          <span>{label}</span>
        </>
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="bg-paper border border-ink/20 p-4 flex items-start space-x-3">
        <AlertTriangle className="w-4 h-4 text-ink shrink-0 mt-0.5" />
        <p className="text-xs text-ink-muted leading-relaxed font-medium">
          {isCloudUser
            ? 'Changes to your profile, avatar, and password are synced to your Supabase account.'
            : 'You are in local guest mode. Sign in to save profile changes, set a password, and sync across devices.'}
        </p>
      </div>

      {/* Profile Section */}
      <div className="bg-paper border border-ink/20 p-6 space-y-5">
        {sectionTitle(<User className="w-4 h-4" />, 'Profile', 'Your public academic identity')}

        <div className="flex items-center space-x-4">
          <UserAvatar name={displayName || 'A'} email={avatarUrl.trim() || user.email} size={56} />
          <div className="text-xs font-editorial-mono text-ink-muted-2 space-y-0.5">
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase tracking-widest">Avatar Source</span>
            </div>
            <p className="text-ink text-xs">{avatarUrl.trim() ? 'Custom image URL' : 'Gravatar (auto from email)'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-editorial-mono uppercase tracking-widest text-ink-muted-2">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              disabled={!isCloudUser}
              className="w-full bg-canvas border border-ink/20 text-ink text-xs px-3 py-2 focus:outline-none focus:border-ink disabled:opacity-50 placeholder:text-ink-muted-2"
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-editorial-mono uppercase tracking-widest text-ink-muted-2">
              Academic Role
            </label>
            <input
              type="text"
              value={academicRole}
              onChange={e => setAcademicRole(e.target.value)}
              disabled={!isCloudUser}
              className="w-full bg-canvas border border-ink/20 text-ink text-xs px-3 py-2 focus:outline-none focus:border-ink disabled:opacity-50 placeholder:text-ink-muted-2"
              placeholder="e.g. PhD Candidate, Postdoc Researcher"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-editorial-mono uppercase tracking-widest text-ink-muted-2">
              Email Address <span className="text-ink-muted-2/70">(read-only, used for sign-in)</span>
            </label>
            <input
              type="text"
              value={user.email}
              readOnly
              className="w-full bg-canvas border border-ink/20 text-ink-muted-2 text-xs px-3 py-2 cursor-not-allowed"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-editorial-mono uppercase tracking-widest text-ink-muted-2">
              Custom Avatar URL <span className="text-ink-muted-2/70">(optional, overrides Gravatar)</span>
            </label>
            <div className="flex items-stretch space-x-2">
              <input
                type="text"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                disabled={!isCloudUser}
                className="flex-1 bg-canvas border border-ink/20 text-ink text-xs px-3 py-2 focus:outline-none focus:border-ink disabled:opacity-50 placeholder:text-ink-muted-2"
                placeholder="https://…"
              />
              <button
                onClick={() => setAvatarUrl('')}
                disabled={!isCloudUser}
                className="px-3 bg-canvas border border-ink/20 text-ink-muted-2 hover:text-ink hover:border-ink text-xs font-bold flex items-center space-x-1.5 disabled:opacity-50 transition-colors"
                title="Reset to Gravatar"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Use Gravatar</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-ink/15">
          {saveState === 'error' ? (
            <span className="text-xs text-red-700 font-bold">{saveError}</span>
          ) : (
            <span className="text-xs text-ink-muted-2 font-editorial-mono">
              {isCloudUser ? 'Synced with Supabase auth profile' : 'Sign in to enable profile editing'}
            </span>
          )}
          <SaveButton state={saveState} onClick={handleSaveProfile} label="Save Profile" disabled={!isCloudUser} />
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-paper border border-ink/20 p-6 space-y-5">
        {sectionTitle(<ShieldCheck className="w-4 h-4" />, 'Security', 'Manage your account password')}

        {!isCloudUser ? (
          <p className="text-xs text-ink-muted-2 font-editorial-mono">
            Guests have no password — sign in with an account to change it here.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-editorial-mono uppercase tracking-widest text-ink-muted-2">
                  New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-ink-muted-2 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full bg-canvas border border-ink/20 text-ink text-xs pl-8 pr-3 py-2 focus:outline-none focus:border-ink placeholder:text-ink-muted-2"
                    placeholder="Min. 6 characters"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-editorial-mono uppercase tracking-widest text-ink-muted-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-ink-muted-2 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full bg-canvas border border-ink/20 text-ink text-xs pl-8 pr-3 py-2 focus:outline-none focus:border-ink placeholder:text-ink-muted-2"
                    placeholder="Repeat password"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-ink/15">
              {passwordState === 'error' ? (
                <span className="text-xs text-red-700 font-bold">{passwordError}</span>
              ) : (
                <span className="text-xs text-ink-muted-2 font-editorial-mono">
                  You will need the new password on your next sign-in.
                </span>
              )}
              <SaveButton
                state={passwordState}
                onClick={handleChangePassword}
                label="Change Password"
                disabled={!isCloudUser}
              />
            </div>
          </>
        )}
      </div>

      {/* Appearance Section */}
      <div className="bg-paper border border-ink/20 p-6 space-y-5">
        {sectionTitle(<Palette className="w-4 h-4" />, 'Appearance', 'Editor & workspace theme presets')}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {THEMES.map(theme => {
            const isActive = theme.id === activeThemeId;
            return (
              <button
                key={theme.id}
                onClick={() => onSelectTheme(theme.id)}
                className={`text-left p-4 border transition-colors flex flex-col space-y-2 ${
                  isActive
                    ? 'bg-canvas border-ink shadow-[3px_3px_0_0_var(--th-accent,#d11111)]'
                    : 'bg-canvas border-ink/20 hover:border-ink/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">{theme.name}</span>
                  {isActive && <Check className="w-4 h-4 text-ink" />}
                </div>
                <div className="flex items-center space-x-1.5">
                  {['bgHeader', 'bgSidebar', 'bgEditor', 'accent'].map(key => (
                    <span
                      key={key}
                      className="w-5 h-5 border border-ink/10"
                      style={{ backgroundColor: (theme.colors as Record<string, string>)[key] }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[9px] font-editorial-mono text-ink-muted-2 uppercase tracking-widest">
                  <span>{theme.mode}</span>
                  {isActive && <span className="text-ink font-bold">Active</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Integrations Section */}
      <div className="bg-paper border border-ink/20 p-6 space-y-5">
        {sectionTitle(<Sparkles className="w-4 h-4" />, 'Integrations', 'AI assistants & application info')}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={onOpenAiSettings}
            className="p-4 bg-canvas border border-ink/20 hover:border-ink/50 transition-colors flex items-start justify-between text-left"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-ink">AI Provider Settings</p>
              <p className="text-ink-muted-2 text-xs font-editorial-mono">
                Configure Anthropic / Gemini / OpenAI assistants for the chat panel.
              </p>
            </div>
            <ExternalLink className="w-4 h-4 text-ink-muted-2 shrink-0" />
          </button>

          <button
            onClick={onOpenAbout}
            className="p-4 bg-canvas border border-ink/20 hover:border-ink/50 transition-colors flex items-start justify-between text-left"
          >
            <div className="space-y-1">
              <p className="text-xs font-bold text-ink">About TeXForge</p>
              <p className="text-ink-muted-2 text-xs font-editorial-mono">
                Version, credits, and editor technology stack.
              </p>
            </div>
            <Info className="w-4 h-4 text-ink-muted-2 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
};
