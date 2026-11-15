# Demo cheat sheet

Before you start: sign in as **Event team**, open Overview and press **Reset demo data**. Use Chrome.
Every step works with no `ANTHROPIC_API_KEY`, because each AI call has a canned fallback.
To switch sides, open the account menu (bottom left on desktop, top right on mobile) → **Sign out**, then pick a demo account.
Each email is locked to one account type, which you can show on **Profile**.

| Demo account | Email | Type |
|---|---|---|
| Kiertovolt | hiring@kiertovolt.example | Company |
| Olena Kovalenko | olena.k@example.com | Talent |
| Event team | events@talentday.example | Organiser |

1. **Kiertovolt** → **New problem**. Dictate or paste these answers:
   - *Problem:* Our battery sensor data from the recycling line is noisy and the operators have stopped trusting the dashboard.
   - *First week:* Sit with the shift operators, collect a week of raw readings, and find where the sensors disagree with what people see.
   - *Hard part:* Three generations of sensors, no documentation, and the people who set them up have left.
   - *Bonus:* Python, has worked with hardware data, and is comfortable on a shop floor.
   - *Languages:* English, Finnish is a plus. We'd like 5 years of experience. (The AI suggests rephrasing this part as the actual work.)
2. **Olena**, on a phone-sized screen → Explore → the battery card → **Answer this problem**. Paste this answer, then press **Translate**:
   > Я б почала з того, що тиждень стояла б поруч з операторами і записувала, коли їхнє відчуття не збігається з датчиком. На попередній роботі я налагоджувала дані з трьох поколінь лабораторного обладнання, і половина проблем були кабелі. Я б склала таблицю: датчик, кабель, скрипт, і перевіряла кожен шар окремо.

   Press **Send**. **My answers** now shows *Sent*.
3. **Kiertovolt** → Problems → the battery card. You'll see 8 anonymous answers in random order. #F1, #G8 and #H4 are the generic AI fluff. Use `j`/`k` to move and `s` to shortlist Olena's answer (translated from Ukrainian), #A7 and #B3.
4. **Olena** → **Invites**: the invite shows "Reply by …". **Accept & share my name** takes her straight to **Pick a time**:
   an office visit, a video call, or the event-day table. Pick one, then **Add to calendar**. Kiertovolt sees it under **Meetings**.
5. **Event team** → Overview. Point out that needs arrived about 4 weeks before the event (typical: the day before), the reply rate,
   and **Promises kept**: each company's record of replying within the time it promised.

## No ghosting, changes, and meetings beyond the event day
- **Karavaani** (hiring@karavaanifreight.example): its home opens on **Waiting on you**, with one answer past its 3-day reply promise
  and one expired invite (press **Re-invite**). Nothing is rejected automatically.
- **Petra** (petra.w@example.com): **Home** shows that Ledgerleaf asked to move her video call; she picks a new time in the thread.
- **Pause or fill a problem**: on a problem page, **Problem status** → Pause… / Mark as filled…, with a reason everyone who answered is told.
- **My situation changed** (talent **Home**): step back from all answers, optionally with a date. Companies see only
  "#A7 stepped back" (and the date, if given). The reason is never stored.
- **Goals**: each problem carries a public promise (decide-by date, reply within N days, ways to meet). A talent's goal on **Home**
  is private: companies never see it, and it never changes who sees an answer.

## Seeing both sides interact (for testing)
Open two browser windows next to each other: one at `http://localhost:3000` and the other at `http://127.0.0.1:3000`.
Each address keeps its own sign-in, so you can be Kiertovolt on the left and Olena on the right.
The bell checks for news every 5 seconds, so actions on one side show up on the other within a few seconds.

## Several events
There are three fictional Espoo events (Tech Talent Day, Green Transition Jobs Morning, International Talent Evening), and every problem belongs to exactly one.
- **Event team** → **Events**: the list with venue, tables, problems and meetings per event, plus **New event**. Overview and Schedule have an event picker.
- **Talent** → Explore: the **Event** filter chips narrow the problems; each card shows its event, date and venue.
- **Invites** and meeting details say "Table N at <event>, <day>, <venue>", so the right event is always clear.
- **Company** → a problem → **Change event** (until an event-day meeting is booked). The intake asks "Which event?" before publishing.
Note: the first load after this change re-seeds the demo data, so use **Reset demo data** to start clean.

## Skills (candidate only)
- Sign in as Olena (talent) → Profile → "Your skills — only you see these". Her four skills are already there. To show the flow, paste any CV-like text (for example "Python, SQL, data analysis, technical translation, teaching") and press "Suggest skills". Each suggestion has Add / Dismiss, or "Add all". Without an API key the offline word list is used.
- Say it out loud: the CV is used once and never saved; companies and the organiser never see skills; every suggestion is the person's choice.
- Explore (`/talent`): cards show "Uses your skills: …" and a "Newest | Uses my skills" toggle. Nothing is hidden. Open the clean-tech battery problem to see the quiet "Your related skills" box next to the answer form.
- Switch to a company: the answers are still anonymous and in the same random order, with no skills anywhere.
- Skills for problems ("Work involved") come from the intake and can be edited in the card editor.
- After editing seed data, use Reset demo (organiser) so the seeded skills and tags appear.

## Event card
After a company shortlists an answer and the candidate accepts, an event-day meeting with a table and time gets an identity card at `/meet/<meeting id>`: first names, company, problem, event, venue, table, time, a code (PUL-XXXXXX) and a QR code of its own address. Nothing else (no surname, no email). It stops working after the event date ("This card has expired", no QR).
- Try it: `/meet/mt-1` is Olena × Pulssi Medical, Table 2 at the Green Transition Jobs Morning (10 Dec, 09:00). Open it as **Olena** (olena.k@example.com), **Pulssi Medical** (hiring@pulssimedical.example) or the **Event team** (events@talentday.example). Any other account gets a "not found" page.
- Olena can tick up to 3 of her four skills under the card ("Show up to 3 of your skills on this card"); the company then sees them on the card, and only those.
- Links: **Meetings** → "Your event card" (candidate), the booked-meeting panel in the thread (both sides), and the event-day "My day" rows.
- Print: the card page has a "Print this card" button; the app header and buttons are hidden when printing.

## Events run by the organiser
The event team now decides which companies take part. Companies do not pick an event by themselves.
- **Event team** (events@talentday.example) → **Events**: each event shows a stage (Draft, Open, Locked, Done), its problem deadline and "N of M tables taken". Open an event with **Manage**.
- **Employers** tab → **Invite companies**: tick one or more companies, add an optional message, send. A company can only be invited while the event has a free table.
- **Overview** tab: the one next step ("Open the event", then "Lock the event", then "Mark as done"), the problem deadline, a description and the needs timeline. Locking blocks new problems, answers, invitations and table changes. **New events start as drafts**: companies and candidates cannot see a draft.
- **Kiertovolt** (hiring@kiertovolt.example) → **Events** (the nav shows a "1" badge): the invitation to the International Talent Evening, with the event team's message. **Accept** gives it a table. Then **Publish a problem** opens the intake already set to that event ("For: … · Table N"). A company can publish up to 3 problems per event, until the problem deadline.
- Switch to a candidate (Olena): the new problem shows under Explore. Switch back to the Event team: the **Problems** tab lists it, and **Employers** shows Kiertovolt as Confirmed with its table (you can move it to another free table).
- After **Lock the event**, a candidate sees "Answers for this event have closed." on that event's problems.
- Existing demo companies are already confirmed for the events their problems belong to. Use **Reset demo data** (Overview) to get the pending Kiertovolt invitation back.

## After the event (next steps and outcomes)
The seed includes a finished event, **Espoo Autumn Talent Day** (17 Oct): 4 problems, 16 answers, 8 held meetings. Use **Reset demo data** first.
- **Plan a next step**: sign in as **Karavaani Freight** (hiring@karavaanifreight.example) → Home → "Plan the next step with Ville Mäkelä" → the thread's **Next step** section → **Plan the next step**
  (pick Interview / Trial day / Offer / Next step, a date up to 30 days ahead, an optional note). Ville (ville.m@example.com) then sees "Karavaani Freight will contact you about an interview by …".
- **Record an outcome**: the same company has "Tell Olena Kovalenko how it went", already past its date (flagged "Overdue", and the sweep has told both sides).
  Open it → **Record how it went** → Hired / Still talking (new date) / Not this time (pick a reason). "Hired" shows the pay-subsidy link.
  **Ledgerleaf** (hiring@ledgerleaf.example) has "Joonas Heikkinen" in the *Still talking* state; **Pulssi Medical** has one hire and one "not this time".
- **Candidate side**: sign in as **Olena** (olena.k@example.com) → Home → Waiting on them: "Karavaani Freight: interview by … (past its date)". Open the answer → **I've taken another job** closes it for both sides.
- **Organiser outcomes** (hiring organiser account → Events → Espoo Autumn Talent Day → **Outcomes** tab): status "Still settling · window closes 16 Dec", the funnel (problems → answers → shortlisted → accepted → meetings held → next step agreed → hired) with % of the previous step, "At the event" vs "Since the event", the promises block, and "Problems with no next step" (a cue to talk with a company, never a person).
  **Download CSV** gives the same anonymous figures. **Close follow-up now** opens a confirm dialog listing exactly what is deleted (answers, shortlists, meetings, next steps, feedback, activity) and what stays (figures, problem cards, accounts); after it the tab reads "Final · closed …" and Home for companies and candidates no longer shows that event's answers. Use **Reset demo data** to bring it back.
  The Overview opens with a compact **After the event** summary (hires, next steps, promises kept) linking to this tab. **Espoo Spring Talent Day** is already closed: its Outcomes tab shows only the final snapshot.
- Companies' "Promises kept" record now also counts these next-step promises (kept, late, overdue).
