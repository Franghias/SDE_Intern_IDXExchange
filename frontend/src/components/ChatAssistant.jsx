import { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../api/chatApi';
import '../stylesheets/ChatAssistant.css';

/**
 * Module-level cache: stores conversation history per pageContext
 * so that navigating away and coming back retains the chat until "Clear conversation" is clicked.
 */
const chatHistoryCache = {};

export function clearAllChatHistoryCache() {
  Object.keys(chatHistoryCache).forEach((key) => {
    delete chatHistoryCache[key];
  });
}

/**
 * ChatAssistant — Conversational AI component that helps users fill in search filters.
 *
 * Props:
 *   - filters        {Object}   Current filter values (read-only context for the LLM)
 *   - onFiltersChange {Function} Callback to update parent filter state
 *   - pageContext     {string}   "listings" | "favorites" | "openhouses" | "chatsearch"
 *   - defaultOpen     {boolean}  (optional) Whether chat panel is open initially
 */
function ChatAssistant({ filters, onFiltersChange, pageContext, defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState(() => chatHistoryCache[pageContext] || []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [changedFields, setChangedFields] = useState([]);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Restore cached messages when pageContext changes
  useEffect(() => {
    setMessages(chatHistoryCache[pageContext] || []);
  }, [pageContext]);

  // Persist messages to module cache whenever they change
  useEffect(() => {
    chatHistoryCache[pageContext] = messages;
  }, [messages, pageContext]);

  // Scroll to bottom of chat messages container when messages update (without scrolling the main page)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Clear changed-field highlights after a delay
  useEffect(() => {
    if (changedFields.length > 0) {
      const timer = setTimeout(() => setChangedFields([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [changedFields]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const response = await sendChatMessage({
        messages: updatedMessages,
        currentFilters: filters,
        pageContext,
      });

      // Add assistant response to conversation
      const assistantMessage = { role: 'assistant', content: response.message };
      setMessages((prev) => [...prev, assistantMessage]);

      // Apply filter suggestions if any were returned
      if (response.filters && Object.keys(response.filters).length > 0) {
        const newFilters = { ...filters };
        const changed = [];

        for (const [key, value] of Object.entries(response.filters)) {
          if (newFilters[key] !== undefined || isKnownFilter(key, pageContext)) {
            const stringVal = String(value);
            // Only consider it a change if the value actually differs from current filter state
            if (String(newFilters[key] ?? '') !== stringVal) {
              newFilters[key] = stringVal;
              changed.push(key);
            }
          }
        }

        if (changed.length > 0) {
          onFiltersChange(newFilters);
          setChangedFields(changed);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    setMessages([]);
    delete chatHistoryCache[pageContext];
    setError(null);
    setChangedFields([]);

    if (onFiltersChange) {
      const resetFilters = getResetFilters(pageContext, filters);
      onFiltersChange(resetFilters);
    }
  }

  function handleToggle() {
    setIsOpen((prev) => !prev);
  }

  return (
    <div className={`chat-assistant ${isOpen ? 'chat-assistant--open' : ''}`} id="chat-assistant">
      {/* Toggle button */}
      <button
        className="chat-assistant__toggle"
        onClick={handleToggle}
        id="chat-toggle-btn"
        aria-expanded={isOpen}
        aria-controls="chat-panel"
      >
        <span className="chat-assistant__toggle-icon">{isOpen ? '✕' : '🤖'}</span>
        <span className="chat-assistant__toggle-text">
          {isOpen ? 'Close Chat' : 'Ask AI to help with filters'}
        </span>
        {!isOpen && messages.length > 0 && (
          <span className="chat-assistant__badge">{messages.length}</span>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="chat-assistant__panel" id="chat-panel">
          {/* Messages area */}
          <div className="chat-assistant__messages" id="chat-messages" ref={messagesContainerRef}>
            {messages.length === 0 && (
              <div className="chat-assistant__welcome">
                <span className="chat-assistant__welcome-icon">💬</span>
                <p className="chat-assistant__welcome-title">Hi! I'm your search assistant.</p>
                <p className="chat-assistant__welcome-text">
                  Tell me what you're looking for and I'll fill in the search filters for you.
                  {pageContext === 'openhouses'
                    ? ' You can ask about property features and open house dates.'
                    : ' Try something like "3 bed houses in LA under 500k".'
                  }
                </p>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-assistant__message chat-assistant__message--${msg.role}`}
              >
                <div className="chat-assistant__message-bubble">
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="chat-assistant__message chat-assistant__message--assistant">
                <div className="chat-assistant__message-bubble chat-assistant__typing">
                  <span className="chat-assistant__dot"></span>
                  <span className="chat-assistant__dot"></span>
                  <span className="chat-assistant__dot"></span>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-assistant__error">
                <span>⚠️</span> {error}
              </div>
            )}
          </div>

          {/* Changed fields indicator */}
          {changedFields.length > 0 && (
            <div className="chat-assistant__changed" id="filter-changed-indicator">
              <span>✨ Updated:</span>
              {changedFields.map((field) => (
                <span key={field} className="chat-assistant__changed-tag">
                  {formatFieldName(field)}
                </span>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="chat-assistant__input-area">
            <input
              ref={inputRef}
              className="chat-assistant__input"
              id="chat-input"
              type="text"
              placeholder="Describe what you're looking for…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              autoComplete="off"
            />
            <button
              className="chat-assistant__send-btn"
              id="chat-send-btn"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              ↑
            </button>
          </div>

          {/* Footer actions */}
          {messages.length > 0 && (
            <button
              className="chat-assistant__clear-btn"
              id="chat-clear-btn"
              onClick={handleClearChat}
            >
              Clear conversation
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Check if a filter key is a recognized field for the given page context.
 */
function isKnownFilter(key, pageContext) {
  const propertyFilters = ['city', 'state', 'zipcode', 'minPrice', 'maxPrice', 'beds', 'baths', 'sortBy', 'sortOrder'];
  const dateFilters = ['startDate', 'endDate'];

  if (pageContext === 'openhouses') {
    return propertyFilters.includes(key) || dateFilters.includes(key);
  }
  return propertyFilters.includes(key);
}

/**
 * Format a camelCase filter field name into a human-readable label.
 */
function formatFieldName(field) {
  const map = {
    city: 'City',
    state: 'State',
    zipcode: 'ZIP Code',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    beds: 'Beds',
    baths: 'Baths',
    startDate: 'Start Date',
    endDate: 'End Date',
    sortBy: 'Sort Field',
    sortOrder: 'Sort Direction',
  };
  return map[field] || field;
}

/**
 * Generate an empty filter object for resetting filters on chat clear.
 */
function getResetFilters(pageContext, currentFilters) {
  const propertyFilters = ['city', 'state', 'zipcode', 'minPrice', 'maxPrice', 'beds', 'baths', 'sortBy', 'sortOrder'];
  const dateFilters = ['startDate', 'endDate'];

  const keysToReset = pageContext === 'openhouses'
    ? [...propertyFilters, ...dateFilters]
    : propertyFilters;

  const reset = {};
  for (const key of keysToReset) {
    reset[key] = '';
  }

  if (currentFilters) {
    for (const key of Object.keys(currentFilters)) {
      reset[key] = '';
    }
  }

  return reset;
}

export default ChatAssistant;
