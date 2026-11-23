# Time Is Money — Design brief

Sources studied (2026-11-23): Anthropic `frontend-design` skill, Draftbit `mobile-taste` /
`mobile-design-review` (React Native, "AI tells" catalog + rubric), `ios-taste` (pproenca/dot-skills),
`ios-ui-craft` (Prisma-Labs-Dev/apple-skills), Apple HIG. Process used: App Read → plan →
review the plan against generic defaults → build → screenshot critique.

## App Read
- Kind: personal utility with a money lens (screen time ↔ yen). Audience: the person who just
  unlocked their phone "for a minute". Moment: a glance, under 5 seconds.
- Feeling: **honest and slightly sobering, never preachy**. Calm surface, one pointed number.
- Primary job (one thing): *see what today's phone time cost, in yen.* Secondary: limits.
- Dials (Draftbit): EXPRESSION 4 (branded-native: own tokens, native chrome), MOTION 3,
  DENSITY 4. Platform posture: iOS-first.

## 0.5-second test
`// 0.5s: one large yen figure over an hour ruler on a quiet page — "this is costing me"`
If the first glance is "a list of rows" or "the app's name", it failed.

## Concept: the meter
A taxi meter / electricity meter for attention. The single bold move (signature element) is the
**yen figure + hour ruler**: rounded tabular numerals, and a 0–24h ruler with ticks at every 2h —
the exact points where the yen notification fires — filled up to today's usage. Everything else
stays quiet.

## Tokens
Color (one accent, one gray family = iOS system grays, dark mode first-class via DynamicColorIOS):

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `accent` (copper) | `#A8541A` | `#F0A35E` | the only interactive/brand color; meter fill |
| `accentSoft` | `#A8541A1F` | `#F0A35E29` | fills behind accent (ruler track, selected chip) |
| background | systemBackground | systemBackground | main pages (white / black) |
| grouped | systemGroupedBackground | same | forms & settings only |
| text | label / secondaryLabel / tertiaryLabel | same | |
| destructive | systemRed | systemRed | delete / unlock only |

Why copper: cost, coins, warmth without the "indigo pipeline" or acid-green defaults; ≥4.5:1 on
white for text use. Status colors (green/red) are used only with icon+text.

Type: SF Pro (system) for UI; **SF Pro Rounded, tabular figures** for money and durations only.
Scale: display 56 (the meter, once per screen), title 22, headline 17, body 17, footnote 13.
No ALL-CAPS labels, no eyebrow labels, no "big bold title + gray subtitle" opener on every screen.

Shape: radius scale 10 (controls) / 14 (groups). No shadows. Grouping by whitespace and hairlines
first; inset groups only for forms/settings.

## Layout
```
Home (no tab bar: two destinations do not justify one)
┌───────────────────────────────┐
│ 今日 11月23日(月)          ⚙︎ │  quiet header row, settings behind a gear
│ [今日｜今週｜累計]             │  native segmented
│                               │
│  ¥4,350                       │  meter (rendered by the report extension)
│  2時間54分 ・ 1,500円/時       │
│  |··|··|··|··|··|··|··|··|··| │  0–24h ruler, ticks every 2h
│  次のお知らせまで 1時間06分    │
│                               │
│ 制限                     編集 │  sentence-case heading, one action
│ X        20分   ロック中      │  rows: name, today's limit, state
│ YouTube  1時間  あと…          │
│ ＋ 制限を追加                  │
│                               │
│ 全制限を一括解除               │  quiet destructive text, last
└───────────────────────────────┘
```
Left aligned throughout. Screen padding 20. Settings: pushed screen, inset grouped, no icon tiles.

## Review against generic defaults (what I changed from the first redesign, and why)
- Large app-name title on Home → removed; the number is the hero (0.5s test).
- Indigo accent → copper (Draftbit tell 2 "indigo pipeline").
- Tinted icon chip on every row → removed (tell 4); text rows, naked symbols only where they carry meaning.
- Card on card on card → whitespace and hairlines (tell 3); cards only for the meter placeholder.
- Settings tab → gear in the header (tell 25); tab bar removed (2 destinations).
- Explanatory paragraphs on every screen → one line max, in place, only where a decision is made.
- Onboarding: kept 3 steps but each is personalization or a permission prime (allowed); page 1 is a
  live value demo (type your rate, see the meter react), not a hero icon + title + paragraph.
- No em dashes in UI strings; "—" placeholders replaced.
- Alert only for destructive confirmation (action sheets); errors inline.

## Quality floor
44pt targets, Dynamic Type (body unbounded, display capped ×1.3), VoiceOver labels on every
pressable (row label = all visible text), reduced motion respected, dark mode parity, no
synchronous native calls during render.
