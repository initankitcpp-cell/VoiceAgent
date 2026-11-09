import { useCallback, useEffect, useRef, useState } from 'react';
import { selectVoice, type SpeechSegment } from '../lib/voiceLocales';
import type { Locale } from '../data/languages';

export type VoiceStatus = 'idle' | 'listening' | 'speaking' | 'paused';
interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
export interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const recognitionConstructor = () =>
  (window as SpeechWindow).SpeechRecognition ?? (window as SpeechWindow).webkitSpeechRecognition;
const errorMessages: Record<string, string> = {
  'not-allowed':
    'Microphone access was denied. Allow it in your browser’s site settings, then try again. You can also type below.',
  'service-not-allowed':
    'Speech recognition is blocked by this browser or device. Please use a typed response.',
  'audio-capture': 'No microphone was found. Connect a microphone or type your answer.',
  network:
    'Your browser could not reach its speech-recognition service. Open this app directly in Google Chrome rather than an editor preview, allow microphone access, and retry. If you are already in Chrome, check your connection or try another network. Other websites may still work when the speech service is unavailable.',
  'no-speech': 'No speech was detected. Try again in a quiet space, or type below.',
  'language-not-supported':
    'The requested recognition language is unavailable on this device. Please type your answer.',
};

export function useVoice(onTranscript: (value: string) => void) {
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [interim, setInterim] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [missingLocales, setMissingLocales] = useState<string[]>([]);
  const recognition = useRef<Recognition | null>(null);
  const speechToken = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speechTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const callback = useRef(onTranscript);
  callback.current = onTranscript;
  const supported = !!recognitionConstructor() && window.isSecureContext;
  const canSpeak =
    !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function';

  const clearRecognition = useCallback(() => {
    if (timeout.current) clearTimeout(timeout.current);
    const active = recognition.current;
    recognition.current = null;
    if (active) {
      active.onend = null;
      active.onerror = null;
      active.onresult = null;
      try {
        active.abort();
      } catch {
        /* already stopped */
      }
    }
  }, []);
  const cancelSpeech = useCallback(() => {
    speechToken.current++;
    if (speechTimeout.current) clearTimeout(speechTimeout.current);
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
      utteranceRef.current = null;
    }
    if (canSpeak) window.speechSynthesis.cancel();
  }, [canSpeak]);
  const stop = useCallback(() => {
    clearRecognition();
    cancelSpeech();
    setInterim('');
    setStatus('idle');
  }, [clearRecognition, cancelSpeech]);

  const speak = useCallback(
    (input: string | SpeechSegment[], locale: Locale = 'en-US') => {
      clearRecognition();
      cancelSpeech();
      setInterim('');
      setError('');
      setErrorCode(null);
      if (muted || !canSpeak) {
        setStatus('idle');
        return;
      }
      const segments = typeof input === 'string' ? [{ text: input, lang: locale }] : input;
      const currentVoices = window.speechSynthesis.getVoices();
      const available = currentVoices.length ? currentVoices : voices;
      const missing = [
        ...new Set(
          segments
            .filter((segment) => !selectVoice(available, segment.lang))
            .map((segment) => segment.lang),
        ),
      ];
      setMissingLocales(missing);
      const queue = segments
        .filter((segment) => segment.text.trim())
        .map((segment) => ({ ...segment, voice: selectVoice(available, segment.lang) }))
        .filter((segment) => segment.voice !== null);
      const token = speechToken.current;
      let index = 0;
      const playNext = () => {
        if (speechToken.current !== token) return;
        if (speechTimeout.current) clearTimeout(speechTimeout.current);
        const segment = queue[index++];
        if (!segment) {
          utteranceRef.current = null;
          setStatus('idle');
          return;
        }
        const utterance = new SpeechSynthesisUtterance(segment.text);
        utteranceRef.current = utterance;
        utterance.lang = segment.lang;
        utterance.voice = segment.voice;
        utterance.rate = 0.92;
        utterance.pitch = 1;
        utterance.onend = playNext;
        utterance.onerror = (event) => {
          if (speechToken.current !== token) return;
          if (event.error !== 'canceled' && event.error !== 'interrupted')
            setError(
              `Voice playback failed for ${segment.lang}. Read that part in the transcript.`,
            );
          playNext();
        };
        setStatus('speaking');
        try {
          window.speechSynthesis.speak(utterance);
          speechTimeout.current = setTimeout(() => {
            if (speechToken.current === token) {
              cancelSpeech();
              setStatus('idle');
              setError(
                'Voice playback timed out. You can replay the explanation or continue using text.',
              );
            }
          }, 90000);
        } catch {
          setError('Voice playback is unavailable. You can continue using text.');
          playNext();
        }
      };
      playNext();
    },
    [muted, canSpeak, voices, clearRecognition, cancelSpeech],
  );

  const listen = useCallback(
    (locale: Locale = 'en-US') => {
      if (status === 'speaking' || status === 'paused') return;
      const Constructor = recognitionConstructor();
      if (!Constructor || !window.isSecureContext) {
        setErrorCode('unsupported');
        setError(
          'Speech recognition needs a supported browser on HTTPS or localhost. You can type your answer below.',
        );
        return;
      }
      clearRecognition();
      cancelSpeech();
      setError('');
      setErrorCode(null);
      setInterim('');
      let finalized = '';
      try {
        const active = new Constructor();
        recognition.current = active;
        active.lang = locale;
        active.continuous = false;
        active.interimResults = true;
        active.onresult = (event) => {
          if (recognition.current !== active) return;
          let live = '';
          finalized = '';
          for (let i = 0; i < event.results.length; i++) {
            if (event.results[i].isFinal) finalized += event.results[i][0].transcript + ' ';
            else live += event.results[i][0].transcript;
          }
          setInterim(live);
          if (finalized.trim()) callback.current(finalized.trim());
        };
        active.onerror = (event) => {
          if (recognition.current !== active) return;
          setErrorCode(event.error === 'aborted' ? null : event.error);
          if (event.error !== 'aborted')
            setError(
              errorMessages[event.error] ??
                'Speech recognition stopped unexpectedly. Try again or type your answer.',
            );
          clearRecognition();
          setInterim('');
          setStatus('idle');
        };
        active.onend = () => {
          if (recognition.current !== active) return;
          if (!finalized.trim())
            setError('No final transcript was received. Please try again or type your answer.');
          clearRecognition();
          setInterim('');
          setStatus('idle');
        };
        active.start();
        setStatus('listening');
        timeout.current = setTimeout(() => {
          if (recognition.current !== active) return;
          try {
            active.stop();
            timeout.current = setTimeout(() => {
              if (recognition.current === active) {
                clearRecognition();
                setInterim('');
                setStatus('idle');
                setError('The speech service timed out. Please try again or type your response.');
              }
            }, 3000);
          } catch {
            clearRecognition();
            setStatus('idle');
          }
        }, 15000);
      } catch {
        clearRecognition();
        setStatus('idle');
        setError('Could not start your microphone. Check permissions or type your answer.');
      }
    },
    [status, clearRecognition, cancelSpeech],
  );

  const finishListening = useCallback(() => {
    try {
      recognition.current?.stop();
    } catch {
      stop();
    }
  }, [stop]);
  const togglePause = useCallback(() => {
    if (!canSpeak) return;
    if (status === 'speaking') {
      window.speechSynthesis.pause();
      setStatus('paused');
    } else if (status === 'paused') {
      window.speechSynthesis.resume();
      setStatus('speaking');
    }
  }, [canSpeak, status]);
  const toggleMute = useCallback(() => {
    stop();
    setMuted((value) => !value);
  }, [stop]);

  useEffect(() => {
    if (!canSpeak) return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.addEventListener('voiceschanged', update);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update);
  }, [canSpeak]);
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) stop();
    };
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('pagehide', stop);
      document.removeEventListener('visibilitychange', onHidden);
      clearRecognition();
      cancelSpeech();
    };
  }, [stop, clearRecognition, cancelSpeech]);

  return {
    status,
    muted,
    error,
    errorCode,
    interim,
    supported,
    canSpeak,
    voices,
    missingLocales,
    voiceFor: (locale: string) => selectVoice(voices, locale),
    speak,
    listen,
    stop,
    finishListening,
    togglePause,
    toggleMute,
    clearError: () => {
      setError('');
      setErrorCode(null);
    },
  };
}
