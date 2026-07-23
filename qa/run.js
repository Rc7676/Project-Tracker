#!/usr/bin/env node
/* Project Tracker — automated QA suite.
 *
 * Usage:   npm install && npm test
 * Env:     PW_CHROMIUM=/path/to/chrome   (optional; auto-detected otherwise)
 *
 * Drives the real app (index.html) headlessly with playwright-core and
 * asserts on views, roles, undo, CSV, tags, recurring to-dos, mentions,
 * My Work, the timeline, and the command palette. Exits non-zero on failure.
 */
const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const fileUrl = 'file://' + path.resolve(__dirname, '..', 'index.html');

function findChromium() {
  if (process.env.PW_CHROMIUM) return process.env.PW_CHROMIUM;
  const candidates = [];
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (fs.existsSync(root)) {
    // headless_shell first — the full Chrome binary no longer supports the
    // old headless mode playwright-core drives.
    for (const dir of fs.readdirSync(root)) candidates.push(path.join(root, dir, 'chrome-linux', 'headless_shell'));
    for (const dir of fs.readdirSync(root)) candidates.push(path.join(root, dir, 'chrome-linux', 'chrome'));
  }
  candidates.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  const found = candidates.find(fs.existsSync);
  if (!found) throw new Error('No Chromium found. Set PW_CHROMIUM=/path/to/chrome');
  return found;
}

let passed = 0, failed = 0;
function check(name, ok, extra) {
  if (ok) { passed++; console.log('  ✅ ' + name); }
  else { failed++; console.log('  ❌ ' + name + (extra !== undefined ? '  → ' + JSON.stringify(extra) : '')); }
}

const SEED = `(role) => {
  const mk = (n, c, s, offs, a, extra) => {
    const p = newProject(n, c); p.statusIndex = s; p.assignee = a || '';
    const t = new Date();
    (offs || []).forEach((o, i) => {
      const d = new Date(t.getTime() + o * 86400000);
      const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      p.todos.push({ text: 'task ' + i, description: '', subs: [], done: i % 2 === 1, assignee: a || '', dueDate: ds, repeat: '' });
    });
    Object.assign(p, extra || {});
    return p;
  };
  state.projects = [
    mk('פרויקט אלפא', 'Dolley', 4, [-3, 4], 'רז', { tags: ['urgent', 'client'] }),
    mk('Beta Launch', 'XY', 2, [2, 9], 'רז'),
    mk('Gamma', 'Pinch', 1, [], 'Dana'),
    mk('Old Thing', 'Dolley', 4, [], '', { archived: true }),
  ];
  state.roles = { 'viewer@x.com': 'viewer', 'todo@x.com': 'todo-all' };
  state.displayNames = { 'razcohen7676@gmail.com': 'רז' };
  if (role === 'admin') { currentUserEmail = 'razcohen7676@gmail.com'; currentUserLabel = 'רז'; }
  else if (role === 'viewer') { currentUserEmail = 'viewer@x.com'; currentUserLabel = 'viewer'; }
  else if (role === 'todo') { currentUserEmail = 'todo@x.com'; currentUserLabel = 'todo'; }
  saveState(); renderToolbar(); rerenderAllData();
}`;

(async () => {
  const exe = findChromium();
  console.log('Chromium: ' + exe);
  const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
  const consoleErrors = [];

  async function seeded(role, width) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(role + '@' + width + ': ' + m.text()); });
    page.on('pageerror', e => consoleErrors.push(role + '@' + width + ' PAGEERROR: ' + e.message));
    await page.goto(fileUrl, { waitUntil: 'load' });
    await page.waitForTimeout(250);
    await page.evaluate('(' + SEED + ')(' + JSON.stringify(role) + ')');
    await page.waitForTimeout(150);
    return page;
  }

  console.log('\n1. Views × roles × widths');
  for (const role of ['admin', 'viewer', 'todo']) {
    for (const width of [1200, 360]) {
      const page = await seeded(role, width);
      for (const v of ['cards', 'table', 'kanban', 'timeline', 'dashboard', 'mywork']) {
        await page.evaluate('setView(' + JSON.stringify(v) + ')');
        await page.waitForTimeout(90);
        const r = await page.evaluate(`({
          kids: document.getElementById('content').children.length,
          overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        })`);
        check(`${role}@${width} ${v} renders, no overflow`, r.kids > 0 && !r.overflow, r);
      }
      await page.close();
    }
  }

  console.log('\n2. Role guardrails');
  {
    const page = await seeded('viewer', 1200);
    const r = await page.evaluate(`(() => {
      openDetail(state.projects[0].id);
      const cmds = buildPaletteCommands().map(c => c.label);
      const res = {
        deleteHidden: document.getElementById('detailDeleteBtn').style.display === 'none',
        archiveHidden: document.getElementById('detailArchiveBtn').style.display === 'none',
        titleReadonly: document.getElementById('detailTitle').readOnly,
        noTagInput: !document.querySelector('.tag-input'),
        noAdminCmds: !cmds.some(l => /Import|Team|Assign all/.test(l)),
      };
      closeDetail();
      return res;
    })()`);
    for (const [k, v] of Object.entries(r)) check('viewer ' + k, v === true, r);
    await page.close();
  }

  console.log('\n3. Archive + undo');
  {
    const page = await seeded('admin', 1200);
    const r = await page.evaluate(`(async () => {
      const id = state.projects[1].id;
      toggleArchive(id);
      const archived = state.projects[1].archived === true;
      const hidden = !getFilteredProjects().some(p => p.id === id);
      document.querySelector('.toast-undo').click();
      await new Promise(res => setTimeout(res, 60));
      return { archived, hidden, undone: state.projects[1].archived === false };
    })()`);
    check('archive sets flag', r.archived);
    check('archived hidden from views', r.hidden);
    check('undo restores', r.undone);
    await page.close();
  }

  console.log('\n4. CSV export');
  {
    const page = await seeded('admin', 1200);
    const r = await page.evaluate(`({
      quoted: csvCell('a,"b"'),
      excludesArchived: !getFilteredProjects().some(p => p.name === 'Old Thing'),
    })`);
    check('csv quoting', r.quoted === '"a,""b"""', r.quoted);
    check('csv respects archive filter', r.excludesArchived);
    await page.close();
  }

  console.log('\n5. Tags');
  {
    const page = await seeded('admin', 1200);
    const r = await page.evaluate(`(() => {
      const cardTags = (renderCardsView(getFilteredProjects()).querySelectorAll('.card-tags .tag-chip')).length;
      state.ui.searchQuery = 'urgent';
      const found = getFilteredProjects().map(p => p.name);
      state.ui.searchQuery = '';
      return { cardTags, tagSearchHits: found };
    })()`);
    check('tag chips on cards', r.cardTags >= 2, r);
    check('search matches tags', r.tagSearchHits.length === 1 && r.tagSearchHits[0] === 'פרויקט אלפא', r);
    await page.close();
  }

  console.log('\n6. Recurring to-dos');
  {
    const page = await seeded('admin', 1200);
    const r = await page.evaluate(`(() => {
      const p = state.projects[1];
      const t = p.todos.find(t => !t.done);
      t.repeat = 'weekly';
      const before = t.dueDate;
      toggleQuestDone(p, t);
      return { stillOpen: !t.done, moved: t.dueDate > before, hasDoneTs: typeof t.doneTs === 'number' };
    })()`);
    check('recurring stays open', r.stillOpen);
    check('recurring due date advances', r.moved, r);
    check('completion timestamped', r.hasDoneTs);
    await page.close();
  }

  console.log('\n7. Mentions + bell');
  {
    const page = await seeded('admin', 1200);
    const r = await page.evaluate(`(() => {
      const p = state.projects[0];
      p.comments.push({ user: 'Dana', text: 'please look @רז thanks', ts: Date.now() });
      saveState(); renderToolbar();
      const unread = unreadMentionCount();
      const bellVisible = document.getElementById('mentionBell').style.display !== 'none';
      const badge = document.getElementById('bellBadge').textContent;
      state.ui.mentionsSeenTs = Date.now() + 1000;
      const afterRead = unreadMentionCount();
      return { unread, bellVisible, badge, afterRead };
    })()`);
    check('mention detected', r.unread === 1, r);
    check('bell visible with badge', r.bellVisible && r.badge === '1', r);
    check('mark-read clears', r.afterRead === 0);
    await page.close();
  }

  console.log('\n8. My Work');
  {
    const page = await seeded('admin', 1200);
    await page.evaluate(`setView('mywork')`);
    await page.waitForTimeout(120);
    const r = await page.evaluate(`({
      rows: document.querySelectorAll('.mywork-row').length,
      groups: document.querySelectorAll('.mywork-group').length,
    })`);
    check('my-work lists my open todos', r.rows === 2, r); // רז owns Alpha(1 open) + Beta(1 open)
    check('grouped sections', r.groups >= 1, r);
    await page.close();
  }

  console.log('\n9. Timeline expansion');
  {
    const page = await seeded('admin', 1200);
    await page.evaluate(`setView('timeline')`);
    await page.waitForTimeout(150);
    const r = await page.evaluate(`(() => {
      const row = document.querySelector('.timeline-row');
      row.click();
      const subAfter = document.querySelectorAll('.timeline-subrow').length;
      const markers = document.querySelectorAll('.timeline-marker').length;
      document.querySelector('.timeline-row').click();
      const subCollapsed = document.querySelectorAll('.timeline-subrow').length;
      return { subAfter, markers, subCollapsed };
    })()`);
    check('bar click expands per-to-do lanes', r.subAfter > 0 && r.markers === r.subAfter, r);
    check('second click collapses', r.subCollapsed === 0, r);
    await page.close();
  }

  console.log('\n10. Palette regression (Esc keeps detail open)');
  {
    const page = await seeded('admin', 1200);
    const r = await page.evaluate(`(async () => {
      openDetail(state.projects[0].id);
      openPalette();
      document.getElementById('paletteInput').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await new Promise(res => setTimeout(res, 60));
      return {
        paletteClosed: !document.getElementById('paletteOverlay').classList.contains('visible'),
        detailOpen: document.getElementById('detailOverlay').classList.contains('visible'),
      };
    })()`);
    check('esc closes palette only', r.paletteClosed && r.detailOpen, r);
    await page.close();
  }

  const realErrors = consoleErrors.filter(e => !/supabase|ERR_|net::|Failed to load resource/i.test(e));
  console.log('\n11. Console errors');
  check('zero console errors', realErrors.length === 0, realErrors.slice(0, 5));

  await browser.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error('SUITE CRASH:', e); process.exit(2); });
