import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { useFavorites } from '../hooks/useFavorites';

describe('useFavorites hook', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty favorites when localStorage is empty', () => {
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual([]);
    expect(result.current.favoriteCount).toBe(0);
  });

  it('toggles adding and removing favorite IDs', () => {
    const { result } = renderHook(() => useFavorites());

    // Add 100002222
    act(() => {
      result.current.toggleFavorite('100002222');
    });
    expect(result.current.isFavorite('100002222')).toBe(true);
    expect(result.current.favoriteCount).toBe(1);
    expect(result.current.favorites).toEqual(['100002222']);

    // Remove 100002222
    act(() => {
      result.current.toggleFavorite('100002222');
    });
    expect(result.current.isFavorite('100002222')).toBe(false);
    expect(result.current.favoriteCount).toBe(0);
    expect(result.current.favorites).toEqual([]);
  });

  it('persists favorites in localStorage', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite('12345');
      result.current.toggleFavorite('67890');
    });

    const stored = JSON.parse(localStorage.getItem('favorites'));
    expect(stored).toEqual(['12345', '67890']);
  });

  it('clears all favorites with clearFavorites', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      result.current.toggleFavorite('111');
      result.current.toggleFavorite('222');
    });
    expect(result.current.favoriteCount).toBe(2);

    act(() => {
      result.current.clearFavorites();
    });
    expect(result.current.favorites).toEqual([]);
    expect(result.current.favoriteCount).toBe(0);
    expect(localStorage.getItem('favorites')).toBe('[]');
  });

  it('syncs across tabs on storage event', () => {
    const { result } = renderHook(() => useFavorites());

    act(() => {
      localStorage.setItem('favorites', JSON.stringify(['999']));
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'favorites', newValue: JSON.stringify(['999']) })
      );
    });

    expect(result.current.isFavorite('999')).toBe(true);
    expect(result.current.favoriteCount).toBe(1);
  });
});
