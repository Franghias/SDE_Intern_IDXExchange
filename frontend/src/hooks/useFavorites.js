import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'favorites';

/**
 * Read favorite IDs from localStorage.
 * Returns an array of property display ID strings.
 */
function readFavorites() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Write favorite IDs to localStorage.
 * @param {string[]} ids
 */
function writeFavorites(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/**
 * Custom hook for managing favorite properties in localStorage.
 * - Persists across page refreshes
 * - Syncs across tabs via the `storage` event
 * - All localStorage access is encapsulated — no inline calls in components
 *
 * @returns {{ favorites: string[], favoriteCount: number, isFavorite: Function, toggleFavorite: Function, clearFavorites: Function }}
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState(readFavorites);

  // Sync across tabs: when another tab writes to localStorage, update state
  useEffect(() => {
    function handleStorage(e) {
      if (e.key === STORAGE_KEY) {
        setFavorites(readFavorites());
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isFavorite = useCallback(
    (id) => favorites.includes(String(id)),
    [favorites]
  );

  const toggleFavorite = useCallback((id) => {
    const idStr = String(id);
    setFavorites((prev) => {
      const next = prev.includes(idStr)
        ? prev.filter((fav) => fav !== idStr)
        : [...prev, idStr];
      writeFavorites(next);
      return next;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    writeFavorites([]);
    setFavorites([]);
  }, []);

  return {
    favorites,
    favoriteCount: favorites.length,
    isFavorite,
    toggleFavorite,
    clearFavorites,
  };
}
