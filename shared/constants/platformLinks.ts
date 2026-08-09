/**
 * Single source of truth for cross-platform public links.
 *
 * Web and Desktop About screens read from here.
 * Placeholder values are marked clearly — see docs/PLATFORM_LINKS.md
 * for exactly which values to replace.
 */
export interface PlatformLinks {
  websiteUrl: string;
  desktopDownloadUrl: string;
  androidDownloadUrl: string;
  changelogUrl: string;
}

export const platformLinks: PlatformLinks = {
  websiteUrl: 'REPLACE_ME_WEBSITE_URL',
  desktopDownloadUrl: 'REPLACE_ME_EXE_DOWNLOAD_URL',
  androidDownloadUrl: 'REPLACE_ME_APK_DOWNLOAD_URL_IF_APPLICABLE',
  changelogUrl: 'REPLACE_ME_WEBSITE_URL/changelog',
};
