import type { AppProps /*, AppContext */ } from 'next/app'
import React from 'react'
import { noop } from '../util/noop'

if (process.env.NODE_ENV === 'production') {
  for (const key in console) {
    console[key] = noop
  }
}

function App({ Component, pageProps }: AppProps): JSX.Element {
  return <Component {...pageProps} />
}

export default App
