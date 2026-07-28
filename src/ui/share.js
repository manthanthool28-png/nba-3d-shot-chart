import { stateToQuery } from '../state.js';

const BOOKMARKS_KEY = 'shotchart.bookmarks';

export function updateUrl(state) {
  const query = stateToQuery(state);
  const url = `${location.pathname}${query ? `?${query}` : ''}`;
  history.replaceState(null, '', url);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function screenshotPng(renderer, filename) {
  renderer.domElement.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

export function loadBookmarks() {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveBookmark(name, state) {
  const bookmarks = loadBookmarks();
  bookmarks.push({ name, query: stateToQuery(state), savedAt: Date.now() });
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}

export function removeBookmark(index) {
  const bookmarks = loadBookmarks();
  bookmarks.splice(index, 1);
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  return bookmarks;
}
