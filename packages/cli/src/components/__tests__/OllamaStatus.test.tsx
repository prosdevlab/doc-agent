import { render } from 'ink-testing-library';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { type OllamaState, OllamaStatus } from '../OllamaStatus';

describe('OllamaStatus', () => {
  const defaultProps = {
    isInteractive: true,
    onInstallConfirm: undefined,
    onStartConfirm: undefined,
  };

  it('should render checking state', () => {
    const state: OllamaState = { status: 'checking' };
    const { lastFrame } = render(React.createElement(OllamaStatus, { ...defaultProps, state }));

    expect(lastFrame()).toContain('Checking Ollama');
  });

  it('should render ready state with model name', () => {
    const state: OllamaState = { status: 'ready', model: 'llama3.2-vision' };
    const { lastFrame } = render(React.createElement(OllamaStatus, { ...defaultProps, state }));

    expect(lastFrame()).toContain('Ollama ready');
    expect(lastFrame()).toContain('llama3.2-vision');
  });

  it('should render pulling-model state', () => {
    const state: OllamaState = { status: 'pulling-model', model: 'test-model' };
    const { lastFrame } = render(React.createElement(OllamaStatus, { ...defaultProps, state }));

    expect(lastFrame()).toContain('Pulling test-model');
  });

  it('should render pulling-model state with progress', () => {
    const state: OllamaState = {
      status: 'pulling-model',
      model: 'test-model',
      pullProgress: { status: 'pulling', completed: 500000000, total: 1000000000 },
    };
    const { lastFrame } = render(React.createElement(OllamaStatus, { ...defaultProps, state }));

    expect(lastFrame()).toContain('Pulling test-model');
    expect(lastFrame()).toContain('50%');
    expect(lastFrame()).toContain('500.0 MB');
  });

  it('should render error state', () => {
    const state: OllamaState = { status: 'error', message: 'Connection failed' };
    const { lastFrame } = render(React.createElement(OllamaStatus, { ...defaultProps, state }));

    expect(lastFrame()).toContain('error');
    expect(lastFrame()).toContain('Connection failed');
  });

  it('should render cancelled state', () => {
    const state: OllamaState = { status: 'cancelled' };
    const { lastFrame } = render(React.createElement(OllamaStatus, { ...defaultProps, state }));

    expect(lastFrame()).toContain('Cancelled');
  });

  it('should render prompt-install state', () => {
    const state: OllamaState = { status: 'prompt-install' };
    const onInstallConfirm = vi.fn();
    const { lastFrame } = render(
      React.createElement(OllamaStatus, {
        ...defaultProps,
        state,
        onInstallConfirm,
      })
    );

    expect(lastFrame()).toContain('Ollama is not installed');
    expect(lastFrame()).toContain('Install Ollama');
  });

  it('should render prompt-start state', () => {
    const state: OllamaState = { status: 'prompt-start' };
    const onStartConfirm = vi.fn();
    const { lastFrame } = render(
      React.createElement(OllamaStatus, {
        ...defaultProps,
        state,
        onStartConfirm,
      })
    );

    expect(lastFrame()).toContain('not running');
    expect(lastFrame()).toContain('Start Ollama');
  });
});
