'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useEffect, useState } from 'react'

export default function SupaTest() {
  const [chart, setChart] = useState()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getData = async () => {
      const { data }: any = await supabase.from('chart').select('*')
      setChart(data)
    }
    getData()
  }, [])

  return chart ? <pre>{JSON.stringify(chart, null, 2)}</pre> : <p>Loading chart info...</p>
}