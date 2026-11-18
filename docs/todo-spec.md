# Get Shit Done — module spec

Personal task list. Principle: tasks you can see at a glance and that matter. No goals, streaks, combos or rewards for volume; the satisfaction lives in the act of completing.

## Identity

- Title "GET SHIT DONE" (Space Grotesk); all other UI Dutch via `t()`.
- Route `/todo`, permission key `todo`, module name "Get Shit Done".
- Tasks are per user; no sharing.

## Data

- **Category**: name, colour (fixed palette of ~10 tones that read well on black), icon (fixed set of 24), sort order. Created/edited only in the manage sheet (gear icon): a list of categories (drag to reorder, tap to edit) and an editor with name, colour, icon, projects (drag to reorder) and delete. Deleting one with tasks: confirm with count; tasks become uncategorised; history keeps the old name/colour.
- **System category "Automatisch"**: holds all linked tasks; cannot be deleted or used for manual tasks; colour editable. Its projects are the sources: "Cashflow", "Minor".
- **Project**: name, belongs to one category. A task can only have a project if it has a category.
- **Task**: title, category?, project?, due date? (day only, no time), flagged, notes (light markdown), subtasks, position (fractional index, global order), lastEditedAt, completedAt?, link? (source module + id).
- **Subtask**: title, done, position.
- Uncategorised colour: Signal Green.

## Main screen (mobile)

- **Header row**: title left; right: all-time completed counter, history icon, gear icon, and a small cloud-off icon while offline or with pending sync.
- **Filter row** (horizontal scroll): "Gemarkeerd", then categories. Single select; tap again clears.
- **Project row**: appears when a category is active, single select.
- **List**: manual order, global (reordering in a filtered view keeps the global order consistent).
- **Add button**: round, bottom-right thumb zone.
- **Undo button**: bottom-left (see Undo). The list has bottom padding so neither button covers a row.

## Task row (one line)

`[check] title…                [flag]`
`        Due · category · 2/5 · notes`

- **Checkbox**: a ring in the category colour; hover previews the check; completing fills it, draws the check and sends out a ring pulse. 44×44 hit area. Subtasks and history use the same check.
- **Title**: one line, ellipsis.
- **Meta line** (only when there is something to show): due label, category (hidden while filtering on it), `2/5` with subtasks, notes icon, link icon for linked tasks. Flag sits at the right of the row.
- **Due label**: "Vandaag" (green), "Morgen", weekday within a week, short date further out; overdue reads "Gisteren" / "3 dagen te laat" in red.
- **Projects**: never shown in the row.
- **Aging**: untouched by edits (title, date, notes, subtask, flag; reordering doesn't count) for 30 days → text at 70% opacity, 60 days → 50%. Tasks with a future date and linked tasks never age.

## Quick add

- **Opening**: tap the add button, or press `N` on desktop. A bottom sheet opens with the input focused inside the tap handler, so the keyboard appears at once.
- **Input row**: title, a calendar button (native date picker; once set it shows the due label with a clear button), submit.
- **Chips above the keyboard**: category → then its projects.
- **Preselection**: the active filter's category/project, else none.
- **Enter**: saves the task to the top of the list; the input clears and the chips stay for the next task. Swipe down, tap outside or Esc closes.

## Expanded task block

- **Opening**: tap a row (not the blob). It morphs into a larger floating card; the list behind it blurs.
- **Contents**: title, category/project, date shown prominently ("over 3 dagen") with date chips, flag, subtasks, notes, link to the source for linked tasks.
- **Saving and closing**: autosave on every change. Tap the blur or swipe down to morph back.
- **Subtasks**: "+ Subtaak" row; Enter chains the next. Drag to reorder; swipe left to delete. Ticking one plays a mini wave (no dust). The parent never auto-completes.
- **Notes**: rendered light markdown (bold, lists, links); tap the text to edit it raw in a textarea; blur renders it again.

## Gestures

- **Swipe left** past ¼ of the screen width: the row turns progressively redder with a trashcan icon; haptic at the threshold; release deletes. No dust; same pattern as the workout set swipe.
- **Swipe right** past ¼: the row fills in the category colour with a check icon; haptic at the threshold; release completes with the full animation.
- **Long-press 300 ms**: haptic tick, the row lifts, and the others spring aside with a tick per slot. The list auto-scrolls near its edges. A horizontal move before 300 ms counts as a swipe. Desktop: drag with the mouse.

## Completion choreography

1. Pop haptic.
2. The blob fills (120 ms).
3. A wave sweeps the row left to right in the category colour (300 ms).
4. The row squashes vertically (180 ms).
5. A dust burst of tiny category-coloured particles (~600 ms), while the list closes the gap with a spring.
6. The counter rolls +1 (vertical digit scroll) as the dust settles.

- **Haptics**: Android uses `navigator.vibrate`; iOS Safari toggles a hidden `<input type="checkbox" switch>`.
- **Reduced motion**: with `prefers-reduced-motion`, the wave becomes a fade and there is no dust.
- **Sound**: none.

## Undo

- **Button**: bottom-left; undo-arrow icon plus a countdown `5s`. It pops up and slides away.
- **Covers**: completions and deletions.
- **Stacking**: each tap undoes the latest action. Every new action or undo resets the countdown to 5 s. The button slides away when the stack is empty or time runs out.
- **Undoing a completion**: the gap opens, the row un-squashes in its colour, then the fill drains (~300 ms). The counter rolls −1 and the task returns to its original position.

## History overlay

- **Opening**: the history icon opens a full-screen overlay.
- **Pulse graph** at the top: a low, smooth line of completions over the last 365 days with Signal styling. No interaction. It follows the active category filter.
- **Search**: title and notes.
- **Filters**: category chips plus a project row, as on the main screen.
- **List**: grouped per day (Vandaag, Gisteren, ma 16 nov…), infinite scroll back to the start.
- **Actions per task**: view details (read-only, subtasks and notes kept), or restore (back to the top of the list).

## Empty state

"Niks meer te doen." centred in muted text, with the 3 most recent completions faded below.

## Linked tasks (Automatisch)

- **When they appear**: 7 days before their date, at the top of the list. Overdue linked tasks stay until done.
- **Cashflow**: an invoice with status `sent`/`overdue` and a payment due date creates a task dated on that due date.
  - Completing it sets the invoice to `paid` with date paid = today.
  - Undo or restore puts back the previous status and clears the date paid.
  - When the invoice is marked paid in cashflow, the task completes silently: it counts and goes to history, but nothing animates.
- **Minor**: each sprint creates "Show & Grow voorbereiden" dated on its Show & Grow date. Completing it does not change the sprint.
- **Editing**: title and date are locked and follow the source. Reordering, flag, notes and subtasks are allowed.
- **Deleting**: hides the task permanently for that source item.
- **Access**: only created for modules the user has access to.

## Offline

- **Cache**: the list and categories are cached locally.
- **Queue**: create, edit, complete, delete and reorder are queued and replayed on reconnect.
- **Conflicts**: last write wins per field.
- **Indicator**: cloud-off icon in the header while offline or pending.

## Desktop

- **Layout**: centred column, max ~640 px; the add button sits bottom-right of the column; the expanded block is the same floating card.
- **Keys**: `N` opens quick add, `Esc` closes.

## Dashboard

The module tile shows a small number of open tasks (including automated ones), hidden when 0.

## Defaults not explicitly discussed (veto if wrong)

- **Days to due**: calendar days in Europe/Amsterdam; day rollover at local midnight.
- **Title**: max 200 characters, single line in quick add.
- **Quick add**: has no flag chip; set the flag in the expanded block.
- **Restore from history**: also clears completedAt and reverts linked sources as with undo.
- **Category colour change**: applies to open tasks immediately and to history too.
