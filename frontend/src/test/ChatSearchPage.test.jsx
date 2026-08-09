import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatSearchPage, { clearChatSearchCache } from '../pages/ChatSearchPage';
import * as propertyApi from '../api/propertyApi';
import * as chatApi from '../api/chatApi';

// Mock API modules
vi.mock('../api/propertyApi');
vi.mock('../api/chatApi');

const MOCK_PROPERTIES = {
  total: 2,
  limit: 20,
  offset: 0,
  results: [
    {
      propertyId: '1001',
      listPrice: 450000,
      address: '123 Main St',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      beds: 3,
      baths: 2,
      sqft: 1500,
      photos: '["https://example.com/photo1.jpg"]',
    },
    {
      propertyId: '1002',
      listPrice: 550000,
      address: '456 Sunset Blvd',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90210',
      beds: 4,
      baths: 3,
      sqft: 2200,
      photos: '["https://example.com/photo2.jpg"]',
    },
  ],
};

describe('ChatSearchPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearChatSearchCache();
    propertyApi.fetchProperties.mockResolvedValue(MOCK_PROPERTIES);
  });

  it('renders page header and initial property listings on mount', async () => {
    render(<ChatSearchPage />);

    expect(screen.getByRole('heading', { name: /ai conversational search/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(propertyApi.fetchProperties).toHaveBeenCalled();
    });

    expect(await screen.findByText('$450,000')).toBeInTheDocument();
    expect(await screen.findByText('$550,000')).toBeInTheDocument();
  });

  it('does NOT render manual PropertyFilters or SortControls forms', async () => {
    render(<ChatSearchPage />);

    await waitFor(() => {
      expect(propertyApi.fetchProperties).toHaveBeenCalled();
    });

    // Verify PropertyFilters elements are absent
    expect(screen.queryByRole('form', { name: /property filters/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^search$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();

    // Verify SortControls elements are absent
    expect(screen.queryByText(/sort by/i)).not.toBeInTheDocument();
  });

  it('automatically fetches properties when chatbot updates filters without requiring manual confirmation', async () => {
    const user = userEvent.setup();

    chatApi.sendChatMessage.mockResolvedValue({
      message: "I've set the max price to 500k in Los Angeles.",
      filters: { city: 'Los Angeles', maxPrice: '500000' },
    });

    render(<ChatSearchPage />);

    await waitFor(() => {
      expect(propertyApi.fetchProperties).toHaveBeenCalledTimes(1);
    });

    const chatInput = screen.getByPlaceholderText(/describe what you're looking for/i);
    const sendButton = screen.getByRole('button', { name: /send message/i });

    await user.type(chatInput, 'houses under 500k in LA');
    await user.click(sendButton);

    await waitFor(() => {
      expect(chatApi.sendChatMessage).toHaveBeenCalled();
    });

    await waitFor(() => {
      // Direct API refetch triggered automatically by chatbot filter changes
      expect(propertyApi.fetchProperties).toHaveBeenCalledTimes(2);
      expect(propertyApi.fetchProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({
          city: 'Los Angeles',
          maxPrice: '500000',
        })
      );
    });
  });

  it('automatically applies sorting parameters when requested via chatbot', async () => {
    const user = userEvent.setup();

    chatApi.sendChatMessage.mockResolvedValue({
      message: "I've sorted properties by price from low to high.",
      filters: { sortBy: 'price', sortOrder: 'asc' },
    });

    render(<ChatSearchPage />);

    await waitFor(() => {
      expect(propertyApi.fetchProperties).toHaveBeenCalledTimes(1);
    });

    const chatInput = screen.getByPlaceholderText(/describe what you're looking for/i);
    const sendButton = screen.getByRole('button', { name: /send message/i });

    await user.type(chatInput, 'sort by price lowest first');
    await user.click(sendButton);

    await waitFor(() => {
      expect(propertyApi.fetchProperties).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortBy: 'price',
          sortOrder: 'asc',
        })
      );
    });
  });

  it('renders empty state when no properties match AI filters', async () => {
    propertyApi.fetchProperties.mockResolvedValueOnce({
      total: 0,
      limit: 20,
      offset: 0,
      results: [],
    });

    render(<ChatSearchPage />);

    expect(await screen.findByText('No properties found')).toBeInTheDocument();
  });

  it('renders error state and handles retry button click', async () => {
    const user = userEvent.setup();
    propertyApi.fetchProperties.mockRejectedValueOnce(new Error('Network Error'));

    render(<ChatSearchPage />);

    expect(await screen.findByText('Network Error')).toBeInTheDocument();

    propertyApi.fetchProperties.mockResolvedValueOnce(MOCK_PROPERTIES);
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await user.click(retryBtn);
    expect(await screen.findByText('$450,000')).toBeInTheDocument();
  });

  it('does NOT re-fetch properties when chatbot responds to conversational messages (like thank you) without filter changes', async () => {
    const user = userEvent.setup();

    // First filter request
    chatApi.sendChatMessage.mockResolvedValueOnce({
      message: "Filtered properties in Mountain Mesa.",
      filters: { city: 'Mountain Mesa' },
    });

    render(<ChatSearchPage />);

    await waitFor(() => {
      expect(propertyApi.fetchProperties).toHaveBeenCalledTimes(1);
    });

    const chatInput = screen.getByPlaceholderText(/describe what you're looking for/i);
    const sendButton = screen.getByRole('button', { name: /send message/i });

    await user.type(chatInput, 'Mountain Mesa');
    await user.click(sendButton);

    await waitFor(() => {
      expect(propertyApi.fetchProperties).toHaveBeenCalledTimes(2);
    });

    // Conversational follow-up (e.g. thank you) returning empty or identical filters
    chatApi.sendChatMessage.mockResolvedValueOnce({
      message: "You're welcome! Let me know if you need anything else.",
      filters: {},
    });

    await user.type(chatInput, 'thank you');
    await user.click(sendButton);

    await waitFor(() => {
      expect(chatApi.sendChatMessage).toHaveBeenCalledTimes(2);
    });

    // Should NOT call fetchProperties a third time
    expect(propertyApi.fetchProperties).toHaveBeenCalledTimes(2);
  });
});
