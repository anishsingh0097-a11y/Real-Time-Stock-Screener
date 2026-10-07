'use client'
import React,{memo}from 'react'
import{formatVolume}from '@/utils/formatters'
export const VolumeCell=memo(function VolumeCell({value}:{value:number}){
  return<span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatVolume(value)}</span>
})
