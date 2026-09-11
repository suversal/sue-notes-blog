import styles from '../blog-v1.module.css';

export function Plate({ type = 'notes', compact = false }: { type?: 'notes' | 'grid' | 'cache' | 'none'; compact?: boolean }) {
  if (type === 'none') return null;
  const label = type === 'cache' ? '浏览器、边缘与源站的请求路径示意' : type === 'grid' ? '逐步收敛的模块网格示意' : '零散记录被整理为一份文章的示意';
  return <div className={`${styles.plate} ${compact ? styles.plateCompact : ''}`} role="img" aria-label={label}>
    <svg viewBox="0 0 480 290" preserveAspectRatio="xMidYMid meet">
      {type === 'cache' ? <><g fill="none" stroke="currentColor" strokeWidth="1" opacity=".65"><circle cx="240" cy="137" r="97" /><circle cx="240" cy="137" r="65" /><path d="M40 137h400" strokeDasharray="3 5" /></g>{[95, 215, 335].map((x, index) => <g key={x}><rect x={x} y="111" width="50" height="50" fill={index === 1 ? '#a33d2d' : '#f5f4e9'} stroke="#6f7567" /><text x={x + 25} y="142" fill={index === 1 ? '#fff' : '#414737'} textAnchor="middle" fontFamily="monospace" fontSize="13">{['01', '02', '03'][index]}</text></g>)}</>
        : type === 'grid' ? <><g stroke="currentColor" strokeWidth=".7" opacity=".5">{Array.from({ length: 6 }, (_, index) => <path key={index} d={`M${105 + index * 45} 44v180M105 ${44 + index * 36}h225`} />)}</g><rect x="150" y="80" width="90" height="108" fill="#a33d2d" /><rect x="240" y="116" width="45" height="72" fill="#7f8870" /><path d="M166 104h57m-57 12h43m-43 12h57" stroke="#ebc1ad" strokeWidth="2" /><circle cx="322" cy="62" r="7" fill="currentColor" /></>
        : <><g stroke="currentColor" fill="none" strokeWidth="1" opacity=".6"><path d="M30 80h90m-30-30v125M352 59h83v156h-83" strokeDasharray="3 5" /><path d="m107 138 51 0m-6-5 6 5-6 5M321 138h52m-6-5 6 5-6 5" /></g><g transform="rotate(-12 208 144)"><rect x="135" y="56" width="144" height="170" fill="#c5c9b6" stroke="#858d78" /><path d="M154 88h99m-99 13h76m-76 30h99m-99 13h91m-91 14h63" stroke="#939c84" strokeWidth="2" /></g><g transform="rotate(8 249 138)"><rect x="185" y="38" width="148" height="188" fill="#f9f7ed" stroke="#77806b" /><rect x="202" y="56" width="20" height="25" fill="#a33d2d" /><path d="M236 60h75m-75 8h51M202 105h112m-112 11h112m-112 11h85m-85 30h112m-112 11h112m-112 11h85" stroke="#79806b" strokeWidth="1.5" /><text x="202" y="210" fontFamily="Georgia,serif" fontSize="11" fill="#a33d2d">A thought, kept.</text></g><circle cx="95" cy="202" r="12" fill="#a33d2d" /><path d="M89 202h12m-6-6v12" stroke="#f9f7ed" /></>}
    </svg>
    {!compact && <div className={styles.plateCaption}><span>FIELD NOTES / {type === 'cache' ? 'THE REQUEST' : type === 'grid' ? 'LESS, BUT BETTER' : 'FROM NOTES TO WORDS'}</span><span>FIG. {type === 'cache' ? '03' : type === 'grid' ? '02' : '01'}</span></div>}
  </div>;
}
