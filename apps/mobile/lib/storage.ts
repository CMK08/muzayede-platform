import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch {
      console.warn(`[Storage] Failed to set key: ${key}`);
    }
  },

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch {
      console.warn(`[Storage] Failed to remove key: ${key}`);
    }
  },

  async getStringArray(key: string): Promise<string[]> {
    const value = await storage.get<string[]>(key);
    return value ?? [];
  },

  async appendToStringArray(
    key: string,
    item: string,
    maxLength: number = 50
  ): Promise<void> {
    const arr = await storage.getStringArray(key);
    const filtered = arr.filter((v) => v !== item);
    filtered.unshift(item);
    if (filtered.length > maxLength) {
      filtered.pop();
    }
    await storage.set(key, filtered);
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch {
      console.warn('[Storage] Failed to clear storage');
    }
  },
};
