import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';
import ErrorBoundary from '../components/ErrorBoundary';

// Helper component that throws an error when shouldThrow is true
function ProblematicComponent({ shouldThrow, message = 'Test render crash' }) {
  if (shouldThrow) {
    throw new Error(message);
  }
  return <div data-testid="normal-child">Child Component Rendered Successfully</div>;
}

// Helper stateful component to test recovery
function RecoveryTestHarness({ initialThrow = true }) {
  const [shouldThrow, setShouldThrow] = useState(initialThrow);

  return (
    <div>
      <button type="button" onClick={() => setShouldThrow(false)}>
        Fix Bug
      </button>
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={shouldThrow} message="Crash on mount" />
      </ErrorBoundary>
    </div>
  );
}

describe('ErrorBoundary Component', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    // Suppress console.error in test output for intentional ErrorBoundary errors
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders child components normally when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div data-testid="test-child">Safe Content</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('test-child')).toBeInTheDocument();
    expect(screen.getByText('Safe Content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('catches render errors and displays the default recovery UI', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} message="Simulated Component Crash" />
      </ErrorBoundary>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/Simulated Component Crash/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /return to home/i })).toBeInTheDocument();
    expect(screen.queryByTestId('normal-child')).not.toBeInTheDocument();
  });

  it('invokes onError prop when an error is caught', () => {
    const onErrorMock = vi.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ProblematicComponent shouldThrow={true} message="Tracked Error" />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock.mock.calls[0][0].message).toBe('Tracked Error');
    expect(onErrorMock.mock.calls[0][1]).toHaveProperty('componentStack');
  });

  it('recovers and renders normal child UI when error condition is resolved and Try Again is clicked', async () => {
    const user = userEvent.setup();

    render(<RecoveryTestHarness initialThrow={true} />);

    // Initially crashed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByTestId('normal-child')).not.toBeInTheDocument();

    // Fix the bug in child state
    await user.click(screen.getByRole('button', { name: /fix bug/i }));

    // Click "Try Again" on ErrorBoundary
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Child should now render successfully
    expect(screen.getByTestId('normal-child')).toBeInTheDocument();
    expect(screen.getByText('Child Component Rendered Successfully')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('invokes onReset callback when Try Again is clicked', async () => {
    const user = userEvent.setup();
    const onResetMock = vi.fn();

    render(
      <ErrorBoundary onReset={onResetMock}>
        <ProblematicComponent shouldThrow={true} message="Resettable Error" />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(onResetMock).toHaveBeenCalledTimes(1);
  });

  it('supports custom fallback element', () => {
    const customFallback = <div data-testid="custom-fallback">Custom Error View</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ProblematicComponent shouldThrow={true} message="Custom fallback test" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error View')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('supports custom fallbackRender function receiving error and resetErrorBoundary', async () => {
    const user = userEvent.setup();
    let recovered = false;

    render(
      <ErrorBoundary
        fallbackRender={({ error, resetErrorBoundary }) => (
          <div data-testid="custom-render-fallback">
            <p>Custom Error: {error.message}</p>
            <button
              type="button"
              onClick={() => {
                recovered = true;
                resetErrorBoundary();
              }}
            >
              Custom Reset
            </button>
          </div>
        )}
      >
        <ProblematicComponent shouldThrow={true} message="Function Fallback Error" />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('custom-render-fallback')).toBeInTheDocument();
    expect(screen.getByText('Custom Error: Function Fallback Error')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /custom reset/i }));
    expect(recovered).toBe(true);
  });

  it('toggles technical details and stack trace visibility', async () => {
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} message="Details inspection error" />
      </ErrorBoundary>
    );

    const toggleBtn = screen.getByRole('button', { name: /show technical details/i });
    expect(toggleBtn).toBeInTheDocument();
    expect(screen.queryByText(/Stack Trace:/i)).not.toBeInTheDocument();

    // Open details
    await user.click(toggleBtn);
    expect(screen.getByText(/Stack Trace:/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide technical details/i })).toBeInTheDocument();

    // Close details
    await user.click(screen.getByRole('button', { name: /hide technical details/i }));
    expect(screen.queryByText(/Stack Trace:/i)).not.toBeInTheDocument();
  });
});
