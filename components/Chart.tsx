'use client'

import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DateRange } from "react-day-picker";
import { LineChart, BarChart } from 'recharts';
import { isAfter, isBefore, sub } from "date-fns"

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

interface DataPoints {
    [key: string]: number,
}

export default function Chart({chartId, containerStyle, dateRange}: Props) {
    const supabase = createClientComponentClient();

    const [chartInfo, setchartInfo] = useState<ChartInfo | undefined>();
    const [rawData, setRawData] = useState <DataPoints | undefined>();
    const [displayData, setDisplayData] = useState <DataPoints | undefined>();
    const [fetchedDateRange, setFetchedDateRange] = useState<DateRange | undefined>();

    function shouldFetchData(){
        const today = new Date()
        if (!fetchedDateRange || isBefore(dateRange?.from??today, fetchedDateRange?.from??today) || isAfter(dateRange?.to??today, fetchedDateRange?.to??today)){
            return false;
        }
        return true;
    }

    function bucketData(data: DataPoints | undefined){
        console.log(dateRange?.from, JSON.stringify(data));
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
        if (chartInfo && chartInfo.dateField && dateRange && !shouldFetchData()){
            const getRawData = async () => {
                let { data }: any = await supabase
                    .from(chartInfo?.dateField.table)
                    .select([chartInfo?.sqlQuery, chartInfo?.dateField.createdAt].join(', '))
                    .gt(chartInfo?.dateField.createdAt, sub(dateRange?.from??new Date(), {days: 1}).toISOString())
                    .lt(chartInfo?.dateField.createdAt, dateRange?.to?.toISOString())
                    .order(chartInfo?.dateField.createdAt, {ascending: true});
                
                let rawDataTemp: DataPoints = {};
                data.map((value: number, created_at: string)=>{rawDataTemp[created_at] = value})
                setRawData(rawDataTemp);
                setFetchedDateRange({
                    from: dateRange?.from,
                    to: dateRange?.to
                });
                bucketData(rawDataTemp);
            };
            getRawData();
            bucketData(rawData);
        }
    }, [chartInfo, dateRange]);

    return(
        <div style={containerStyle}>
            {rawData ? Object.keys(rawData as Object).length : <></>}
        </div>
    )
}   