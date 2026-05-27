# Fix list

## 1. Re-seed data (clean + valid)
- Delete current seeded events/RSVPs/tickets/checkins.
- Create **2 demo users** with email+password (you can sign in directly):
  - `alice@demo.lovable` / `Demo!2345`
  - `bob@demo.lovable`   / `Demo!2345`
- Create **2 hosts** owned by these users (Alice owns one, Bob owns the other; each is also a `host_member` on the other so you can test invites).
- Create **3 upcoming + 3 past** published public events, capacity **5** each, evenly split between the two hosts.
- Valid RSVP demo data: fill `going` up to capacity, then add 2 `waitlist` entries with proper `queue_position`, plus a few `checked-in` rows on past events.

Credentials will be shown in chat after the seed runs.

## 2. Event details page (`/events/$eventId`)
- **"I'm going" → ticket**: keep calling `rsvp_event` RPC, then on success invalidate the ticket query so the "View ticket" button + `/tickets` page update immediately. Also surface RPC errors.
- **Capacity full**: when `going_count >= capacity` and user has no RSVP, show "This event is full" + a **Join waitlist** button (same `rsvp_event` RPC — it auto-puts them on waitlist).
- **Already on waitlist**: show "You're on the waitlist (position N)" + **Leave waitlist** button.
- **Already going**: keep the existing "You're going" + View ticket, add **Cancel RSVP** button (already partially wired — verify it calls `cancel_rsvp`).

## 3. My Events
- Remove the duplicated Moderation button in `EventCard`.

## 4. Edit event page
- **Validation bug**: `eventSchema` requires `online_url` to be a URL even when venue is physical. Fix the zod schema so `online_url` is only required/validated when `venue_type === "online"` (and same for `location` when physical). Strip the other field before submit.
- **Paid toggle**: it's already enabled in `EventForm` — the "Coming soon" tooltip must be on the edit page wrapper. Remove the disabled overlay/tooltip.

## 5. "Become a host" flow
- Add a **Become a host** button on the home page (and in the header when signed in but with no hosts).
- Route already exists: `/hosts/new` (authenticated). If user isn't signed in, send them to `/signin` with redirect back. Verify the form works; add a short explainer.

## 6. Host management
- On `/h/$hostSlug` for host members: add **Create event** button (links to existing `/hosts/$hostSlug/events/new`).
- On the event page for host members: add a **Manage attendees** panel (or dedicated route) showing tabs: **Going**, **Waitlist** (ordered), **Checked-in**. Read from `rsvps` + `checkins` via existing RLS (host members can see).

## 7. Host member invites
- Existing tables: `host_invites` + server fn `acceptHostInvite`. Add UI:
  - On host edit/manage page: "Invite member" section. Choose role (Host / Checker), click **Create invite link** → inserts `host_invites` row and shows a copyable link `/invite/{token}`.
  - List existing pending invites with copy + revoke (delete) buttons.
- Note: current schema's `host_role` enum needs a `checker` value. Migration will `ALTER TYPE host_role ADD VALUE 'checker'` if missing, and policies will treat checker as a member (can view, can check in) but not host (can't edit event).

## 8. Check-in page
- Route exists: `/events/$eventId/checkin`. Make sure it:
  - Is accessible to host members (host or checker).
  - Renders each user's ticket QR code (use `qrcode.react`) on the **tickets** page so attendees can show it.
  - On the check-in page: manual code input (paste/enter `EVT-XXXXXXXX`) + a "Check in" button.
  - Live counters (Going / Checked-in / Remaining), refetched after each scan.
  - Prevents duplicate check-ins (DB unique on `ticket_id`; UI shows "already checked in").
  - **Undo last** button reverses the most recent check-in in this session.

## Order of execution
1. DB migration: add `checker` to `host_role` enum + index on `checkins(ticket_id)` unique.
2. Re-seed script (deletes + recreates demo data + users).
3. Frontend fixes in this order: EventForm schema → edit page paid toggle → event details RSVP/waitlist → tickets QR → check-in page → my events duplicate button → become-a-host CTA → host manage panel → invite UI.

## Technical notes (for me)
- Zod fix: make `online_url`/`location` conditional via `superRefine` or `discriminatedUnion` on `venue_type`.
- Seed uses `supabase--insert` for data and admin `auth.admin.createUser` via a one-off SQL function or service-role HTTP call; here I'll use `supabaseAdmin` from a one-shot server fn or just call the Supabase Auth Admin REST endpoint inline. (Simplest: a temporary server function I run via `stack_modern--invoke-server-function`.)
- QR: add `qrcode.react` dep.
- Enum migration uses `ALTER TYPE ... ADD VALUE IF NOT EXISTS 'checker'`.

Ready to start once approved.