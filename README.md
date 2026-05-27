# Gather — User Guide

Gather is a lightweight event-hosting platform where anyone can discover events, RSVP in a tap, and hosts can manage check-in at the door. This guide walks through every flow a visitor, attendee, or host will encounter.

---

## Table of Contents

1. [Browsing Events & Hosts (No Account Needed)](#1-browsing-events--hosts-no-account-needed)
2. [Creating an Account & Signing In](#2-creating-an-account--signing-in)
3. [RSVP — "I'm Going"](#3-rsvp--im-going)
4. [Joining the Waitlist](#4-joining-the-waitlist)
5. [Your Tickets](#5-your-tickets)
6. [Adding Photos to the Gallery](#6-adding-photos-to-the-gallery)
7. [Leaving Feedback](#7-leaving-feedback)
8. [Reporting an Event](#8-reporting-an-event)
9. [Reporting a Gallery Photo](#9-reporting-a-gallery-photo)
10. [Becoming a Host](#10-becoming-a-host)
11. [Inviting Team Members](#11-inviting-team-members)
12. [Creating an Event](#12-creating-an-event)
13. [Editing & Publishing an Event](#13-editing--publishing-an-event)
14. [My Events](#14-my-events)
15. [Check-in at the Door](#15-check-in-at-the-door)
16. [Sharing Events & Host Pages](#16-sharing-events--host-pages)
17. [Host Dashboard](#17-host-dashboard)
18. [Managing Reports](#18-managing-reports)

---

## 1. Browsing Events & Hosts (No Account Needed)

No sign-in is required to explore what's happening on Gather.

### Explore events

1. Open the site — you land on the **Explore** page.
2. Browse the list of upcoming public events.
3. Use the filters at the top to narrow results:
   - **Search** — type a title or keyword.
   - **Location** — enter a city or venue name.
   - **From / To** — pick a date range.
   - **Include past events** — toggle on to see events that have already ended.
4. Click **Apply** to filter, or **Reset** to clear.
5. Click any event card to open its detail page.

### Browse hosts

1. Click **Hosts** in the navigation bar.
2. Search by name using the search field.
3. Click a host card to see their profile and published events.

---

## 2. Creating an Account & Signing In

1. Click **Sign in** in the top-right corner of the header.
2. Choose one of:
   - **Continue with Google** — authenticate with your Google account.
   - **Create account** — fill in your Name, Email, and Password, then check your inbox to confirm your email.
3. If you already have an account, enter your Email and Password and click **Sign in**.

> After signing in you are returned to the page you were on (e.g. an event you wanted to RSVP to).

---

## 3. RSVP — "I'm Going"

_Requires: signed-in account, event is in the future, seats are available._

1. Open an event detail page.
2. In the **RSVP** sidebar you will see the remaining capacity (e.g. "5 of 20 spots left").
3. Click **I'm going**.
4. The button is replaced with a confirmation: **"You're going 🎉"** and two links:
   - **View ticket** — opens your ticket with a QR code and ticket number.
   - **Cancel RSVP** — releases your spot (it may be given to someone on the waitlist).
5. Your ticket also appears on the **My Tickets** page.

---

## 4. Joining the Waitlist

_Requires: signed-in account, event is in the future, event is full._

1. Open a full event's detail page. You will see: **"This event is full (N/N)."**
2. Click **Join waitlist**.
3. You are added at the next position. The sidebar now reads: **"On the waitlist — position #N"**.
4. If someone ahead of you leaves the waitlist, your position number moves up.
5. If a spot opens (someone cancels their RSVP), the first person on the waitlist is **automatically promoted** and receives a seat — no action needed.
6. To leave voluntarily, click **Leave waitlist**.

---

## 5. Your Tickets

1. Click **My Tickets** in the navigation (or the mobile tab bar).
2. Each ticket shows:
   - Event name and date.
   - **Ticket code** (e.g. `EVT-XXXXXXXX`).
   - A **QR code** — show this at check-in.
3. Available actions per ticket:
   - **Add to Calendar** — downloads an `.ics` file.
   - **View event** — opens the event detail page.
   - **Cancel ticket** — frees your spot. A confirmation dialog appears: _"Cancel this ticket? Your spot will be freed up for someone on the waitlist."_

---

## 6. Adding Photos to the Gallery

_Requires: signed-in account._

1. Open an event detail page and scroll to the **Gallery** section.
2. Click **Share a photo** and select an image file.
3. After upload you will see a toast: **"Photo submitted — pending host approval."**
4. The photo is **not visible publicly** until the host approves it.

---

## 7. Leaving Feedback

_Requires: you RSVP'd to the event and the event has ended._

1. Open the past event's detail page and scroll to **Feedback**.
2. Click **Add feedback**.
3. Select a **Rating** (1–5 stars).
4. Optionally type a **Comment** (placeholder: _"What stood out?"_).
5. Click **Submit feedback**.
6. Your feedback is displayed publicly on the event page. Each attendee may submit only one review.

---

## 8. Reporting an Event

_Requires: signed-in account._

1. On the event detail page, click **Report**.
2. A dialog opens — enter the reason and any details.
3. Submit. The report is sent to the host team for review on their **Reports** page.

---

## 9. Reporting a Gallery Photo

_Requires: signed-in account._

1. In the event gallery, click **Report** on the photo in question.
2. Enter the reason and details, then submit.
3. The report is sent to the host team for review on their **Reports** page.

---

## 10. Becoming a Host

Any signed-in user can create a host profile.

1. Click **Become a host** in the site header (or on the Explore page).
2. You are taken to the **Create a host** form. Fill in:
   - **Logo** — upload an image.
   - **Name** — your host or organization name.
   - **Slug** — a URL-friendly identifier (your public page will be `/h/your-slug`).
   - **Short bio** — tell people who you are and what you organize.
   - **Contact email** — shown publicly so attendees can reach you.
3. Click **Create host**.
4. You can edit your host profile at any time from your host page by clicking **Edit host**.

---

## 11. Inviting Team Members

Hosts can invite others to join the host team as either a **Host** (can edit events) or a **Checker** (can only run check-in).

1. Go to your host page and click **Edit host**.
2. Scroll to the **Team** section.
3. Click **Invite as Host** or **Invite as Checker** — a unique invite link is created and copied to your clipboard.
4. Share the link with the person you want to invite.
5. When they open the link and sign in, they join the team with the assigned role.
6. Active invite links are listed below. You can **Copy** a link again or revoke it with the trash icon.

---

## 12. Creating an Event

_Requires: you are a host._

1. Go to your host page and click **+ New event**.
2. Fill out the event form:
   - **Title** and **Slug** (URL identifier).
   - **Description** — rich-text event details.
   - **Start** and **End** dates/times, plus **Timezone**.
   - **Capacity** — maximum number of attendees.
   - **Venue** — toggle between **Physical** (enter an address) and **Online** (enter a meeting URL).
   - **Visibility** — **Public** (listed in Explore) or **Unlisted** (accessible only by direct link).
3. Click **Create event**.
4. The event is created as a **draft**. It is not visible to anyone until you publish it.

---

## 13. Editing & Publishing an Event

1. Open the event and click **Edit** (visible to hosts only).
2. The edit page shows the current status: **draft** or **published**, and visibility: **public** or **unlisted**.
3. Make any changes and click **Save changes**.
4. To make the event live, click **Publish**. To take it offline again, click **Unpublish**.
5. Use **Duplicate** to create a copy of the event (useful for recurring events).
6. Upload a **Cover image** — a wide image shown at the top of the event page.

**Visibility rules:**

| Status | Visibility | Who can see it? |
|--------|-----------|-----------------|
| Draft | — | Only the host team, via **My Events** |
| Published | Public | Everyone, listed on the Explore page |
| Published | Unlisted | Anyone with the direct link (not listed in Explore) |

Use the **Share** button to copy the event link for unlisted events.

---

## 14. My Events

_Available to hosts and checkers._

1. Click **My Events** in the navigation.
2. Browse or filter events using:
   - **Host** dropdown — select a specific host or "All hosts".
   - **From / To** — date range.
   - **Search** — filter by title.
3. Each event card shows:
   - **Edit** — opens the event editor (hosts only).
   - **Check-in** — opens the check-in page (hosts and checkers).
   - **Ended** badge — if the event is in the past.

---

## 15. Check-in at the Door

_Available to hosts and checkers._

1. From **My Events**, click **Check-in** on the event, or navigate to the event and use the check-in link.
2. The check-in page displays three live counters:
   - **Going** — total RSVPs.
   - **Waitlist** — people still waiting.
   - **Checked-in** — people who have arrived.
3. Enter a ticket code (e.g. `EVT-XXXXXXXX`) in the input field and click **Check in**.
   - **Valid ticket** — the attendee is checked in and the Checked-in counter updates. The check-in appears under **This session**.
   - **Invalid ticket** — a message appears: no ticket found.
4. Made a mistake? Click **Undo last** to reverse the most recent check-in.

> If you are not a host or checker for this event, you will see: _"Only host or checker members of this event can run check-in."_

---

## 16. Sharing Events & Host Pages

Both event detail pages and host profile pages include a **Share** button.

1. Click **Share**.
2. On supported devices the native share sheet opens. Otherwise the link is copied to your clipboard.
3. Pages include social-media meta tags (Open Graph / Twitter Card), so links shared on social platforms display a rich preview with the event or host image and description.

---

## 17. Host Dashboard

_Available to hosts._

1. Click **Host Dashboard** in the navigation.
2. See all events you host, split into **Upcoming** and **Past** sections.
3. Each event card shows summary stats:
   - **Going** — confirmed RSVPs.
   - **Waitlist** — people waiting for a spot.
   - **Checked-in** — attendees who arrived.
4. Click **Export RSVPs and attendance** to download a CSV file with the full attendee list, RSVP status, waitlist position, and check-in status for that event.

---

## 18. Managing Reports

_Available to hosts._

1. Click **Reports** in the navigation.
2. View all user-submitted reports related to your hosted events and gallery images.
3. For each report you can:
   - **Dismiss** — if the report is not actionable, remove it from the queue.
   - **Confirm** — suppress the reported event (unpublish) or hide the reported gallery image.
