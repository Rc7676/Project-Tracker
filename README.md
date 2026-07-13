# Project Tracker

A single-file web app for tracking projects through stages, with quests
(to-dos), sub-missions, notes, a hand/deck/discard workflow, filters, and
saved presets. The whole app is one `index.html` — no build step.

- **Themes.** Pick a look from the theme dropdown in the footer: **Normal**
  (clean/flat), **Fantasy** (parchment / collectible-card-game), plus fun ones —
  **⚽ Soccer, 🚀 Space, 🌆 Synthwave, 🌊 Ocean, 🌲 Forest**. The theme is saved
  per browser; light/dark mode is a separate toggle.
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

That's it. Once you also set up login (next section), the footer pill reads
**“Shared · synced”** after you sign in, and every signed-in teammate
reads/writes the same workspace. Open the app in two browsers and watch an edit
in one appear in the other.

---

## 3. Turn on login (required if your repo/site is public)

The shared table is locked to **signed-in users** (see
`supabase-schema.sql`). The public anon key alone can't read or write your
data — a visitor must log in with an account you create. Set this up:

1. In Supabase: **Authentication → Providers → Email** — make sure **Email** is
   enabled, and turn **OFF “Allow new users to sign up.”** This stops strangers
   from creating their own accounts. (Optional: turn off “Confirm email” so the
   accounts you create work immediately.)
2. Add your team: **Authentication → Users → Add user** → enter each person's
   email + a password → **Create user**. Repeat for everyone who should have
   access.
3. Make sure you've run the latest `supabase-schema.sql` (its policies are
   `to authenticated`). If you ran an older version with “public” policies,
   just run the file again — it replaces them.

Now when anyone opens the app they get a **Sign in** screen. Only the accounts
you created can get in; everyone else is locked out even though the code and
key are public. There's a **🚪 Sign out** button in the footer.

## 4. Roles & permissions

Admins can restrict what each teammate may do. Open the **👥 Team** button in
the footer (admins only) and assign a role — and an optional **display name** —
to each login email:

- **Admin** — full access; the only role that can manage the team, import
  backups, permanently delete projects, and clear the activity log.
- **Editor (everything except delete)** — may do everything an admin can
  *except* the admin-only actions above (can still trash/restore projects).
- **To-do editor — all projects** — may add/complete/edit/delete **to-dos** on
  any project; nothing else.
- **To-do editor — At Service only** — to-dos only on At Service projects, and
  *sees only* At Service projects.
- **To-do editor — Dolley / XY / Pinch only** — to-dos only on projects of that
  category, and *sees only* that category.
- **Viewer** — read-only.

**Display names:** set a name per person in the Team panel (admins only) and it
shows in comments, the activity log, and the footer instead of the email.
**Activity filter:** the Activity panel has a *By user* dropdown to see just one
person's changes.

### Groups are per-user

The **Projects / VIP / Irrelevant** groups are personal to each signed-in user —
your VIP and Irrelevant lists are your own and don't affect what anyone else
sees. Any role (even a Viewer) can organize their own groups. Permanently
deleting a project (which removes it for everyone) stays an admin-only action
(**🗑️ Delete forever**, in a project's detail view or the Irrelevant list).

The **General To-Do's, General Notes and Project Statistics** panels are hidden
from to-do editors (admins and viewers still see them). Anyone not listed is a
**Viewer**. The admin email(s) are set in `index.html`
via `BOOTSTRAP_ADMINS` (so you can't lock yourself out); the current owner is
`razcohen7676@gmail.com`.

> **Important — this is a guardrail, not un-bypassable security.** Roles are
> enforced in the app (buttons hidden + actions refused), which is perfect for
> a *trusted* team. But because the database still accepts writes from any
> signed-in user, a determined, technical user could bypass the UI. Truly
> tamper-proof permissions require server-side (database) rules, which is a
> larger rebuild — ask if you need it.

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
- **The anon key is public by design, and that's OK here.** With the login
  gate on and “Allow new users to sign up” turned off, the key alone grants no
  access — only the accounts you create can read or write. Removing a person's
  access is as simple as deleting their user in Supabase → Authentication.
- **Backups:** the **⬇️ Export Backup** button downloads the full dataset as
  JSON; **⬆️ Import Backup** restores it. Good to grab one before big changes.

---

## Prefer Firebase or another backend?

The storage layer is isolated in `index.html` (the `initBackend` / `pushNow` /
`applySharedData` functions and the `SUPABASE_*` config). You can swap in a
different backend by replacing those functions — the rest of the app talks to a
plain in-memory `state` object and calls `saveState()`.

---

## Tips

- **Views:** switch between **Cards**, **Table**, and **Kanban**. In Kanban,
  drag a project card between stage columns to change its status.
- **Due dates live on to-dos:** each to-do has its own assignee and due date.
  A project's card/table/overdue view reflects the soonest upcoming (open)
  to-do, so deadlines still surface at a glance.
- **Comments & history:** each project's detail view has a comment thread and a
  history of changes made to it.
- **Keyboard shortcuts:** `/` focuses search, `n` starts a new project, `s`
  toggles multi-select, `Esc` closes a dialog / exits select mode.
- **Bulk edits:** click **☑️ Select**, tick several projects, then set their
  status, assignee, or move/irrelevant them all at once.
- **Filters:** on phones the filters collapse behind a **🔍 Filters & sort**
  bar. A "Showing X of Y · Clear all filters" line appears whenever a filter is
  active. Overdue items surface as a red chip you can click to filter.

## Local development

It's a static file — just open `index.html` in a browser. No install, no build.
