'use client'

import Chart from './Chart';
import { useState } from 'react';
import DateRangePicker from './DateRangePicker';
import { addDays } from "date-fns"
import { DateRange } from "react-day-picker"

type Props = {
    name: string,
    containerStyle: React.CSSProperties,
    onClickDashboardItem: (dashboardItem: typeof Chart) => void,
}

export default function Dashboard({name, containerStyle, onClickDashboardItem}: Props){
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(2022, 0, 20),
        to: addDays(new Date(2022, 0, 20), 20),
    })
    
    return(
        <div style={containerStyle}>
            <DateRangePicker setDashBoardDate={setDate} />
        </div>
    )
}