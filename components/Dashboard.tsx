'use client'

import Chart from './Chart';
import { useEffect, useState } from 'react';
import DateRangePicker from './DateRangePicker';
import { sub, startOfMonth, endOfMonth, intervalToDuration } from "date-fns"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { DateRange } from "react-day-picker"
import { PresetDropdown } from './PresetDropdown';

interface Props {
    name: string,
    containerStyle: React.CSSProperties | undefined,
    onClickDashboardItem: (dashboardItem: typeof Chart) => void,
}

interface DashboardData {
    dashboardName: string,
    title: string,
    initialDateRange: string,
}

const presetOptions = {
    lastNinety: "Last 90 days",
    lastThirty: "Last 30 days",
    currMonth: "Current month"
}

const comparisonOptions = {
    prevPeriod: "Previous period",
    prevNinety: "Previous 90 days",
    prevThirty: "Previous 30 days",
    prevMonth: "Previous month"
}

const defaultDashboardName = "CompanyA";

const today = new Date();
today.setHours(0, 0, 0, 0);

const lastThirty = {
    from: sub(today, {days: 29}),
    to: today
}
const lastNinety = {
    from: sub(today, {days: 89}),
    to: today
}

const currMonth = {
    from: startOfMonth(today),
    to: today
}

const prevMonth = {
    from: startOfMonth(sub(today, {months: 1})),
    to: endOfMonth(sub(today, {months: 1}))
}


export default function Dashboard({name, containerStyle, onClickDashboardItem}: Props) {
    const supabase = createClientComponentClient();
    
    // stores data from API
    const [dashboardData, setDashboardData] = useState<DashboardData | undefined>();
    const [chartData, setChartData] = useState([]);

    // stores the user's selections from preset dropdown
    const [preset, setPreset] = useState('');
    const [comparison, setComparison] = useState(comparisonOptions.prevPeriod);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [comparisonRange, setComparisonRange] = useState<DateRange | undefined>();

    // sets the date range to the dashboard's preset
    function setInitialDateRange(dashboardPreset: string){
        if (dashboardPreset === 'LAST_90_DAYS'){
            setPreset(presetOptions.lastNinety);
     
        }
        else if (dashboardPreset === 'LAST_30_DAYS'){
            setPreset(presetOptions.lastThirty);
    
        }
        else if (dashboardPreset === 'CURENT_MONTH'){
            setPreset(presetOptions.currMonth);
        }
    }

    // calculates the previous period for custom ranges from the calendar
    function setPreviousPeriod(){
        const rangeInterval = {start: dateRange?.from??new Date(), end: dateRange?.to??new Date()}; 
        const intervalDuration = intervalToDuration(rangeInterval);

        const dateRangeFrom = new Date(dateRange?.from??today);

        const from = sub(sub(dateRangeFrom, {years: intervalDuration.years??0 * 2, months: intervalDuration.months??0 * 2, days: intervalDuration.days??0 * 2}), {days: 1});

        const to = sub(dateRangeFrom, {days: 1});
        
        setComparisonRange({
            from: from,
            to: to
        })
    }

    // updates the comparison range based on the selection
    function updateComparisonRange(){
        const dateRangeFrom = new Date(dateRange?.from??today);

        if (comparison === comparisonOptions.prevThirty){
            setComparisonRange({
                from: sub(dateRangeFrom, {days: 30}),
                to: sub(dateRangeFrom, {days: 1}),
            });
        }
        else if (comparison === comparisonOptions.prevNinety){
            setComparisonRange({
                from: sub(dateRangeFrom, {days: 91}),
                to: sub(dateRangeFrom, {days: 1}),
            });
        }
        else if (comparison === comparisonOptions.prevMonth){
            setComparisonRange(prevMonth);
        }
        else if (comparison == comparisonOptions.prevPeriod){
            setPreviousPeriod();
        }
    }

    // fetches dashboard data on load
    useEffect(() => {
        const getDashboardData = async () => {
            let { data }: any = await supabase.
                from('dashboard')
                .select('*')
                .eq('name', defaultDashboardName);
            data = data[0]
            setDashboardData({
                dashboardName: data.name,
                title: data.dateFilter.name,
                initialDateRange: data.dateFilter.initialDateRange,
            });
        }
        getDashboardData();
    }, []);

    // fetches chart data once we have dashboard data
    useEffect(() => {
        if (dashboardData){
            setInitialDateRange(dashboardData.initialDateRange);
            const getChartData = async() => {
                const { data }: any = await supabase
                    .from('chart')
                    .select('id')
                    .eq('dashboardName', dashboardData?.dashboardName)
                    .order('id', {ascending: true});
                setChartData(data);
            }
            getChartData();
        }
    }, [dashboardData]);

    // updates the date range (passed down to chart) when a preset selection is made
    useEffect(() => {
        if (preset){
            if (preset === presetOptions.lastThirty){
                setDateRange(lastThirty);  
            }
            else if (preset === presetOptions.lastNinety){
                setDateRange(lastNinety);  
            }
            else if (preset === presetOptions.currMonth){
                setDateRange(currMonth);
            }
            updateComparisonRange();
        }
    }, [preset])

    // updates the comparison range (passed down to chart) when a new selection is made
    useEffect(() => {
        if (comparison){
            updateComparisonRange();
        }
    }, [comparison]);

    // updates the date range (passed down to chart) when a custom calendar selection is made
    useEffect(() => {
        if (dateRange){
            if (dateRange !== lastThirty && dateRange !== lastNinety && dateRange !== currMonth){
                if (dateRange.from === dateRange.to){}
                setPreset("Custom Range");
            }
            updateComparisonRange();
        }
    }, [dateRange])



    return(
        <div style={containerStyle}>
            <div className='flex flex-row justify-left items-center gap-4'>
                <DateRangePicker date={dateRange} setDate={setDateRange} />
                <PresetDropdown selected={preset} setSelected={setPreset} options={presetOptions} />
                <span className='text-sm text-center text-gray-700'>compared to</span>
                <PresetDropdown selected={comparison} setSelected={setComparison} options={comparisonOptions} />
            </div>
            <div className='mt-[5%] flex flex-wrap justify-around'>
                {chartData?.map((e: {id: string}) => <div key={e.id}>{<Chart chartId={e.id} containerStyle={undefined} dateRange={dateRange} comparisonRange={comparisonRange} />}</div>)}
            </div>
        </div>
    )
}