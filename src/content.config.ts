import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/** One print on the line = one project. The Markdown body is the brief. */
const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      order: z.number(),
      client: z.string(),
      type: z.string(),
      year: z.string(),
      role: z.array(z.string()),
      stack: z.array(z.string()),
      url: z.url(),
      summary: z.string(),
      cover: image(),
      alt: z.string(),
      /** Resting angle on the peg (deg) and how far below the wire it hangs (px). */
      tilt: z.number().default(0),
      drop: z.number().default(0),
      process: z.array(z.string()),
      results: z.array(z.object({ value: z.string(), label: z.string() })),
    }),
});

export const collections = { work };
