/**
 * Placeholder packshot used until a real product photo is uploaded.
 * Follows the catalogue art direction (pouch on the left, tray of loose product on the right),
 * drawn as a deterministic SVG coloured to match the product. Never mistaken for a photo:
 * it is flat, illustrated and carries a small "Photo coming soon" note.
 */
import { cn } from '@/lib/utils';

type Form = 'slices' | 'powder' | 'leaves' | 'petals' | 'seeds' | 'chunks' | 'stems';

const PALETTES: [RegExp, string[]][] = [
  [/mango|amchur|pineapple|banana|jackfruit|chikoo|calendula|turmeric|chrysanthemum|makhana|chana|pongal|upma|khichdi/i, ['#F2A428', '#F7C548', '#E58A1F', '#FAD97A']],
  [/tomato|chilli|beetroot|dragon|kokum|capsicum|rose|hibiscus|potpourri/i, ['#C8322B', '#E0573E', '#A3202A', '#B23A5E']],
  [/papaya|carrot|pumpkin|orange|sweet potato|ginger|lemon/i, ['#E8742C', '#F39A45', '#D45F1F', '#F7B26A']],
  [/moringa|curry|mint|tulsi|spinach|coriander|methi|fenugreek|okra|lemongrass|neem|eucalyptus|drumstick|chilli flakes|mor milagai|sundakkai|manathakkali|pumpkin seeds/i, ['#4C7A2A', '#6E9A3A', '#3A6420', '#8DB35A']],
  [/butterfly pea|blue/i, ['#2B3F9E', '#4A5FC8', '#1F2E78', '#6C3FA0']],
  [/shiitake|mushroom|oyster|milky|guava|chikoo|flax|sesame|sunflower|watermelon|brinjal|banana flower|chia/i, ['#9A6B43', '#B88A5E', '#7B5232', '#D2B48C']],
  [/garlic|onion|chamomile|jasmine|apple|pampas|amla/i, ['#E9D9A6', '#F3E7BF', '#D4C08A', '#C9B27A']],
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rng(seed: number) {
  let t = seed;
  return () => { t = (t + 0x6d2b79f5) | 0; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}
function formOf(name: string): Form {
  if (/powder|mix|amchur/i.test(name)) return 'powder';
  if (/leaves|leaf|methi|mint|tulsi|curry|spinach|coriander|lemongrass/i.test(name)) return 'leaves';
  if (/flower|petal|hibiscus|rose|chamomile|jasmine|calendula|chrysanthemum|butterfly|potpourri/i.test(name)) return 'petals';
  if (/seed|chia|flax|sesame|chana|chilli flakes/i.test(name)) return 'seeds';
  if (/eucalyptus|pampas|stem|lemongrass|drumstick/i.test(name)) return 'stems';
  if (/slice|chips|ring|wheel|orange|tomato|okra|beetroot|apple|dragon|guava|banana|jackfruit/i.test(name)) return 'slices';
  return 'chunks';
}

export function ProductArt({ name, className, label = true, pouch = true }: { name: string; className?: string; label?: boolean; pouch?: boolean }) {
  const pal = PALETTES.find(([re]) => re.test(name))?.[1] ?? ['#8C6A3F', '#B08B58', '#6E5230', '#D7BC8A'];
  const r = rng(hash(name));
  const form = formOf(name);
  const pieces: React.ReactNode[] = [];
  const cx = pouch ? 262 : 200, cy = pouch ? 222 : 200, rx = pouch ? 98 : 150, ry = pouch ? 62 : 150;
  const N = form === 'seeds' ? 70 : form === 'powder' ? 0 : form === 'leaves' || form === 'petals' ? 26 : 18;
  for (let i = 0; i < N; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.82;
    const x = Math.round((cx + Math.cos(a) * rx * d) * 10) / 10, y = Math.round((cy + Math.sin(a) * ry * d) * 10) / 10;
    const c = pal[Math.floor(r() * pal.length)];
    const rot = Math.floor(r() * 180);
    const s = pouch ? 1 : 1.35;
    if (form === 'slices') {
      const R = (12 + r() * 9) * s;
      pieces.push(<g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}><ellipse rx={R} ry={R * 0.82} fill={c} /><ellipse rx={R * 0.62} ry={R * 0.5} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="1.4" /><circle r={R * 0.14} fill={pal[2]} opacity=".6" /></g>);
    } else if (form === 'leaves') {
      const L = (14 + r() * 8) * s;
      pieces.push(<g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}><path d={`M${-L} 0 Q0 ${-L * 0.55} ${L} 0 Q0 ${L * 0.55} ${-L} 0Z`} fill={c} /><path d={`M${-L} 0 L${L} 0`} stroke="#fff" strokeOpacity=".3" strokeWidth="1" /></g>);
    } else if (form === 'petals') {
      const L = (9 + r() * 7) * s;
      pieces.push(<g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>{[0, 72, 144, 216, 288].map((pr) => <ellipse key={pr} rx={L * 0.42} ry={L} transform={`rotate(${pr}) translate(0 ${-L * 0.6})`} fill={c} opacity=".9" />)}</g>);
    } else if (form === 'seeds') {
      const R = (3 + r() * 2.5) * s;
      pieces.push(<ellipse key={i} cx={x} cy={y} rx={R * 1.5} ry={R} transform={`rotate(${rot} ${x} ${y})`} fill={c} />);
    } else if (form === 'stems') {
      const L = 70 * s;
      pieces.push(<g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}><path d={`M${-L / 2} 0 L${L / 2} 0`} stroke={pal[2]} strokeWidth="2" />{[-0.3, 0, 0.3].map((t) => <ellipse key={t} cx={L * t} cy={-5} rx="6" ry="9" fill={c} />)}</g>);
    } else {
      const R = (10 + r() * 9) * s;
      pieces.push(<path key={i} transform={`translate(${x} ${y}) rotate(${rot})`} d={`M${-R} ${-R * 0.4} Q${-R * 0.2} ${-R} ${R * 0.8} ${-R * 0.6} Q${R * 1.1} ${R * 0.2} ${R * 0.2} ${R * 0.8} Q${-R} ${R * 0.9} ${-R} ${-R * 0.4}Z`} fill={c} />);
    }
  }
  const words = name.replace(/\(.*?\)/g, '').trim().toUpperCase().split(/\s+/);
  const lines: string[] = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + ' ' + w).length <= 11) lines[lines.length - 1] = last + ' ' + w;
    else lines.push(w);
  }

  return (
    <svg viewBox="0 0 400 400" className={cn('h-full w-full', className)} role="img" aria-label={`${name} — illustration, photo coming soon`}>
      <rect width="400" height="400" fill={pouch ? '#FBFAF4' : '#F6F4EC'} />
      {pouch && (
        <>
          <ellipse cx={cx} cy={cy + ry + 16} rx={rx + 22} ry="12" fill="#17271C" opacity=".06" />
          <rect x={cx - rx - 16} y={cy - ry - 16} width={(rx + 16) * 2} height={(ry + 16) * 2} rx="22" fill="#fff" stroke="#17271C" strokeOpacity=".08" />
          <rect x={cx - rx - 6} y={cy - ry - 6} width={(rx + 6) * 2} height={(ry + 6) * 2} rx="16" fill="#F6F4EC" />
        </>
      )}
      {form === 'powder' && (
        <g>
          <ellipse cx={cx} cy={cy + 6} rx={rx * 0.78} ry={ry * 0.62} fill={pal[2]} />
          <ellipse cx={cx - 4} cy={cy - 2} rx={rx * 0.68} ry={ry * 0.5} fill={pal[0]} />
          <ellipse cx={cx - 14} cy={cy - 10} rx={rx * 0.38} ry={ry * 0.24} fill={pal[3]} opacity=".55" />
        </g>
      )}
      {pieces}
      {pouch && (
        <g>
          <ellipse cx="120" cy="330" rx="74" ry="10" fill="#17271C" opacity=".08" />
          <path d="M58 92 Q56 80 70 78 L170 78 Q184 80 182 92 L190 318 Q190 330 176 330 L64 330 Q50 330 50 318Z" fill="#E7EFE2" stroke="#17271C" strokeOpacity=".1" />
          <path d="M60 78 L180 78 L181 98 L59 98Z" fill="#D7E4D0" />
          <path d="M64 88 L176 88" stroke="#17271C" strokeOpacity=".15" strokeDasharray="3 3" />
          <rect x="72" y="132" width="96" height="150" rx="6" fill="#fff" />
          <g transform="translate(108 140) scale(.62)"><path d="M21 22C14 23 7 18 6 8c8-1 15 3 15 14Z" fill="#176B36" /><path d="M23 19c1-9 7-15 15-15 0 9-6 15-15 15Z" fill="#2E8B4E" /></g>
          <text x="120" y="176" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fill="#123D27">NutriDry</text>
          {lines.slice(0, 4).map((l, i) => (
            <text key={i} x="120" y={198 + i * 13} textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize={l.length > 9 ? 8.5 : 10} fill="#17271C">{l}</text>
          ))}
          <rect x="100" y="262" width="40" height="8" rx="4" fill={pal[0]} opacity=".8" />
        </g>
      )}
      {label && <text x="388" y="388" textAnchor="end" fontFamily="Arial, sans-serif" fontSize="11" fill="#17271C" opacity=".35">Photo coming soon</text>}
    </svg>
  );
}

export function ProductImage({ url, alt, name, className, sizes = '(min-width: 1024px) 25vw, 50vw', priority }: { url: string | null; alt?: string | null; name: string; className?: string; sizes?: string; priority?: boolean }) {
  if (!url) return <ProductArt name={name} className={className} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt || name} sizes={sizes} loading={priority ? 'eager' : 'lazy'} className={cn('h-full w-full object-cover', className)} />;
}

export const CAT_ART: Record<string, string> = {
  'dried-fruits': 'Dried Mango Slices', 'dried-vegetables': 'Sun-Dried Tomatoes', mushrooms: 'Dried Shiitake Mushrooms',
  'herbs-and-leaves': 'Moringa Leaf Powder', 'flowers-and-tea': 'Hibiscus Flower Tea', 'spices-and-powders': 'Turmeric Powder',
  'traditional-south-indian': 'Sundakkai Vathal', 'seeds-and-snacks': 'Pumpkin Seeds', 'ready-to-cook': 'Vegetable Upma Mix',
  'pet-products': 'Dried Sweet Potato Chews', 'decorative-products': 'Decorative Dried Orange Slices', 'combo-packs': 'Fruit Snack Sampler',
};

/** Wide illustrated banner: three bowls of products from the category. */
export function BannerArt({ names }: { names: string[] }) {
  const n = names.slice(0, 3);
  const pos = ['left-[6%] top-[14%] w-[38%]', 'left-[40%] top-[34%] w-[30%]', 'right-[4%] top-[6%] w-[30%]'];
  return (
    <div aria-hidden className="relative h-full w-full bg-[radial-gradient(ellipse_at_50%_60%,#EDF5E9_0%,#F6F1E6_75%)]">
      {n.map((name, i) => (
        <div key={name} className={`absolute aspect-square overflow-hidden rounded-full border-[5px] border-white shadow-soft ${pos[i]}`}>
          <ProductArt name={name} pouch={false} label={false} />
        </div>
      ))}
    </div>
  );
}
