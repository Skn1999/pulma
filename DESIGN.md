# Pulma design language

Pulma is a civic service: a free, public matchmaking tool for recruitment events run by the City of Espoo.
The design should feel like it belongs next to the city's own web services — clear, calm, trustworthy and
accessible to everyone — while staying recognisably its own product.

**Inspiration, not imitation.** The palette and type are inspired by the public design tokens of espoo.fi
(deep navy, a confident civic blue, light blue-grey surfaces, warm peach and pink highlights, Work Sans and
Lato). Pulma never uses the City of Espoo logo, coat of arms or wordmark, and never presents itself as an
official city page. All data in the prototype is fictional.

## Principles
1. **Content on white, on a quiet frame.** Work happens on white surfaces. The frame around them is a light
   tint. Never put the main content on the same colour as the frame.
2. **One confident blue.** `primary` is the only saturated colour for actions and the current location.
   Peach and pink are highlights, never buttons or text.
3. **Square-ish and plain.** Small radii (4–6px), thin borders, one soft shadow level. No gradients, no glass.
4. **Readable first.** Body 16px, small text never below 13px, line height 1.5. Headings are navy, not black.
5. **Never colour alone.** Every state that has a colour also has a word or an icon (Overdue, Expired,
   Employer, Candidate…).
6. **The problem card is the hero object.** It looks like a physical index card: white paper, a 4px blue band
   along the top, a faint blue margin line on the left and a soft paper shadow. (No ruled lines: they never
   line up with real text.)

## Colour tokens
Base (shared by everyone; the event team uses it unchanged):

| Token | Value | Use |
|---|---|---|
| `navy` / `--foreground` heading | `#012169` | Headings, logo, strong text, dark bands |
| `--foreground` | `#1B2333` | Body text |
| `--primary` | `#0050BB` | Buttons, links, current nav item, focus ring |
| `--primary-hover` | `#012169` | Button hover (as on espoo.fi: blue → navy) |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--background` | `#F3F5F8` | App frame behind content |
| `--card` / `--popover` / `--paper` | `#FFFFFF` | Content surfaces, dialogs, cards |
| `--muted` | `#EEF1F5` | Quiet fills (table headers, hover rows) |
| `--muted-foreground` | `#54595D` | Secondary text (6.9:1 on white) |
| `--border` | `#D5DCE5` | Borders and dividers |
| `--input` | `#A7ACB0` | Form field borders (3:1 non-text contrast) |
| `--accent` | `#DFE5EB` | Selected chips, active nav background |
| `--accent-foreground` | `#012169` | Text on accent |
| `--highlight` | `#FFC386` | Peach: "new", markers, focus on dark backgrounds |
| `--highlight-soft` | `#FDE6DB` | Soft peach panels (notes, tips) |
| `--pair` | `#FCA5C7` | Pink: decorative pair colour only |
| `--note` | `#FFDC47` | Yellow notices (with dark text) |
| `--destructive` | `#C8102E` | Errors and destructive actions (5.9:1 on white) |
| `--card-rule` | `#0050BB` | Index-card top band and margin line |

Charts: `#0050BB`, `#012169`, `#5B8BD6`, `#A7ACB0`, `#FFC386`.

### Role variants (subtle)
Same primary, same type. Only the frame tint, the accent surfaces and the highlight change, plus a text
label next to the logo. Scoped with `:root:has([data-role="…"])` so dialogs and menus follow.

| | Employer | Candidate | Event team |
|---|---|---|---|
| Label | "Employer" | "Candidate" | "Event team" |
| Frame `--background` | `#EEF2F7` (cool blue-grey) | `#FBF3EE` (warm peach-grey) | `#F3F5F8` |
| Sidebar `--sidebar` | `#E4EAF1` | `#FBEAE1` | `#EEF1F5` |
| Accent `--accent` | `#DFE5EB` | `#FDE6DB` | `#DFE5EB` |
| Accent text | `#012169` | `#5A2A10` | `#012169` |
| Highlight | `#FFC386` | `#FCA5C7` | `#FFC386` |

Candidates are mostly on phones and should feel welcomed: warm surfaces. Employers work at desks in long
review sessions: cool, quiet surfaces. Both share the civic blue so the product stays one product.

## Typography
| Role | Font | Size / line | Weight |
|---|---|---|---|
| Display (h1) | Lato | 30px / 1.2 (24px on phones) | 700 |
| Heading (h2) | Lato | 20px / 1.3 | 700 |
| Heading (h3) | Lato | 17px / 1.35 | 700 |
| Body | Work Sans | 16px / 1.5 | 400 |
| UI / labels | Work Sans | 14px / 1.45 | 500 |
| Small | Work Sans | 13px / 1.4 | 400 |
| Eyebrow | Work Sans | 12px, uppercase, +0.06em | 600 |

Headings are navy. Never set running text below 13px. Ukrainian and other Cyrillic text falls back to the
system sans-serif.

## Space, shape, elevation
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48 px. Page gutters 16px (phone) / 24px (desktop).
- Radius: `--radius` 6px (inputs, buttons, cards 6px; chips full pill; dialogs 8px).
- Elevation: one shadow, `0 1px 2px rgb(1 33 105 / .06), 0 4px 12px -4px rgb(1 33 105 / .12)`.
  Cards rest flat with a border; only the problem card and dialogs carry the shadow.

## Components
- **Buttons:** primary = blue fill, white text, hover navy. Secondary = white with `--input` border, navy
  text. Ghost = text only. Minimum 40px tall on desktop, 44px on candidate pages.
- **Links:** primary blue, underlined on hover and always underlined in running text.
- **Focus:** 2px `--ring` outline with 2px offset on light surfaces; peach on dark surfaces.
- **Nav (sidebar):** current item = accent background + 3px primary rule on the left + bold label.
- **Chips / filters:** pill, white with border; selected = accent fill, accent text and a check icon.
- **Status badges:** pill with an icon and a word. Overdue/expired use `--destructive` text on white with a
  border, never red fill alone.
- **Problem card:** white, a 4px `--card-rule` band on top, a faint `--card-rule` margin line on the left,
  title in Lato navy, shadow as above.
- **Event card (identity card):** same paper as the problem card, the code in a monospaced face.

## Accessibility checklist
- Text contrast ≥ 4.5:1 (body) and ≥ 3:1 (large text, icons, borders of inputs).
- Every interactive element reachable by keyboard with a visible focus outline.
- No information conveyed by colour alone; role is always also written.
- Touch targets ≥ 44px on candidate pages; respect `prefers-reduced-motion`.

## Tokens in code
`app/globals.css` holds the tokens as CSS variables (base in `:root`, role variants under
`:root:has([data-role=…])`), mapped to Tailwind via `@theme inline`. Components use the semantic names
(`bg-card`, `text-primary`, `bg-accent`, `border-border`…) and never raw colours.
