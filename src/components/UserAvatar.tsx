import React, { useState } from 'react';
import { getAvatarUrl } from '../services/avatar';

interface UserAvatarProps {
  name: string;
  email?: string;
  size?: number;
  className?: string;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  email,
  size = 32,
  className = '',
}) => {
  const [useFallback, setUseFallback] = useState(false);

  if (!email || useFallback) {
    return (
      <div
        style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.4)) }}
        className={`border border-ink/30 bg-paper-deep flex items-center justify-center text-ink font-editorial font-bold ${className}`}
        title={name}
      >
        {(name || '?').charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={getAvatarUrl(email, size * 2)}
      alt={name}
      title={name}
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'cover' }}
      onError={() => setUseFallback(true)}
      className={`border border-ink/30 ${className}`}
    />
  );
};