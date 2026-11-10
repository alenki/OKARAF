export type Theme = 'safelight' | 'lights';
export type Vec3 = [number, number, number];

/** Colours the WebGL hero tray uses. */
export interface TrayLook {
  bg: Vec3;
  pageBg: Vec3;
  paper: Vec3;
  ink: Vec3;
  light: Vec3;
  lightAmt: number;
  glow: number;
  fog: number;
  vignette: number;
  shadow: number;
}

/** Colours a developing print uses before it reaches full colour. */
export interface PrintLook {
  paper: Vec3;
  ink: Vec3;
}

const hex = (h: string): Vec3 => {
  const n = parseInt(h.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** Safelight is the darkroom (treatment A). Lights is the room with the lights on (treatment B). */
export const LOOKS: Record<Theme, { tray: TrayLook; print: PrintLook }> = {
  safelight: {
    tray: {
      bg: hex('#0c0605'),
      pageBg: hex('#0d0c0b'),
      paper: hex('#b9412f'),
      ink: hex('#170504'),
      light: hex('#ff4b2e'),
      lightAmt: 0.85,
      glow: 1,
      fog: 0.5,
      vignette: 0.55,
      shadow: 0.5,
    },
    print: { paper: hex('#8f2c20'), ink: hex('#150504') },
  },
  lights: {
    tray: {
      bg: hex('#e7e1d6'),
      pageBg: hex('#efeae1'),
      paper: hex('#f8f6f1'),
      ink: hex('#0d0c0b'),
      light: hex('#ffffff'),
      lightAmt: 0.6,
      glow: 0,
      fog: 0.32,
      vignette: 0.08,
      shadow: 0.16,
    },
    print: { paper: hex('#f9f7f2'), ink: hex('#0d0c0b') },
  },
};

const KEY = 'okaraf-theme';

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'lights' ? 'lights' : 'safelight';
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* private mode: the choice just isn't remembered */
  }
  window.dispatchEvent(new CustomEvent<Theme>('okaraf:theme', { detail: theme }));
}

/** Blend helper for looks: same shape in, same shape out. */
export function mixLook<T extends object>(a: T, b: T, t: number): T {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(a) as (keyof T & string)[]) {
    const va = a[key] as unknown;
    const vb = b[key] as unknown;
    if (Array.isArray(va) && Array.isArray(vb)) out[key] = va.map((v: number, i: number) => v + ((vb[i] as number) - v) * t);
    else if (typeof va === 'number' && typeof vb === 'number') out[key] = va + (vb - va) * t;
    else out[key] = t < 0.5 ? va : vb;
  }
  return out as T;
}
