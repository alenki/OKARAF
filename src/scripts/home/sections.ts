import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import type { App } from '../app';
import type { DevelopItem } from '../stage/Develop';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Manifesto: words develop out of the dark as you read down the page. */
export function initManifesto(app: App) {
  const section = document.querySelector<HTMLElement>('[data-manifesto]');
  const text = section?.querySelector<HTMLElement>('[data-manifesto-text]');
  if (!section || !text || app.reduced) return;
  // Split and dim only as it nears the viewport, so the paragraph is plain text until then.
  ScrollTrigger.create({
    trigger: text,
    start: 'top bottom',
    once: true,
    onEnter: () => {
      const split = SplitText.create(text, { type: 'words', wordsClass: 'mword', aria: 'none' });
      const thumbs = section.querySelectorAll<HTMLElement>('.thumb');
      const scrollTrigger = { trigger: text, start: 'top 78%', end: 'bottom 52%', scrub: true };
      gsap.fromTo(split.words, { opacity: 0.12 }, { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger });
      gsap.fromTo(thumbs, { '--dev': 0 }, { '--dev': 1, ease: 'none', stagger: 0.25, scrollTrigger });
    },
  });
}

/** "Websites": a wireframe that develops into the finished site as you scroll past it. */
function initPrintDemo(app: App, demo: HTMLElement) {
  const img = demo.querySelector<HTMLImageElement>('img');
  const wireframe = demo.querySelector<HTMLElement>('[data-wireframe]');
  const paper = demo.querySelector<HTMLElement>('.demo-print-paper') ?? demo;
  if (!img) return;
  const item: DevelopItem = { img, seed: 7.7, progress: app.reduced ? 1 : 0, hover: 0, visible: false, cx: 0, cy: 0, w: 0, h: 0, rot: 0 };
  app.develop?.add(item);
  if (app.reduced) {
    paper.style.setProperty('--dev', '1');
    if (wireframe) wireframe.style.opacity = '0';
    return;
  }
  const st = ScrollTrigger.create({ trigger: demo, start: 'top 82%', end: 'center 42%' });
  app.onFrame(() => {
    const r = img.getBoundingClientRect();
    item.visible = r.bottom > -100 && r.top < app.viewport.height + 100;
    item.cx = r.left + r.width / 2;
    item.cy = r.top + r.height / 2;
    item.w = r.width;
    item.h = r.height;
    const p = st.progress;
    if (Math.abs(p - item.progress) > 0.0005) {
      item.progress = p;
      // The paper border turns white with the shader's colour phase (0.72 -> 1).
      const c = Math.min(1, Math.max(0, (p - 0.72) / 0.28));
      paper.style.setProperty('--dev', (c * c * (3 - 2 * c)).toFixed(3));
      if (wireframe) wireframe.style.opacity = String(Math.max(0, 1 - p * 1.6));
    }
  });
}

/** "Automations": an example order runs through the pipeline on a loop while it's on screen. */
function initPipelineDemo(app: App, demo: HTMLElement) {
  const steps = [...demo.querySelectorAll<HTMLElement>('[data-step]')];
  const log = demo.querySelector<HTMLElement>('[data-log]');
  const lines = [...(demo.querySelector<HTMLTemplateElement>('[data-log-lines]')?.content.querySelectorAll('li') ?? [])].map(
    (li) => li.textContent ?? '',
  );
  if (!steps.length) return;
  if (app.reduced) {
    for (const s of steps) s.classList.add('is-done');
    if (log) log.textContent = lines.join('\n');
    return;
  }
  const typeLine = (text: string) => {
    if (!log) return;
    const row = document.createElement('span');
    log.append(row, '\n');
    const state = { n: 0 };
    gsap.to(state, {
      n: text.length,
      duration: Math.min(0.9, text.length * 0.018),
      ease: 'none',
      onUpdate: () => void (row.textContent = text.slice(0, Math.round(state.n))),
    });
  };
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 2.2 });
  tl.call(() => {
    for (const s of steps) s.classList.remove('is-on', 'is-done');
    if (log) log.textContent = '';
  });
  steps.forEach((step, i) => {
    tl.call(() => step.classList.add('is-on'), [], i * 1.05 + 0.3);
    tl.call(() => typeLine(lines[i] ?? ''), [], i * 1.05 + 0.35);
    tl.call(() => step.classList.replace('is-on', 'is-done'), [], i * 1.05 + 0.95);
  });
  tl.to({}, { duration: 0.6 });
  ScrollTrigger.create({
    trigger: demo,
    start: 'top 85%',
    end: 'bottom 15%',
    onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
  });
}

/** "AI": a question goes into the latent space; the answer develops out of the noise. */
function initLatentDemo(app: App, demo: HTMLElement) {
  const question = demo.querySelector<HTMLElement>('[data-question]');
  const answer = demo.querySelector<HTMLElement>('[data-answer]');
  const canvas = demo.querySelector<HTMLCanvasElement>('[data-noise]');
  if (!question || !answer || !canvas) return;
  const qText = question.textContent ?? '';
  const aText = answer.textContent ?? '';
  if (app.reduced) return;

  // A small 1-bit noise field, ordered-dithered like the hero.
  const ctx = canvas.getContext('2d');
  const W = (canvas.width = 120);
  const H = (canvas.height = 36);
  const image = ctx?.createImageData(W, H);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const noise = { amount: 0, t: 0 };
  let active = false;
  let rgb = [229, 50, 30];
  const readColour = () => {
    const on = getComputedStyle(demo).getPropertyValue('--noise-on').trim();
    if (/^#[0-9a-f]{6}$/i.test(on)) rgb = [1, 3, 5].map((i) => parseInt(on.slice(i, i + 2), 16));
  };
  readColour();
  app.onTheme(() => requestAnimationFrame(readColour));
  app.onFrame((_time, dt) => {
    if (!active || !ctx || !image) return;
    noise.t += dt;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const v =
          0.5 +
          0.25 * Math.sin(x * 0.21 + noise.t * 2.1 + Math.sin(y * 0.3 + noise.t)) +
          0.25 * Math.sin(y * 0.37 - noise.t * 1.6 + Math.cos(x * 0.13));
        const threshold = (bayer[(y % 4) * 4 + (x % 4)]! + 0.5) / 16;
        const lit = v * noise.amount > threshold;
        const o = (y * W + x) * 4;
        image.data[o] = rgb[0]!;
        image.data[o + 1] = rgb[1]!;
        image.data[o + 2] = rgb[2]!;
        image.data[o + 3] = lit ? 255 : 0;
      }
    }
    ctx.putImageData(image, 0, 0);
  });

  const glyphs = '░▒▓█/\\#%&*+=';
  const scramble = (el: HTMLElement, text: string, p: number) => {
    let out = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      const at = i / text.length;
      if (ch === ' ' || p > at + 0.08) out += ch;
      else if (p > at - 0.12) out += glyphs.charAt(Math.floor(Math.random() * glyphs.length));
      else out += ' ';
    }
    el.textContent = out;
  };

  const tl = gsap.timeline({ paused: true });
  const q = { p: 0 };
  const a = { p: 0 };
  tl.call(() => {
    answer.textContent = '';
    question.textContent = '';
  })
    .to(q, { p: 1, duration: 1.1, ease: 'none', onUpdate: () => void (question.textContent = qText.slice(0, Math.round(q.p * qText.length))) })
    .to(noise, { amount: 1, duration: 0.5, ease: 'power2.out' })
    .to(noise, { amount: 1, duration: 0.9 })
    .to(a, { p: 1, duration: 1.8, ease: 'power1.inOut', onUpdate: () => scramble(answer, aText, a.p) })
    .to(noise, { amount: 0.18, duration: 1.2, ease: 'power2.inOut' }, '<+0.3');

  ScrollTrigger.create({
    trigger: demo,
    start: 'top 78%',
    end: 'bottom 10%',
    onEnter: () => {
      active = true;
      q.p = 0;
      a.p = 0;
      noise.amount = 0;
      tl.restart();
    },
    onEnterBack: () => void (active = true),
    onLeave: () => void (active = false),
    onLeaveBack: () => {
      active = false;
      tl.pause(0);
      question.textContent = qText;
      answer.textContent = aText;
    },
  });
}

/** Services: titles pull into focus, and each one runs its own small demonstration. */
export function initServices(app: App) {
  for (const focus of document.querySelectorAll<HTMLElement>('[data-focus]')) {
    if (app.reduced) continue;
    const sharp = focus.querySelector('.focus-sharp');
    const soft = focus.querySelector('.focus-soft');
    const scrollTrigger = { trigger: focus, start: 'top 88%', end: 'top 48%', scrub: true };
    gsap.fromTo(sharp, { opacity: 0 }, { opacity: 1, ease: 'none', scrollTrigger });
    gsap.fromTo(soft, { opacity: 1 }, { opacity: 0, ease: 'none', scrollTrigger });
  }
  const print = document.querySelector<HTMLElement>('[data-demo="print"]');
  const pipeline = document.querySelector<HTMLElement>('[data-demo="pipeline"]');
  const latent = document.querySelector<HTMLElement>('[data-demo="latent"]');
  if (print) initPrintDemo(app, print);
  if (pipeline) initPipelineDemo(app, pipeline);
  if (latent) initLatentDemo(app, latent);
}

/** How I work: a timer runs along the six baths as you scroll through them. */
export function initProcess(app: App) {
  const section = document.querySelector<HTMLElement>('[data-process]');
  const steps = [...(section?.querySelectorAll<HTMLElement>('[data-bath]') ?? [])];
  const bar = section?.querySelector<HTMLElement>('[data-process-bar]');
  if (!section || !steps.length || app.reduced) return;
  ScrollTrigger.create({
    trigger: section.querySelector('[data-baths]') ?? section,
    start: 'top 70%',
    end: 'bottom 55%',
    onUpdate: (self) => {
      if (bar) bar.style.transform = `scaleX(${self.progress.toFixed(4)})`;
      const active = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
      steps.forEach((s, i) => {
        s.classList.toggle('is-active', i === active && self.progress > 0);
        s.classList.toggle('is-done', i < active);
      });
    },
  });
}

/** Contact form, posted to Netlify Forms. In dev there's no Netlify, so it pretends. */
export function initForm() {
  const form = document.querySelector<HTMLFormElement>('[data-form]');
  if (!form) return;
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const idle = submit?.textContent ?? 'Send';

  const fieldError = (input: HTMLInputElement | HTMLTextAreaElement) => {
    const error = form.querySelector<HTMLElement>(`[data-error-for="${input.name}"]`);
    let message = '';
    if (input.validity.valueMissing) message = 'This one is needed.';
    else if (input.validity.typeMismatch) message = 'That doesn’t look like an email address.';
    if (error) error.textContent = message;
    input.setAttribute('aria-invalid', String(message.length > 0));
    return message.length === 0;
  };
  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[required]')];
  for (const field of fields) field.addEventListener('blur', () => fieldError(field));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const invalid = fields.filter((f) => !fieldError(f));
    if (invalid.length) {
      invalid[0]?.focus();
      return;
    }
    if (submit) {
      submit.disabled = true;
      submit.textContent = 'Developing…';
    }
    try {
      const body = new URLSearchParams([...new FormData(form).entries()].map(([k, v]) => [k, String(v)])).toString();
      const ok = import.meta.env.DEV
        ? true
        : (await fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })).ok;
      if (!ok) throw new Error('Form post failed');
      form.reset();
      form.classList.add('is-sent');
      if (status) status.textContent = status.dataset.success ?? 'Sent.';
    } catch {
      if (status) status.textContent = status.dataset.failure ?? 'Couldn’t send it.';
    } finally {
      if (submit) {
        submit.disabled = false;
        submit.textContent = idle;
      }
    }
  });
}
