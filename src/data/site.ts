/** Everything about Omar that isn't a project. Bracketed values are placeholders (see PLACEHOLDERS.md). */

export const site = {
  name: 'Omar Karaf',
  brand: 'OKARAF',
  title: 'Omar Karaf — Developer',
  description:
    'Omar Karaf builds websites, automations and AI that make a business easy to see and easy to run. Based in Nalchik, working worldwide.',
  url: 'https://okaraf.netlify.app',
  email: 'okaraf07@gmail.com',
  links: {
    whatsapp: 'https://api.whatsapp.com/send?phone=79289996640',
    github: 'https://github.com/alenki',
    codeforces: 'https://codeforces.com/profile/Alenki_',
  },
  location: {
    city: 'Nalchik',
    country: 'Russia',
    coords: '43.49° N, 43.61° E',
    timeZone: 'Europe/Moscow',
    tzLabel: 'GMT+3',
  },
  availability: '[Jan 2027]',
  replyTime: '[within 24 hours]',
};

/** The old marquee, kept: each value with its suit. */
export const values: { word: string; suit: SuitName }[] = [
  { word: 'Fluidity', suit: 'heart' },
  { word: 'Strategy', suit: 'spade' },
  { word: 'Intentionality', suit: 'club' },
  { word: 'Strength', suit: 'diamond' },
  { word: 'Empathy', suit: 'heart' },
  { word: 'Skills', suit: 'spade' },
  { word: 'Intelligence', suit: 'club' },
  { word: 'Power', suit: 'diamond' },
  { word: 'Perfection', suit: 'heart' },
  { word: 'Class', suit: 'spade' },
  { word: 'Focus', suit: 'club' },
  { word: 'Commitment', suit: 'diamond' },
  { word: 'Will', suit: 'heart' },
  { word: 'Integrity', suit: 'spade' },
  { word: 'Courage', suit: 'club' },
  { word: 'Resilience', suit: 'diamond' },
  { word: 'Faith', suit: 'moon' },
  { word: 'Karaf', suit: 'crown' },
];

export type SuitName = 'heart' | 'spade' | 'club' | 'diamond' | 'moon' | 'crown';

export interface Credential {
  title: string;
  issuer: string;
  detail: string;
  year: string;
  file: string; // base name in /public/certificates
}

/** Ordered as an exposure test strip: lightest to densest. */
export const credentials: Credential[] = [
  { title: 'Introduction to Programming (C++)', issuer: 'Stepik', detail: 'Course certificate', year: '[2022]', file: 'stepik_cpp' },
  { title: 'Introduction to Algorithms', issuer: 'Sirius', detail: 'C++ implementation', year: '[2022]', file: 'sirius_algo' },
  { title: 'Russian AI Cup · Qualifying', issuer: 'Russian AI Olympiad', detail: '21st of 8,292', year: '2023', file: 'ai_qualifying_stage' },
  { title: 'Russian AI Cup · Main stage', issuer: 'Russian AI Olympiad', detail: '40th of 462', year: '2023', file: 'ai_main_stage' },
  { title: 'Russian AI Cup · Final', issuer: 'Russian AI Olympiad', detail: 'Finalist, top 50', year: '2023', file: 'ai_final_stage' },
  { title: 'Product Management', issuer: 'VK', detail: 'Course certificate', year: '[2024]', file: 'vk_product' },
];

export const certificateUrl = (file: string, ext: 'pdf' | 'webp') => `/certificates/${encodeURIComponent(file)}.${ext}`;

export interface Service {
  id: 'websites' | 'automations' | 'ai';
  name: string;
  darkroom: string;
  line: string;
  items: string[];
}

export const services: Service[] = [
  {
    id: 'websites',
    name: 'Websites',
    darkroom: 'The print',
    line: 'Sites that make a business look like the best version of itself, and load before you blink.',
    items: ['Brand and portfolio sites', 'Online stores', 'A CMS your team will actually use', 'Performance and SEO, built in'],
  },
  {
    id: 'automations',
    name: 'Automations',
    darkroom: 'In the dark',
    line: 'Systems that quietly do the repetitive work: orders, leads, reports and follow-ups.',
    items: ['Lead and order pipelines', 'Telegram, Sheets, CRM and email, connected', 'Documents that sort themselves', 'Reports that write themselves'],
  },
  {
    id: 'ai',
    name: 'AI',
    darkroom: 'The latent image',
    line: 'Assistants and tools that read, write and decide, with tests that keep them honest.',
    items: ['Customer-facing assistants', 'Search across your own documents', 'Content and data pipelines', 'Evaluation and monitoring'],
  },
];

export interface Step {
  name: string;
  line: string;
  time: string;
}

/** How a project runs, in darkroom order. Durations are placeholders. */
export const steps: Step[] = [
  { name: 'Expose', line: 'A call and a short brief. We find what the business actually needs.', time: '[1 call]' },
  { name: 'Develop', line: 'Design and a working prototype. You see it early, in the browser.', time: '[1–2 weeks]' },
  { name: 'Stop', line: "We review, cut what doesn't earn its place, and lock the scope.", time: '[1–2 days]' },
  { name: 'Fix', line: 'Build and test. Code, content and integrations made permanent.', time: '[2–4 weeks]' },
  { name: 'Wash', line: 'Launch. Fast, clean, indexed and measured from day one.', time: '[1 day]' },
  { name: 'Dry', line: 'Support after launch, so it keeps holding up.', time: '[Ongoing]' },
];
