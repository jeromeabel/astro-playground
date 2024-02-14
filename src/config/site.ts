import type { SiteType } from '@/config/site.types';

export const SITE: SiteType = {
  name: 'Astro Playground - API Endpoints',
  description: 'Play with the Astro framework',
  keywords: 'Astro, playground, web, learning',
  icon: '/logo.svg',
  ogImage: {
    src: '/og.png',
    width: 1200,
    height: 630,
    format: 'png',
  },
  themeColor: '#fefefe',
  author: 'Jérôme Abel',
  twitterAcount: '@jeromeabeldev',
  socials: {
    twitter: 'https://twitter.com/',
    facebook: 'https://www.facebook.com/',
    instagram: 'https://www.instagram.com/',
    linkedin: 'https://www.linkedin.com/',
  },
  nav: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
  ],
};
