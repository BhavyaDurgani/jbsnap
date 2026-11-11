import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { NotificationProvider } from '../context/NotificationContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://jbsnap.app'),
  title: {
    default: 'JBSnap: Visual Backend API Builder & Workflow Compiler',
    template: '%s | JBSnap API Builder',
  },
  description: 'Build, deploy, and export production-ready backend APIs in seconds using a visual node DAG graph. Compiles directly into clean Fastify + TypeScript code with zero vendor lock-in.',
  keywords: [
    'visual api builder',
    'no code backend platform',
    'low code backend developer',
    'fastify code generator',
    'api gateway compiler',
    'visual node graph dag',
    'typescript backend builder',
    'JBSnap',
    'open backend architecture',
    'zero vendor lock-in backend'
  ],
  authors: [{ name: 'JBSnap Team', url: 'https://jbsnap.app' }],
  creator: 'JBSnap Engineering',
  publisher: 'JBSnap',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: 'https://jbsnap.app',
  },
  openGraph: {
    title: 'JBSnap: Visual Backend API Builder & Workflow Compiler',
    description: 'Design and deploy backend APIs visually. Compile nodes directly into production-grade TypeScript Fastify apps.',
    url: 'https://jbsnap.app',
    siteName: 'JBSnap Platform',
    images: [
      {
        url: '/logo.jpg',
        width: 1200,
        height: 630,
        alt: 'JBSnap Visual API Builder Architecture',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'JBSnap: Visual Backend API Builder & Workflow Compiler',
    description: 'Design and deploy backend APIs visually. Compile nodes directly into production-grade TypeScript Fastify apps.',
    creator: '@jbsnap_dev',
    images: ['/logo.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  }
};

const jsonLdSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://jbsnap.app/#software',
      'name': 'JBSnap',
      'operatingSystem': 'All',
      'applicationCategory': 'DeveloperApplication',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'description': 'The premier visual API builder and backend workflow execution engine. Build, test, and export production-ready Fastify TypeScript backends.',
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': '4.9',
        'ratingCount': '1480'
      }
    },
    {
      '@type': 'WebSite',
      '@id': 'https://jbsnap.app/#website',
      'url': 'https://jbsnap.app',
      'name': 'JBSnap API Builder',
      'description': 'Visual Backend API Builder & Workflow Execution Engine',
      'publisher': {
        '@type': 'Organization',
        'name': 'JBSnap Platform',
        'logo': 'https://jbsnap.app/logo.jpg'
      }
    }
  ]
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link rel="icon" href="/logo.jpg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body suppressHydrationWarning>
        {/* Adcash Autotag Library managed via Next.js Script to prevent extension hydration mismatch */}
        <Script
          id="aclib"
          strategy="afterInteractive"
          src="//acscdn.com/script/aclib.js"
        />
        <Script
          id="aclib-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function initAdcash() {
                  if (typeof aclib !== 'undefined' && aclib.runAutoTag) {
                    aclib.runAutoTag({
                      zoneId: 'bbnwixwo7s',
                    });
                  }
                }
                if (typeof aclib !== 'undefined' && aclib.runAutoTag) {
                  initAdcash();
                } else {
                  var s = document.getElementById('aclib');
                  if (s) {
                    s.addEventListener('load', initAdcash);
                  }
                  window.addEventListener('DOMContentLoaded', initAdcash);
                }
              })();
            `,
          }}
        />
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
