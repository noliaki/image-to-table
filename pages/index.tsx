import dynamic from 'next/dynamic'
import React from 'react'

const Input = dynamic(() => import('../components/input'), { ssr: false })

export default function Home(): JSX.Element {
  return <Input />
}
