/**
 * Saves the JSON export to a place the user can keep — share sheet on
 * native, browser download on web.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { buildExport, exportFilename } from './export';

export async function exportData(): Promise<{ ok: true } | { ok: false; reason: string }> {
  try {
    const data = await buildExport();
    const json = JSON.stringify(data, null, 2);
    const filename = exportFilename();

    if (Platform.OS === 'web') {
      if (typeof document === 'undefined') {
        return { ok: false, reason: 'Web environment not available.' };
      }
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    const uri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, json, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return {
        ok: false,
        reason: `Saved locally to ${uri}, but sharing isn't available on this device.`,
      };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Inward data',
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'Unknown error' };
  }
}
