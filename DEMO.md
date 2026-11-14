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
