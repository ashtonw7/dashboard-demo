'use client'

import Dashboard from '@/components/Dashboard';
import { useState, useEffect } from 'react';

export default function Home() {
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
