# MediCare Voice

**Understand Your Medicine. Remember Your Schedule. Stay Safe.**

A local-first healthcare platform built around elderly medication safety, with
three roles in one app:

* **Patient** — opens on a **Digital Wellbeing** dashboard: a wellbeing score
  built from movement, sleep, water, mood and medication, a one-tap mood check-in,
  a guided breathing exercise, and AI insights drawn from their own records. From
  there: scan a medicine, check expiry against the prescription, get reminded at
  dose time, find a doctor, book appointments and keep health records.
* **Doctor** — today's clinic queue, the full patient record with adherence
  broken down per medicine, consultation notes, prescriptions, target ranges.
* **Hospital desk** — live appointment board, booking confirmations, a digital
  patient registry, and a **follow-ups to call** list: patients a doctor asked
  back who have nothing booked. The desk can send them a reminder or book on their
  behalf, and the alert clears itself once a booking exists.

> ### Prototype honesty statement
> The medicine-recognition step runs on a **Demo Recognition Engine** backed by a
> local sample-pack table. **There is no trained model in this build**, and the app
> says so on the scan screen, the result screen and in Settings. Everything else —
> accounts, appointments, digital records, prescriptions, expiry arithmetic,
> scheduling, reminders, insights, voice, storage, translations — is real code
> doing real work.

---

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open the printed URL (default <http://localhost:5173>); serve to a phone with
`npm run dev -- --host`. Camera and microphone need `https://` or `localhost`;
without them the app falls back to the sample-pack picker and typed input.

**Demo accounts** — one tap on the sign-in screen. Password for all: `demo1234`

| Account | Role | What you see |
|---|---|---|
| `kamala@demo.health` | Patient | 68-year-old with 14 days of medication history, appointments, vitals, mood diary |
| `anitha@demo.health` | Doctor | Today's clinic, 4 patients, consultation and prescribing |
| `admin@demo.health` | Hospital desk | Appointment board, pending requests, patient registry |

**Google Sign-In** is optional and real: copy `.env.example` to `.env.local`, add a
Google OAuth **Web application** client id, and the genuine Google account chooser
appears. Without it the app runs on email accounts and states plainly that Google
sign-in is not configured.

---

## Demo script (3 minutes)

1. **Sign in as Kamala.** The app opens on **Digital Wellbeing**: a score out of
   100 with its week-over-week trend, today's steps/sleep/water/doses, a one-tap
   mood check-in, and live insights — *expired medicine at home*, *the 8:00 PM dose
   is the one most often missed (70% taken)*, *Metformin: about 5 days left*.
2. **Wait a moment** — the reminder overlay fires for the overdue dose:
   Taken / Not Taken / Remind Me Later, all stored locally.
3. **Visits → Book an appointment.** Pick Dr. Ravi Shankar — notice the day strip
   only offers his clinic days, and taken slots are struck through.
4. **Health records → Prescriptions.** Tap *Add to my schedule* on the cardiologist's
   prescription; it appears in Today's Schedule as a real dose slot.
5. **Tap "What went into it"** on the score to see the five pillars break down,
   then **Breathing exercise** for a paced one-minute exercise.
6. **How I feel** — three low days in a row surfaces a supportive card with a
   support line, never a diagnosis.
7. **More → Demo Mode** runs the five medicine-scanning scenarios
   (correct, expired, wrong medicine, wrong strength, missed reminder).
8. **Sign out → sign in as Dr. Anitha.** Same data, different lens: the clinic
   queue, then *Patients → Open record* for Kamala's adherence per medicine, vitals
   against her target range, notes and prescriptions. *Start consultation* writes a
   note and issues a prescription that lands back on the patient's screen.
9. **Sign in as the hospital desk.** The appointment you booked earlier is sitting
   in *Awaiting confirmation*. Above it, **Follow-ups to call** lists Meenakshi
   Iyer (overdue by a week) and Arun Prasad (due in two days) — both asked back by
   a doctor with nothing booked. Hit **Send reminder**.
10. **Sign in as `meenakshi@demo.health`.** The bell shows a badge; the inbox has
   the desk's message with a **View** link straight into booking. Book a slot, go
   back to the desk, and her follow-up alert is gone — because the alert is derived
   from the data, not a task someone has to tick off.
11. **Register a new doctor** (Create account → Doctor). Sign back in as any
    patient and open **Doctors**: the new doctor is listed with a *New* badge and
    is immediately bookable.

Settings → **Reset demo data** puts everything back.

---

## Project structure

```
src/
├─ core/                      no React, no DOM
│  ├─ auth/                   AuthService, PBKDF2 crypto, GoogleAuthProvider
│  ├─ clinic/                 AppointmentService (slots, rules, queues, stats)
│  ├─ insights/               InsightsEngine   <- swap point (health model)
│  ├─ notifications/          derived alerts + sent messages, one inbox
│  ├─ recognition/            MedicineRecognitionEngine <- swap point (CV model)
│  │                          MockRecognitionEngine, OnDeviceRecognitionEngine
│  ├─ ocr/                    OcrEngine <- swap point; real field parsing
│  ├─ voice/                  SpeechEngine <- swap point; IntentEngine, Assistant
│  ├─ pipeline/               ScanPipeline
│  ├─ verification/           expiry maths + schedule comparison
│  ├─ scheduler/              occurrences, due/missed, adherence
│  ├─ wellness/               activity, sleep, mood aggregates + WellbeingScore
│  ├─ camera/                 getUserMedia + frame capture
│  ├─ storage/                Database (one local JSON doc) + demo seed
│  └─ i18n/                   en / ta / hi
├─ app/                       AppState, Navigator + route guard, Reminders, useSpeech
├─ ui/
│  ├─ components/             Screen, kit (charts, tables, stats), Icon, overlays
│  └─ screens/{auth,patient,doctor,hospital}
└─ styles/                    global.css (tokens, elderly base) + app.css (product)
```

`ARCHITECTURE.md` has the layer diagram, data models, routing rules and the
insights-engine specification.

---

## 1. What is currently functional

**Accounts and roles** — email sign-up/sign-in with PBKDF2-SHA256 password hashing
(150k iterations, per-account salt, via WebCrypto); real Google Identity Services
integration when configured; a multi-step sign-up that collects role-appropriate
details (patient health profile, doctor registration/practice details); a route
guard that keeps each role inside its own screens.

**Appointments** — availability windows per doctor, slot generation by
`slotMinutes`, past-slot and double-booking rejection, working-day filtering, the
full status lifecycle (requested → confirmed → checked in → completed, plus
cancelled and no-show), patient booking, doctor queue, hospital board and stats.

**Digital records** — vitals with charts and doctor-set target bands, consultation
notes on a timeline, prescriptions that the patient can pull into their own
medication schedule in one tap.

**Medication safety** — real expiry arithmetic, schedule verification with
unit-converting strength comparison, OCR field extraction, frequency expansion,
dose status resolution, reminders with snooze, and stock decrement on each dose
taken so refill forecasts stay honest.

**Digital wellbeing** — the patient's landing screen: a five-pillar wellbeing
score (movement, sleep, hydration, mood, medication) with a week-over-week trend
and a full breakdown, one-tap mood check-in, activity/sleep/water logging with
goals and streaks, and a paced breathing exercise. Pillars with no data are
excluded from the score rather than counted as zero.

**Notifications** — one inbox per role, fed by derived alerts (follow-up due,
booking awaiting confirmation, visit tomorrow) and messages the desk actually
sent. The desk's *follow-ups to call* list finds patients a doctor asked back who
have nothing booked; sending a reminder delivers it to that patient's inbox, and
the alert disappears on its own once a booking exists.

**Doctor directory** — patients see every registered doctor with speciality, fee,
languages and the next clinic day. A doctor who signs up appears for every patient
immediately, flagged *New* for two weeks.

**Insights** — a deterministic rules engine over the patient's own data:
adherence risk with the worst time-of-day named, refill forecast, expiry sweep,
vitals against the doctor's range, activity and sleep trends, low-mood support
prompt, upcoming-checkup reminder, hydration nudge, sleep-consistency check,
step streaks, an observed sleep-and-mood pattern, and the wellbeing score trend.

**Wellness and mental wellbeing** — steps/sleep/water/active-minutes logging with
goals, streaks and 7-day charts; a mood, stress and sleep-quality diary with a
supportive (never diagnostic) response to a run of low days.

**Voice** — browser speech recognition and text-to-speech, a deterministic
keyword/regex intent engine in three languages, answered from live app state.

**Platform** — local-first storage with no backend and no network calls; English,
Tamil and Hindi with per-key English fallback; 20 px base text scalable to 26 px,
64 px touch targets, high-contrast theme; responsive from a 360 px phone to a
desktop workspace with a side rail.

## 2. What is simulated

| Simulated | What actually happens | Where |
|---|---|---|
| Medicine recognition from pixels | The engine ignores the image. A chosen sample pack returns at 94% confidence; a free camera capture derives a pack from a hash of the frame and returns it **below** the confidence threshold, so the UI shows "could not identify — choose the pack" instead of faking certainty. | `core/recognition/MockRecognitionEngine.ts` |
| Text detection from pixels | The OCR engine receives the sample pack's printed lines instead of reading the photo. The field parsing that follows is production logic. | `core/ocr/MockOcrEngine.ts` |
| Inference latency | ~650 ms recognition + ~350 ms OCR, so the progress UI is honest about timing. | both mock engines |
| Sample pack images | Drawn as SVG from the sample data — deliberately not photographs of real products. | `medicineDatabase.ts` |
| Notifications | An in-app overlay on a 15-second tick, not an OS notification that can wake the device. | `app/Reminders.tsx` |
| Google ID token verification | The token is decoded client-side to read the profile. Production must verify it server-side. | `core/auth/GoogleAuthProvider.ts` |
| Account storage | Accounts live in `localStorage` on the device. Real deployment moves them behind a server. | `core/storage/Database.ts` |
| Clinical content | Four fictional patients, three fictional doctors, one fictional hospital. Not a drug database, and no clinical guidance anywhere. | `core/storage/seedDemo.ts` |

## 3. Where the custom AI model will be integrated

```ts
// src/core/recognition/MedicineRecognitionEngine.ts
interface MedicineRecognitionEngine {
  readonly id: string;
  readonly displayName: string;   // shown to the user
  readonly isSimulated: boolean;  // drives the "Demo Recognition Engine" banner
  readonly confidenceThreshold: number;
  initialize(): Promise<void>;
  // -> { medicineName, strength, dosageForm, confidence }
  recognize(input: RecognitionInput): Promise<EngineRecognition>;
  dispose(): Promise<void>;
}
```

`OnDeviceRecognitionEngine.ts` is the skeleton with the three implementation steps
marked. When the model is ready:

```ts
setRecognitionEngine(
  new OnDeviceRecognitionEngine({ modelPath: 'medicare_v1.dlc', delegate: 'dsp' }),
);
```

Nothing else changes, and the honesty banner disappears on its own because
`isSimulated` becomes false. The same pattern replaces OCR (`setOcrEngine`),
speech (`setSpeechEngine`) and the health-intelligence layer
(`setInsightsEngine`) — independently and in any order.

## 4. How this becomes an Android application

1. **PWA / TWA (days).** Web manifest, icon, portrait orientation and local-first
   data are already in place. Add a service worker, wrap in a Trusted Web Activity.
   Limitation: background alarms are weak, so reminders only fire while the app is
   open.
2. **Capacitor (1–2 weeks, recommended for a pilot).** Same codebase, native shell,
   plus `@capacitor/local-notifications` for alarm-backed reminders,
   `@capacitor/camera`, SQLite storage, and a custom plugin exposing the TFLite/QNN
   model to `OnDeviceRecognitionEngine`.
3. **Native Kotlin (best on-device story).** `core/` is framework-free and ports
   file by file: `MedicationScheduler`, `VerificationEngine`, `AppointmentService`
   and `InsightsEngine` are pure functions; `Database` → Room; `CameraService` →
   CameraX; `Reminders` → AlarmManager + notification channel; `WebSpeechEngine` →
   `SpeechRecognizer`/`TextToSpeech`; i18n bundles → `values-ta` / `values-hi`.
   Only `ui/` is rewritten in Compose.

Either way, accounts and clinical records must move behind a real backend with
server-side auth before any pilot with real patients — the local-first design keeps
that a repository-layer change.

## 5. Optimising recognition for Snapdragon on-device inference

1. **Scope it.** Not a general drug classifier — a closed-set classifier over the
   pack designs enrolled for the pilot, with the OCR path carrying the variable
   data (strength, expiry, batch).
2. **Small backbone.** MobileNetV3-Small or EfficientNet-Lite0 at 224×224, trained
   with augmentation for the real failure modes: blister glare, low indoor light,
   motion blur, partial packs, tilt, and shaky elderly framing.
3. **INT8 post-training quantisation** on a representative set of real phone
   captures; expect ~4× smaller and 2–3× faster, and verify top-1 loss stays within
   about 1%.
4. **Convert for the target runtime.** TFLite → Qualcomm AI Engine Direct (QNN) /
   SNPE `.dlc`, run on the **HTP/NPU** delegate with GPU → CPU fallback;
   `OnDeviceEngineOptions.delegate` already carries the choice.
5. **Keep the pipeline cheap.** Feed the YUV camera frame directly (no JPEG
   round-trip), letterbox rather than stretch, reuse a pinned input buffer, warm the
   interpreter in `initialize()`.
6. **Recognition and OCR over the same frame** on separate threads, cached by frame
   hash so a held-still pack is not re-inferred every frame.
7. **Keep the confidence threshold and the "choose the pack" fallback.** In a
   medication app a low-confidence answer must become a question, never a claim.
8. **Measure on the shipping device** — p50/p95 latency, thermal throttling across a
   30-scan session, battery per 100 scans, accuracy by lighting condition.

---

---

## Publishing

The same source ships as a web app and an Android app.

### Web — GitHub Pages

`.github/workflows/deploy-web.yml` builds and publishes on every push to `main`.

**One-time setup:** repo **Settings → Pages → Source: GitHub Actions**. Until you
do that the workflow will fail on the deploy step.

Live at: <https://dharaneesh-m-oss.github.io/medicare_voice/>

The build uses a **relative** base (`./`), so the same `dist/` works served from
a domain root (Vercel, Netlify), from a repo subpath (Pages) and from inside the
APK. An absolute base can only be right for one of those and silently 404s every
asset on the others — which looks like a blank white page with no error.

That is only safe because this app never changes the URL path: navigation is a
screen stack and `history.pushState(state, '')` is called without a URL. If real
client-side routes are ever added, the base has to become per-target again.

To enable real Google Sign-In on the published site, add a repository secret
`VITE_GOOGLE_CLIENT_ID` (Settings → Secrets and variables → Actions) with a
Google OAuth **Web application** client id whose authorised origin is
`https://dharaneesh-m-oss.github.io`. Without the secret the site runs on email
accounts and says plainly that Google sign-in is not configured.

### Web — Vercel

Import the repo at [vercel.com/new](https://vercel.com/new). `vercel.json` pins
the framework, build command and output directory, so no dashboard configuration
is needed; every push to `main` redeploys.

### Android — Capacitor

Capacitor wraps the same built bundle in a native shell
(`capacitor.config.ts`, app id `in.medicarevoice.app`).

`.github/workflows/build-android.yml` builds a **debug APK** on every push to
`main`, and publishes it to a GitHub release on every `v*` tag.

**Direct download (no GitHub account needed):**
<https://github.com/dharaneesh-m-oss/medicare_voice/releases/latest/download/MediCare-Voice.apk>

The asset filename is kept constant so that link stays valid for every future
version. To cut a new one: `git tag v0.2.0 && git push --tags`.

To install on the phone: transfer the APK and allow "install from unknown
sources". A debug APK is signed with a throwaway debug key — fine for
sideloading onto the iQOO for testing, **not** acceptable for Play distribution.
Release signing needs a keystore stored as repository secrets.

Locally, with Android Studio installed:

```bash
npm run build:app
```

```bash
npm run open:android
```

The first command builds the web bundle and copies it into the native project;
the second opens it in Android Studio to run on a device.

The APK is self-contained — the whole app ships inside it and makes no network
calls — so it runs with no server and no internet.

### Known limitation carried into both builds

Reminders still fire only while the app is open — they run on an in-app timer,
not `AlarmManager`. Making them reliable on Android means adding
`@capacitor/local-notifications` and scheduling from
`MedicationScheduler.getPendingReminders()`; the decision logic does not change,
only the delivery mechanism.

## Safety

MediCare Voice does not diagnose, does not prescribe, does not suggest dosage
changes and never tells anyone to stop a prescribed medicine. It reports what it
observed and how that compares with what a clinician recorded, and every warning
ends with **"Please verify with your doctor or pharmacist."** The wellbeing diary
is explicitly a personal diary, not a screening instrument. This is a prototype and
is not a medical device.

## Languages

English, Tamil and Hindi ship, with per-key English fallback — patient-facing
screens are fully translated; some doctor/hospital form labels fall back to English
and are safe to translate incrementally.

To add a language: copy `src/core/i18n/en.ts`, translate the values, add a row to
`LANGUAGES` in `src/core/i18n/index.ts`, and optionally add a keyword block to
`KEYWORDS` in `src/core/voice/IntentEngine.ts` for voice commands. No component,
engine or screen changes.
