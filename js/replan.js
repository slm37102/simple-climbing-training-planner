// Missed-session gap detection (ADR-0008, closes KG-A3/KG-D3).
// The plan itself is pure calendar math (see program.js); this module is the one
// place that compares the calendar against what was actually logged. It only
// *detects* — any schedule change is a user action wired in the Today view.
import { Program } from './program.js';
import { daysBetween, addDays } from './dates.js';

export const SOFT_GAP_DAYS = 8;   // 8–13 days since last main session → informational note
export const MAJOR_GAP_DAYS = 14; // ≥14 days → offer to extend the plan (KG-A3 "miss ≥2 wk")

// Mon/Thu/Sat — mirrors the main slots of DOW_TO_SLOT in program.js.
const MAIN_DOWS = new Set([1, 4, 6]);

function isMainDow(iso) {
  return MAIN_DOWS.has(new Date(iso + 'T00:00:00').getDay());
}

export const Replan = {
  // Returns null when there is no actionable gap, else
  // { gapDays, missedCount, anchor, severity: 'soft'|'major', canShift, shiftDays }.
  // Pure function of (plan, todayISO) — reads plan.days directly, no Storage access.
  detectGap(plan, todayISO) {
    const settings = plan?.settings;
    const start = Program.effectiveStart(settings);
    if (!start) return null;
    const ctx = Program.resolveDate(todayISO, start, Program.cycleWeeksOf(settings), settings.peakType);
    if (!ctx || ctx.outOfCycle) return null;

    // Anchor = the latest signal that the schedule was on track: last touched
    // main-slot day, cycle start, plan creation (a fresh plan whose computed
    // start lies in the past — routine in compDate mode — is not a gap), or an
    // explicit acknowledgment from a previous banner.
    let anchor = start;
    const created = (plan.createdAt || '').slice(0, 10);
    if (created > anchor) anchor = created;
    const ack = settings.gapAcknowledgedThrough;
    if (ack && ack > anchor) anchor = ack;
    const days = plan.days || {};
    for (const d of Object.keys(days)) {
      if (d < todayISO && d > anchor && isMainDow(d)) anchor = d;
    }

    const gapDays = daysBetween(anchor, todayISO);
    if (gapDays < SOFT_GAP_DAYS) return null;

    // Main-slot days inside the gap with no log entry — for the banner copy only.
    let missedCount = 0;
    for (let d = addDays(anchor, 1); d < todayISO; d = addDays(d, 1)) {
      if (isMainDow(d) && !days[d]) missedCount++;
    }

    return {
      gapDays,
      missedCount,
      anchor,
      severity: gapDays >= MAJOR_GAP_DAYS ? 'major' : 'soft',
      canShift: settings.anchorMode !== 'compDate',
      // Whole weeks, rounded DOWN. Must never exceed gapDays: shiftDays is added
      // to effectiveStart, so shiftDays > gapDays would push the new start past
      // today itself (outOfCycle) whenever the anchor is the raw cycle start —
      // floor keeps today's post-shift offset in [0,6], always safely in-cycle,
      // while staying an exact multiple of 7 so the Monday re-snap in
      // Program.effectiveStart is a no-op (the shift you see is the shift you get).
      shiftDays: Math.floor(gapDays / 7) * 7
    };
  }
};
