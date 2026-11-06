import { Montserrat, Plus_Jakarta_Sans, Fasthand } from 'next/font/google';

export const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

export const fasthand = Fasthand({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

