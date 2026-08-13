import { useState, useEffect, useCallback } from 'react';
import { fetchProperties } from '../api/propertyApi';
import { useFavorites } from '../hooks/useFavorites';
import { prefetchPromises } from '../utils/prefetchCache';
import ChatAssistant from '../components/ChatAssistant';
import PropertyCard from '../components/PropertyCard';
import Pagination from '../components/Pagination';
import '../stylesheets/ChatSearchPage.css';

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

/**
 * INITIAL_FILTERS for chat search state initialization.
 */
const INITIAL_CHAT_FILTERS = {
  city: '',
  state: '',
  zipcode: '',
  minPrice: '',
  maxPrice: '',
  beds: '',
  baths: '',
};

/**
 * Module-level cache: persists across component mount/unmount cycles.
 */
let chatSearchCache = null;

export function clearChatSearchCache() {
  chatSearchCache = null;
}

function ChatSearchPage() {
  const [properties, setProperties] = useState(chatSearchCache?.properties ?? []);
  const [total, setTotal] = useState(chatSearchCache?.total ?? 0);
  const [loading, setLoading] = useState(!chatSearchCache);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState(chatSearchCache?.activeFilters ?? { ...INITIAL_CHAT_FILTERS });
  const [currentPage, setCurrentPage] = useState(chatSearchCache?.currentPage ?? 1);
  const [itemsPerPage, setItemsPerPage] = useState(chatSearchCache?.itemsPerPage ?? 20);

  const { isFavorite, toggleFavorite } = useFavorites();

  const totalPages = Math.ceil(total / itemsPerPage);

  const loadProperties = useCallback(async (filters = {}, page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      // Clean empty string values before passing to API
      const cleanedFilters = {};
      for (const [key, value] of Object.entries(filters)) {
        if (value !== '' && value !== null && value !== undefined) {
          cleanedFilters[key] = value;
        }
      }

      const data = await fetchProperties({
        limit,
        offset,
        ...cleanedFilters,
      });

      setProperties(data.results);
      setTotal(data.total);

      // Update module-level cache with fresh data
      chatSearchCache = {
        properties: data.results,
        total: data.total,
        activeFilters: filters,
        currentPage: page,
        itemsPerPage: limit,
      };
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: await prefetch Promise if available, otherwise fetch
  useEffect(() => {
    if (!chatSearchCache) {
      if (prefetchPromises.listings) {
        setLoading(true);
        prefetchPromises.listings.then((data) => {
          if (data && data.results) {
            setProperties(data.results);
            setTotal(data.total);
            chatSearchCache = {
              properties: data.results,
              total: data.total,
              activeFilters: { ...INITIAL_CHAT_FILTERS },
              currentPage: 1,
              itemsPerPage: 20,
            };
          } else {
            loadProperties({}, 1, itemsPerPage);
          }
          setLoading(false);
        });
      } else {
        loadProperties({}, 1, itemsPerPage);
      }
    }
  }, [itemsPerPage, loadProperties]);

  /**
   * Automatically triggered when chatbot updates search filters.
   * Directly executes property search without requiring manual user confirmation.
   */
  function handleChatFiltersChange(newFilters) {
    const allKeys = new Set([...Object.keys(newFilters), ...Object.keys(activeFilters)]);
    const hasChanges = Array.from(allKeys).some(
      (key) => String(newFilters[key] ?? '') !== String(activeFilters[key] ?? '')
    );
    if (!hasChanges) return;

    setActiveFilters(newFilters);
    setCurrentPage(1);
    loadProperties(newFilters, 1, itemsPerPage);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadProperties(activeFilters, page, itemsPerPage);
  }

  function handleItemsPerPageChange(e) {
    const newLimit = Number(e.target.value);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    loadProperties(activeFilters, 1, newLimit);
  }

  // Count active non-empty filter criteria
  const activeCount = Object.values(activeFilters).filter((val) => val !== '' && val !== null && val !== undefined).length;

  // Compute the "Showing X–Y of Z" range
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, total);

  return (
    <div className="chat-search-page" id="chat-search-page">
      <header className="chat-search-page__header">
        <h1 className="chat-search-page__title">AI Conversational Search</h1>
        <p className="chat-search-page__subtitle">
          Describe what you're looking for and the AI will auto-apply search filters in real time.
        </p>
      </header>

      {/* AI Chatbot Assistant (Open by default, directly triggers API fetches) */}
      <ChatAssistant
        filters={activeFilters}
        onFiltersChange={handleChatFiltersChange}
        pageContext="chatsearch"
        defaultOpen={true}
      />

      {/* Top pagination — below chat, above grid */}
      {!loading && !error && totalPages > 1 && (
        <div className="pagination-controls" id="pagination-top">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
          <div className="items-per-page">
            <label htmlFor="items-per-page-top" className="items-per-page__label">
              Per page:
            </label>
            <select
              id="items-per-page-top"
              className="items-per-page__select"
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
            >
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="chat-search-page__loading" id="listings-loading">
          <div className="chat-search-page__spinner" />
          <p>Finding properties matching your request…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="chat-search-page__error" id="listings-error">
          <span className="chat-search-page__error-icon">⚠️</span>
          <p>{error}</p>
          <button className="chat-search-page__retry-btn" onClick={() => loadProperties(activeFilters, currentPage, itemsPerPage)}>
            Retry
          </button>
        </div>
      )}

      {/* Results summary + grid + bottom pagination */}
      {!loading && !error && (
        <>
          <p className="chat-search-page__count" id="property-count">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of{' '}
            <strong>{total.toLocaleString()}</strong> properties
            {activeCount > 0 && <span className="chat-search-page__filter-tag"> (AI Filtered)</span>}
          </p>

          {properties.length === 0 ? (
            <div className="chat-search-page__empty" id="listings-empty">
              <span className="chat-search-page__empty-icon">🏘️</span>
              <h3>No properties found</h3>
              <p>Try asking the AI assistant for a broader search range or different location.</p>
            </div>
          ) : (
            <div className="chat-search-page__grid" id="property-grid">
              {properties.map((property) => (
                <PropertyCard
                  key={property.propertyId || property.L_DisplayId}
                  property={property}
                  isFavorite={isFavorite(property.propertyId || property.L_DisplayId)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>
          )}

          {/* Bottom pagination — below grid */}
          {totalPages > 1 && (
            <div className="pagination-controls" id="pagination-bottom">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
              <div className="items-per-page">
                <label htmlFor="items-per-page-bottom" className="items-per-page__label">
                  Per page:
                </label>
                <select
                  id="items-per-page-bottom"
                  className="items-per-page__select"
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ChatSearchPage;
