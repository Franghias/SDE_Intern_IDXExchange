import { useState, useEffect } from 'react';
import '../stylesheets/SortControls.css';

/**
 * Sort field definitions — label shown to user, value sent to backend.
 */
const SORT_FIELDS = [
  { value: 'price', label: 'Price' },
  { value: 'date', label: 'Date Listed' },
  { value: 'sqft', label: 'Sqft' },
  { value: 'beds', label: 'Beds' },
  { value: 'baths', label: 'Baths' },
];

/**
 * Direction options per field type.
 */
const DIRECTIONS = {
  default: [
    { value: '', label: '—' },
    { value: 'asc', label: 'Low to High' },
    { value: 'desc', label: 'High to Low' },
  ],
  date: [
    { value: '', label: '—' },
    { value: 'asc', label: 'Oldest First' },
    { value: 'desc', label: 'Newest First' },
  ],
};

/**
 * Multi-column sort controls.
 * All 5 sort fields are displayed at once, each with a direction dropdown.
 * User picks directions for whichever fields they want, then clicks "Sort".
 *
 * Props:
 *   sortCriteria - Array of { field, order } objects (current active sorts)
 *   onChange(newCriteria) - called with updated array when user clicks Sort or Clear
 */
function SortControls({ sortCriteria, onChange }) {
  // Build local state from current sortCriteria
  function buildSelections() {
    const selections = {};
    for (const f of SORT_FIELDS) {
      const match = sortCriteria.find((c) => c.field === f.value);
      selections[f.value] = match ? match.order : '';
    }
    return selections;
  }

  const [selections, setSelections] = useState(buildSelections);

  // Resync local dropdown selections when sortCriteria changes externally
  // (e.g. LLM-triggered sort, or programmatic clear)
  useEffect(() => {
    setSelections(buildSelections());
  }, [sortCriteria]);

  function handleDirectionChange(field, order) {
    setSelections((prev) => ({ ...prev, [field]: order }));
  }

  function handleSort() {
    const criteria = SORT_FIELDS
      .filter((f) => selections[f.value] !== '')
      .map((f) => ({ field: f.value, order: selections[f.value] }));
    onChange(criteria);
  }

  function handleClear() {
    const cleared = {};
    for (const f of SORT_FIELDS) {
      cleared[f.value] = '';
    }
    setSelections(cleared);
    onChange([]);
  }

  // Check if any direction is selected
  const hasSelections = SORT_FIELDS.some((f) => selections[f.value] !== '');

  // Check if local selections differ from active sortCriteria
  const activeMap = {};
  for (const c of sortCriteria) {
    activeMap[c.field] = c.order;
  }
  const isDirty = SORT_FIELDS.some((f) => (selections[f.value] || '') !== (activeMap[f.value] || ''));

  return (
    <div className="sort-controls" id="sort-controls">
      <div className="sort-controls__header">
        <span className="sort-controls__title">
          <span className="sort-controls__title-icon">⇅</span> Sort Listings
        </span>
        {hasSelections && (
          <span className="sort-controls__active-badge">
            {SORT_FIELDS.filter((f) => selections[f.value] !== '').length} active
          </span>
        )}
      </div>

      <div className="sort-controls__fields">
        {SORT_FIELDS.map((f) => {
          const options = f.value === 'date' ? DIRECTIONS.date : DIRECTIONS.default;
          const isFieldActive = selections[f.value] !== '';
          return (
            <div
              className={`sort-controls__field ${isFieldActive ? 'sort-controls__field--active' : ''}`}
              key={f.value}
            >
              <label
                htmlFor={`sort-${f.value}`}
                className="sort-controls__label"
              >
                {f.label}
              </label>
              <select
                id={`sort-${f.value}`}
                className={`sort-controls__select ${isFieldActive ? 'sort-controls__select--active' : ''}`}
                value={selections[f.value]}
                onChange={(e) => handleDirectionChange(f.value, e.target.value)}
              >
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div className="sort-controls__actions">
        <button
          className="sort-controls__sort-btn"
          onClick={handleSort}
          disabled={!hasSelections && sortCriteria.length === 0}
        >
          Apply Sort
        </button>
        {(hasSelections || sortCriteria.length > 0) && (
          <button
            className="sort-controls__clear-btn"
            onClick={handleClear}
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

export { SORT_FIELDS, DIRECTIONS };
export default SortControls;
