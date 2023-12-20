'use client'

import { useEffect, useState, PureComponent } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DateRange } from "react-day-picker";
import { Text, XAxis, YAxis, Tooltip, Line, LineChart, BarChart, Label, ResponsiveContainer, CartesianGrid } from 'recharts';
import { isAfter, isBefore, intervalToDuration, format, add } from "date-fns"

import ChartHeader from './ChartHeader';

interface Props {
    chartId: string,
    containerStyle: React.CSSProperties | undefined,
    dateRange: DateRange | undefined,
    comparisonRange: DateRange | undefined,
}

interface ChartInfo {
    sqlQuery: string,
    xAxisField: string,
    yAxisField: string,
    dateField: {createdAt: string, table: string},
    chartType: string,
    name: string,
}

interface bucketEntry {
    name: string,
    value: number | null,
    comparisonValue: number | null,
}

const NUM_DATE_CHARS_IN_ISO = 10;
const SUNDAY = 0;

export default function Chart({chartId, containerStyle, dateRange, comparisonRange}: Props) {
    const supabase = createClientComponentClient();

    const [chartInfo, setchartInfo] = useState<ChartInfo | undefined>();
    const [rawData, setRawData] = useState <Map<string, number> | undefined>();
    const [bucketData, setBucketData] = useState <bucketEntry[] | undefined>();
    const [fetchedDateRange, setFetchedDateRange] = useState<DateRange | undefined>();
    const [total, setTotal] = useState(0);
    const [compTotal, setCompTotal] = useState(0);

    function shouldFetchData(){
        const today = new Date()

        if (!fetchedDateRange || isBefore(dateRange?.from??today, fetchedDateRange?.from!) || isAfter(dateRange?.to??today, fetchedDateRange?.to??today)
            || !comparisonRange || isBefore(comparisonRange?.from??today, dateRange?.from!) || isAfter(comparisonRange?.to??today, dateRange?.to??today)){
            return true;
        }
        return false;
    }

    function getUsableDateString(date: Date){
        return date.toISOString().slice(0, NUM_DATE_CHARS_IN_ISO);
    }

    function getValFromDate(date: Date, data: Map<string, number>){
        const value = data.get(getUsableDateString(date));
        if (value){
            return value;
        }
        return 0;
    }

    function getBucketSize(range: DateRange){
        const rangeInterval = {start: range!.from!, end: range!.to!}; 
        const intervalDuration = intervalToDuration(rangeInterval);
        let days = intervalDuration.days!;
        let months = intervalDuration.months! * 30;
        let years = intervalDuration.years! * 365;
        days = days + months + years;

        if (days < 7){
            return "DAYS"
        }
        else if (days < 30){
            return "WEEKS"
        }
        else{
            return "MONTHS"
        }
    }

    function getEmptyBucketData(){
        return {
            bucket: {
                name: '',
                value: 0,
                comparisonValue: 0,
            },
            month: 0,
        }
    }

    function generateBucketName(date: Date, bucketSize: string){
        if (bucketSize === "DAYS" || bucketSize === "WEEKS"){
            return format(date, 'LLLL').concat(' ', date.getDate().toString());
        }
        return format(date, 'LLLL').concat(' ', date.getFullYear().toString()); 
    }

    function buildBucketDataStore(range: DateRange, compRange: DateRange, data: Map<string, number>, bucketSize: string){  
        let buckets: bucketEntry[] = [];

        let rangeStart = range.from!;
        let rangeEnd = range.to!;

        let currDate = rangeStart;
        let endDate = add(rangeEnd, {days: 1});

        let compDate = compRange.from!; 

        let currBucket = getEmptyBucketData();
        currBucket.month = currDate.getMonth();

        let valTotal = 0;
        let compValTotal = 0;
        
        while(getUsableDateString(currDate) !== getUsableDateString(endDate)){
            const day = currDate.getDay();
            const month = currDate.getMonth();

            if (getValFromDate(currDate, data)){
                let value = getValFromDate(currDate, data);
                currBucket.bucket.value += value;
                valTotal += value;
            }
            if (isBefore(compDate, rangeStart) && getValFromDate(compDate, data)){
                let value = getValFromDate(compDate, data);
                currBucket.bucket.comparisonValue += value;
                compValTotal += value
            }

            
            if (buckets.length === 0){
                currBucket.bucket.name = generateBucketName(rangeStart, bucketSize);
            }
            else{
                currBucket.bucket.name = 'MiddleBucket';
            }
            

            if (bucketSize === "DAYS"){
                currBucket.bucket.value = Math.round(currBucket.bucket.value);
                if (currBucket.bucket.value == 0){
                    // @ts-ignore
                    currBucket.bucket.value = null;
                }
                currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
                if (currBucket.bucket.comparisonValue == 0){
                    // @ts-ignore
                    currBucket.bucket.comparisonValue = null;
                }

                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
            }
            else if (bucketSize === "WEEKS" && currDate !== endDate && day === SUNDAY){
                currBucket.bucket.value = Math.round(currBucket.bucket.value);
                if (currBucket.bucket.value == 0){
                    // @ts-ignore
                    currBucket.bucket.value = null;
                }
                currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
                if (currBucket.bucket.comparisonValue == 0){
                    // @ts-ignore
                    currBucket.bucket.comparisonValue = null;
                }

                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
            }
            else if (bucketSize === "MONTHS" && currBucket.month !== month){
                currBucket.bucket.value = Math.round(currBucket.bucket.value);
                if (currBucket.bucket.value == 0){
                    // @ts-ignore
                    currBucket.bucket.value = null;
                }
                currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
                if (currBucket.bucket.comparisonValue == 0){
                    // @ts-ignore
                    currBucket.bucket.comparisonValue = null;
                }

                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
                currBucket.month = month;
            }
            currDate = add(currDate, {days: 1});
            compDate = add(compDate, {days: 1});
        }
        if (currBucket.bucket.value == 0){
            // @ts-ignore
            currBucket.bucket.value = null;
        }
        currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
        if (currBucket.bucket.comparisonValue == 0){
            // @ts-ignore
            currBucket.bucket.comparisonValue = null;
        }
        currBucket.bucket.name = generateBucketName(rangeEnd, bucketSize);
        buckets.push(currBucket.bucket);

        setBucketData(buckets)
        setTotal(valTotal);
        setCompTotal(compValTotal);
    }

    function generateBucketData(data: Map<string, number> | undefined){
        if (data && dateRange && dateRange.to && dateRange.from && getUsableDateString(dateRange.from) !== getUsableDateString(dateRange.to) && comparisonRange && comparisonRange.to && comparisonRange.from){
            const bucketSize = getBucketSize(dateRange);
            if (bucketSize === "DAYS"){
                buildBucketDataStore(dateRange, comparisonRange, data, "DAYS");
            }
            else if (bucketSize === "WEEKS"){
                buildBucketDataStore(dateRange, comparisonRange, data, "WEEKS");
            }
            else{
                buildBucketDataStore(dateRange, comparisonRange, data, "MONTHS");
            }
        }
    }

    useEffect(() => {
        const getChartData = async () => {
            let { data }: any = await supabase.from('chart').select('*').eq('id', chartId);
            data = data[0]
            setchartInfo({
                sqlQuery: data.sqlQuery,
                xAxisField: data.xAxisField,
                yAxisField: data.yAxisField,
                dateField: {createdAt: data.dateField.field, table: data.dateField.table},
                chartType: data.chartType,
                name: data.name,
            });
        };
        getChartData();
    }, []);

    useEffect(() => {
        if (chartInfo && chartInfo.dateField && dateRange && dateRange.to && dateRange.from && comparisonRange && comparisonRange.to && comparisonRange.from && shouldFetchData()){
            console.log("HERE");
            const createdAtField = chartInfo?.dateField.createdAt;
            const valueField = chartInfo?.sqlQuery;

            let dateFromCompare: string | Date = new Date(comparisonRange!.from);
            dateFromCompare.setUTCHours(0,0,0,0);
            dateFromCompare = dateFromCompare.toISOString();
            let dateToCompare: string | Date = new Date(dateRange!.to);
            dateToCompare.setUTCHours(23,59,59,999);
            dateToCompare = dateToCompare.toISOString();

            const getRawData = async () => {
                let { data }: any = await supabase
                    .from(chartInfo?.dateField.table)
                    .select([createdAtField, valueField].join(', '))
                    .gte(createdAtField, dateFromCompare)
                    .lte(createdAtField, dateToCompare)
                    .order(createdAtField, {ascending: true});
                
                let rawDataTemp = new Map<string, number>();
                data.map((e: any)=>{rawDataTemp.set(e[createdAtField].slice(0, NUM_DATE_CHARS_IN_ISO), e[valueField])});
                setRawData(rawDataTemp);
                setFetchedDateRange({
                    from: dateRange?.from,
                    to: dateRange?.to
                });
                generateBucketData(rawDataTemp);
            };
            getRawData();
        }
        else{
            generateBucketData(rawData);
        }
    }, [chartInfo, dateRange, comparisonRange]);

    return(
        <div style={containerStyle}>
            {JSON.stringify(bucketData)??<></>}
            {bucketData ?
                <div className='flex flex-col'>
                    <ChartHeader name={chartInfo!.name} total={total} compTotal={compTotal} />
                    <LineChart width={500} height={200} data={bucketData} margin={{ top: 30, right: 0, left: 0, bottom: 5 }}>
                        <Line type="linear" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false} />
                        <Line type="linear" dataKey="comparisonValue" stroke="#808080" strokeWidth={2} dot={false} />
                        <XAxis dataKey="name" interval="preserveStartEnd" ticks={[bucketData[0].name, bucketData[bucketData.length - 1].name]} />
                    </LineChart>
                </div> : 
                <>
                </>
            }
        </div>
    )
}   