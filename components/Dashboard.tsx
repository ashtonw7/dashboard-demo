'use client'

import Chart from './Chart';
import { useState } from 'react';
import DateRangePicker from './DateRangePicker';
import { addDays } from "date-fns"
import { DateRange } from "react-day-picker"
import { PresetDropdown } from './PresetDropdown';

interface Props {
    name: string,
    containerStyle: React.CSSProperties,
    onClickDashboardItem: (dashboardItem: typeof Chart) => void,
}

const presetOptions = {
    0: "Last 90 days",
    1: "Last 30 days",
    2: "Current month"
}

const comparisonOptions = {
    0: "Previous period",
    1: "Previous 90 days",
    2: "Previous 30 days",
    3: "Previous month"
}

export default function Dashboard({name, containerStyle, onClickDashboardItem}: Props) {
    const [today, setToday] = useState<Date>(new Date());
    
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: new Date(today.getFullYear(), today.getMonth(), 1),
        to: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    })


    const [preset, setPreset] = useState(presetOptions[0]);
    const [comparison, setComparison] = useState(comparisonOptions[0]);

    return(
        <div style={containerStyle}>
            <div className='flex flex-row justify-left items-center gap-4 mt-2 ml-2'>
                <DateRangePicker parentDate={dateRange} setDashBoardDate={setDateRange} />
                <PresetDropdown selected={preset} setSelected={setPreset} options={presetOptions} />
                <span className='text-sm text-center text-gray-700'>compared to</span>
                <PresetDropdown selected={comparison} setSelected={setComparison} options={comparisonOptions} />
            </div>
            <div id="debug" className='flex flex-col items-start mt-10 ml-3'>
                <span className='text-xl text-center text-gray-700'>Preset: {preset}</span>
                <span className='text-xl text-center text-gray-700'>Comparison: {comparison}</span>
                <span className='text-xl text-center text-gray-700'>Date Range From: {dateRange?.from?.toString()}</span>
                <span className='text-xl text-center text-gray-700'>Date Range To: {dateRange?.to?.toString()}</span>
            </div>
        </div>
    )
}