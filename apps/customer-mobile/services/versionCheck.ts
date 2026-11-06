import Constants from 'expo-constants';
import { supabase } from './supabase';

export interface VersionCheckResult {
  isOutdated: boolean;
  currentVersion: string;
  minVersion: string;
  latestVersion: string;
  downloadUrl: string;
}

/**
 * Compares two semantic version strings (e.g. "1.1.0" vs "1.2.0").
 * Returns true if `current` is strictly less than `minimum`.
 */
export function isVersionOutdated(current: string, minimum: string): boolean {
  if (!minimum || !current) return false;

  const curParts = current.split('.').map((p) => parseInt(p, 10) || 0);
  const minParts = minimum.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(curParts.length, minParts.length);
  for (let i = 0; i < len; i++) {
    const c = curParts[i] || 0;
    const m = minParts[i] || 0;
    if (c < m) return true;
    if (c > m) return false;
  }

  return false;
}

/**
 * Checks backend `app_settings` for minimum supported version.
 */
export async function checkAppVersion(): Promise<VersionCheckResult> {
  const currentVersion = Constants.expoConfig?.version || '1.2.0';
  const fallbackUrl = 'https://expo.dev/accounts/vamsicoc01/projects/tractor-repair';

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['min_supported_version', 'latest_app_version', 'update_download_url']);

    if (error || !data) {
      return {
        isOutdated: false,
        currentVersion,
        minVersion: currentVersion,
        latestVersion: currentVersion,
        downloadUrl: fallbackUrl,
      };
    }

    const settingsMap = data.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    const minVersion = settingsMap['min_supported_version'] || currentVersion;
    const latestVersion = settingsMap['latest_app_version'] || currentVersion;
    const downloadUrl = settingsMap['update_download_url'] || fallbackUrl;

    const isOutdated = isVersionOutdated(currentVersion, minVersion);

    return {
      isOutdated,
      currentVersion,
      minVersion,
      latestVersion,
      downloadUrl,
    };
  } catch (err) {
    // Fail safe: if network fails or DB unreachable, do not block the user
    return {
      isOutdated: false,
      currentVersion,
      minVersion: currentVersion,
      latestVersion: currentVersion,
      downloadUrl: fallbackUrl,
    };
  }
}
