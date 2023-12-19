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

export default function Chart({chartId, containerStyle, dateRange}: Props) {
    const supabase = createClientComponentClient();

    const [chartInfo, setchartInfo] = useState<ChartInfo | undefined>();
    const [rawData, setRawData] = useState <Map<string, number> | undefined>();
    const [displayData, setDisplayData] = useState <Map<string, number> | undefined>();
    const [fetchedDateRange, setFetchedDateRange] = useState<DateRange | undefined>();

    function shouldFetchData(){
        const today = new Date()
        if (!fetchedDateRange || isBefore(dateRange?.from??today, fetchedDateRange?.from??today) || isAfter(dateRange?.to??today, fetchedDateRange?.to??today)){
            return false;
        }
        return true;
    }

    function bucketData(data: Map<string, number> | undefined, test: boolean){
        console.log("RANGE: ", dateRange?.from, "DATA: ", "SIZE: ", data?.size, test);
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

            const getRawData = async () => {
                let { data }: any = await supabase
                    .from(chartInfo?.dateField.table)
                    .select([createdAtField, valueField].join(', '))
                    .gt(createdAtField, sub(dateRange?.from??new Date(), {days: 1}).toISOString())
                    .lt(createdAtField, dateRange?.to?.toISOString())
                    .order(createdAtField, {ascending: true});
                
                let rawDataTemp = new Map<string, number>();
                data.map((e: any)=>{rawDataTemp.set(e[createdAtField], e[valueField])});
                console.log(rawDataTemp)
                setRawData(rawDataTemp);
                setFetchedDateRange({
                    from: dateRange?.from,
                    to: dateRange?.to
                });
                bucketData(rawDataTemp, true);
            };
            getRawData();
        }
        else{
            bucketData(rawData, false);
        }
    }, [chartInfo, dateRange]);

    return(
        <div style={containerStyle}>
            {rawData ? rawData.size : <></>}
        </div>
    )
}   