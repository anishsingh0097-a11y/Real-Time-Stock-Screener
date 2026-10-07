import type { FilterPreset } from '@/types/stock'
export const FILTER_PRESETS: FilterPreset[] = [
  { id:'real-companies', name:'Real Companies', description:'Real NSE-listed companies (live prices)', filters:[
    {id:'rc-real',field:'isReal',operator:'eq',value:true,enabled:true,label:'Real companies'},
  ]},
  { id:'tata-group', name:'Tata Group', description:'TCS, Tata Motors, Tata Steel, Titan...', filters:[
    {id:'tg-grp',field:'group',operator:'eq',value:'Tata',enabled:true,label:'Group: Tata'},
  ]},
  { id:'reliance-jio', name:'Reliance & Jio', description:'Reliance Industries, Jio Financial...', filters:[
    {id:'rj-grp',field:'group',operator:'eq',value:'Reliance (Jio)',enabled:true,label:'Group: Reliance (Jio)'},
  ]},
  { id:'aditya-birla', name:'Aditya Birla', description:'Grasim, Hindalco, UltraTech...', filters:[
    {id:'ab-grp',field:'group',operator:'eq',value:'Aditya Birla',enabled:true,label:'Group: Aditya Birla'},
  ]},
  { id:'adani-group', name:'Adani Group', description:'Adani Ent, Ports, Power, Green...', filters:[
    {id:'ad-grp',field:'group',operator:'eq',value:'Adani',enabled:true,label:'Group: Adani'},
  ]},
  { id:'value-stocks', name:'Value Stocks', description:'Low PE, high ROE, low debt', filters:[
    {id:'vs-pe',field:'pe',operator:'between',value:[1,15],enabled:true,label:'P/E 1-15'},
    {id:'vs-roe',field:'roe',operator:'gte',value:15,enabled:true,label:'ROE >= 15%'},
    {id:'vs-de',field:'debtToEquity',operator:'lte',value:0.5,enabled:true,label:'D/E <= 0.5'},
    {id:'vs-div',field:'dividendYield',operator:'gte',value:2,enabled:true,label:'Div >= 2%'},
  ]},
  { id:'growth-momentum', name:'Growth Momentum', description:'High growth, RSI momentum', filters:[
    {id:'gm-rg',field:'revenueGrowthYoY',operator:'gte',value:20,enabled:true,label:'Rev Growth >= 20%'},
    {id:'gm-pg',field:'profitGrowthYoY',operator:'gte',value:20,enabled:true,label:'PAT Growth >= 20%'},
    {id:'gm-rsi',field:'rsi14',operator:'between',value:[40,70],enabled:true,label:'RSI 40-70'},
    {id:'gm-mac',field:'macdSignal',operator:'eq',value:'Bullish',enabled:true,label:'MACD Bullish'},
  ]},
  { id:'large-cap-quality', name:'Large Cap Quality', description:'Blue chip fundamentals', filters:[
    {id:'lq-mc',field:'marketCap',operator:'gte',value:20000,enabled:true,label:'MCap >= 20K Cr'},
    {id:'lq-roc',field:'roce',operator:'gte',value:15,enabled:true,label:'ROCE >= 15%'},
    {id:'lq-pro',field:'promoterHolding',operator:'gte',value:50,enabled:true,label:'Promoter >= 50%'},
    {id:'lq-cat',field:'marketCapCategory',operator:'eq',value:'Large Cap',enabled:true,label:'Large Cap'},
  ]},
  { id:'technical-breakout', name:'Technical Breakout', description:'Price breakout with volume', filters:[
    {id:'tb-rsi',field:'rsi14',operator:'between',value:[50,70],enabled:true,label:'RSI 50-70'},
    {id:'tb-vol',field:'volumeVsAvg',operator:'in',value:['2x','3x','Above'],enabled:true,label:'High Volume'},
    {id:'tb-mac',field:'macdSignal',operator:'eq',value:'Bullish',enabled:true,label:'MACD Bullish'},
    {id:'tb-bol',field:'bollingerPosition',operator:'eq',value:'Within',enabled:true,label:'Within Bands'},
  ]},
  { id:'high-dividend', name:'High Dividend', description:'Consistent high yield', filters:[
    {id:'hd-div',field:'dividendYield',operator:'gte',value:3,enabled:true,label:'Div >= 3%'},
    {id:'hd-pe',field:'pe',operator:'between',value:[1,25],enabled:true,label:'PE 1-25'},
    {id:'hd-de',field:'debtToEquity',operator:'lte',value:1.0,enabled:true,label:'D/E <= 1'},
  ]},
  { id:'it-sector', name:'IT Sector', description:'Quality IT companies', filters:[
    {id:'it-sec',field:'sector',operator:'eq',value:'IT',enabled:true,label:'IT Sector'},
    {id:'it-roe',field:'roe',operator:'gte',value:15,enabled:true,label:'ROE >= 15%'},
    {id:'it-de',field:'debtToEquity',operator:'lte',value:0.3,enabled:true,label:'D/E <= 0.3'},
  ]},
]
export const PRESET_MAP = Object.fromEntries(FILTER_PRESETS.map(p => [p.id, p]))
