'use client'

import { useEffect, useState, PureComponent } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DateRange } from "react-day-picker";
import { Text, XAxis, YAxis, Tooltip, Line, LineChart, BarChart, Label, ResponsiveContainer, CartesianGrid } from 'recharts';
import { isAfter, isBefore, intervalToDuration, format, add, sub } from "date-fns"

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

type BucketEntryData = {
    bucket: {
        name: string,
        value: number | null,
        comparisonValue: number | null,
    }
    month: number,
}

interface BucketEntry {
    name: string,
    value: number | null,
    comparisonValue: number | null,
}

const NUM_DATE_CHARS_IN_ISO = 10;
const SUNDAY = 0;

/*
    Using the date range and comparison range from the dashboard, fetches the chart by ID and uses the chart's data to fetch information from the table.

    IMPROVEMENTS TODO:

    Instead of fetching and replacing our old data when the date is out of range, just fetch the range of new data we need and add it to our data.
    This would remove the need to refetch data when returning to a date (e.g. 10/2/23-10/3/23 -> 10/4/23-10/5/23 -> 10/2/23-10/3/23 would only fetch twice).
*/

export default function Chart({chartId, containerStyle, dateRange, comparisonRange}: Props) {
    // setup variables
    const supabase = createClientComponentClient();
    // stores chart info
    const [chartInfo, setchartInfo] = useState<ChartInfo | undefined>();
    // stores the raw data retrieved from API
    const [rawData, setRawData] = useState <Map<string, number> | undefined>();
    // stores the bucketized data for display
    const [bucketData, setBucketData] = useState <BucketEntry[] | undefined>();
    // stores current range of fetched data
    const [fetchedDateRange, setFetchedDateRange] = useState<DateRange | undefined>();
    // totals of the values in range
    const [total, setTotal] = useState(0);
    const [compTotal, setCompTotal] = useState(0);

    const [updateBuckets, setUpdateBuckets] = useState(false);

    // check if data is stale and needs to be fetched
    function shouldFetchData(){
        // if we don't have ranges, don't fetch
        if (!dateRange || !dateRange.from || !dateRange.to || !comparisonRange || !comparisonRange.to || !comparisonRange.from){
            return false;
        }

        // if the range is outside of our current fetched range, fetch new data
        if (!fetchedDateRange || isAfter(dateRange!.to!, fetchedDateRange!.to!)
            || isBefore(comparisonRange!.from!, fetchedDateRange!.from!)){
            return true;
        }
        return false;
    }

    // Returns a date string YYYY-MM-DD which is easier to compare with and use as key for objects
    function getUsableDateString(date: Date){
        return date.toISOString().slice(0, NUM_DATE_CHARS_IN_ISO);
    }

    // Returns the value from the API for a given date    
    function getValFromDate(date: Date, data: Map<string, number>){
        const value = data.get(getUsableDateString(date));
        if (value){
            return value;
        }
        return 0;
    }

    // Returns the size of the bucket needed based on the date range
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

    // Returns an empty bucket
    function getEmptyBucketData(){
        return {
            bucket: {
                name: '',
                value: null,
                comparisonValue: null,
            },
            month: 0,
        } as BucketEntryData
    }

    // Generates a name for the bucket (used for plotting)
    function generateBucketName(date: Date, bucketSize: string){
        if (bucketSize === "DAYS" || bucketSize === "WEEKS"){
            return format(date, 'LLLL').concat(' ', date.getDate().toString());
        }
        return format(date, 'LLLL').concat(' ', date.getFullYear().toString()); 
    }

    // Loops through the data and compiles the values into necessary buckets
    function buildBucketDataStore(range: DateRange, compRange: DateRange, data: Map<string, number>, bucketSize: string){  
        let buckets: BucketEntry[] = [];

        // data for comparisons and formatting
        let rangeStart = range.from!;
        let rangeEnd = range.to!;

        const rangeInterval = {start: rangeStart, end: rangeEnd};
        const compInterval = {start: compRange!.from!, end: compRange!.to!};

        const numDays = intervalToDuration(rangeInterval).days! + 1;
        let bucketSizeInt = 0;
        if (bucketSize === "DAYS"){
            bucketSizeInt = 1;
        }
        else if (bucketSize === "WEEKS"){
            bucketSizeInt = 7;
        }
        else if (bucketSize === "MONTHS"){
            bucketSizeInt = 30;
        }
        const numBuckets = Math.ceil(numDays / bucketSizeInt);

        let currDate = rangeStart;
        let endDate = add(rangeEnd, {days: 1});

        let compDate = compRange.from!;

        let currBucket = getEmptyBucketData();

        // total values of bucket 
        let valTotal = 0;
        let compValTotal = 0;
        let count = 0;
        
        // Go day by day through the range building buckets and comparison buckets
        while(getUsableDateString(currDate) !== getUsableDateString(endDate)){
            const month = currDate.getMonth();
            count += 1

            // Add value to bucket if it exists
            if (getValFromDate(currDate, data)){
                let value = getValFromDate(currDate, data);
                if (!currBucket.bucket.value){
                    currBucket.bucket.value = value;
                }
                else{
                    currBucket.bucket.value += value;
                }
                valTotal += value;
            }

            // Add the comparison range value to bucket if it exists
            if (isBefore(compDate, rangeStart) && getValFromDate(compDate, data)){
                let value = getValFromDate(compDate, data);
                if (!currBucket.bucket.comparisonValue){
                    currBucket.bucket.comparisonValue = value;
                }
                else{
                    currBucket.bucket.comparisonValue += value;
                }
                compValTotal += value
            }

            // Names are generated just for the first and last buckets for graphing keys to match example (could be easily adjusted to be something like
            // a date range if all buckets should have an x-axis)
            if (buckets.length === 0){
                currBucket.bucket.name = generateBucketName(rangeStart, bucketSize);
            }
            else{
                currBucket.bucket.name = count.toString();
            }
            
            // if we've reached the end of a bucket, store it and start the next one
            if (bucketSize === "DAYS"){
                if (currBucket.bucket.value){
                    currBucket.bucket.value = Math.round(currBucket.bucket.value);
                }
                if (currBucket.bucket.comparisonValue){
                    currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
                }
                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
            }
            else if (bucketSize === "WEEKS" && currDate !== endDate && count % 7 === 0){
                if (currBucket.bucket.value){
                    currBucket.bucket.value = Math.round(currBucket.bucket.value);
                }
                if (currBucket.bucket.comparisonValue){
                    currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
                }
                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
            }
            else if (bucketSize === "MONTHS" && currBucket.month !== month){
                if (currBucket.bucket.value){
                    currBucket.bucket.value = Math.round(currBucket.bucket.value);
                }
                if (currBucket.bucket.comparisonValue){
                    currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
                }
                buckets.push(currBucket.bucket);
                currBucket = getEmptyBucketData();
                currBucket.month = month;
            }
            currDate = add(currDate, {days: 1});
            compDate = add(compDate, {days: 1});
        }

        // if we have a leftover bucket (didn't end on an even week or month), add it
        if (buckets.length !== numBuckets){
            if (currBucket.bucket.value){
                currBucket.bucket.value = Math.round(currBucket.bucket.value);
            }
            if (currBucket.bucket.comparisonValue){
                currBucket.bucket.comparisonValue = Math.round(currBucket.bucket.comparisonValue);
            }
            buckets.push(currBucket.bucket);
        }
        // set the name of the final bucket
        buckets[buckets.length - 1].name = generateBucketName(rangeEnd, bucketSize);
        

        // if the last comparison range isn't in the last bucket, make it null so it won't be graphed 
        let compDuration = intervalToDuration(compInterval);
        let compDays = compDuration!.years! * 365 + compDuration!.months! * 31 + compDuration!.days!;

        const rangeDuration = intervalToDuration(rangeInterval);
        let rangeDays = rangeDuration!.years! * 365 + rangeDuration!.months! * 31 + rangeDuration!.days!;
        
        if (compDays < rangeDays ){
            buckets[buckets.length - 1].comparisonValue = null;
        }

        // set values for display
        setBucketData(buckets)
        setTotal(valTotal);
        setCompTotal(compValTotal);
    }

    // buidls buckets depending on the bucket size
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

    // fetch our chart data
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

    // bucketize data if new data is fetched (used on initial call)
    useEffect(() => {
        generateBucketData(rawData);
    }, [rawData]);

    // whenever our date range or comparison range changes, fetch new data if necessary/generate bucket data if not
    useEffect(() => {
        if (chartInfo && chartInfo.dateField && dateRange && dateRange.to && dateRange.from && comparisonRange && comparisonRange.to && comparisonRange.from && shouldFetchData()){
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
                    from: comparisonRange?.from,
                    to: dateRange?.to
                });
            };
            getRawData();
        }
        else {
            generateBucketData(rawData);
        }
    }, [chartInfo, dateRange, comparisonRange]);

    return(
        <div style={containerStyle}>
            {bucketData ?
                <div className='flex flex-col'>
                    <ChartHeader name={chartInfo!.name} total={total} compTotal={compTotal} />
                    <LineChart width={500} height={200} data={bucketData} margin={{ top: 30, right: 0, left: 0, bottom: 5 }}>
                        <Line type="linear" dataKey="comparisonValue" stroke="#a7abb5" strokeWidth={3} dot={false} />
                        <Line type="linear" dataKey="value" stroke="#8884d8" strokeWidth={3} dot={false} />
                        <XAxis dataKey="name" interval="preserveStartEnd" tickLine={false} ticks={[bucketData[0].name, bucketData[bucketData.length - 1].name]} />
                    </LineChart>
                </div> : 
                <>
                </>
            }
        </div>
    )
}   