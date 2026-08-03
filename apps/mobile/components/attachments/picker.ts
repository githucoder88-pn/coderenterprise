/**
 * Attachment picker — image, camera, document with graceful fallbacks.
 */
export interface Attachment {
  uri: string;
  type: string;
  name?: string;
  size?: number;
}

async function safeCall<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}

export async function pickImage(): Promise<Attachment | null> {
  try {
    const picker = require('expo-image-picker');
    const perm = await picker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = await picker.launchImageLibraryAsync({
      mediaTypes: picker.MediaTypeOptions?.Images ?? 'images',
      quality: 0.7,
      allowsEditing: false,
    });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset) return null;
    return { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'image' };
  } catch { return null; }
}

export async function takePhoto(): Promise<Attachment | null> {
  try {
    const picker = require('expo-image-picker');
    const perm = await picker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    const result = await picker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset) return null;
    return { uri: asset.uri, type: asset.type ?? 'image/jpeg', name: asset.fileName ?? 'photo' };
  } catch { return null; }
}

export async function pickDocument(): Promise<Attachment | null> {
  try {
    const doc = require('expo-document-picker');
    const result = await doc.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled) return null;
    const asset = result.assets?.[0] ?? result;
    if (!asset?.uri) return null;
    return { uri: asset.uri, type: asset.mimeType ?? 'application/octet-stream', name: asset.name ?? 'file', size: asset.size };
  } catch { return null; }
}

export async function pasteFromClipboard(): Promise<Attachment | null> {
  try {
    const cb = require('expo-clipboard');
    if (cb.hasImageAsync && await cb.hasImageAsync()) {
      const img = await cb.getImageAsync?.({ format: 'png' });
      if (img?.data) return { uri: img.data as string, type: 'image/png', name: 'clipboard.png' };
    }
    return null;
  } catch { return null; }
}

export const AttachmentPicker = {
  image: pickImage,
  camera: takePhoto,
  document: pickDocument,
  clipboard: pasteFromClipboard,
};
