import { useState } from 'react';
import '../stylesheets/PropertyFilters.css';

const BEDS_OPTIONS = ['Any', '1', '2', '3', '4', '5+'];
const BATHS_OPTIONS = ['Any', '1', '2', '3', '4+'];

const INITIAL_FILTERS = {
  city: '',
  state: '',
  zipcode: '',
  minPrice: '',
  maxPrice: '',
  beds: '',
  baths: '',
};

/**
 * PropertyFilters — Search filter form for property listings.
 *
 * Supports two modes:
 *   1. Uncontrolled (default): manages its own internal filter state.
 *   2. Controlled: when `externalFilters` and `onExternalChange` are provided,
 *      uses the parent's state as the source of truth (e.g. for chatbot integration).
 *
 * Props:
 *   - onSearch          {Function}  Called with cleaned filters when the user clicks Search
 *   - onClear           {Function}  Called when the user clicks Clear Filters
 *   - externalFilters   {Object}    (optional) Controlled filter values from parent
 *   - onExternalChange  {Function}  (optional) Called on every field change in controlled mode
 *   - changedFields     {string[]}  (optional) List of field names recently changed by chatbot — for highlight animation
 */
function PropertyFilters({ onSearch, onClear, externalFilters, onExternalChange, changedFields = [] }) {
  // Internal state used only when NOT controlled externally
  const [internalFilters, setInternalFilters] = useState({ ...INITIAL_FILTERS });

  // Determine which state to use
  const isControlled = externalFilters !== undefined && onExternalChange !== undefined;
  const filters = isControlled ? externalFilters : internalFilters;

  function handleChange(e) {
    const { name, value } = e.target;
    if (isControlled) {
      onExternalChange({ ...filters, [name]: value });
    } else {
      setInternalFilters((prev) => ({ ...prev, [name]: value }));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    // Build a clean filters object — skip empty values
    const cleaned = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== '' && value !== 'Any') {
        // Convert "5+" → 5 and "4+" → 4 for the API
        cleaned[key] = value.endsWith('+') ? value.slice(0, -1) : value;
      }
    }

    onSearch(cleaned);
  }

  function handleClear() {
    if (isControlled) {
      onExternalChange({ ...INITIAL_FILTERS });
    } else {
      setInternalFilters({ ...INITIAL_FILTERS });
    }
    onClear();
  }

  /**
   * Returns extra CSS class if a field was recently changed by the chatbot.
   */
  function fieldHighlight(fieldName) {
    return changedFields.includes(fieldName) ? 'property-filters__field--changed' : '';
  }

  return (
    <form className="property-filters" onSubmit={handleSubmit} aria-label="Property filters">
      <div className="property-filters__fields">
        <div className={`property-filters__field ${fieldHighlight('city')}`}>
          <label htmlFor="filter-city">City</label>
          <input
            id="filter-city"
            name="city"
            type="text"
            placeholder="e.g. Los Angeles"
            value={filters.city}
            onChange={handleChange}
          />
        </div>

        <div className={`property-filters__field ${fieldHighlight('state')}`}>
          <label htmlFor="filter-state">State</label>
          <input
            id="filter-state"
            name="state"
            type="text"
            placeholder="e.g. CA"
            value={filters.state}
            onChange={handleChange}
          />
        </div>

        <div className={`property-filters__field ${fieldHighlight('zipcode')}`}>
          <label htmlFor="filter-zipcode">ZIP Code</label>
          <input
            id="filter-zipcode"
            name="zipcode"
            type="text"
            placeholder="e.g. 90210"
            value={filters.zipcode}
            onChange={handleChange}
          />
        </div>

        <div className={`property-filters__field ${fieldHighlight('minPrice')}`}>
          <label htmlFor="filter-minPrice">Min Price</label>
          <input
            id="filter-minPrice"
            name="minPrice"
            type="number"
            placeholder="$0"
            min="0"
            value={filters.minPrice}
            onChange={handleChange}
          />
        </div>

        <div className={`property-filters__field ${fieldHighlight('maxPrice')}`}>
          <label htmlFor="filter-maxPrice">Max Price</label>
          <input
            id="filter-maxPrice"
            name="maxPrice"
            type="number"
            placeholder="No max"
            min="0"
            value={filters.maxPrice}
            onChange={handleChange}
          />
        </div>

        <div className={`property-filters__field ${fieldHighlight('beds')}`}>
          <label htmlFor="filter-beds">Beds</label>
          <select
            id="filter-beds"
            name="beds"
            value={filters.beds}
            onChange={handleChange}
          >
            {BEDS_OPTIONS.map((opt) => (
              <option key={opt} value={opt === 'Any' ? '' : opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div className={`property-filters__field ${fieldHighlight('baths')}`}>
          <label htmlFor="filter-baths">Baths</label>
          <select
            id="filter-baths"
            name="baths"
            value={filters.baths}
            onChange={handleChange}
          >
            {BATHS_OPTIONS.map((opt) => (
              <option key={opt} value={opt === 'Any' ? '' : opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="property-filters__actions">
        <button type="submit" className="property-filters__search-btn" id="search-btn">
          Search
        </button>
        <button type="button" className="property-filters__clear-btn" id="clear-btn" onClick={handleClear}>
          Clear Filters
        </button>
      </div>
    </form>
  );
}

export { INITIAL_FILTERS };
export default PropertyFilters;
