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
    const [dashboardData, setDashboardData] = useState<DashboardData | undefined>();
    const [chartData, setChartData] = useState([]);

    const [preset, setPreset] = useState('');
    const [comparison, setComparison] = useState(comparisonOptions.prevPeriod);
    const [dateRange, setDateRange] = useState<DateRange | undefined>();
    const [comparisonRange, setComparisonRange] = useState<DateRange | undefined>();

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
                from: sub(dateRangeFrom, {days: 90}),
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

    useEffect(() => {
        if (comparison){
            updateComparisonRange();
        }
    }, [comparison]);

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
                {/* {<Chart chartId={"1"} containerStyle={undefined} dateRange={dateRange} comparisonRange={comparisonRange} />} */}
            </div>
            {/* <div id="debug" className='flex flex-col items-start gap-5 mt-10 ml-3'>
                <div className='flex flex-col gap-1 items-start'>
                    <span className='text-xl text-center text-gray-700'>Preset: {preset}</span>
                    <span className='text-xl text-center text-gray-700'>Comparison: {comparison}</span>
                </div>
                <div className='flex flex-col gap-1 items-start'>
                    <span className='text-xl text-center text-gray-700'>Date Range From: {dateRange?.from?.toString()}</span>
                    <span className='text-xl text-center text-gray-700'>Date Range To: {dateRange?.to?.toString()}</span>
                </div>
                <div className='flex flex-col gap-1 items-start'>
                    <span className='text-xl text-center text-gray-700'>Comparison Range From: {comparisonRange?.from?.toString()}</span>
                    <span className='text-xl text-center text-gray-700'>Comparison Range To: {comparisonRange?.to?.toString()}</span>
                </div>
                <div>
                    <span className='text-xl text-center text-gray-700'>Dashboard Data: {JSON.stringify(dashboardData)}</span>
                </div>
            </div> */}
        </div>
    )
}