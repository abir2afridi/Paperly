/**
 * ZIP / project-path security guards (plan §10).
 *
 * Pure functions — no DOM, no JSZip dependency here so they can be unit-tested
 * and shared by every entry point that accepts external paths or archives.
 */

export const ZIP_MAX_FILES = 200;
export const ZIP_MAX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

export interface ZipEntryMeta {
  path: string;
  isDirectory: boolean;
  /** Raw size before compression, when available (JSZip: entry._data.uncompressedSize). */
  uncompressedSize: number;
  /** Unix permission bits from JSZip (entry.unixPermissions). */
  unixPermissions?: number | string;
}

/**
 * Returns a normalized, safe project-relative path, or null if the path is
 * unsafe. Rejects: null bytes, empty/absolute paths, drive letters, UNC
 * prefixes, and any path containing ".." segments.
 */
export function sanitizeProjectFilePath(rawPath: string): string | null {
  if (!rawPath) return null;
  if (rawPath.includes('\0')) return null;
  if (rawPath.startsWith('/') || rawPath.startsWith('\\')) return null;
  if (/^[a-zA-Z]:/.test(rawPath)) return null;
  if (/^\\\\/.test(rawPath)) return null;

  const normalized = rawPath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (!normalized || normalized === '.') return null;
  if (normalized.startsWith('/')) return null;

  const segments = normalized.split('/');
  for (const seg of segments) {
    if (seg === '..' || seg === '.') return null;
    if (!seg.trim()) return null;
  }
  if (normalized.includes('..')) return null;

  return normalized;
}

/**
 * Validates a whole ZIP import plan. Returns { ok: true, files } or
 * { ok: false, reason } with the specific violation (plan §10: reject
 * archives with too many files, too large total size, or symlinks).
 */
export function validateZipImport(entries: ZipEntryMeta[]): {
  ok: boolean;
  reason?: string;
  files: { path: string }[];
} {
  if (entries.length > ZIP_MAX_FILES) {
    return {
      ok: false,
      reason: `ZIP contains ${entries.length} files — the limit is ${ZIP_MAX_FILES}.`,
      files: [],
    };
  }

  let totalBytes = 0;
  const files: { path: string }[] = [];

  for (const entry of entries) {
    if (isSymlinkEntry(entry)) {
      return {
        ok: false,
        reason: `ZIP contains a symbolic link ('${entry.path}') which is not allowed.`,
        files: [],
      };
    }

    const safePath = sanitizeProjectFilePath(entry.path);
    if (!safePath) {
      return {
        ok: false,
        reason: `ZIP contains an unsafe path ('${entry.path}').`,
        files: [],
      };
    }

    if (!entry.isDirectory) {
      totalBytes += entry.uncompressedSize;
      files.push({ path: safePath });
      if (totalBytes > ZIP_MAX_UNCOMPRESSED_BYTES) {
        return {
          ok: false,
          reason: `ZIP is larger than the ${ZIP_MAX_UNCOMPRESSED_BYTES / (1024 * 1024)} MB limit.`,
          files: [],
        };
      }
    }
  }

  return { ok: true, files };
}

function isSymlinkEntry(entry: ZipEntryMeta): boolean {
  if (typeof entry.unixPermissions === 'number') {
    const fileType = entry.unixPermissions & 0xf000;
    return fileType === 0xa000; // S_IFLNK
  }
  return false;
}

/** Maps a project-relative path to the FileType enum (mirrors App.tsx logic). */
export function fileTypeFromPath(path: string): 'TEX' | 'BIB' | 'CLS' | 'STY' | 'IMAGE' | 'PDF' | 'OTHER' {
  const lower = path.toLowerCase();
  if (lower.endsWith('.tex')) return 'TEX';
  if (lower.endsWith('.bib')) return 'BIB';
  if (lower.endsWith('.cls')) return 'CLS';
  if (lower.endsWith('.sty')) return 'STY';
  if (/\.(png|jpe?g|gif|svg|eps|bmp)$/.test(lower)) return 'IMAGE';
  if (lower.endsWith('.pdf')) return 'PDF';
  return 'OTHER';
}