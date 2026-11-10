// @ts-check
import { defineConfig } from 'astro/config';

// GitHub Pages project site. Override with SITE_URL / BASE_PATH for other hosts.
const site = process.env.SITE_URL ?? 'https://landvaluetaxfan.github.io';
const base = process.env.BASE_PATH ?? '/The-Light-of-Other-Stars';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  compressHTML: true,
  devToolbar: { enabled: false },
});
