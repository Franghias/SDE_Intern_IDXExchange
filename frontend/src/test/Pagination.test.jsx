import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Pagination, { buildPageNumbers } from '../components/Pagination';

describe('Pagination', () => {
  it('renders page numbers and navigation buttons', () => {
    render(
      <Pagination currentPage={1} totalPages={10} onPageChange={() => {}} />
    );

    expect(screen.getByLabelText('Previous page')).toBeInTheDocument();
    expect(screen.getByLabelText('Next page')).toBeInTheDocument();
    // Should show page 1 through 5, ellipsis, and 10
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('disables Previous button on page 1', () => {
    render(
      <Pagination currentPage={1} totalPages={5} onPageChange={() => {}} />
    );

    expect(screen.getByLabelText('Previous page')).toBeDisabled();
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('disables Next button on the last page', () => {
    render(
      <Pagination currentPage={5} totalPages={5} onPageChange={() => {}} />
    );

    expect(screen.getByLabelText('Next page')).toBeDisabled();
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
  });

  it('calls onPageChange with the correct page when a number is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={1} totalPages={10} onPageChange={onPageChange} />
    );

    await user.click(screen.getByText('3'));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('calls onPageChange(currentPage - 1) when Previous is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={onPageChange} />
    );

    await user.click(screen.getByLabelText('Previous page'));
    expect(onPageChange).toHaveBeenCalledWith(4);
  });

  it('calls onPageChange(currentPage + 1) when Next is clicked', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination currentPage={5} totalPages={10} onPageChange={onPageChange} />
    );

    await user.click(screen.getByLabelText('Next page'));
    expect(onPageChange).toHaveBeenCalledWith(6);
  });

  it('renders ellipsis for large page counts', () => {
    render(
      <Pagination currentPage={5} totalPages={24} onPageChange={() => {}} />
    );

    // Sliding window around page 5: 1, … 3,4,5,6,7 … 24
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    // Two ellipsis markers should be present (before and after the window)
    expect(screen.getAllByText('…')).toHaveLength(2);
  });

  it('returns null when totalPages is 1 or less', () => {
    const { container } = render(
      <Pagination currentPage={1} totalPages={1} onPageChange={() => {}} />
    );

    expect(container.innerHTML).toBe('');
  });

  it('marks the active page with aria-current="page"', () => {
    render(
      <Pagination currentPage={3} totalPages={10} onPageChange={() => {}} />
    );

    const activeButton = screen.getByText('3');
    expect(activeButton).toHaveAttribute('aria-current', 'page');

    // Other page buttons should not have aria-current
    const otherButton = screen.getByText('4');
    expect(otherButton).not.toHaveAttribute('aria-current');
  });
});

describe('buildPageNumbers', () => {
  it('returns empty array when totalPages <= 1', () => {
    expect(buildPageNumbers(1, 0)).toEqual([]);
    expect(buildPageNumbers(1, 1)).toEqual([]);
  });

  it('shows all pages without ellipsis when totalPages <= 5', () => {
    expect(buildPageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(buildPageNumbers(3, 4)).toEqual([1, 2, 3, 4]);
  });

  it('shows sliding window with ellipsis and last page for large counts', () => {
    // Page 1 of 24: 1,2,3,4,5 … 24
    expect(buildPageNumbers(1, 24)).toEqual([1, 2, 3, 4, 5, '…', 24]);

    // Page 5 of 24: 1, … 3,4,5,6,7, … 24
    expect(buildPageNumbers(5, 24)).toEqual([1, '…', 3, 4, 5, 6, 7, '…', 24]);
  });

  it('merges window with last page when close to the end', () => {
    // Page 23 of 24: 1, … 20,21,22,23,24 (no trailing ellipsis needed)
    expect(buildPageNumbers(23, 24)).toEqual([1, '…', 20, 21, 22, 23, 24]);

    // Page 22 of 24: 1, … 20,21,22,23,24
    expect(buildPageNumbers(22, 24)).toEqual([1, '…', 20, 21, 22, 23, 24]);
  });

  it('does not add ellipsis when window is adjacent to last page', () => {
    // Page 5 of 7: 1, … 3,4,5,6,7 — no trailing ellipsis
    expect(buildPageNumbers(5, 7)).toEqual([1, '…', 3, 4, 5, 6, 7]);

    // Page 4 of 7: 1,2,3,4,5,6,7 — window starts at 2, adjacent to 1 so no leading ellipsis
    expect(buildPageNumbers(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
