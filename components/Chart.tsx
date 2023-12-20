'use client'

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DateRange } from "react-day-picker";
import { LineChart, Line, BarChart, XAxis, YAxis, Tooltip } from 'recharts';
import { isAfter, isBefore, intervalToDuration, format, add } from "date-fns"

interface Props {
    chartId: string,
    containerStyle: React.CSSProperties | undefined,
    dateRange: DateRange | undefined,
}

interface ChartInfo {
    sqlQuery: string,
    xAxisField: string,
    yAxisField: string,
    dateField: {createdAt: string, table: string},
}

interface bucketEntry {
    value: number,
    name: string
}

const NUM_DATE_CHARS_IN_ISO = 10;
const SUNDAY = 0;

export default function Chart({chartId, containerStyle, dateRange}: Props) {
    const supabase = createClientComponentClient();

    const [chartInfo, setchartInfo] = useState<ChartInfo | undefined>();
    const [rawData, setRawData] = useState <Map<string, number> | undefined>();
    const [bucketData, setBucketData] = useState <bucketEntry[] | undefined>();
    const [fetchedDateRange, setFetchedDateRange] = useState<DateRange | undefined>();

    function shouldFetchData(){
        const today = new Date()
        if (!fetchedDateRange || isBefore(dateRange?.from??today, fetchedDateRange?.from!) || isAfter(dateRange?.to??today, fetchedDateRange?.to??today)){
            return false;
        }
        return true;
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
        const rangeInterval = {start: range.from!, end: range.to!}; 
        const intervalDuration = intervalToDuration(rangeInterval);
        let days = intervalDuration.years??0 * 365;
        days += intervalDuration.months??0 * 30;
        days += intervalDuration.days??0;
        
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
                value: 0
            },
            count: 0,
            month: 0,
        }
    }

    function buildBucketDataStore(range: DateRange, data: Map<string, number>, bucketSize: string){
        let buckets: bucketEntry[] = [];
        let currDate = range.from!;

        let endDate = add(range.to!, {days: 1});

        let currBucket = getEmptyBucketData();
        currBucket.month = currDate.getMonth();
        
        while(getUsableDateString(currDate) !== getUsableDateString(endDate)){
            const day = currDate.getDay();
            const month = currDate.getMonth();

            if (currBucket.count === 0){
                currBucket.bucket.name = format(currDate, 'LLLL').concat(' ', currDate.getDate().toString());
            }

            currBucket.bucket.value += getValFromDate(currDate, data);
            currBucket.count += 1;

            if (bucketSize === "DAYS"){
                currBucket.bucket.value = Math.round(currBucket.bucket.value);
                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
            }
            else if (bucketSize === "WEEKS" && currDate !== endDate && day === SUNDAY){
                currBucket.bucket.value = Math.round(currBucket.bucket.value);
                currBucket.bucket.name = currBucket.bucket.name.concat(' - ', format(currDate, 'LLLL').concat(' ', currDate.getDate().toString()));
                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
            }
            else if (bucketSize === "MONTHS" && currBucket.month !== month){
                currBucket.bucket.value = Math.round(currBucket.bucket.value);
                currBucket.bucket.name = currBucket.bucket.name.concat(' - ', format(currDate, 'LLLL').concat(' ', currDate.getDate().toString()));
                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
                currBucket.month = month;
            }
            currDate = add(currDate, {days: 1});
        }
        console.log(buckets);
        setBucketData(buckets)
    }

    function generateBucketData(data: Map<string, number> | undefined){
        if (data && dateRange && dateRange.to && dateRange.from){
            const bucketSize = getBucketSize(dateRange);
            if (bucketSize === "DAYS"){
                buildBucketDataStore(dateRange, data, "DAYS");
            }
            else if (bucketSize === "WEEKS"){
                buildBucketDataStore(dateRange, data, "WEEKS");
            }
            else{
                buildBucketDataStore(dateRange, data, "MONTHS");
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
            });
        };
        getChartData();
    }, []);

    useEffect(() => {
        if (chartInfo && chartInfo.dateField && dateRange && dateRange.to && dateRange.from && !shouldFetchData()){
            const createdAtField = chartInfo?.dateField.createdAt;
            const valueField = chartInfo?.sqlQuery;

            let dateFromCompare: string | Date = new Date(dateRange!.from);
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
    }, [chartInfo, dateRange]);

    return(
        <div style={containerStyle}>
            {rawData ? rawData.size : <></>}
            <br/>
            
            {bucketData ? 
                <LineChart width={500} height={250} data={bucketData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false} />
                    <Tooltip />
                    <XAxis dataKey="name" />
                </LineChart> :
                <>
                </>
            }
        </div>
    )
}   