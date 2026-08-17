import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatAssistant, { clearAllChatHistoryCache } from '../components/ChatAssistant';
import * as chatApi from '../api/chatApi';

vi.mock('../api/chatApi');

describe('ChatAssistant Persistence & Filters', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearAllChatHistoryCache();
  });

  it('persists conversation history across unmount and remount for the same pageContext', async () => {
    const user = userEvent.setup();
    chatApi.sendChatMessage.mockResolvedValue({
      message: 'Here are listings in Los Angeles.',
      filters: { city: 'Los Angeles' },
    });

    const onFiltersChange = vi.fn();

    // 1. Render ChatAssistant on 'listings' page
    const { unmount } = render(
      <ChatAssistant
        filters={{}}
        onFiltersChange={onFiltersChange}
        pageContext="listings"
        defaultOpen={true}
      />
    );

    const input = screen.getByPlaceholderText(/describe what you're looking for/i);
    const sendBtn = screen.getByRole('button', { name: /send message/i });

    await user.type(input, 'find homes in LA');
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Here are listings in Los Angeles.')).toBeInTheDocument();
    });

    // 2. Unmount (simulating navigating away from Listings page)
    unmount();

    // 3. Remount on 'listings' page
    render(
      <ChatAssistant
        filters={{}}
        onFiltersChange={onFiltersChange}
        pageContext="listings"
        defaultOpen={true}
      />
    );

    // 4. Verify conversation history is restored
    expect(screen.getByText('find homes in LA')).toBeInTheDocument();
    expect(screen.getByText('Here are listings in Los Angeles.')).toBeInTheDocument();
  });

  it('maintains separate conversation history for different pageContexts', async () => {
    const user = userEvent.setup();
    chatApi.sendChatMessage.mockResolvedValueOnce({
      message: 'Listings chat response',
      filters: {},
    });

    const onFiltersChange = vi.fn();

    // Render on 'listings'
    const { unmount } = render(
      <ChatAssistant
        filters={{}}
        onFiltersChange={onFiltersChange}
        pageContext="listings"
        defaultOpen={true}
      />
    );

    const input = screen.getByPlaceholderText(/describe what you're looking for/i);
    const sendBtn = screen.getByRole('button', { name: /send message/i });

    await user.type(input, 'listings question');
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Listings chat response')).toBeInTheDocument();
    });

    unmount();

    // Render on 'openhouses'
    render(
      <ChatAssistant
        filters={{}}
        onFiltersChange={onFiltersChange}
        pageContext="openhouses"
        defaultOpen={true}
      />
    );

    // Should NOT have the listings message
    expect(screen.queryByText('Listings chat response')).not.toBeInTheDocument();
  });

  it('clears conversation history when Clear Conversation button is clicked', async () => {
    const user = userEvent.setup();
    chatApi.sendChatMessage.mockResolvedValue({
      message: 'Assistant reply',
      filters: {},
    });

    const { unmount } = render(
      <ChatAssistant
        filters={{}}
        onFiltersChange={vi.fn()}
        pageContext="favorites"
        defaultOpen={true}
      />
    );

    const input = screen.getByPlaceholderText(/describe what you're looking for/i);
    const sendBtn = screen.getByRole('button', { name: /send message/i });

    await user.type(input, 'hello');
    await user.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText('Assistant reply')).toBeInTheDocument();
    });

    const clearBtn = screen.getByRole('button', { name: /clear conversation/i });
    await user.click(clearBtn);

    expect(screen.queryByText('Assistant reply')).not.toBeInTheDocument();

    unmount();

    // Remounting should also have empty history
    render(
      <ChatAssistant
        filters={{}}
        onFiltersChange={vi.fn()}
        pageContext="favorites"
        defaultOpen={true}
      />
    );

    expect(screen.queryByText('Assistant reply')).not.toBeInTheDocument();
  });

  it('passes empty filter strings to onFiltersChange when backend instructs clearing a filter', async () => {
    const user = userEvent.setup();
    chatApi.sendChatMessage.mockResolvedValue({
      message: 'Updated filters: city Los Angeles, state cleared.',
      filters: { city: 'Los Angeles', state: '' },
    });

    const onFiltersChange = vi.fn();

    render(
      <ChatAssistant
        filters={{ city: 'Los Angeles', state: 'CA' }}
        onFiltersChange={onFiltersChange}
        pageContext="listings"
        defaultOpen={true}
      />
    );

    const input = screen.getByPlaceholderText(/describe what you're looking for/i);
    const sendBtn = screen.getByRole('button', { name: /send message/i });

    await user.type(input, 'set filter to be in LA and price 300k to 500k');
    await user.click(sendBtn);

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          city: 'Los Angeles',
          state: '',
        })
      );
    });
  });
});
