interface Props {
    name: string,
    total: number,
    compTotal: number
}

// returns a string of the percent difference between two numbers
function calculatePercentDifference(total: number, compTotal: number){
    let percentDifference = (100 * Math.abs(total - compTotal) / ((total + compTotal) / 2)).toFixed(1).toString();
    if (total > compTotal){
        return '+'.concat('', percentDifference.concat('', '%'));
    }
    else{
        return '-'.concat('', percentDifference.concat('', '%'));
    }
}

// adds commas to numbers
function numToCommaString(num: number | string){
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function ChartHeader({name, total, compTotal}: Props){    
    // determine if percentage should be red or green depending on current period's value vs. comparison period's value
    let percentageClass = 'h-[2rem] w-auto text-[1rem] rounded-md flex flex-row items-center justify-center';
    if (total > compTotal){
        percentageClass += ' bg-green-200 text-green-900'
    }
    else{
        percentageClass += ' bg-red-200 text-red-900'
    }
    
    return(
        <div className='flex flex-col'>
            <div className="flex flex-row justify-start gap-2">
                <h2 className='font-sans font-medium text-gray-500'>
                    {name}
                </h2>
                <div className={percentageClass}>
                    {calculatePercentDifference(total, compTotal)}
                </div>
            </div>
            <div className="flex flex-row justify-between items-baseline">
                <h3 className="font-sans font-medium text-4xl text-sky-600">
                    {total % 1 === 0 ? numToCommaString(total) : numToCommaString(total.toFixed(2))}
                </h3>
                <h3 className="font-sans font-medium text-3xl text-gray-400">
                    {compTotal % 1 === 0 ? numToCommaString(compTotal) : numToCommaString(compTotal.toFixed(2))}
                </h3>
            </div>                             
        </div>
    )
}