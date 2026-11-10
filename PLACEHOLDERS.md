# Placeholders

Everything on the site that still needs real content. Placeholders show on the page in `[square brackets]` (styled in safelight red where they're inline), so a quick visual pass finds them too.

## Personal facts

| What | Where | Now |
|---|---|---|
| Availability date | `src/data/site.ts` → `site.availability` | `[Jan 2027]` |
| Reply time | `src/data/site.ts` → `site.replyTime` | `[within 24 hours]` |
| Languages you work in | `src/components/home/About.astro` → facts list | `[Russian, English]` |
| Two or three more bio sentences, in your own words | `src/components/home/About.astro` → `.about-text` | `[Two or three more sentences…]` |
| Certificate years (Stepik, Sirius, VK) | `src/data/site.ts` → `credentials` | `[2022]`, `[2024]` |
| Budget ranges for the brief form | `src/components/home/Contact.astro` → `budgets` | `[Under $1,000]` … `[$10,000+]` |
| Durations of the six steps | `src/data/site.ts` → `steps` | `[1 call]`, `[1–2 weeks]` … |

## Portrait

`src/components/home/About.astro` shows an "unexposed" Frame 07 sheet. To use a real photo:

1. Save it as `src/assets/portrait.jpg` (portrait orientation, at least 1200 px tall).
2. Replace the `.portrait-sheet` div with
   `<Image src={portrait} alt="Omar Karaf" widths={[480, 800, 1200]} sizes="(min-width: 960px) 34vw, 90vw" data-develop="2.4" />`
   and import it at the top: `import portrait from '../../assets/portrait.jpg';`. `data-develop` makes it develop in like the prints.

## Projects (`src/content/work/*.md`)

Each file's Markdown body is the brief ("The latent image") and is a **draft written from the screenshots**. Confirm or rewrite it.

| Project | Missing |
|---|---|
| Harmony Coffee | `results`: Lighthouse score, LCP |
| ESOES | `results`: plays in release week, listening time |
| Melty | `stack`; third `process` step (how the menu is managed); `results` |
| Galereya | `year`, `stack`; `results` |
| Master Auto | `year`, `stack`; two `process` steps (services/pricing, booking); `results` |

Case-study galleries also have two empty frames each (`Frame B · [mobile screens]`, `Frame C · [a detail or interaction]`) in `src/pages/work/[slug].astro`. Add a `screens` list to the collection schema when you have the images, or swap the two `case-shot--todo` figures for `<Image>`s.

## Demo data in "What I develop"

`src/components/home/Services.astro`. These are labelled "example data" on the page, but real numbers from a client project would be stronger:

- **Automations:** the four log lines in `<template data-log-lines>`.
- **AI:** the customer question, the answer, and `Tested on [250] real questions`.

## Before going live

- **Netlify Forms:** after the first deploy, open *Site → Forms → contact* and add an email notification so briefs reach your inbox.
- **Domain:** `site` in `astro.config.mjs`, `site.url` in `src/data/site.ts` and the sitemap line in `public/robots.txt` all say `https://okaraf.netlify.app`. Change all three if you deploy elsewhere (e.g. okaraf.ru).
- **Social image:** `public/og/okaraf.jpg` is a real capture of the hero (1200×630). Re-capture it if the hero changes.
