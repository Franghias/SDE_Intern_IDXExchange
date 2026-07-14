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

function PropertyFilters({ onSearch, onClear }) {
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });

  function handleChange(e) {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
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
    setFilters({ ...INITIAL_FILTERS });
    onClear();
  }

  return (
    <form className="property-filters" onSubmit={handleSubmit} aria-label="Property filters">
      <div className="property-filters__fields">
        <div className="property-filters__field">
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

        <div className="property-filters__field">
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

        <div className="property-filters__field">
          <label htmlFor="filter-zipcode">ZIP Code</label>
          <input
            id="filter-zipcode"
            name="zipcode"
            type="text"
            placeholder="e.g. 97201"
            value={filters.zipcode}
            onChange={handleChange}
          />
        </div>

        <div className="property-filters__field">
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

        <div className="property-filters__field">
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

        <div className="property-filters__field">
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

        <div className="property-filters__field">
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

export default PropertyFilters;
