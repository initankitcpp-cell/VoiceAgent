import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useVoice, type Recognition } from './useVoice';

class MockRecognition implements Recognition {
  static instances: MockRecognition[] = [];
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null;
  onend: Recognition['onend'] = null;
  start = vi.fn();
  stop = vi.fn();
  abort = vi.fn();
  constructor() {
    MockRecognition.instances.push(this);
  }
}
class MockUtterance {
  text: string;
  lang = '';
  rate = 1;
  pitch = 1;
  voice: SpeechSynthesisVoice | null = null;
  onend: (() => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}
const synth = {
  speak: vi.fn(),
  cancel: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn(() => [
    { name: 'English test voice', lang: 'en-US', localService: true } as SpeechSynthesisVoice,
  ]),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};
beforeEach(() => {
  MockRecognition.instances = [];
  vi.clearAllMocks();
  synth.getVoices.mockReturnValue([
    { name: 'English test voice', lang: 'en-US', localService: true } as SpeechSynthesisVoice,
  ]);
  vi.stubGlobal('SpeechRecognition', MockRecognition);
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  vi.stubGlobal('speechSynthesis', synth);
  vi.stubGlobal('isSecureContext', true);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe('browser voice lifecycle (API simulations, not real audio)', () => {
  it('queues native and English segments using the matching voice for each', () => {
    synth.getVoices.mockReturnValue([
      { name: 'English test voice', lang: 'en-IN', localService: true },
      { name: 'Hindi test voice', lang: 'hi-IN', localService: true },
    ] as SpeechSynthesisVoice[]);
    const { result } = renderHook(() => useVoice(vi.fn()));
    act(() =>
      result.current.speak([
        { text: 'नमस्ते', lang: 'hi-IN' },
        { text: 'Confident', lang: 'en-IN' },
      ]),
    );
    const first = synth.speak.mock.calls[0][0] as MockUtterance;
    expect(first.lang).toBe('hi-IN');
    expect(first.voice?.name).toBe('Hindi test voice');
    act(() => first.onend?.());
    const second = synth.speak.mock.calls[1][0] as MockUtterance;
    expect(second.lang).toBe('en-IN');
    expect(second.voice?.name).toBe('English test voice');
    act(() => second.onend?.());
    expect(result.current.status).toBe('idle');
  });
  it('keeps unsupported native speech as text instead of using the wrong voice', () => {
    const { result } = renderHook(() => useVoice(vi.fn()));
    act(() =>
      result.current.speak([
        { text: 'ನಮಸ್ಕಾರ', lang: 'kn-IN' },
        { text: 'Hello', lang: 'en-IN' },
      ]),
    );
    expect(result.current.missingLocales).toEqual(['kn-IN']);
    expect(synth.speak).toHaveBeenCalledTimes(1);
    expect((synth.speak.mock.calls[0][0] as MockUtterance).text).toBe('Hello');
  });
  it('uses the explicitly requested recognition locale for native help', () => {
    const { result } = renderHook(() => useVoice(vi.fn()));
    act(() => result.current.listen('kn-IN'));
    expect(MockRecognition.instances[0].lang).toBe('kn-IN');
  });
  it('blocks the microphone during speech and supports pause/resume', () => {
    const { result } = renderHook(() => useVoice(vi.fn()));
    act(() => result.current.speak('Hello'));
    expect(result.current.status).toBe('speaking');
    act(() => result.current.listen());
    expect(MockRecognition.instances).toHaveLength(0);
    act(() => result.current.togglePause());
    expect(result.current.status).toBe('paused');
    expect(synth.pause).toHaveBeenCalled();
    act(() => result.current.togglePause());
    expect(result.current.status).toBe('speaking');
    expect(synth.resume).toHaveBeenCalled();
  });
  it('extracts final recognized text and displays permission failures', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useVoice(callback));
    act(() => result.current.listen());
    const instance = MockRecognition.instances[0];
    expect(result.current.status).toBe('listening');
    act(() =>
      instance.onresult?.({
        resultIndex: 0,
        results: {
          length: 1,
          0: { isFinal: true, length: 1, 0: { transcript: 'I am curious about space' } },
        },
      }),
    );
    expect(callback).toHaveBeenCalledWith('I am curious about space');
    act(() => instance.onerror?.({ error: 'not-allowed' }));
    expect(result.current.error).toContain('denied');
    expect(result.current.status).toBe('idle');
  });
  it('aborts recognition before speaking and ignores stale speech completion events', () => {
    const { result } = renderHook(() => useVoice(vi.fn()));
    act(() => result.current.listen());
    const recognition = MockRecognition.instances[0];
    act(() => result.current.speak('One'));
    const oldUtterance = synth.speak.mock.calls.at(-1)![0] as MockUtterance;
    const staleCompletion = oldUtterance.onend;
    expect(recognition.abort).toHaveBeenCalled();
    act(() => result.current.stop());
    act(() => result.current.listen());
    act(() => staleCompletion?.());
    expect(result.current.status).toBe('listening');
  });
  it('cleans up recognition and synthesis on unmount', () => {
    const { result, unmount } = renderHook(() => useVoice(vi.fn()));
    act(() => result.current.listen());
    const recognition = MockRecognition.instances[0];
    unmount();
    expect(recognition.abort).toHaveBeenCalled();
    expect(recognition.onresult).toBe(null);
    expect(synth.cancel).toHaveBeenCalled();
  });
  it('gives actionable network guidance, accepts no invented transcript, and can retry', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useVoice(callback));
    act(() => result.current.listen());
    const failed = MockRecognition.instances[0];
    act(() => failed.onerror?.({ error: 'network' }));
    expect(result.current.errorCode).toBe('network');
    expect(result.current.error).toContain('Google Chrome');
    expect(result.current.error).toContain('editor preview');
    expect(result.current.status).toBe('idle');
    expect(callback).not.toHaveBeenCalled();
    expect(failed.abort).toHaveBeenCalled();
    act(() => result.current.listen());
    expect(MockRecognition.instances).toHaveLength(2);
    expect(result.current.error).toBe('');
    expect(result.current.errorCode).toBe(null);
    expect(result.current.status).toBe('listening');
  });
  it('leaves typed practice usable without the recognition API', () => {
    vi.stubGlobal('SpeechRecognition', undefined);
    const { result } = renderHook(() => useVoice(vi.fn()));
    expect(result.current.supported).toBe(false);
    act(() => result.current.listen());
    expect(result.current.status).toBe('idle');
    expect(result.current.error).toContain('type');
  });
});
