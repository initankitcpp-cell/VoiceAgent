# Voca AI — Learn English in Your Own Language

**Learn English, one conversation at a time.** A working, browser-powered guided vocabulary voice tutor, built as a recruiter-ready prototype for an Apna Advantage application.

Voca uses curated lessons, transparent vocabulary checks, and the free LanguageTool API for sentence grammar, spelling, and punctuation feedback. It is not a generative LLM chatbot. There is no OpenAI dependency, API key, account system, database, or paid service required.

This upgrade extends the existing React/Vite application. The original 60 English words, five-word sessions, grammar checking, quizzes, progress key, dark dashboard, and animated orb are preserved. The new native-language layer adds onboarding, bilingual instruction, matching speech voices, guided translation and real-life practice, and an optional secure localization service.

## Indian language support

On first open, search and select a language, then choose Beginner, Intermediate, or Advanced. Returning users go straight to their workspace. **Settings · Change Language** updates preferences without deleting words or quiz history; changing level affects future sessions. Preferences use `voca-settings-v1`, separate from the unchanged `voca-progress-v1`.

| Language          | Native label | Requested locale | Bundled lessons                |
| ----------------- | ------------ | ---------------- | ------------------------------ |
| Hindi             | हिन्दी       | hi-IN            | All 60 words                   |
| Marathi           | मराठी        | mr-IN            | All 60 words                   |
| Kannada           | ಕನ್ನಡ        | kn-IN            | All 60 words                   |
| Tamil             | தமிழ்        | ta-IN            | Optional AI / English fallback |
| Telugu            | తెలుగు       | te-IN            | Optional AI / English fallback |
| Malayalam         | മലയാളം       | ml-IN            | Optional AI / English fallback |
| Bengali           | বাংলা        | bn-IN            | Optional AI / English fallback |
| Gujarati          | ગુજરાતી      | gu-IN            | Optional AI / English fallback |
| Punjabi           | ਪੰਜਾਬੀ       | pa-Guru-IN       | Optional AI / English fallback |
| Odia              | ଓଡ଼ିଆ        | or-IN            | Optional AI / English fallback |
| Assamese          | অসমীয়া      | as-IN            | Optional AI / English fallback |
| Urdu              | اردو         | ur-IN            | Optional AI / English fallback |
| Kashmiri          | کٲشُر        | ks-Arab-IN       | Optional AI / English fallback |
| Konkani           | कोंकणी       | kok-IN           | Optional AI / English fallback |
| Nepali            | नेपाली       | ne-IN            | Optional AI / English fallback |
| Sindhi            | سنڌي         | sd-Arab-IN       | Optional AI / English fallback |
| Dogri             | डोगरी        | doi-IN           | Optional AI / English fallback |
| Maithili          | मैथिली       | mai-IN           | Optional AI / English fallback |
| Manipuri (Meitei) | ꯃꯤꯇꯩꯂꯣꯟ      | mni-Mtei-IN      | Optional AI / English fallback |
| Bodo              | बड़ो         | brx-IN           | Optional AI / English fallback |
| Santali           | ᱥᱟᱱᱛᱟᱲᱤ      | sat-Olck-IN      | Optional AI / English fallback |
| Sanskrit          | संस्कृतम्    | sa-IN            | Optional AI / English fallback |

English explanations (`en-IN`) are also selectable. These locale tags are configuration, **not claims that a browser supports their audio**. Urdu, Kashmiri, and Sindhi text uses right-to-left direction. Punjabi currently requests Gurmukhi, Kashmiri/Sindhi Arabic, Meitei Meitei Mayek, and Santali Ol Chiki. Additional scripts/dialects can be added as separate configuration entries; no single dialect is assumed to cover every speaker.

The offline catalog contains 180 authored word-definition pairs across Hindi, Marathi, and Kannada, with native explanations, instructions, hints, feedback, and seven contextual translation prompts per language. English word meanings and examples remain visible. The content has been checked for completeness, script, locale, and consistency during implementation, but **no independent language educator has reviewed it**. Obtain native-speaker editorial review before presenting it as certified or professionally reviewed teaching material. AI translations are always labeled as unreviewed.

### Bilingual voice and conversation

- English words/examples use an English voice; native explanation segments use a matching native-language voice. Speech is queued in order, with cancellation and stale-callback protection. Pause/resume, stop, mute, and navigation cleanup are preserved.
- Voice detection uses `speechSynthesis.getVoices()` and `voiceschanged`. No matching language/script means that segment stays text-only; it is never read using an unrelated English voice. If another English regional voice is used, its actual name/locale is displayed. The list may fill asynchronously, and available voices depend on browser/OS/device. See [MDN voice discovery](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices).
- English exercise recognition requests `en-IN`. The optional native-language help tab requests the selected locale. The traditional browser API does not reliably enumerate all cloud recognition locales; a request can fail with `language-not-supported`, permission, or network errors. The app reports the failure and keeps typing available. Installed TTS voices do not prove recognition support.
- Native help is explicitly guided: type/say **1** (meaning), **2** (English example), or **3** (hint), or use supported Hindi/Marathi/Kannada help keywords. Native help is never sent to English grammar checking or graded as English speaking practice. Arbitrary questions get an honest guided-help response, not a fabricated AI answer.
- Bilingual messages retain their original language tags when you change preferences mid-session. Pending grammar/localization work is canceled or ignored when no longer relevant. Changing language does not erase the current English word, session position, or saved progress.

### Optional real-life practice

Select **Daily Conversations, Job Interviews, Workplace English, Customer Service, Travel, or Business Communication** on the existing welcome dashboard. Vocabulary essentials remains the default. These categories provide contextual translation and question prompts relevant to college, commuting, interviews, team tasks, orders, train tickets, and email.

The lesson's **Practice mode** selector keeps the original repetition, original-sentence, and meaning exercises and adds:

- **Translate to English:** translate the displayed native-language prompt. A transparent check normalizes punctuation/case and matches a small set of authored English reference answers. Other correct translations may not match; this is explained, and a reference answer is available. This mode is disabled if native text is unavailable.
- **Real-life English question:** answer a contextual question using at least four English words. LanguageTool checks the submitted text. Relevance, intended meaning, and pronunciation are not assessed.

Extra contextual practice does not mark the unrelated current vocabulary word as learned. Vocabulary credit still comes from core word exercises. The same five-word quiz and summary remain available.

## Optional server-side AI lesson localization

**Not required for Hindi, Marathi, Kannada, or English.** Without configuration, other languages show an explicit English fallback and a retry control. No untranslated English is labeled as native instruction.

The backend accepts only `{languageId, wordId, categoryId}` for known catalog entries. It sends curated lesson content—not the learner's transcript or audio—to a configured OpenAI-compatible chat-completions provider. It requests JSON and validates identity, native-script fields, instruction keys, and size before returning a lesson. This is structural validation, not proof of translation quality. There is no semantic-assessment LLM endpoint; response validation remains transparent as described above.

To configure locally:

1. Copy `.env.example` to `.env.local` (`Copy-Item .env.example .env.local` in PowerShell).
2. Create a provider API key. The example targets [Groq's API](https://console.groq.com/docs/quickstart), which offers a rate-limited free plan; availability and model limits can change. Select a model with suitable language support and JSON object mode. The example model is documented in [Groq's JSON output guide](https://console.groq.com/docs/structured-outputs).
3. Fill these **server-only** values in `.env.local`:

   ```dotenv
   LOCALIZATION_BASE_URL=https://api.groq.com/openai/v1
   LOCALIZATION_MODEL=llama-3.3-70b-versatile
   LOCALIZATION_API_KEY=your-provider-key
   ```

4. Restart `npm run dev`. Vite provides the same-origin `/api/localize` middleware for local development and preview. `GET /api/localize` reports only `{configured: true|false}`. A missing configuration gives HTTP 503 on lesson requests.

Never prefix secrets with `VITE_`, put them in React files, or commit `.env.local`. `.env` variants are ignored; `.env.example` contains no secret. The browser only calls your own `/api/localize` endpoint; provider authorization stays on the server.

The server caches up to 500 validated lessons for 24 hours and deduplicates in-flight requests; the browser keeps up to 150 translations in tab memory. IDs plus source content, language, category, provider URL, and model form the server cache key. Invalid/partial responses and provider failures return HTTP 502, rate limits HTTP 429, and missing configuration HTTP 503. The client has a timeout and explicit English fallback. No fake translation is synthesized after failure.

Requests require the same origin and known fields/IDs; the client cannot supply a provider URL or arbitrary prompt. A bounded, best-effort in-memory per-IP limit allows 30 uncached requests/hour per warm server instance. Serverless instances do not share that counter or cache. For a broad public rollout, add hosting-level durable rate limiting and provider spending limits; this endpoint is public, not authenticated. A provider key was not supplied in this workspace, so live LLM output is not claimed as verified; automated provider tests use HTTP fixtures.

### Deploy the optional backend

- **Vercel:** keep the existing Vite settings. `api/localize.ts` is the Node.js function; set the three `LOCALIZATION_*` variables in the project's environment settings and redeploy. The code uses native fetch/Request/Response on Node 22+. [Vercel Node function documentation](https://vercel.com/docs/functions/runtimes/node-js).
- **Netlify:** `netlify/functions/localize.ts` exposes `/api/localize`, with esbuild configured in `netlify.toml`. Set the same three variables with Functions scope and deploy the repository. [Netlify function documentation](https://docs.netlify.com/build/functions/get-started/).
- A manual upload of `dist` alone includes the frontend and bundled lessons, **not the localization function**. It will show an English fallback for unbundled languages. HTTPS is required for shared microphone access, and browser/OS voice availability still varies.

Automated tests mock provider requests and browser speech APIs. Validate installed voice quality, microphone recognition, regional variants, and generated translation quality manually on intended devices. No pronunciation accuracy or human-review status is fabricated.

## Run locally

Use Node.js **22.12+** (Node 22 LTS recommended) and npm.

```powershell
cd "C:\Users\KIIT\Desktop\Voice Agent"
npm install
npm run dev
```

Open **http://127.0.0.1:5173** in your browser. Vite prints the actual port if that port is in use. Localhost is a secure-context exception suitable for development; a plain HTTP LAN address is not. Use HTTPS for a shared deployment.

```sh
npm run build     # TypeScript check and production bundle in dist/
npm run preview   # Serve the production bundle locally (usually port 4173)
npm test          # Unit tests: engine, persistence, and simulated speech lifecycle
npm run test:e2e  # Browser tests using installed Google Chrome
```

The browser tests require Google Chrome. If it is not installed, install it normally or run `npx playwright install chrome`. No browser installation is necessary to use the application itself.

## Give a two-minute demo

1. On first open, choose a language and level. Pick an optional category, then click **Start Learning** on the existing dashboard. The user click starts narration using available matching voices.
2. Listen to the word, meaning, example, and prompt. **Pause**, **Resume**, **Stop**, **Repeat**, and **Mute** operate the real browser speech API.
3. After narration ends, click the microphone and allow microphone access. Speak, then let recognition finish or click the microphone again to finish. Interim text appears in the conversation; the final transcript appears in the editable response field.
4. Review or correct the transcript and click the send icon (or press Enter) to check it. Shift+Enter inserts a new line. Typed responses run the exact same checks.
5. Try an incorrect response to see feedback. Ask for a hint or edit and retry. Continue through five words, including a multiple-choice meaning exercise.
6. Finish the five-question quiz to see actual results. Open **My vocabulary** or **My progress**. Refresh to demonstrate persistence.

If the speech service is unavailable during the demo, type your responses. The entire lesson, quiz, and progress flow still works.

## Test your microphone

- Open the app in an up-to-date Chrome or Edge browser on a computer, using localhost or an HTTPS deployment. Support depends on browser, OS, and installed speech services; feature detection alone cannot guarantee a working provider.
- Let the tutor finish or press **Stop** before using the microphone. Listening is disabled while speech is playing or paused, and synthesis cancels active recognition.
- Click the microphone, grant access, and say the displayed word. You should see **Listening**, interim text if the service supplies it, and an editable final transcript.
- If permission was denied, open the browser's site information/permissions, allow the microphone, and retry. Confirm your OS allows the browser to use the microphone and that the correct input device is selected.
- Network errors, missing devices, no speech, denied permissions, and unavailable APIs produce visible guidance. Some browsers use a remote recognition service and need internet access. Headphones reduce sound leakage.
- If you see a speech-service connection error inside VS Code, Brave, or another preview/browser, open the localhost URL directly in a standalone Google Chrome window and retry. API detection does not guarantee access to a recognition provider. A speech-service network error can occur while ordinary websites still load. Check network restrictions or try another connection if Chrome has the same issue. Use **Retry microphone** to start a fresh attempt, or **Type instead** to focus the text response without losing the lesson.
- Test **Pause/Resume**, **Mute**, and navigation during playback. Leaving the learning view, hiding the tab, navigating away, or unmounting cancels active voice work.

**Verification limit:** automated tests simulate speech events to verify lifecycle behavior; they do not measure real microphone capture, recognition quality, pronunciation, or provider availability. Test those manually on the device used for the demo.

## What the tutor actually evaluates

| Exercise             | Check                                                                                                              | What it does not measure                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Repeat a word        | The normalized response contains the exact target as a whole word.                                                 | Pronunciation accuracy or speech quality.                               |
| Use it in a sentence | Exact word, at least four English word tokens, and a completed LanguageTool check with no reported writing issues. | Pronunciation, intended meaning, or guaranteed grammatical correctness. |
| Choose a meaning     | The selected option matches the curated definition.                                                                | Open-ended semantic understanding.                                      |
| End-of-session quiz  | Number of correct selections out of five.                                                                          | Fluency, vocabulary mastery, or proficiency level.                      |

The local target-word check ignores case and punctuation. Inflections and synonyms are not accepted in place of the target word; this deliberate limitation is explained in feedback. LanguageTool checks the original submitted text, including punctuation and capitalization. It finds common errors, rather than proving grammatical correctness. A nonsensical sentence can still pass, so the app explicitly avoids claims of semantic validation.

## Free grammar API

Sentence exercises call **`POST https://api.languagetool.org/v2/check`** with `language=en-US` directly from the browser. No registration or secret key is required. The same service checks typed sentences and reviewed speech transcripts; it evaluates text, not speech audio.

- Press Send to check a sentence. First, local checks confirm the target word and minimum length. Valid sentence submissions then show a real checking state while LanguageTool responds.
- Issues include the provider's explanation, affected text, category, and replacement options. **Use suggested sentence** copies the first nonoverlapping suggestions into the response field; review them and send again to recheck. Applying suggestions alone does not pass the exercise.
- “No writing issues found” means the API returned a complete, valid response with no matches. It does not mean the sentence is guaranteed correct. Pronunciation and intended meaning are not measured.
- Any reported writing issues keep the sentence open for revision. Failures, timeouts, malformed/incomplete responses, and rate limits remain **Grammar not checked**, with no practiced-word credit for that sentence. Retry later or use Skip word to continue.
- Checks run only on explicit submissions, never on every keystroke or in the background. Requests have a 12-second timeout, at least 3.5 seconds between uncached submissions, a 60-second cooldown after HTTP 429, and an in-memory cache of up to 50 sentence results. Navigation and leaving/hiding the tab cancel pending checks; late responses cannot complete another exercise.
- This free endpoint currently documents peak limits of 20 requests per IP/minute, 75 KB of text per IP/minute, and 20 KB per request. Voca limits each response to 1,000 characters. Limits and service availability may change; the public service has no SLA. See [LanguageTool's public API rules](https://dev.languagetool.org/public-http-api.html).
- Submitted sentences are sent to LanguageTool. Attribution and a [privacy-policy link](https://languagetool.org/legal/privacy) appear beside sentence submission and results. Audio is not sent to LanguageTool. Voca does not persist sentence text in localStorage; session transcripts and the grammar cache remain in tab memory.

No automated test or polling job should call the public service. Tests intercept HTTP or mock fetch; perform occasional manual integration checks only. For sustained/high-volume usage, self-host LanguageTool or obtain provider-approved API access.

“Practiced” means a response passed one of these checks. Skipping or failing an exercise does not mark the word practiced. Successful practice is saved immediately, including if a session is left early. A completed-session record is saved only after all five quiz questions are answered. Scores are computed from the user's selections; none are fabricated.

## Vocabulary and progress

- 60 curated words: 20 per level, each with a part of speech, simple meaning, example, usage hint, and three-option quiz.
- Five unique words per session. Unseen words are prioritized; when a level is exhausted, least recently practiced words return first. Skipped words remain eligible.
- localStorage key: `voca-progress-v1`. Stores practiced word IDs, recency order, and the most recent 100 session records (date, level, practiced words, actual quiz score, elapsed time).
- Progress belongs to this browser and origin. It does not sync across devices, browser profiles, ports, or domains. Private browsing and cleared site data can remove it. Blocked or full storage shows a warning and allows practice to continue in memory.
- Reset progress is available in **My progress**, with an explicit confirmation.
- Voca does not record or store audio. Sentence submissions are sent directly to LanguageTool for checking. The optional localization backend handles curated lesson IDs only. The browser/OS speech provider may process audio remotely. See [MDN's SpeechRecognition documentation](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

## Browser compatibility

| Capability               | Behavior                                                                                                                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recognition              | Feature-detects `SpeechRecognition` / `webkitSpeechRecognition` and requires a secure context. Browser support is limited and provider access varies. Try Chrome or Edge desktop first, but verify recognition on your specific device. |
| Text-to-speech           | Uses `speechSynthesis` and available English voices, preferring a local voice. Voice quality and pause support vary by browser/OS. Text remains available when playback fails or is muted.                                              |
| Typed mode               | Full lesson and quiz flow in modern browsers without microphone permissions.                                                                                                                                                            |
| Responsive/accessibility | Mobile navigation, semantic controls, keyboard responses, visible focus, live feedback, dialog focus handling, reduced-motion support, and accessible labels.                                                                           |

This is a deployable MVP, not a guarantee of identical speech behavior on all devices. Firefox and browsers without recognition can use typed practice. The app does not request experimental on-device language packs.

## Publish on Vercel and get a public URL

The repository contains `vercel.json`; the frontend builds to `dist`. No environment variables or secrets are needed for bundled lessons, English fallback, or LanguageTool grammar checks. Broader AI lesson localization additionally requires the server function and the three server-only variables documented above. See [Vercel's official Vite deployment guide](https://vercel.com/docs/frameworks/frontend/vite).

### Option A — Vercel dashboard

1. Create a GitHub repository and push the contents of this project (exclude `node_modules` and `dist`; `.gitignore` already does).
2. Sign into Vercel, select **Add New → Project**, and import that repository.
3. Set the root directory to the directory containing `package.json` (repository root if you upload this folder's contents).
4. Use framework preset **Vite**, install command **npm ci**, build command **npm run build**, and output directory **dist**. Select Node.js **22.x** or a supported newer version.
5. Click **Deploy**. Vercel returns an HTTPS URL such as `https://your-project.vercel.app`.
6. In project settings, review **Deployment Protection** and ensure the production deployment can be opened by recruiters without signing into your Vercel account. Verify the link in a signed-out/private window before submitting.
7. Test a microphone response and typed response at that HTTPS URL. Progress on localhost will not transfer to the new origin.

### Option B — Vercel CLI

Run from this project directory:

```sh
npx vercel login
npx vercel --prod
```

Follow the prompts to link/create a project, use this directory, accept the Vite settings, and deploy. The CLI prints the resulting production URL. No Vercel deployment has been made as part of the local build; publishing requires your Vercel account.

### Netlify alternative

Import the same repository, use build command `npm run build` and publish directory `dist`, or upload the built `dist` folder using Netlify's manual deploy. `netlify.toml` includes these settings. Verify public access and use the HTTPS URL for the microphone.

## Project structure

```text
src/
  App.tsx                    App shell, session orchestration, quiz, and progress
  components/                Dashboard, lessons, grammar results, orb, help dialog
  styles.css                 Responsive dark theme, orb animation, reduced motion
  data/vocabulary.ts         Typed 60-word curated vocabulary and quiz bank
  hooks/useVoice.ts          Browser API lifecycle, permissions, cancellation
  hooks/useGrammarCheck.ts   Pending grammar requests and navigation cancellation
  lib/grammar.ts             Free API client, limits, validation, and suggestions
  lib/engine.ts              Conversation reducer, selection, rule validation
  lib/storage.ts             Validated versioned progress and persistence
  **/*.test.ts[x]            Unit and simulated speech lifecycle tests
tests/                      Browser tests with mocked grammar/voice services
vercel.json                 Static Vite build and response headers
netlify.toml                Alternative static hosting configuration
```

The conversation reducer explicitly separates welcome, practice, quiz, and summary phases. Voice state is separate: idle, listening, speaking, and paused. Sentence submission shows a checking state during the actual grammar HTTP request. The reducer requires a matching completed grammar result before accepting a sentence. Recognition handlers are detached before aborting, old synthesis callbacks are invalidated, and timeouts prevent browser services from blocking practice indefinitely. No artificial AI requests or loading delays are used.

For production beyond this MVP, add cross-device accounts only if needed, content review with language educators, broader device testing, and an explicitly scoped pronunciation or semantic assessment service if those capabilities become requirements.
