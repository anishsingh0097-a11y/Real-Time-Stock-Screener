'use client'
import React,{memo}from 'react'
export const RSICell=memo(function RSICell({value}:{value:number}){
  const cls=value<30?'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':value>70?'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400':'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  return<span className={`font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded ${cls}`}>{value.toFixed(1)}</span>
})
