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
  })

  return (
    <main>
      <Dashboard name={dashboardName} containerStyle={dashboardStyles} onClickDashboardItem={()=>''}/>
    </main>
  )
}
