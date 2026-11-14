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
4. **Olena** → **Invites** → **Accept & share my name**, then open **My day** to show the staggered arrival time.
5. **Event team** → Overview. Point out that needs arrived about 4 weeks before the event (typical: the day before) and the reply rate: every answer gets a reply.

## Seeing both sides interact (for testing)
Open two browser windows next to each other: one at `http://localhost:3000` and the other at `http://127.0.0.1:3000`.
Each address keeps its own sign-in, so you can be Kiertovolt on the left and Olena on the right.
The bell checks for news every 5 seconds, so actions on one side show up on the other within a few seconds.
