# MediCare Voice — Architecture

> **Understand Your Medicine. Remember Your Schedule. Stay Safe.**
>
> A local-first healthcare platform with three roles — **patient**, **doctor**,
> **hospital desk** — built around elderly medication safety.
>
> Status: **working prototype**. One thing is deliberately simulated: the
> medicine-recognition step runs on a **Demo Recognition Engine**, not a trained
> model, and the app says so on screen. Everything else — accounts, appointments,
> digital records, prescriptions, expiry maths, schedules, reminders, insights,
> voice, translations — is real, running code.

---

## 1. Layering

```
                 +---------------------------------------------------+
                 |                     UI LAYER                      |
                 |  ui/screens/{auth,patient,doctor,hospital}         |
                 |  ui/components  (Screen, kit, Icon, overlays)      |
                 |  renders state, dispatches actions, no logic       |
                 +-----------------------+---------------------------+
                                         |
                 +-----------------------v---------------------------+
                 |                APPLICATION LAYER                  |
                 |  app/AppState    one database + every write       |
                 |  app/Navigator   screen stack + role route guard  |
                 |  app/Reminders   dose reminder tick               |
                 |  app/useSpeech   binding to the voice engine      |
                 +-----------------------+---------------------------+
                                         |
   +-------------------------------------v-----------------------------------+
   |                              CORE / DOMAIN                              |
   |                          (no React, no DOM)                             |
   |                                                                         |
   |  auth/        AuthService, crypto (PBKDF2), GoogleAuthProvider           |
   |  clinic/      AppointmentService  slots, booking rules, queues, stats    |
   |  insights/    InsightsEngine      <- SWAP POINT (health model)           |
   |  notifications/ NotificationService derived alerts + sent messages       |
   |  wellness/    WellbeingScore      five-pillar digital wellbeing score    |
   |  recognition/ MedicineRecognitionEngine <- SWAP POINT (CV model)         |
   |  ocr/         OcrEngine           <- SWAP POINT (on-device OCR)          |
   |  voice/       SpeechEngine        <- SWAP POINT (multilingual ASR/TTS)   |
   |               IntentEngine, AssistantService                             |
   |  pipeline/    ScanPipeline        camera -> recognition -> OCR -> verify |
   |  verification/VerificationEngine  expiry maths + schedule comparison     |
   |  scheduler/   MedicationScheduler occurrences, due/missed, adherence     |
   |  wellness/    WellnessService     activity, sleep, mood aggregates       |
   |  camera/      CameraService       getUserMedia + frame capture           |
   |  storage/     Database            one local JSON document + selectors    |
   |  i18n/        en / ta / hi bundles, t(key, params)                       |
   +-------------------------------------------------------------------------+
```

Rules that keep the layers honest:

* `core/` never imports React and never imports from `ui/`.
* UI never touches `localStorage`, `getUserMedia`, `speechSynthesis` or `crypto`.
* Every replaceable capability sits behind an **interface + registry**.
* No user-visible string is hardcoded in a component — everything goes through `t()`.
* All writes go through `AppState` actions, so persistence stays in one place.

---

## 2. Roles and routing

| Role | Home | Sections | Shell |
|---|---|---|---|
| `patient` | `home` (Digital Wellbeing) | Wellbeing, Medicines, Visits, Doctors, More | phone frame, bottom tabs, elderly density |
| `doctor` | `doctor_home` | Dashboard, Patients, More | workspace, side rail on desktop, dense tables |
| `hospital_admin` | `hospital_home` | Overview, Visits, Patients, Doctors, More | workspace, side rail on desktop |

`app/Navigator` is a **screen stack**, not a URL router — every screen has exactly
one visible way back, and the browser/hardware back button is wired through
`popstate`. `App.tsx` holds a **route guard**: `ALLOWED[role]` lists the screens a
role may open, and anything else bounces to that role's home. Sign-in and sign-out
therefore never need to navigate — they change the session and the guard follows.

---

## 3. Data model (`core/*/types.ts`)

**Identity** — `Account` (role, email, provider, PBKDF2 hash) with one profile per
role: `PatientProfile`, `DoctorProfile`, `Hospital`. `Session` binds an account to
its `patientId` / `doctorId` / `hospitalId`.

**Clinic** — `Appointment` (date, time, mode, status lifecycle
`requested → confirmed → checked_in → completed`, plus `cancelled` / `no_show`),
`ClinicalNote`, `Prescription` + `PrescriptionItem`, `VitalReading`, `VitalTarget`
(the range a *doctor* recorded — the app never invents clinical thresholds).

**Medication** — `Medicine` (with optional `unitsLeft` for refill forecasts),
`ScheduleEntry`, `DoseOccurrence` (computed, never stored), `DoseRecord`,
`ScanResult`, `RecognitionResult`, `OcrResult`, `VerificationResult`.

**Wellness** — `ActivityLog`, `MoodEntry`, `WellnessGoal`. All self-reported and
explicitly non-clinical.

Every patient-owned row carries a `patientId`, so one database serves the patient
viewing their own data and the doctor viewing someone else's, through the same
`bundleFor(patientId)` selector.

---

## 4. Storage

`core/storage/Database.ts` is the only module that touches `localStorage`: one
versioned JSON document under `medicare.v2.db`, with selectors
(`selectPatient`, `forPatient`, `selectDoctorPatients`, …) as the only way the UI
slices it. Scan images are trimmed to the most recent few on write so the document
stays small. On a server build this becomes a repository over an API; on Android,
Room. No other layer changes.

---

## 5. Accounts and Google Sign-In

* Local accounts: PBKDF2-SHA256, 150k iterations, per-account random salt, via
  WebCrypto. A raw password is never stored.
* Google: real Google Identity Services, gated on `VITE_GOOGLE_CLIENT_ID`. Without
  the id, the UI says Google sign-in is not configured and offers a clearly
  labelled simulated profile so the sign-up flow is still reviewable.
* A Google user with no account is routed into the sign-up flow to pick a role and
  complete their profile — the app never invents a medical profile for someone.
* **Deployment note:** this build decodes the ID token client-side. A real
  deployment must verify signature / `aud` / `iss` / `exp` on a server.

---

## 6. Appointment engine (`core/clinic/AppointmentService.ts`)

Pure functions, shared by the patient's booking screen, the doctor's day view and
the hospital board:

* `generateSlots(doctor, date, appointments)` — expands availability windows by
  `slotMinutes`, marking each slot `free` / `booked` / `past`.
* `nextWorkingDays(doctor)` — only days the doctor actually holds clinic.
* `validateBooking()` — rejects past slots, non-clinic days, double bookings and
  empty reasons before anything is written.
* `upcomingForPatient` / `nextCheckup` / `dayQueue` / `hospitalDay` / `hospitalStats`.

---

## 7. Verification and scheduling

**Expiry** — `MM/YYYY` → last instant of that month → compared with the clock.
`expired` / `expiring_soon` (≤30 days) / `valid` / `unknown`. Never hardcoded.

**Schedule match** — the detected name is normalised (salt suffixes, "IP",
punctuation) and compared with active schedule entries; strengths compare with
unit conversion. Produces `match`, `strength_mismatch`, `not_in_schedule` or
`no_schedule_data`; the worst of (expiry, match) becomes the overall verdict.

**Scheduler** — frequency expansion (daily ×1–3, alternate days, weekly, as-needed),
per-dose status (`upcoming / due / missed / taken / not_taken / snoozed`),
`getNextDose`, `getPendingReminders`, and `adherenceRate(entries, records, days)`.

---

## 7b. Digital Wellbeing (`core/wellness/WellbeingScore.ts`)

The patient's landing screen. One score out of 100 from five pillars — movement,
sleep, hydration, mood and medication adherence — each reporting its own value,
weight and whether it had data, so the UI can always answer "why is it 75?".

Two honesty rules are built into the maths:

* **A pillar with no data is excluded and the remaining weights renormalise.**
  The score never quietly punishes someone for not logging something.
* It is a summary of logged habits, never a clinical measure, and it never
  appears without that framing.

The trend is the same computation run over the previous seven days.

---

## 7c. Notifications (`core/notifications/`)

Two sources feed one inbox:

* **Derived alerts** are recomputed from the data on every render — a follow-up
  is due, a booking is waiting for confirmation, a visit is tomorrow. Nothing to
  keep in sync and nothing to expire: book the appointment and the alert vanishes
  by itself.
* **Stored messages** are what a person actually sent (the desk reminding a
  patient). Those persist and can be marked read.

`outstandingFollowUps()` is the one the front desk runs on: a note asked the
patient back, the date is close or past, and no open appointment exists. The desk
can send that patient a reminder or book for them directly; either action removes
the alert because the underlying fact changed.

On Android the derived alerts become the payload an AlarmManager/WorkManager job
schedules and the stored messages become an FCM topic — the selection logic does
not change.

---

## 8. Insights engine (`core/insights/InsightsEngine.ts`)

The health-intelligence layer: **deterministic, explainable rules and statistics**
over the patient's own records. Not a chatbot, not a generative model, no network.

| Rule | Signal | Output |
|---|---|---|
| Adherence | 14-day taken/due per schedule, worst time-of-day slot | "the 8:00 PM dose is the one most often missed" |
| Refill | `unitsLeft` ÷ doses per day | days of supply remaining |
| Expiry | sweep of the cabinet | expired / expiring within a month |
| Vitals | latest reading vs the **doctor-set** target range | "outside the range your doctor recorded" |
| Wellness | 7-day step and sleep averages vs the patient's own goals | trend vs last week |
| Mood | run of low self-reported days | supportive prompt + support line |
| Appointment | next confirmed visit within 3 days | reminder |
| Hydration | 7-day water average vs the patient's goal | gentle nudge |
| Sleep consistency | standard deviation across the week | "nights ranged 5.1 to 8.4 hours" |
| Streak | consecutive days above the step goal | celebrates what is going right |
| Mood × sleep | sleep on better-mood days vs lower-mood days | reports the pattern, never causation |
| Score trend | wellbeing score week over week | up/down with the point change |

Every insight emits **translation keys plus params**, never sentences, so it speaks
in all three languages. Severity ordering is `urgent > attention > info > good`.
`setInsightsEngine()` is the swap point for a trained on-device model.

**Safety boundary:** it never diagnoses, never scores a clinical scale, never names
a condition and never changes a dose. Anything clinical ends at "check with your
doctor or pharmacist".

---

## 9. Recognition, OCR and voice (unchanged swap points)

```ts
interface MedicineRecognitionEngine {
  readonly id: string;
  readonly displayName: string;   // shown to the user
  readonly isSimulated: boolean;  // drives the honesty banner
  readonly confidenceThreshold: number;
  initialize(): Promise<void>;
  recognize(input): Promise<EngineRecognition>; // -> name, strength, form, confidence
  dispose(): Promise<void>;
}
```

`setRecognitionEngine()`, `setOcrEngine()` and `setSpeechEngine()` each replace one
capability independently. `OnDeviceRecognitionEngine.ts` is the marked skeleton for
the Snapdragon model.

Voice is a fixed intent table (`IntentEngine`) answered from live app state
(`AssistantService`) — deterministic, offline, identical every time.

---

## 10. Design system

`styles/global.css` holds the tokens and the elderly-first base; `styles/app.css`
adds the product layer (shells, navigation, stat tiles, panels, tables, chips,
charts, timeline, scales, toasts).

Two densities from one token set:

* **patient** — 20 px base text (scalable to 26 px), 64 px minimum touch targets,
  one primary action per screen, Listen button on every result screen.
* **pro** — the same tokens at `0.88em` with tables, rails and denser rows, because
  a doctor's day view and a hospital board are scanning tools, not reading tools.

High-contrast theme, all charts hand-drawn inline SVG (no chart library, no
external requests).

### Motion (`styles/motion.css`)

A separate, removable layer. The rule is that **motion carries meaning** and never
costs legibility:

* **Screen transitions** are direction-aware. `App.tsx` compares the stack depth
  across renders (via refs, so the direction is known on the frame the new screen
  mounts) and tags the wrapper `forward` / `back` / `switch`; a push enters from
  the right, a pop from the left, a tab switch simply lifts. That is what makes it
  read as one surface instead of a slideshow.
* **Content cascades** — direct children of a scroll body rise in sequence, with
  delays capped at 190 ms so the last card never keeps a slow reader waiting.
* **Data animates into its value** — lines trace themselves (`pathLength=1`
  normalises the dash maths across series lengths), bars grow from the axis, rings
  fill from empty, meters widen from zero. The motion *is* the reading.
* **Every animation uses `animation-fill-mode: backwards`, never `both`.** The
  animation covers its own delay and then hands the element back to its normal
  style, so a paused compositor, a backgrounded tab or an engine that skips the
  animation can never leave content stuck invisible.
* `prefers-reduced-motion: reduce` collapses the entire layer to ~0 ms and drops
  the overlay blur.

Contrast is checked against the *worst point* of a gradient, not its average:
`--primary-bright` is pinned at the lightest tone that still holds 5.4:1 against
white, so even small uppercase labels on a hero surface clear WCAG AA.
