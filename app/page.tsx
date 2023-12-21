'use client'

import Dashboard from '@/components/Dashboard';
import SupaTest from '@/components/SupaTest';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function Home() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("test");

  useEffect(() => {
    const handleSignIn = async () => {
      await supabase.auth.signInWithPassword({
        email,
        password
      })
    }
    handleSignIn()
  }, []);

  const [dashboardName, setDashboardName] = useState("Test");
  const [dashboardStyles, setDashBoardStyles] = useState({
    fontSize: "1.5rem",
    marginLeft: "1%",
    marginTop: "1%"
  })

  return (
    <main>
      <div className='h-[100vh] flex flex-col justify-between'>
        <Dashboard name={dashboardName} containerStyle={dashboardStyles} onClickDashboardItem={()=>''}/>
        <div className='text-xl mb-[10%] ml-[1%]'>
          A dashboard demo pulling from various databases.<br/>Source code: <a className='text-blue-500 hover:text-blue-700 underline' href="https://github.com/ashtonw7/dashboard-demo/tree/main" target="_blank">GitHub</a>
        </div>
      </div>
    </main>
  )
}
