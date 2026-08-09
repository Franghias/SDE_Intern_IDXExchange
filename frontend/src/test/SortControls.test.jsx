import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SortControls, { SORT_FIELDS } from '../components/SortControls';

describe('SortControls', () => {
  it('renders all 5 sort field dropdowns', () => {
    render(<SortControls sortCriteria={[]} onChange={() => {}} />);

    for (const f of SORT_FIELDS) {
      expect(screen.getByLabelText(f.label)).toBeInTheDocument();
    }
  });

  it('each dropdown defaults to "—" when no criteria are active', () => {
    render(<SortControls sortCriteria={[]} onChange={() => {}} />);

    for (const f of SORT_FIELDS) {
      expect(screen.getByLabelText(f.label).value).toBe('');
    }
  });

  it('pre-selects direction for active sort criteria', () => {
    render(
      <SortControls
        sortCriteria={[{ field: 'price', order: 'desc' }]}
        onChange={() => {}}
      />
    );

    expect(screen.getByLabelText('Price').value).toBe('desc');
    expect(screen.getByLabelText('Beds').value).toBe('');
  });

  it('calls onChange with selected criteria when Sort button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortControls sortCriteria={[]} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText('Price'), 'asc');
    await user.selectOptions(screen.getByLabelText('Date Listed'), 'desc');
    await user.click(screen.getByRole('button', { name: /sort/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      { field: 'price', order: 'asc' },
      { field: 'date', order: 'desc' },
    ]);
  });

  it('clears all selections when Clear button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SortControls
        sortCriteria={[{ field: 'price', order: 'asc' }]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('shows "Oldest First / Newest First" options for Date Listed', () => {
    render(<SortControls sortCriteria={[]} onChange={() => {}} />);

    const dateSelect = screen.getByLabelText('Date Listed');
    const options = Array.from(dateSelect.querySelectorAll('option')).map(
      (o) => o.textContent
    );

    expect(options).toContain('Oldest First');
    expect(options).toContain('Newest First');
    expect(options).not.toContain('Low to High');
  });

  it('shows "Low to High / High to Low" options for Price', () => {
    render(<SortControls sortCriteria={[]} onChange={() => {}} />);

    const priceSelect = screen.getByLabelText('Price');
    const options = Array.from(priceSelect.querySelectorAll('option')).map(
      (o) => o.textContent
    );

    expect(options).toContain('Low to High');
    expect(options).toContain('High to Low');
    expect(options).not.toContain('Oldest First');
  });
});
