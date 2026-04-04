"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer } from "recharts"

interface ChartContainerProps {
  title: string
  children: React.ReactNode
  height?: number
}

export function ChartContainer({ title, children, height = 300 }: ChartContainerProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {children as React.ReactElement}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
