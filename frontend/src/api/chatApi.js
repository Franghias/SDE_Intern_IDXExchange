const API_BASE = '/api';

/**
 * Send a chat message to the backend LLM proxy.
 * The backend forwards the conversation to OpenRouter and returns structured
 * filter suggestions along with a friendly text response.
 *
 * @param {Object}   options
 * @param {Array}    options.messages       - Conversation history [{role, content}, ...]
 * @param {Object}   options.currentFilters - Current filter field values
 * @param {string}   options.pageContext    - "listings" | "favorites" | "openhouses"
 * @returns {Promise<{message: string, filters: Object}>}
 */
export async function sendChatMessage({ messages, currentFilters, pageContext }) {
  const url = `${API_BASE}/chat`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, currentFilters, pageContext }),
    });
  } catch {
    throw new Error('Unable to connect to the chat service. Please check your connection.');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = body?.error || `Chat request failed with status ${response.status}`;
    throw new Error(message);
  }

  return response.json();
}
