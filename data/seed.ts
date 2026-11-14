// Synthetic seed data. Every person and company here is fictional.
import type { DB, Account, Company, ProblemCard, Talent, Response } from "@/lib/types";

const companies: Company[] = [
  { id: "co-game", name: "Nordlight Games", sector: "Games", size: "35 people", about: "A small studio in Otaniemi making cooperative mobile puzzle games played by a few hundred thousand people." },
  { id: "co-cleantech", name: "Kiertovolt", sector: "Clean-tech", size: "40 people", about: "Keilaniemi start-up that recovers metals from used EV batteries and sells the recovered material back to cell makers." },
  { id: "co-medtech", name: "Pulssi Medical", sector: "Medtech", size: "120 people", about: "Makes bedside monitoring devices for hospital wards, with a design lab in Otaniemi." },
  { id: "co-saas", name: "Ledgerleaf", sector: "B2B SaaS", size: "60 people", about: "Accounting automation software for small and mid-sized Nordic businesses." },
  { id: "co-logistics", name: "Karavaani Freight", sector: "Logistics", size: "220 people", about: "Regional freight and warehousing company with a large cross-dock depot near Espoo." },
  { id: "co-robotics", name: "Tarmo Robotics", sector: "Robotics", size: "18 people", about: "Otaniemi spin-out building robotic arms that sort parcels in small warehouses." },
];

const cards: ProblemCard[] = [
  {
    id: "card-cleantech", companyId: "co-cleantech",
    title: "Our battery sensor data is a mess and nobody trusts it",
    context: "Every incoming battery pack gets scanned for voltage and temperature before we dismantle it. The readings come from three generations of sensors and a few hand-built scripts. Operators have started ignoring the dashboard and judging packs by feel.",
    weekOneReality: "You would sit with the shift operators at the dismantling line, collect a week of raw readings, and find out where they disagree with what people see on the bench. By Friday we would like a short list of the five most suspicious data problems and a first fix for one.",
    hardPart: "Nobody wrote down what the sensors were supposed to measure, and the people who set them up have left. Some oddities are real batteries behaving strangely, others are broken cables, and we cannot yet tell which is which.",
    niceToHave: ["Has worked with noisy hardware data", "Comfortable standing on a shop floor", "Can explain findings to non-technical operators"],
    languages: ["English", "Finnish"], format: "onsite", status: "published", createdAt: "2026-11-14T09:30:00.000Z",
  },
  {
    id: "card-game", companyId: "co-game",
    title: "Players quit our puzzle game at level 12 and we do not know why",
    context: "About four in ten new players stop playing right after level 12. Our analytics show the moment but not the reason. Designers argue it is too hard, engineers think it is a loading hitch.",
    weekOneReality: "Watch recordings of real sessions, play level 12 yourself on three different phones, and talk to a handful of players who quit. Come back with one or two theories we can test the following week.",
    hardPart: "The level is hard and slow at once, and the two effects are tangled together. A fix for one can easily hide the other.",
    niceToHave: ["Has watched people use something and learned from it", "Likes puzzle games"],
    languages: ["English"], format: "hybrid", status: "published", createdAt: "2026-11-12T14:10:00.000Z",
  },
  {
    id: "card-game2", companyId: "co-game",
    title: "Our translated game text keeps breaking the buttons",
    context: "We ship in nine languages. Every release a few strings overflow, get cut off or show raw placeholder codes. A spreadsheet and a lot of goodwill hold the process together.",
    weekOneReality: "Collect the last three releases of translation bugs, sort them by cause, and propose a cheap check that catches the most common one before translators and testers see it.",
    hardPart: "Translators work in a spreadsheet without seeing the screen, and the developers cannot read most of the languages.",
    niceToHave: ["Speaks or writes a language other than English or Finnish", "Has done QA of any kind"],
    languages: ["English", "Finnish"], format: "online", status: "published", createdAt: "2026-11-19T10:00:00.000Z",
  },
  {
    id: "card-medtech", companyId: "co-medtech",
    title: "Nurses mute our alarms and we need to understand why",
    context: "Our bedside monitor beeps for many reasons. Hospital staff tell us most alarms need no action, so they mute them, and sometimes the one that mattered gets muted too.",
    weekOneReality: "Shadow a ward for a morning if the hospital allows it, otherwise go through alarm logs and interview our clinical specialist. Write down which alarms people actually act on and which they ignore.",
    hardPart: "Fewer alarms is not automatically safer. We need to cut noise without ever hiding something critical, and the people who know the truth are very busy.",
    niceToHave: ["Has worked in a care, hospital or emergency setting", "Experience writing safety-sensitive instructions"],
    languages: ["English", "Finnish", "Swedish"], format: "onsite", status: "published", createdAt: "2026-11-10T08:45:00.000Z",
  },
  {
    id: "card-saas", companyId: "co-saas",
    title: "New customers sign up, then go quiet after two weeks",
    context: "Roughly a third of new customers never connect their bank account, which is the step where our product becomes useful. Support tickets hint at confusion, but nobody has time to read them all.",
    weekOneReality: "Read a few hundred support tickets and onboarding emails, group them by what people were trying to do, and sit in on two customer calls. Present the three most common stumbling points.",
    hardPart: "Customers describe symptoms, not causes. 'It does not work' can mean five different things, and the loudest complaints are rarely the most common.",
    niceToHave: ["Has taught or trained non-experts", "Comfortable with spreadsheets or basic SQL"],
    languages: ["English", "Finnish"], format: "hybrid", status: "published", createdAt: "2026-11-13T11:20:00.000Z",
  },
  {
    id: "card-saas2", companyId: "co-saas",
    title: "Customers upload invoice files in a hundred different shapes",
    context: "Our import feature expects a tidy CSV. Real customers send exports from old systems, with merged cells, commas in odd places and dates in three formats. Support fixes them by hand.",
    weekOneReality: "Take fifty real, anonymised problem files, work out the ten patterns behind most failures, and suggest which two we should handle automatically first.",
    hardPart: "Every fix for one customer's file risks breaking another's, and customers do not tell us what their old system was.",
    niceToHave: ["Has cleaned up messy data before", "Patience with edge cases"],
    languages: ["English"], format: "online", status: "published", createdAt: "2026-11-17T13:40:00.000Z",
  },
  {
    id: "card-logistics", companyId: "co-logistics",
    title: "Trucks wait in the yard while pallets are hunted down",
    context: "At our cross-dock depot, outbound trucks regularly wait twenty to forty minutes because one or two pallets are not where the system says they are. Drivers are frustrated and so are the floor teams.",
    weekOneReality: "Spend two shifts on the depot floor following pallets from arrival to truck, noting every place where the system and reality drift apart. Propose one small change to try the following week.",
    hardPart: "The scanning process looks fine on paper. The gaps are in habits, shift handovers and a few awkward corners of the building, so they only show up if you watch.",
    niceToHave: ["Has worked on a warehouse, shop or factory floor", "Can talk to a night shift and a manager on the same day"],
    languages: ["English", "Finnish"], format: "onsite", status: "published", createdAt: "2026-11-16T07:55:00.000Z",
  },
  {
    id: "card-robotics", companyId: "co-robotics",
    title: "Our robot arm drops shiny and wet parcels",
    context: "Our arm picks parcels with suction. It works on cardboard and fails on glossy plastic bags and anything damp. We lose about one pick in eight on those items, and customers notice.",
    weekOneReality: "Build a small test table with twenty awkward parcels, run a few hundred picks, and record what fails and how. Try one cheap change to the cups or the approach angle and compare.",
    hardPart: "Failures depend on lighting, humidity and how the parcel lands, so results are noisy. We need a test that is fair enough to trust a result from.",
    niceToHave: ["Likes tinkering with hardware", "Has run careful experiments in a lab or workshop"],
    languages: ["English"], format: "onsite", status: "published", createdAt: "2026-11-21T09:00:00.000Z",
  },
];

const talents: Talent[] = [
  { id: "t-olena", displayName: "Olena Kovalenko", email: "olena.k@example.com", preferredLanguage: "Ukrainian" },
  { id: "t-mika", displayName: "Mika Salonen", email: "mika.s@example.com", preferredLanguage: "Finnish" },
  { id: "t-aino", displayName: "Aino Virtanen", email: "aino.v@example.com", preferredLanguage: "Finnish" },
  { id: "t-joonas", displayName: "Joonas Heikkinen", email: "joonas.h@example.com" },
  { id: "t-sofia", displayName: "Sofia Ramirez", email: "sofia.r@example.com", preferredLanguage: "Spanish" },
  { id: "t-dmytro", displayName: "Dmytro Bondar", email: "dmytro.b@example.com", preferredLanguage: "Ukrainian" },
  { id: "t-priya", displayName: "Priya Nair", email: "priya.n@example.com", preferredLanguage: "English" },
  { id: "t-liisa", displayName: "Liisa Korhonen", email: "liisa.k@example.com", preferredLanguage: "Finnish" },
  { id: "t-tomas", displayName: "Tomas Novak", email: "tomas.n@example.com" },
  { id: "t-amara", displayName: "Amara Okafor", email: "amara.o@example.com", preferredLanguage: "English" },
  { id: "t-elias", displayName: "Elias Lindqvist", email: "elias.l@example.com", preferredLanguage: "Swedish" },
  { id: "t-noor", displayName: "Noor Rahman", email: "noor.r@example.com" },
  { id: "t-ville", displayName: "Ville Mäkelä", email: "ville.m@example.com", preferredLanguage: "Finnish" },
  { id: "t-carmen", displayName: "Carmen Ortiz", email: "carmen.o@example.com", preferredLanguage: "Spanish" },
  { id: "t-kasper", displayName: "Kasper Jensen", email: "kasper.j@example.com" },
  { id: "t-yuki", displayName: "Yuki Tanaka", email: "yuki.t@example.com", preferredLanguage: "English" },
  { id: "t-hanna", displayName: "Hanna Laaksonen", email: "hanna.l@example.com", preferredLanguage: "Finnish" },
  { id: "t-ivan", displayName: "Ivan Petrenko", email: "ivan.p@example.com", preferredLanguage: "Ukrainian" },
  { id: "t-leena", displayName: "Leena Rantanen", email: "leena.r@example.com" },
  { id: "t-omar", displayName: "Omar Haddad", email: "omar.h@example.com", preferredLanguage: "English" },
  { id: "t-nina", displayName: "Nina Kallio", email: "nina.k@example.com" },
  { id: "t-petra", displayName: "Petra Wiklund", email: "petra.w@example.com", preferredLanguage: "Swedish" },
];

interface R {
  id: string; code: string; card: string; talent: string; text: string; date: string;
  lang?: string; tr?: string; ai?: boolean;
}
const mk = (r: R): Response => ({
  id: r.id, publicCode: r.code, cardId: r.card, talentId: r.talent, text: r.text,
  originalLanguage: r.lang ?? "English",
  ...(r.tr ? { translatedText: r.tr } : {}),
  aiAssisted: r.ai ?? false,
  createdAt: `2026-11-${r.date}T12:00:00.000Z`,
});

const FLUFF_1 = "As a passionate, results-driven professional, I thrive in dynamic environments and leverage synergies to deliver scalable, data-driven solutions. My proven track record of cross-functional collaboration positions me to drive impactful outcomes. I am eager to bring my holistic approach and strong communication skills to your innovative team.";
const FLUFF_2 = "I am a highly motivated self-starter with a keen eye for detail and a passion for innovation. I would leverage cutting-edge methodologies and best practices to unlock value and optimise processes end to end. I am confident that my adaptable mindset and commitment to excellence make me an ideal fit for this exciting opportunity.";
const FLUFF_3 = "Data is the new oil, and I am uniquely positioned to harness its transformative potential. By fostering a culture of continuous improvement and aligning stakeholders around a shared vision, I will deliver robust, future-ready insights. I look forward to contributing to your mission of a sustainable tomorrow.";

const responses: Response[] = [
  // ---- card-cleantech: 7 seeded (3 strong, 1 vague, 3 fluff). Olena has none here. ----
  mk({ id: "r-c1", code: "A7", card: "card-cleantech", talent: "t-mika", date: "15",
    text: "I ran a goods-in warehouse for six years, and scanners lie in predictable ways: dirty lenses, a cable that only fails when the forklift passes. I would first log every reading next to the operator's own verdict for one shift, then look for sensors that disagree with people in the same direction every time. Those are probably hardware, not batteries. I would fix one cable problem quickly so the operators see their feedback matters." }),
  mk({ id: "r-c2", code: "B3", card: "card-cleantech", talent: "t-priya", date: "16",
    text: "I left a physics PhD after two years of calibrating noisy detectors, which is roughly this problem. I would start by plotting each sensor generation separately and checking whether the oddities cluster by device, time of day or battery type. If they cluster by device it is the instrument. I would also ask the leavers' old colleagues what the sensors were meant to do and write that down, even if it is only half remembered." }),
  mk({ id: "r-c3", code: "C2", card: "card-cleantech", talent: "t-ville", date: "17", lang: "Finnish", ai: true,
    text: "Olen työskennellyt sähköasentajana ja huoltotehtävissä kahdeksan vuotta. Menisin ensin linjalle ja katsoisin, miten operaattorit käyttävät mittareita oikeasti. Tarkistaisin kaapeloinnit ja liittimet ennen kuin epäilisin dataa, koska kymmenen ongelmasta kahdeksan on yleensä johdoissa. Sen jälkeen kirjaisin viikon lukemat ja vertaisin niitä operaattorien arvioihin.",
    tr: "I have worked as an electrician and in maintenance roles for eight years. I would go to the line first and watch how the operators really use the readings. I would check the cabling and connectors before suspecting the data, because eight problems in ten are usually in the wires. After that I would log a week of readings and compare them with the operators' judgements." }),
  mk({ id: "r-c4", code: "D5", card: "card-cleantech", talent: "t-noor", date: "18",
    text: "I think data quality is really important and I would look at the sensors and try to make the data better. Communication with the team is key. I am a quick learner and would work hard to understand the problem." }),
  mk({ id: "r-c5", code: "F1", card: "card-cleantech", talent: "t-kasper", date: "18", text: FLUFF_1 }),
  mk({ id: "r-c6", code: "G8", card: "card-cleantech", talent: "t-omar", date: "19", text: FLUFF_2 }),
  mk({ id: "r-c7", code: "H4", card: "card-cleantech", talent: "t-nina", date: "20", text: FLUFF_3 }),

  // ---- card-game ----
  mk({ id: "r-g1", code: "A2", card: "card-game", talent: "t-leena", date: "13",
    text: "I am a returning parent and my kids play puzzle games on whatever old phone is in the drawer. I would borrow three cheap phones and play level 12 with a stopwatch, because slow loading on old devices feels like difficulty. Then I would ask five people who quit what they were doing just before, since 'too hard' is often really 'I was interrupted and lost my place'." }),
  mk({ id: "r-g2", code: "B6", card: "card-game", talent: "t-yuki", date: "14",
    text: "Two things are happening at once, so I would try to pull them apart. Compare players on fast and slow devices at level 12: if only the slow ones quit, it is loading. If both quit, look at the recordings for the same repeated mistake. I did this once on a bootcamp project for a quiz app and the answer was a confusing hint button, not difficulty." }),
  mk({ id: "r-g3", code: "C9", card: "card-game", talent: "t-sofia", date: "14", lang: "Spanish", ai: true,
    text: "Jugaría el nivel 12 yo misma en tres teléfonos y anotaría exactamente dónde me desespero. Después hablaría con jugadores que lo dejaron, sin preguntar si era difícil, solo qué hacían en ese momento. Trabajé años como profesora, así que sé que la gente casi nunca dice la causa real a la primera.",
    tr: "I would play level 12 myself on three phones and note exactly where I get frustrated. Then I would talk to players who stopped, not asking whether it was hard, just what they were doing at that moment. I worked for years as a teacher, so I know people almost never give the real cause the first time." }),
  mk({ id: "r-g4", code: "D1", card: "card-game", talent: "t-tomas", date: "15",
    text: "I love games and I think the key is the player experience. I would look at the analytics and see what players want. Good design makes players happy." }),

  // ---- card-game2 ----
  mk({ id: "r-h1", code: "A4", card: "card-game2", talent: "t-carmen", date: "20", lang: "Spanish",
    text: "He trabajado como traductora técnica y el problema casi siempre es que no vemos la pantalla. Pediría capturas de los diez textos que más se rompen y una lista de cuántos caracteres caben en cada botón. Una comprobación automática de longitud, con margen para alemán y finés, probablemente evitaría la mayoría de errores.",
    tr: "I have worked as a technical translator and the problem is almost always that we do not see the screen. I would ask for screenshots of the ten strings that break most and a list of how many characters fit in each button. An automatic length check, with room for German and Finnish, would probably prevent most errors." }),
  mk({ id: "r-h2", code: "B8", card: "card-game2", talent: "t-ivan", date: "20",
    text: "I would sort the last three releases' bugs into overflow, missing placeholders and wrong context. In my last job in a support team I did the same with tickets and one cause was 60 percent of everything. I expect here a quick script that flags strings over a length budget or missing a placeholder would be the cheapest first step." }),
  mk({ id: "r-h3", code: "C3", card: "card-game2", talent: "t-hanna", date: "21", lang: "Finnish",
    text: "Kävisin ensin läpi viimeisten julkaisujen virheet ja ryhmittelisin ne syyn mukaan. Olen opiskellut kielitiedettä ja tiedän, että suomen sanat ovat usein paljon pidempiä kuin englannin. Ehdottaisin, että kääntäjät näkevät kuvakaappauksen jokaisesta tekstistä, koska silloin virheet jäävät kiinni ennen testausta." }),

  // ---- card-medtech ----
  mk({ id: "r-m1", code: "A5", card: "card-medtech", talent: "t-liisa", date: "11",
    text: "I worked nights as a care assistant for five years, so I know the sound of an alarm you stop hearing. I would ask nurses to talk me through the last shift: which beeps made them move and which made them sigh. Then I would compare that list with the logs to find the alarms nobody acts on. I would not remove any of them, only suggest which to look at more closely with clinicians." }),
  mk({ id: "r-m2", code: "B1", card: "card-medtech", talent: "t-olena", date: "12", lang: "Ukrainian", ai: true,
    text: "Я працювала медсестрою в Харкові, тому добре знаю втому від сигналів. Спочатку я б пройшла одну зміну в палаті й записала, на які тривоги реагують одразу, а які просто вимикають. Потім я порівняла б це з журналами пристрою. Важливо нічого не приховувати без клінічного погодження, а лише показати, де шум найбільший.",
    tr: "I worked as a nurse in Kharkiv, so I know alarm fatigue well. First I would follow one ward shift and write down which alarms people respond to immediately and which they just switch off. Then I would compare this with the device logs. It is important not to hide anything without clinical agreement, only to show where the noise is greatest." }),
  mk({ id: "r-m3", code: "C7", card: "card-medtech", talent: "t-elias", date: "12",
    text: "I come from technical writing for aircraft maintenance, where a warning that is ignored is also a design problem. I would collect the alarm texts and sort them by what action the nurse should take. If two alarms look the same but need different actions, that is where mistakes happen. I would draft clearer wording and test it with two or three nurses." }),
  mk({ id: "r-m4", code: "D4", card: "card-medtech", talent: "t-amara", date: "13",
    text: "I would interview ward staff about alarms, review the logs and recommend ways to reduce unnecessary alerts. I have strong analytical skills from my statistics degree and can present findings clearly to stakeholders. I would also keep patient safety as the top priority throughout." }),

  // ---- card-saas ----
  mk({ id: "r-s1", code: "A3", card: "card-saas", talent: "t-petra", date: "14",
    text: "I ran a small bookkeeping firm and I know why people stall at bank connection: they do not have the login to hand, or they fear giving access. I would tag tickets by that single question first, 'was the person blocked by trust, by a missing credential, or by an error?'. Three piles will tell you more than reading everything twice." }),
  mk({ id: "r-s2", code: "B5", card: "card-saas", talent: "t-joonas", date: "15",
    text: "Bootcamp grad, but before that I worked in a phone shop for four years, so I read confused customers for a living. I would export tickets to a spreadsheet and read the first line of each, label it, then count. In the customer calls I would watch them click through onboarding silently and only ask afterwards where they hesitated." }),
  mk({ id: "r-s3", code: "C6", card: "card-saas", talent: "t-sofia", date: "16", lang: "Spanish",
    text: "Como profesora de adultos aprendí que las personas dicen 'no funciona' cuando no entienden el siguiente paso. Agruparía los tickets según lo que la persona intentaba hacer, no según lo que escribió. Después pediría ver la pantalla de dos clientes mientras conectan el banco, porque ahí se ven las dudas.",
    tr: "As an adult-education teacher I learned that people say 'it does not work' when they do not understand the next step. I would group tickets by what the person was trying to do, not by what they wrote. Then I would ask to see two customers' screens while they connect the bank, because that is where the doubts show.",
    ai: true }),
  mk({ id: "r-s4", code: "D8", card: "card-saas", talent: "t-kasper", date: "16",
    text: "Customer success is about understanding users. I would leverage data to find pain points and collaborate with product to improve the onboarding journey. Listening is key." }),

  // ---- card-saas2 ----
  mk({ id: "r-i1", code: "A6", card: "card-saas2", talent: "t-dmytro", date: "18", lang: "Ukrainian",
    text: "Я працював бухгалтером і щодня отримував експорти зі старих систем. Я б узяв п'ятдесят файлів і для кожного записав, що саме ламається: об'єднані клітинки, формат дати чи роздільник. Швидше за все, десять причин пояснять майже все. Автоматично я б спочатку виправляв дати й роздільники, бо це найменш ризиковано.",
    tr: "I worked as an accountant and received exports from old systems every day. I would take the fifty files and for each write down exactly what breaks: merged cells, date format or separator. Most likely ten causes explain nearly everything. I would automate dates and separators first because that is the least risky.",
    ai: true }),
  mk({ id: "r-i2", code: "B2", card: "card-saas2", talent: "t-yuki", date: "19",
    text: "I would build a table: one row per file, one column per problem found. After fifty files the common patterns are obvious. I would keep every fix behind a test that uses the original ugly file, so a new fix cannot silently break an old customer. I have done this kind of cleanup on survey data for a research assistant job." }),
  mk({ id: "r-i3", code: "C1", card: "card-saas2", talent: "t-omar", date: "19",
    text: "I am detail oriented and enjoy working with data. I would review the files and find the issues, then work with the team to fix them. I am a fast learner and a good communicator." }),

  // ---- card-logistics ----
  mk({ id: "r-l1", code: "A1", card: "card-logistics", talent: "t-mika", date: "17",
    text: "I led a goods-in team and the missing-pallet problem is nearly always at handover: the night shift scans, the day shift moves, nobody scans again. I would walk the whole route from dock door to truck on a night shift and mark where a pallet is put down without a scan. A floor sticker at the awkward corner might fix more than any software." }),
  mk({ id: "r-l2", code: "B4", card: "card-logistics", talent: "t-ville", date: "17", lang: "Finnish",
    text: "Olin trukinkuljettajana kuusi vuotta. Tiedän, että lavoja jää väliaikaisesti paikkoihin, joita järjestelmä ei tunne, kun kiire on suuri. Seuraisin yhden lavan matkaa ovelta lähtölavalle ja kirjaisin, missä kohdassa se pysähtyy ilman skannausta. Kysyisin myös kuljettajilta, mihin kohtaan he laittavat lavat silloin, kun paikka on täynnä.",
    tr: "I was a forklift driver for six years. I know pallets get left temporarily in places the system does not know about when it is busy. I would follow one pallet's journey from the door to the outbound pallet position and note where it stops without a scan. I would also ask drivers where they put pallets when the spot is full.",
    ai: true }),
  mk({ id: "r-l3", code: "C5", card: "card-logistics", talent: "t-aino", date: "18",
    text: "I would take two shifts, one day and one night, and follow pallets on foot with a notebook. I studied geography and spent a summer counting traffic by hand, which taught me that patterns appear only if you watch for a long time. My first proposal would be one marked drop zone for pallets waiting for a truck." }),
  mk({ id: "r-l4", code: "D7", card: "card-logistics", talent: "t-petra", date: "19",
    text: "Efficient logistics depends on process optimisation and visibility. I would analyse the supply chain and identify bottlenecks using lean principles. Continuous improvement is a passion of mine." }),

  // ---- card-robotics ----
  mk({ id: "r-b1", code: "A8", card: "card-robotics", talent: "t-ivan", date: "21",
    text: "I repaired vacuum equipment for a living, so I would look at the cups first: worn lips and cheap hoses cause half of all grip problems. Then I would fix the test: same twenty parcels, same lighting, and every pick logged as pass or fail with a photo. Only after that I would change one thing at a time, such as softer cups for plastic bags." }),
  mk({ id: "r-b2", code: "B7", card: "card-robotics", talent: "t-priya", date: "21",
    text: "Because the failures are noisy, I would decide before testing how many picks I need per condition, say two hundred, so I do not chase luck. I would run wet and dry parcels in alternating order to avoid the humidity drifting during the day. A research background taught me that a fair test matters more than a clever fix." }),
  mk({ id: "r-b3", code: "C4", card: "card-robotics", talent: "t-carmen", date: "21", lang: "Spanish",
    text: "Soy ingeniera mecánica y he trabajado en un taller de prototipos. Montaría una mesa de pruebas con veinte paquetes difíciles y registraría cada intento con vídeo. Probaría primero cambiar el ángulo de aproximación, porque es gratis, y después ventosas más blandas para las bolsas brillantes.",
    tr: "I am a mechanical engineer and have worked in a prototype workshop. I would set up a test table with twenty difficult parcels and record every attempt on video. I would try changing the approach angle first because it is free, and then softer cups for the glossy bags.",
    ai: true }),
];

const SEED_AT = "2026-11-01T09:00:00.000Z";
const CONTACTS: Record<string, string> = {
  "co-game": "Riikka Halonen",
  "co-cleantech": "Taneli Aaltonen",
  "co-medtech": "Sanna Peltola",
  "co-saas": "Jonas Berg",
  "co-logistics": "Eero Mattila",
  "co-robotics": "Helmi Kask",
};
const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, "");
const accounts: Account[] = [
  ...companies.map((c): Account => ({
    id: `acc-${c.id.replace("co-", "co-")}`,
    email: `hiring@${slug(c.name)}.example`,
    role: "company",
    displayName: CONTACTS[c.id] ?? "Hiring contact",
    companyId: c.id,
    createdAt: SEED_AT,
  })),
  ...talents.map((t): Account => ({
    id: `acc-${t.id}`,
    email: t.email.trim().toLowerCase(),
    role: "talent",
    displayName: t.displayName,
    talentId: t.id,
    createdAt: SEED_AT,
  })),
  { id: "acc-organiser", email: "events@talentday.example", role: "organiser", displayName: "Event team", createdAt: SEED_AT },
];

export const seed: DB = {
  accounts,
  companies,
  cards,
  talents,
  responses,
  shortlists: [
    { id: "sl-1", cardId: "card-game", responseId: "r-g1", status: "invited", note: "Practical, plans to test on old phones." },
    { id: "sl-2", cardId: "card-game", responseId: "r-g3", status: "invited" },
    { id: "sl-3", cardId: "card-medtech", responseId: "r-m2", status: "accepted", note: "Clinical experience, careful about safety." },
    { id: "sl-4", cardId: "card-medtech", responseId: "r-m1", status: "invited" },
    { id: "sl-5", cardId: "card-logistics", responseId: "r-l1", status: "invited" },
  ],
  meetings: [
    { id: "mt-1", cardId: "card-medtech", responseId: "r-m2", slotStart: "", table: 0 },
  ],
  event: { id: "ev-1", name: "Espoo Tech Talent Day", date: "2026-12-05", startTime: "10:00", endTime: "14:00", slotMinutes: 10, tables: 6 },
  feedback: [],
};
