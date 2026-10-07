import type{Metadata}from 'next'
import{IBM_Plex_Sans}from 'next/font/google'
import './globals.css'
import{Providers}from './providers'
const inter=IBM_Plex_Sans({subsets:['latin'],weight:['400','500','600','700'],display:'swap'})
export const metadata:Metadata={title:'Stock Screener Pro',description:'Real-time Indian equity screener'}
export default function RootLayout({children}:{children:React.ReactNode}){
  return<html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('theme')!=='light')document.documentElement.classList.add('dark')}catch(e){}" }} /></head><body className={inter.className}><Providers>{children}</Providers></body></html>
}
