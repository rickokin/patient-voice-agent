# Helpful Artifacts

> Consumer-facing health **support** artifacts generated from a user's question,
> the agent's grounded answer, and the retrieved story moments.

Helpful Artifacts turn a single Patient Voice Agent answer into practical,
editable tools that help a person **prepare, reflect, organize their thoughts,
ask better questions, and feel less alone**. They embody the product arc the
Patient Voice Agent is built around:

```
story moments  →  lived-experience pattern  →  practical user artifact
```

They are **not** medical advice. They never diagnose, recommend treatment, judge
severity, or make clinical claims. They are grounded only in the retrieved story
moments and the user's own stated concern.

---

## 1. Purpose

After a user asks a question on `/agent` and receives an answer, a **Helpful
Artifacts** section appears offering 10 artifact types. Clicking one generates
that artifact from:

1. The user's original question / concern
2. The prior agent answer (context, never treated as medical advice)
3. The retrieved story moments (the only archive material the model may use)

Every artifact ends with the standard disclaimer:

> This is not medical advice. It is a preparation and reflection tool based on
> lived-experience patterns from the archive.

---

## 2. The 10 artifacts

| # | Type id | Title | Best for |
| --- | --- | --- | --- |
| 1 | `visit_preparation_brief` | Visit Preparation Brief | Getting ready for an upcoming appointment |
| 2 | `appointment_question_card` | Appointment Question Card | Having questions ready in the room |
| 3 | `what_im_trying_to_say` | What I'm Trying to Say | Finding words for a hard-to-express concern |
| 4 | `doctor_message_draft` | Doctor Message Draft | Reaching out between visits |
| 5 | `after_visit_reflection` | After-Visit Reflection | Making sense of a visit afterward |
| 6 | `health_story_timeline` | My Health Story Timeline | Organizing a story spanning months/years |
| 7 | `what_others_wish_they_asked` | What Others Wish They Had Asked | Spotting questions you hadn't thought of |
| 8 | `you_are_not_the_only_one` | You Are Not the Only One | Feeling less alone with a concern |
| 9 | `care_partner_brief` | Care Partner Brief | Bringing someone with you / keeping them informed |
| 10 | `what_to_listen_for` | What to Listen For in the Answer | Evaluating whether a visit gave you clarity |

The canonical registry (titles, descriptions, `bestFor`, `iconName`,
`safetyLevel`) lives in [`lib/artifact-types.ts`](../lib/artifact-types.ts). The
required sections + per-artifact rules for each type live in
[`core/prompts/artifacts.ts`](../core/prompts/artifacts.ts).

---

## 3. Safety rules

These are enforced in the system prompt + per-artifact rules, and defensively in
the service layer (`normalizeArtifactContent` forces the disclaimer and a valid
markdown body, and forces the artifact type to the validated value rather than
trusting the model).

- Do **not** give medical advice.
- Do **not** diagnose or name a condition the user has.
- Do **not** recommend or choose a specific treatment.
- Do **not** tell the user whether symptoms are serious or not serious.
- Do **not** create urgency language unless the user's own question explicitly
  describes emergency symptoms — and even then use only a generic redirect:
  _"If you think this may be an emergency, contact emergency services or seek
  urgent care."_
- Do **not** claim the archive is representative.
- Do **not** invent patient stories, quotes, numbers, or statistics.
- Do **not** impersonate a patient.
- Use soft attribution and editable language: _"People in the archive often
  describe…"_, _"Some story moments suggest…"_, _"This may help you prepare to
  ask…"_, _"You can edit this before using it."_
- Always include the standard disclaimer.

---

## 4. API

All routes require an authenticated, allowlisted user (`requireUserId`), except
the admin listing which requires an admin (`requireAdmin`). When auth is disabled
locally, `userId` is `null`.

### `POST /api/agent/artifacts/generate`

Generate and persist one artifact.

Request body:

```json
{
  "artifactType": "visit_preparation_brief",
  "question": "What should I know before my knee appointment?",
  "answer": "…optional prior agent answer…",
  "mode": "general",
  "queryId": "…optional query_logs.id…",
  "retrievedMomentIds": ["…optional moment uuids…"]
}
```

- `artifactType` — one of the 10 ids (validated; unknown → `400`).
- `question` — required.
- `answer`, `mode`, `queryId` — optional.
- `retrievedMomentIds` — optional; the server re-hydrates these moments as
  grounding (order preserved, unknown ids skipped). If omitted, the artifact is
  generated from the question/answer alone.

Response: `201` with the saved `GeneratedArtifact`.

### `GET /api/agent/artifacts?queryId=…`

List previously generated artifacts for a query (newest first). Used by the panel
to show **View** instead of **Generate** for already-generated types.

### `GET /api/agent/artifacts/:id`

Fetch a single artifact by id (`404` if not found).

### `GET /api/admin/artifacts?limit=100`

Admin-only. List the most recently generated artifacts across all queries. Powers
`/admin/artifacts`.

### `GeneratedArtifact` shape

```ts
interface GeneratedArtifact {
  id: string;
  userId: string | null;
  queryId: string | null;
  artifactType: ArtifactType;
  artifactTitle: string;
  sourceQuestion: string;
  sourceAnswer: string | null;
  retrievedMomentIds: string[];
  content: {
    artifactTitle: string;
    artifactType: ArtifactType;
    summary: string;
    sections: { heading: string; items: string[] }[];
    markdown: string;
    disclaimer: string;
  };
  markdown: string;
  createdAt: string; // ISO
}
```

---

## 5. Data model

Table `generated_artifacts` (migration `0006_productive_gressill.sql`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | text, nullable | text (not a users FK) so a future consumer app can store anonymous sessions |
| `query_id` | uuid, nullable | `references query_logs(id) on delete set null` |
| `artifact_type` | text | |
| `artifact_title` | text | |
| `source_question` | text | |
| `source_answer` | text, nullable | |
| `retrieved_moment_ids` | uuid[] | default `{}` |
| `content_json` | jsonb | structured `GeneratedArtifactContent` |
| `content_markdown` | text | ready-to-render/copy markdown |
| `created_at` | timestamptz | default `now()` |

Indexes: `query_id`, `user_id`, `artifact_type`, `created_at`.

> Note: the spec referred to `agent_queries(id)`; in this codebase the agent's
> query audit table is `query_logs`, so `query_id` references `query_logs(id)`.

---

## 6. Code map

| Concern | File |
| --- | --- |
| Type constants + metadata + content shapes (dependency-free) | `lib/artifact-types.ts` |
| Prompt module (system, per-artifact sections/rules, JSON schema) | `core/prompts/artifacts.ts` |
| Pure content normalization (disclaimer + markdown fallback) | `core/artifacts/artifact-content.ts` |
| Generation service (orchestration) | `core/artifacts/artifact-service.ts` |
| Repository | `core/artifacts/generated-artifacts-repository.ts` |
| Moment re-hydration by id | `core/retrieval/retrieval-service.ts` (`getSupportingMomentsByIds`) |
| Routes | `app/api/agent/artifacts/**`, `app/api/admin/artifacts/route.ts` |
| Panel + viewer | `components/agent/helpful-artifacts-panel.tsx`, `components/agent/generated-artifact-viewer.tsx` |
| "Save as PDF" builder (pure, jsPDF) | `lib/artifact-pdf.ts` |
| Agent integration | `app/agent/page.tsx` |
| Admin view | `app/admin/artifacts/page.tsx` |
| Tests | `tests/artifact-types.test.ts`, `tests/artifact-content.test.ts`, `tests/artifact-pdf.test.ts` |

Route handlers are thin; business logic lives in `core/`.

---

## 7. Reuse in a separate consumer-facing agent

This feature was built to be lifted into a separate consumer app:

- **`lib/artifact-types.ts`** is dependency-free (no DB/LLM/server imports) and
  can be copied verbatim to share the type catalog between apps.
- **`core/artifacts/artifact-content.ts`** is pure and unit-tested — safe to
  reuse for normalizing/rendering artifacts anywhere.
- **`core/prompts/artifacts.ts`** holds all prompting + safety rules in one place
  so a consumer agent inherits the same guardrails.
- **`generateHelpfulArtifact`** accepts either pre-loaded `retrievedMoments` or
  `retrievedMomentIds`, so a consumer app with its own retrieval can pass moments
  directly without depending on this app's tables.
- **`user_id` is text and nullable**, so anonymous/consumer sessions persist
  without a provisioned user row.

Future ideas: per-artifact feedback (reuse the existing feedback pattern),
exporting artifacts to PDF, and letting users edit + re-save an artifact.

## 8. Testing

Pure logic is covered without calling OpenAI:

```bash
npm test
```

Covers artifact-type validation/metadata lookup, the section normalizer, the
JSON→content normalizer (including type forcing + disclaimer enforcement), the
markdown fallback when the model omits `markdown`, and the PDF builder
(valid PDF output, multi-page flow, filename slugifying).

## 9. Export / "Save as PDF"

The artifact viewer has a **Save as PDF** button. It generates a real,
vector-text PDF entirely client-side (via `jspdf`) and downloads it directly —
no popup window and no browser print dialog. The document is built by
`buildArtifactPdf` (`lib/artifact-pdf.ts`), which lays out the structured
content (title, metadata, source question, summary, sections, and the standard
disclaimer) with automatic page breaks; the filename comes from
`buildArtifactPdfFilename` (slugified title). The builder is DOM-free so it's
unit-tested and reusable by the consumer-facing app. This works identically in
the agent flow and the admin viewer (no extra route or auth surface). If
generation fails, the viewer shows an inline error.
