import { ScrollViewStyleReset, useServerDocumentContext } from 'expo-router/html';
import type { ReactNode } from 'react';

import { WEB_BASE_PATH } from '@/constants/config';

export default function Root({ children }: { children: ReactNode }) {
  const { htmlAttributes, bodyAttributes, headNodes, bodyNodes } = useServerDocumentContext();

  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>Mormon News Roundup</title>
        <meta name="description" content="Your Daily Mormon News: Unfiltered" />
        <meta property="og:title" content="Mormon News Roundup" />
        <meta property="og:description" content="Your Daily Mormon News: Unfiltered" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:description" content="Your Daily Mormon News: Unfiltered" />
        <meta name="theme-color" content="#1D1838" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Mormon News" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href={`${WEB_BASE_PATH}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${WEB_BASE_PATH}/apple-touch-icon.png`} />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: responsiveBackground }} />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}

const responsiveBackground = `
body {
  background-color: #1D1838;
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: #000;
  }
}`;
