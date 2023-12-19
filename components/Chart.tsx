'use client'

interface Props {
    chartId: string,
    containerStyle: React.CSSProperties | undefined,
}

export default function Chart({chartId, containerStyle}: Props) {
    return(
        <>
            {chartId}
        </>
    )
}