# ShiftSync Agent Guide

This file aligns implementation to the spec and captures decisions.

## Product Goal

Build ShiftSync, a multi-location staff scheduling platform for Coastal Eats (4 locations across 2 time zones) with strong constraint enforcement, real-time updates, and auditability.

## Core Roles

- Admin: global oversight across all locations.
- Manager: manages assigned locations only.
- Staff: works shifts at certified locations with skills and availability.

## Non-Negotiables

- Enforce scheduling constraints with clear, user-facing explanations.
- Prevent double-booking across locations.
- Respect skill, certification, availability, and rest rules.
- Handle timezones and overnight shifts correctly.
- Maintain an immutable audit trail for schedule changes.
- Support real-time updates for published/modified schedules and swap workflows.
- Runtime validation uses Zod only; no class-validator/class-transformer.
- Prefer React Query + Zustand for state; avoid useEffect unless a last resort.

## Key Constraints

- No overlapping shifts for the same staff member.
- Minimum 10 hours rest between shifts for the same staff member.
- Skills and location certifications required for assignment.
- Assignments must fall within availability windows.
- Publish/unpublish cutoff: 48 hours before shift start (configurable).

## Swap & Coverage Rules

- Swap/drop requests require manager approval.
- Original assignment stays until approval.
- Pending swap canceled if manager edits the shift.
- Max 3 pending swap/drop requests per staff member.
- Drop requests expire 24 hours before shift start.

## Overtime & Labor Rules

- Weekly hours warning at 35+, overtime at 40+.
- Daily hours warning > 8, hard block > 12.
- 6th consecutive day warning.
- 7th consecutive day requires manager override with reason.

## Fairness Analytics

- Track total hours per staff over time.
- Tag premium shifts (Fri/Sat evenings).
- Fairness score for premium distribution.
- Compare assigned vs desired hours.

## Real-Time Events

- Schedule publish/modify pushes to staff immediately.
- Swap request lifecycle updates in real time.
- On-duty dashboard updates live.
- Conflict notification if simultaneous assignment attempted.

## Time & Timezones

- Store times in UTC with location timezone metadata.
- Display times in the location timezone.
- Recurring availability must survive DST transitions.
- Overnight shifts are a single shift.

## Audit Trail

- Capture who, when, and before/after for shift changes.
- Admin export by date range and location.

## MVP Priorities (72-hour scope)

1. Core scheduling with constraint engine + explanations.
2. Multi-location + timezone correctness.
3. Swap/drop workflow with approvals.
4. Basic real-time notifications.
5. Audit trail and seed data.

## Plan of Attack (Concrete Checklist)

Phase 1: Foundations (6-8h)
- Auth + role-based access (admin/manager/staff).
- Zod-only runtime validation + consistent error shape.
- Baseline DB migrations + seed verified.
- OpenAPI/Swagger setup for API docs.

Phase 2: Scheduling Core (12-16h)
- Shift CRUD and publish/unpublish with cutoff.
- Assignment flow with constraint engine.
- Explainable violations + suggestion engine.

Phase 3: Swap & Coverage (8-10h)
- Swap/drop requests + approvals.
- Pending edit cancellation + expiration + max 3 pending.

Phase 4: Compliance & Fairness (8-10h)
- Overtime warnings + override capture.
- Fairness analytics + premium shift tagging.

Phase 5: Real-time (6-8h)
- Live schedule updates.
- Swap notifications + conflict detection.

Phase 6: Polish (6-8h)
- Audit trail UI + export.
- Seed data coverage + demo logins + docs.
- Postman collection export + quickstart.

## UI Stack

- UI: Shadcn + Tailwind.
- Router: TanStack Router.
- Data fetching: TanStack Query.
- Forms: react-hook-form + zod + @hookform/resolvers.
- Tables: @tanstack/react-table.
- Date/time: date-fns + date-fns-tz.
- Icons: lucide-react.
- Utilities: clsx, tailwind-merge, class-variance-authority.
- Realtime: socket.io-client (or SSE fallback).
- Charts: recharts (or nivo).

## Suggested Day-by-Day

Day 1
- Phase 1 complete.
- Start Phase 2 (shift CRUD + publish/unpublish).

Day 2
- Finish Phase 2 (constraint engine + explanations).
- Phase 3 complete (swap/drop flow).

Day 3
- Phase 4 + 5 complete (compliance, fairness, real-time).
- Phase 6 complete (audit UI, docs, demo polish).
- Swagger + Postman artifacts finalized.

## Backend-to-Frontend Delivery Map

1) Auth + roles
- Backend: auth, role checks, manager location scoping.
- Frontend: app shell, role-aware nav, login scaffolds.

2) Shifts CRUD + publish/unpublish
- Backend: shifts API, publish cutoff rules.
- Frontend: scheduling workspace (weekly grid + shift drawer + publish controls).

3) Constraint engine + explanations
- Backend: validation with detailed rule failures + suggestions.
- Frontend: conflict banner, suggestions panel, inline guidance in shift editor.

4) Swap/drop workflow
- Backend: swap requests, approvals, expirations.
- Frontend: swap/coverage views, approval actions, countdown tags.

5) Overtime + fairness
- Backend: overtime calculation, fairness metrics, what-if responses.
- Frontend: overtime dashboard, fairness report, what-if impact panel.

6) Realtime events
- Backend: publish/modify events, swap lifecycle, conflict notifications.
- Frontend: live updates, toasts, notification center.

7) Audit trail
- Backend: audit log persistence + export API.
- Frontend: audit log view and export controls.

## UI Route Checklist

`/login`
- Role-based login shortcuts for demo.
- Basic session status indicator.

`/schedule`
- Weekly grid view with filters (location, role, skill).
- Shift drawer: create/edit, publish/unpublish, cutoff warning.
- Conflict banner with suggestions.
- Assignment pills + availability badges.
- UI components: WeeklyGrid, ShiftCard, AssignmentPill, AvailabilityBadge, ConflictBanner.
- Data needs: shifts, assignments, availability windows, suggestions, publish cutoff.

`/swaps`
- Swap/drop request list + detail panel.
- Approval actions, countdown tags, status timeline.
- UI components: SwapRequestCard, ApprovalActions, CountdownTag, Badge.
- Data needs: swap requests, approval status, expiry time.

`/compliance`
- Overtime meters and warnings.
- 6th/7th day alerts + override capture.
- UI components: OvertimeMeter, InlineAlert, Button.
- Data needs: projected hours, consecutive days, override metadata.

`/fairness`
- Hours distribution report.
- Premium shift tracking and fairness score.
- Assigned vs desired hours bar.
- UI components: FairnessScore, HoursBar, PremiumShiftTag, StatCard.
- Data needs: assigned hours, desired hours, premium shift counts.

`/notifications`
- Notification center with read/unread.
- Live indicator + toast integration.
- UI components: NotificationItem, LiveIndicator, Toaster.
- Data needs: notifications, read status, realtime events.

`/audit`
- Audit log table + filters (date/location).
- Export action.
- UI components: Table (TBD), Badge, Button.
- Data needs: audit entries, filters, export endpoint.

## Intentional Ambiguities (Decisions)

- De-certified staff: non-destructive; keep history, block future assignments after decertified_at.
- Desired hours vs availability: availability is hard constraint; desired hours are soft targets for analytics/suggestions.
- Consecutive days: count a day worked if assigned minutes >= 60.
- Swap approved then shift edited: invalidate swap if eligibility fields change; keep if notes-only change.
- Location spanning timezones: single authoritative timezone per location.

## Additional Ambiguities (Decisions)

- Weekly hours boundary: use each shift's location timezone for week boundaries; sum across locations.
- Overnight shift daily hours: allocate hours to shift start date in location timezone.

## Documentation Requirements

- Provide login info for each role.
- Document assumptions and known limitations.
- Include seed data covering edge cases.
