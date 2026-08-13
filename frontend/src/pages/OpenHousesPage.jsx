import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, isWithinInterval, isSameDay, parseISO } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { fetchAllOpenHouses } from '../api/propertyApi';
import { formatPrice, formatTime, formatDate } from '../utils/format';
import { useFavorites } from '../hooks/useFavorites';
import { prefetchPromises } from '../utils/prefetchCache';
import ChatAssistant from '../components/ChatAssistant';
import PropertyFilters, { INITIAL_FILTERS } from '../components/PropertyFilters';
import SortControls from '../components/SortControls';
import PropertyImageCarousel from '../components/PropertyImageCarousel';
import Pagination from '../components/Pagination';
import '../stylesheets/OpenHousesPage.css';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50];

/**
 * Module-level cache: persists across component mount/unmount cycles so that
 * navigating away and back does NOT re-fetch data from the server.
 * The cache is updated every time a fresh fetch occurs (search, sort, date range, pagination, etc.).
 */
let openHousesCache = null;

function OpenHousesPage() {
  // Card list state
  const [openHouses, setOpenHouses] = useState(openHousesCache?.openHouses ?? []);
  const [total, setTotal] = useState(openHousesCache?.total ?? 0);
  const [loading, setLoading] = useState(!openHousesCache);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(openHousesCache?.currentPage ?? 1);
  const [itemsPerPage, setItemsPerPage] = useState(openHousesCache?.itemsPerPage ?? 20);
  const [sortCriteria, setSortCriteria] = useState(openHousesCache?.sortCriteria ?? []);

  // Calendar / date filter state
  const [calendarEvents, setCalendarEvents] = useState(openHousesCache?.calendarEvents ?? []);
  const [calendarLoading, setCalendarLoading] = useState(!openHousesCache);
  const [calendarDate, setCalendarDate] = useState(openHousesCache?.calendarDate ?? new Date());
  const [dateRange, setDateRange] = useState(openHousesCache?.dateRange ?? { start: '', end: '' });
  const [activeRange, setActiveRange] = useState(openHousesCache?.activeRange ?? null); // { startDate, endDate } or null

  // Calendar range selection: tracks click state for start/end picking
  // null = no selection, { start } = first click done, { start, end } = range complete
  const [calendarSelection, setCalendarSelection] = useState(openHousesCache?.calendarSelection ?? null);

  // Property filters state (lifted for chatbot integration)
  const [filterFormValues, setFilterFormValues] = useState(openHousesCache?.filterFormValues ?? { ...INITIAL_FILTERS });
  const [activePropertyFilters, setActivePropertyFilters] = useState(openHousesCache?.activePropertyFilters ?? {});
  const [changedFields, setChangedFields] = useState([]);

  const totalPages = Math.ceil(total / itemsPerPage);

  const { isFavorite, toggleFavorite } = useFavorites();

  /**
   * Load paginated open houses for the card list.
   */
  const loadOpenHouses = useCallback(async (range = null, page = 1, limit = 20, propFilters = {}, criteria = []) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * limit;
      const params = { limit, offset, ...propFilters };
      if (range) {
        params.startDate = range.startDate;
        params.endDate = range.endDate;
      }
      if (criteria && criteria.length > 0) {
        params.sortCriteria = criteria;
      }
      const data = await fetchAllOpenHouses(params);
      setOpenHouses(data.results);
      setTotal(data.total);

      // Update module-level cache with fresh data
      openHousesCache = {
        ...openHousesCache,
        openHouses: data.results,
        total: data.total,
        currentPage: page,
        itemsPerPage: limit,
        sortCriteria: criteria,
        activeRange: range,
        activePropertyFilters: propFilters,
      };
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Load all open house events for the current calendar month view.
   * Uses a high limit to get all events for that month.
   */
  const loadCalendarEvents = useCallback(async (viewDate) => {
    setCalendarLoading(true);
    try {
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      // Fetch the full month range (with padding for calendar grid)
      const startDate = format(new Date(year, month, 1), 'yyyy-MM-dd');
      const endDate = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
      const data = await fetchAllOpenHouses({ startDate, endDate, limit: 500 });
      setCalendarEvents(data.results);

      // Update calendar events in cache
      if (openHousesCache) {
        openHousesCache.calendarEvents = data.results;
        openHousesCache.calendarDate = viewDate;
      }
    } catch {
      // Calendar events failing shouldn't block the card list
      setCalendarEvents([]);
    } finally {
      setCalendarLoading(false);
    }
  }, []);

  // On mount: await prefetch Promises if available, otherwise fetch.
  // Subsequent visits restore from the module-level cache instead.
  useEffect(() => {
    if (!openHousesCache) {
      if (prefetchPromises.openHousesCards) {
        setLoading(true);
        prefetchPromises.openHousesCards.then((cardData) => {
          if (cardData && cardData.results) {
            setOpenHouses(cardData.results);
            setTotal(cardData.total);
            openHousesCache = {
              openHouses: cardData.results,
              total: cardData.total,
              currentPage: 1,
              itemsPerPage: 20,
              sortCriteria: [],
              activeRange: null,
              activePropertyFilters: {},
              filterFormValues: { ...INITIAL_FILTERS },
              calendarDate: new Date(),
              dateRange: { start: '', end: '' },
              calendarSelection: null,
            };
          } else {
            loadOpenHouses(null, 1, itemsPerPage);
          }
          setLoading(false);
        });
      } else {
        loadOpenHouses(null, 1, itemsPerPage);
      }

      if (prefetchPromises.openHousesCalendar) {
        setCalendarLoading(true);
        prefetchPromises.openHousesCalendar.then((calData) => {
          if (calData && calData.results) {
            setCalendarEvents(calData.results);
            if (openHousesCache) {
              openHousesCache.calendarEvents = calData.results;
            }
          } else {
            loadCalendarEvents(calendarDate);
          }
          setCalendarLoading(false);
        });
      } else {
        loadCalendarEvents(calendarDate);
      }
    }
  }, []);

  // Convert open house results to react-big-calendar event format
  const events = useMemo(() => {
    return calendarEvents.map((oh) => {
      const dateStr = oh.openHouseDate || oh.date;
      const eventDate = new Date(dateStr + 'T00:00:00');
      return {
        title: oh.address || 'Open House',
        start: eventDate,
        end: eventDate,
        allDay: true,
        resource: oh,
      };
    });
  }, [calendarEvents]);

  /**
   * Handle clicking a date on the calendar.
   * 1st click: set start date
   * 2nd click: set end date (auto-swaps if before start) → applies filter
   * Re-click on a selected date: deselect that endpoint (or clear if only start was set)
   */
  /** Helper: sync calendar/date-related state to the module-level cache. */
  function syncDateStateToCache(sel, range) {
    if (openHousesCache) {
      openHousesCache.calendarSelection = sel;
      openHousesCache.dateRange = range;
    }
  }

  function handleSelectSlot(slotInfo) {
    const clickedDate = format(slotInfo.start, 'yyyy-MM-dd');

    if (!calendarSelection) {
      // No selection yet — set start date
      setCalendarSelection({ start: clickedDate });
      setDateRange({ start: clickedDate, end: '' });
      syncDateStateToCache({ start: clickedDate }, { start: clickedDate, end: '' });
      return;
    }

    if (!calendarSelection.end) {
      // Start is set, no end yet
      if (clickedDate === calendarSelection.start) {
        // Re-click on start — deselect entirely
        setCalendarSelection(null);
        setDateRange({ start: '', end: '' });
        syncDateStateToCache(null, { start: '', end: '' });
        // If there was an active filter, clear it
        if (activeRange) {
          setActiveRange(null);
          setCurrentPage(1);
          loadOpenHouses(null, 1, itemsPerPage, activePropertyFilters);
        }
        return;
      }
      // Set end date — auto-swap if clicked before start
      let start = calendarSelection.start;
      let end = clickedDate;
      if (end < start) {
        [start, end] = [end, start];
      }
      setCalendarSelection({ start, end });
      setDateRange({ start, end });
      syncDateStateToCache({ start, end }, { start, end });
      // Apply the range filter immediately
      const newRange = { startDate: start, endDate: end };
      setActiveRange(newRange);
      setCurrentPage(1);
      loadOpenHouses(newRange, 1, itemsPerPage, activePropertyFilters);
      return;
    }

    // Both start and end are set — handle re-clicks
    if (clickedDate === calendarSelection.start) {
      // Remove start, keep end as the new start
      const newSel = { start: calendarSelection.end };
      const newRange = { start: calendarSelection.end, end: '' };
      setCalendarSelection(newSel);
      setDateRange(newRange);
      syncDateStateToCache(newSel, newRange);
      setActiveRange(null);
      setCurrentPage(1);
      loadOpenHouses(null, 1, itemsPerPage, activePropertyFilters);
      return;
    }
    if (clickedDate === calendarSelection.end) {
      // Remove end, keep start
      const newSel = { start: calendarSelection.start };
      const newRange = { start: calendarSelection.start, end: '' };
      setCalendarSelection(newSel);
      setDateRange(newRange);
      syncDateStateToCache(newSel, newRange);
      setActiveRange(null);
      setCurrentPage(1);
      loadOpenHouses(null, 1, itemsPerPage, activePropertyFilters);
      return;
    }

    // Clicked a new date while range is complete — start fresh
    setCalendarSelection({ start: clickedDate });
    setDateRange({ start: clickedDate, end: '' });
    syncDateStateToCache({ start: clickedDate }, { start: clickedDate, end: '' });
    setActiveRange(null);
    setCurrentPage(1);
    loadOpenHouses(null, 1, itemsPerPage, activePropertyFilters);
  }

  /**
   * Handle clicking an event on the calendar — navigate to property detail.
   */
  function handleSelectEvent(event) {
    const oh = event.resource;
    if (oh?.propertyId) {
      window.open(`/property/${oh.propertyId}`, '_blank', 'noopener,noreferrer');
    }
  }

  /**
   * Handle calendar month navigation.
   */
  function handleCalendarNavigate(newDate) {
    setCalendarDate(newDate);
    loadCalendarEvents(newDate);
  }

  /**
   * Handle date range form submission.
   */
  function handleRangeFilter(e) {
    e.preventDefault();
    if (!dateRange.start && !dateRange.end) {
      handleClearFilter();
      return;
    }
    const newRange = {};
    if (dateRange.start) newRange.startDate = dateRange.start;
    if (dateRange.end) newRange.endDate = dateRange.end;
    setActiveRange(newRange);
    setCurrentPage(1);
    syncDateStateToCache(calendarSelection, dateRange);
    loadOpenHouses(newRange, 1, itemsPerPage, activePropertyFilters);
  }

  /**
   * Clear the date filter — show all open houses.
   */
  function handleClearFilter() {
    setActiveRange(null);
    setDateRange({ start: '', end: '' });
    setCalendarSelection(null);
    setCurrentPage(1);
    syncDateStateToCache(null, { start: '', end: '' });
    loadOpenHouses(null, 1, itemsPerPage, activePropertyFilters);
  }

  /**
   * Handle property filter search (from PropertyFilters component).
   */
  function handlePropertySearch(filters) {
    setActivePropertyFilters(filters);
    setCurrentPage(1);
    if (openHousesCache) openHousesCache.filterFormValues = filterFormValues;
    loadOpenHouses(activeRange, 1, itemsPerPage, filters);
  }

  /**
   * Handle property filter clear.
   */
  function handlePropertyClear() {
    setActivePropertyFilters({});
    setFilterFormValues({ ...INITIAL_FILTERS });
    setCurrentPage(1);
    if (openHousesCache) openHousesCache.filterFormValues = { ...INITIAL_FILTERS };
    loadOpenHouses(activeRange, 1, itemsPerPage, {});
  }

  /**
   * Called by ChatAssistant when the LLM suggests new filter values.
   * Updates both date range and property filter fields visually without triggering a search.
   * Sort fields (sortBy/sortOrder) are intercepted and converted to sortCriteria.
   */
  function handleChatFiltersChange(newFilters) {
    const changed = [];

    // Extract sort fields from the LLM response first
    const { sortBy, sortOrder, ...remainingFields } = newFilters;

    // Convert LLM sort response to sortCriteria array if present
    if (sortBy) {
      const newCriteria = [{ field: sortBy, order: sortOrder || 'asc' }];
      setSortCriteria(newCriteria);
      if (openHousesCache) openHousesCache.sortCriteria = newCriteria;
      changed.push('sortBy');
    }
    if (sortOrder) changed.push('sortOrder');

    // Separate date range fields from property filter fields
    const { startDate, endDate, ...propertyFields } = remainingFields;

    // Update date range if chatbot suggested dates
    if (startDate !== undefined || endDate !== undefined) {
      setDateRange((prev) => {
        const updated = { ...prev };
        if (startDate !== undefined) {
          updated.start = startDate;
          if (startDate !== prev.start) changed.push('startDate');
        }
        if (endDate !== undefined) {
          updated.end = endDate;
          if (endDate !== prev.end) changed.push('endDate');
        }
        return updated;
      });
    }

    // Update property filters
    for (const key of Object.keys(propertyFields)) {
      if (propertyFields[key] !== filterFormValues[key]) {
        changed.push(key);
      }
    }

    // Merge with existing property filter values
    const mergedPropertyFilters = { ...filterFormValues };
    for (const [key, value] of Object.entries(propertyFields)) {
      if (key in INITIAL_FILTERS) {
        mergedPropertyFilters[key] = value;
      }
    }
    setFilterFormValues(mergedPropertyFilters);
    if (openHousesCache) openHousesCache.filterFormValues = mergedPropertyFilters;

    setChangedFields(changed);
    if (changed.length > 0) {
      setTimeout(() => setChangedFields([]), 2500);
    }
  }

  /**
   * Build the combined filter context for the chatbot (includes date range + property filters).
   */
  function getChatFilterContext() {
    return {
      ...filterFormValues,
      startDate: dateRange.start,
      endDate: dateRange.end,
    };
  }

  function handleSortChange(newCriteria) {
    setSortCriteria(newCriteria);
    setCurrentPage(1);
    loadOpenHouses(activeRange, 1, itemsPerPage, activePropertyFilters, newCriteria);
  }

  function handlePageChange(page) {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    loadOpenHouses(activeRange, page, itemsPerPage, activePropertyFilters, sortCriteria);
  }

  function handleItemsPerPageChange(e) {
    const newLimit = Number(e.target.value);
    setItemsPerPage(newLimit);
    setCurrentPage(1);
    loadOpenHouses(activeRange, 1, newLimit, activePropertyFilters, sortCriteria);
  }

  /**
   * Custom styling for calendar day cells: event indicators + selected range highlight.
   */
  function dayPropGetter(date) {
    const dateStr = format(date, 'yyyy-MM-dd');
    const classes = [];

    // Highlight days that have open house events
    const hasEvent = calendarEvents.some((oh) => {
      const ohDate = oh.openHouseDate || oh.date;
      return ohDate && ohDate.toString().slice(0, 10) === dateStr;
    });
    if (hasEvent) {
      classes.push('calendar-day--has-event');
    }

    // Highlight selected range
    if (calendarSelection) {
      const startDate = parseISO(calendarSelection.start);
      const isStart = isSameDay(date, startDate);

      if (calendarSelection.end) {
        const endDate = parseISO(calendarSelection.end);
        const isEnd = isSameDay(date, endDate);

        if (isStart || isEnd) {
          classes.push('calendar-day--range-endpoint');
        } else if (isWithinInterval(date, { start: startDate, end: endDate })) {
          classes.push('calendar-day--in-range');
        }
      } else {
        // Only start selected (waiting for second click)
        if (isStart) {
          classes.push('calendar-day--range-endpoint');
        }
      }
    }

    return classes.length > 0 ? { className: classes.join(' ') } : {};
  }

  /**
   * Custom event styling.
   */
  function eventPropGetter(event) {
    const oh = event.resource;
    if (oh?.status === 'expired') {
      return { className: 'calendar-event--expired' };
    }
    if (oh?.status === 'upcoming') {
      return { className: 'calendar-event--upcoming' };
    }
    return { className: 'calendar-event--active' };
  }

  // Compute the "Showing X–Y of Z" range
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const rangeEnd = Math.min(currentPage * itemsPerPage, total);

  return (
    <div className="openhouses-page">
      <div className="openhouses-page__header">
        <h2 className="openhouses-page__title">Open Houses</h2>
        <p className="openhouses-page__subtitle">
          Browse upcoming and past open house events. Use the calendar or date range to filter.
        </p>
      </div>

      {/* Chatbot — above calendar and filters */}
      <ChatAssistant
        filters={getChatFilterContext()}
        onFiltersChange={handleChatFiltersChange}
        pageContext="openhouses"
      />

      {/* Calendar section */}
      <div className="openhouses-page__calendar-section">
        <div className="openhouses-page__calendar-wrapper">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            views={['month']}
            defaultView="month"
            date={calendarDate}
            onNavigate={handleCalendarNavigate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            dayPropGetter={dayPropGetter}
            eventPropGetter={eventPropGetter}
            popup
            style={{ height: 480 }}
          />
          {calendarLoading && (
            <div className="openhouses-page__calendar-loading">Loading events…</div>
          )}
        </div>

        {/* Date range filter */}
        <form className="openhouses-page__range-filter" onSubmit={handleRangeFilter}>
          <h3 className="openhouses-page__range-title">Filter by Date Range</h3>
          <div className="openhouses-page__range-inputs">
            <div className={`openhouses-page__range-field ${changedFields.includes('startDate') ? 'openhouses-page__range-field--changed' : ''}`}>
              <label htmlFor="range-start">Start Date</label>
              <input
                id="range-start"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
              />
            </div>
            <div className={`openhouses-page__range-field ${changedFields.includes('endDate') ? 'openhouses-page__range-field--changed' : ''}`}>
              <label htmlFor="range-end">End Date</label>
              <input
                id="range-end"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
          <div className="openhouses-page__range-actions">
            <button type="submit" className="openhouses-page__range-btn openhouses-page__range-btn--apply">
              Apply Filter
            </button>
            {activeRange && (
              <button
                type="button"
                className="openhouses-page__range-btn openhouses-page__range-btn--clear"
                onClick={handleClearFilter}
              >
                Clear Filter
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Property Filters — after calendar section */}
      <PropertyFilters
        onSearch={handlePropertySearch}
        onClear={handlePropertyClear}
        externalFilters={filterFormValues}
        onExternalChange={setFilterFormValues}
        changedFields={changedFields}
      />

      {/* Sort controls — below filters */}
      {!loading && !error && (
        <SortControls
          sortCriteria={sortCriteria}
          onChange={handleSortChange}
        />
      )}

      {/* Active filter indicator */}
      {activeRange && (
        <div className="openhouses-page__active-filter">
          <span>📅 Filtering: </span>
          <strong>
            {activeRange.startDate === activeRange.endDate
              ? formatDate(activeRange.startDate)
              : `${formatDate(activeRange.startDate || 'All')} — ${formatDate(activeRange.endDate || 'All')}`}
          </strong>
          <button
            className="openhouses-page__clear-chip"
            onClick={handleClearFilter}
            aria-label="Clear date filter"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top pagination */}
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
        <div className="openhouses-page__loading" id="loading-state">
          <div className="spinner" />
          <p>Loading open houses…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="openhouses-page__error" id="error-state">
          <span className="openhouses-page__error-icon">⚠</span>
          <h2>Something went wrong</h2>
          <p>{error}</p>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          <p className="openhouses-page__count" id="openhouse-count">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of{' '}
            <strong>{total.toLocaleString()}</strong> open houses
            {(activeRange || Object.keys(activePropertyFilters).length > 0) && (
              <span className="openhouses-page__filter-tag"> (filtered)</span>
            )}
          </p>

          {openHouses.length === 0 ? (
            <div className="openhouses-page__empty" id="no-results">
              <span className="openhouses-page__empty-icon">📅</span>
              <h2>No open houses found</h2>
              <p>Try adjusting your date range or clearing the filter to see all events.</p>
            </div>
          ) : (
            <div className="openhouses-page__grid" id="openhouse-grid">
              {openHouses.map((oh, idx) => (
                <a
                  key={`${oh.listingId}-${oh.openHouseDate}-${idx}`}
                  className="oh-card"
                  href={`/property/${oh.propertyId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div className="oh-card__image-wrapper">
                    <PropertyImageCarousel photosStr={oh.photos} />
                    <span className="oh-card__price-badge">
                      {formatPrice(oh.listPrice)}
                    </span>
                    <span className={`oh-card__status-badge oh-card__status-badge--${oh.status}`}>
                      {oh.status}
                    </span>
                    {oh.propertyId && (
                      <button
                        className={`oh-card__favorite-btn${isFavorite(oh.propertyId) ? ' oh-card__favorite-btn--active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleFavorite(oh.propertyId);
                        }}
                        aria-label={isFavorite(oh.propertyId) ? 'Remove from favorites' : 'Add to favorites'}
                        title={isFavorite(oh.propertyId) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {isFavorite(oh.propertyId) ? '♥' : '♡'}
                      </button>
                    )}
                  </div>

                  <div className="oh-card__body">
                    <h2 className="oh-card__address">{oh.address}</h2>
                    <p className="oh-card__location">
                      {oh.city}, {oh.state} {oh.zipCode}
                    </p>

                    <div className="oh-card__date-row">
                      <span className="oh-card__date-icon">📅</span>
                      <span className="oh-card__date-text">
                        {formatDate(oh.openHouseDate || oh.date)}
                      </span>
                    </div>

                    <div className="oh-card__time-row">
                      <span className="oh-card__time-icon">🕐</span>
                      <span className="oh-card__time-text">
                        {formatTime(oh.startTime)} — {formatTime(oh.endTime)}
                      </span>
                    </div>

                    <div className="oh-card__stats">
                      <span className="oh-card__stat">
                        <strong>{oh.beds}</strong> beds
                      </span>
                      <span className="oh-card__divider">·</span>
                      <span className="oh-card__stat">
                        <strong>{oh.baths}</strong> baths
                      </span>
                      <span className="oh-card__divider">·</span>
                      <span className="oh-card__stat">
                        <strong>{oh.sqft?.toLocaleString() ?? '—'}</strong> sqft
                      </span>
                    </div>

                    {oh.OpenHouseType && (
                      <span className="oh-card__type-tag">{oh.OpenHouseType}</span>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}

          {/* Bottom pagination */}
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

export default OpenHousesPage;
