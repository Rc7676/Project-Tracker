# Project Tracker

A single-file web app for tracking projects through stages, with quests
(to-dos), sub-missions, notes, a hand/deck/discard workflow, filters, and
saved presets. The whole app is one `index.html` — no build step.

- **Two card styles.** The default is a clean, flat **Normal** look. A
  **Fantasy** style (parchment / collectible-card-game) is one click away via
  the **🎴 Fantasy Cards** button in the footer. Light/dark mode is a separate
  toggle.
- **Shared data (optional).** Out of the box the app saves to your own browser.
  Add two Supabase values and it becomes a live shared workspace: everyone who
  opens the app sees and edits the **same** projects, missions, and notes, with
  changes appearing in real time.

---

## 1. Put it online (host on GitHub Pages)

The code already lives in this repo. To give everyone a link:

1. Push this repo to GitHub (already done if you're reading this here).
2. On GitHub: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick the branch (e.g. `main`) and folder **`/ (root)`**, then **Save**.
5. Wait ~1 minute. Your app is live at
   `https://<your-username>.github.io/Project-Tracker/`.

Anyone with that link can open the app. **But hosting the code does not share
the *data*** — see the next section for that.

---

## 2. Turn on shared data (so everyone sees & edits the same thing)

GitHub only serves the code. For all users to share one live dataset, the app
needs a small cloud database. This uses [Supabase](https://supabase.com) (free
tier is plenty). Setup takes about 5 minutes.

1. Go to <https://supabase.com>, sign up, and **create a new project**
   (any name; remember the database password).
2. In the project: open the **SQL Editor**, click **New query**, paste the
   contents of [`supabase-schema.sql`](./supabase-schema.sql), and click
   **Run**. This creates the shared table and turns on live updates.
3. Open **Project Settings → API** and copy two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (a long string under "Project API keys")
4. Open `index.html`, find this block near the top of the `<script>`:

   ```js
   const SUPABASE_URL = "";        // e.g. "https://abcdefgh.supabase.co"
   const SUPABASE_ANON_KEY = "";   // your project's public "anon" key
   ```

   Paste your two values between the quotes. Save, commit, and push.

That's it. The footer pill now reads **“Shared · synced”** instead of
**“Local only”**, and every visitor reads/writes the same workspace. Open the
app in two browsers and watch an edit in one appear in the other.

### What is and isn't shared

- **Shared across everyone:** projects, their status/quests/sub-missions/notes/
  map images, plus the General Missions and General Notes panels.
- **Local to each person (not shared):** search text, filters, sort, saved
  presets, light/dark mode, and the Normal/Fantasy card style. Your view is
  yours; the data is everyone's.

### Good to know

- **Editing model:** the shared workspace is saved as a whole document with
  *last-write-wins*. For a small team this is fine. If two people edit at the
  exact same second, the later save wins for the whole document — so avoid
  having two people rewrite the same project simultaneously.
- **The anon key is public by design.** It only allows access to this one
  shared table. Keep the app URL within your team, and don't store anything
  secret in the tracker.
- **Backups:** the **⬇️ Export Backup** button downloads the full dataset as
  JSON; **⬆️ Import Backup** restores it. Good to grab one before big changes.

---

## Prefer Firebase or another backend?

The storage layer is isolated in `index.html` (the `initBackend` / `pushNow` /
`applySharedData` functions and the `SUPABASE_*` config). You can swap in a
different backend by replacing those functions — the rest of the app talks to a
plain in-memory `state` object and calls `saveState()`.

---

## Local development

It's a static file — just open `index.html` in a browser. No install, no build.
