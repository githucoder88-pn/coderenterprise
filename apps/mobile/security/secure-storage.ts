/**
 * Secure Storage — encrypted token/credential storage via expo-secure-store
 */

import * as SecureStore from 'expo-secure-store';

export class SecureStorage {
  async get(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  }

  async delete(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  }

  async getToken(): Promise<string | null> {
    return this.get('coder_token');
  }

  async setToken(token: string): Promise<void> {
    return this.set('coder_token', token);
  }

  async clearAll(): Promise<void> {
    await this.delete('coder_token');
    await this.delete('coder_refresh_token');
    await this.delete('coder_user');
  }
}

export const secureStorage = new SecureStorage();
