import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PropertyFilters from '../components/PropertyFilters';

describe('PropertyFilters', () => {
  it('renders all seven filter inputs', () => {
    render(<PropertyFilters onSearch={() => { }} onClear={() => { }} />);

    expect(screen.getByLabelText('City')).toBeInTheDocument();
    expect(screen.getByLabelText('State')).toBeInTheDocument();
    expect(screen.getByLabelText('ZIP Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Min Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Max Price')).toBeInTheDocument();
    expect(screen.getByLabelText('Beds')).toBeInTheDocument();
    expect(screen.getByLabelText('Baths')).toBeInTheDocument();
  });

  it('calls onSearch with filter values on form submit', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<PropertyFilters onSearch={onSearch} onClear={() => { }} />);

    await user.type(screen.getByLabelText('City'), 'Portland');
    await user.type(screen.getByLabelText('Min Price'), '200000');
    await user.click(screen.getByRole('button', { name: /search/i }));

    expect(onSearch).toHaveBeenCalledTimes(1);
    const calledFilters = onSearch.mock.calls[0][0];
    expect(calledFilters.city).toBe('Portland');
    expect(calledFilters.minPrice).toBe('200000');
  });

  it('does not include empty filter values when calling onSearch', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(<PropertyFilters onSearch={onSearch} onClear={() => { }} />);

    // Only fill in city, leave everything else empty
    await user.type(screen.getByLabelText('City'), 'Los Angeles');
    await user.click(screen.getByRole('button', { name: /search/i }));

    const calledFilters = onSearch.mock.calls[0][0];
    expect(calledFilters).toEqual({ city: 'Los Angeles' });
    expect(calledFilters).not.toHaveProperty('state');
    expect(calledFilters).not.toHaveProperty('zipcode');
    expect(calledFilters).not.toHaveProperty('minPrice');
    expect(calledFilters).not.toHaveProperty('maxPrice');
    expect(calledFilters).not.toHaveProperty('beds');
    expect(calledFilters).not.toHaveProperty('baths');
  });

  it('calls onClear and resets all inputs when Clear button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<PropertyFilters onSearch={() => { }} onClear={onClear} />);

    // Fill in some fields
    await user.type(screen.getByLabelText('City'), 'Portland');
    await user.type(screen.getByLabelText('Min Price'), '100000');

    // Click clear
    await user.click(screen.getByRole('button', { name: /clear/i }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('City')).toHaveValue('');
    expect(screen.getByLabelText('Min Price')).toHaveValue(null);
  });
});
