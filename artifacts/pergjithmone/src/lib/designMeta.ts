import type { CSSProperties } from 'react';

// Lightweight design metadata — shared between the Wizard picker and the Editor.
// Elements (the actual canvas data) live only in Editor.tsx's DESIGNS array,
// looked up by id at apply-time.

export interface DesignMeta {
  id: string;
  name: { sq: string; en: string };
  category: string;
  thumb: CSSProperties;
  thumbAccents: CSSProperties[];
  /** Real photo URL to show as the card background (overrides thumb CSS) */
  thumbPhoto?: string;
  /** Short bold text overlaid on the photo thumbnail (e.g. "PARIS") */
  thumbLabel?: string;
}

export const DESIGN_CATEGORY_LABELS: Record<string, { sq: string; en: string }> = {
  'Wedding':       { sq: 'Dasma',          en: 'Wedding'       },
  'Travel':        { sq: 'Udhëtime',       en: 'Travel'        },
  'Baby & Family': { sq: 'Bebe & Familja', en: 'Baby & Family' },
  'Celebration':   { sq: 'Festime',        en: 'Celebration'   },
  'Modern':        { sq: 'Moderne',        en: 'Modern'        },
  'Portrait':      { sq: 'Portret',        en: 'Portrait'      },
  'Nature':        { sq: 'Natyrë',         en: 'Nature'        },
};

// Maps DB category name (Albanian) → DESIGNS category key
export const DB_CAT_TO_DESIGN_CAT: Record<string, string> = {
  'Dasmë':   'Wedding', 'Dasëm': 'Wedding', 'Wedding': 'Wedding', 'Dasma': 'Wedding',
  'Udhëtime':'Travel',  'Udhëtim':'Travel', 'Travel': 'Travel',
  'Familje': 'Baby & Family', 'Fëmijë':'Baby & Family', 'Bebe':'Baby & Family',
  'Fëmijëri':'Baby & Family', 'Family': 'Baby & Family', 'Baby': 'Baby & Family',
  'Ditëlindje':'Celebration','Festash':'Celebration','Festë':'Celebration',
  'Festim':'Celebration', 'Birthday': 'Celebration', 'Celebrations': 'Celebration',
  'Natyrë':  'Nature',  'Peizazh':'Nature', 'Nature': 'Nature',
  'Çifte':   'Portrait','Dashurinë':'Portrait', 'Portrait': 'Portrait', 'Couples': 'Portrait',
  'Miqësi':  'Modern',  'Sport':'Modern','Arkitekturë':'Modern','Graduim':'Modern',
  'Friendship': 'Modern', 'Modern': 'Modern',
  'Vendndodhje': 'Locations', 'Locations': 'Locations',
};

export const DESIGN_METAS: DesignMeta[] = [

  // ── WEDDING ──────────────────────────────────────────────────────────────
  { id:'cream-names', name:{sq:'Emra në Krem',en:'Cream Names'}, category:'Wedding',
    thumb:{ background:'#ECE7E1' },
    thumbPhoto:'/designs/wedding-cream-thumb.jpg',
    thumbLabel:'NAMES',
    thumbAccents:[] },
  { id:'the-wedding-of', name:{sq:'Dasma e',en:'The Wedding Of'}, category:'Wedding',
    thumb:{ background:'#1A2A1A' },
    thumbPhoto:'/designs/wedding-spin-thumb.jpg',
    thumbLabel:'WEDDING',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'30%',background:'linear-gradient(to top,rgba(0,0,0,0.35) 0%,transparent 100%)' },
    ] },

  // ── TRAVEL ───────────────────────────────────────────────────────────────
  { id:'paris-pink', name:{sq:'Paris Rozë',en:'Paris Pink'}, category:'Travel',
    thumb:{ background:'#FEC5D6' },
    thumbPhoto:'/designs/paris-cover-thumb.jpg',
    thumbLabel:'PARIS',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'28%',background:'linear-gradient(to top,rgba(254,197,214,0.55) 0%,transparent 100%)' },
    ] },
  { id:'barcelona-red', name:{sq:'Barcelona',en:'Barcelona'}, category:'Travel',
    thumb:{ background:'#A83441' },
    thumbPhoto:'/designs/barcelona-cover-thumb.jpg',
    thumbLabel:'BARCELONA',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'28%',background:'linear-gradient(to top,rgba(168,52,65,0.55) 0%,transparent 100%)' },
    ] },

  // ── BABY & FAMILY ────────────────────────────────────────────────────────
  { id:'baby-ador', name:{sq:'ADOR',en:'ADOR'}, category:'Baby & Family',
    thumb:{ background:'#BCC9D1' },
    thumbPhoto:'/designs/baby-ador-thumb.jpg',
    thumbLabel:'ADOR',
    thumbAccents:[] },

  { id:'champagne', name:{sq:'Shampanjë',en:'Champagne'}, category:'Celebration',
    thumb:{ background:'radial-gradient(ellipse at 40% 25%, #2C1E10 0%, #120C08 70%)' },
    thumbPhoto:'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=80&fit=crop',
    thumbLabel:'CELEBRATE',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(to top,rgba(0,0,0,0.70) 0%,transparent 100%)' },
    ] },

  { id:'confetti', name:{sq:'Konfeti',en:'Confetti'}, category:'Celebration',
    thumb:{ background:'#FAFAFA' },
    thumbPhoto:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'35%',background:'linear-gradient(to top,rgba(0,0,0,0.60) 0%,transparent 100%)' },
    ] },

  { id:'ceremony', name:{sq:'Ceremoni',en:'Ceremony'}, category:'Celebration',
    thumb:{ background:'#0C1E3C' },
    thumbPhoto:'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',inset:0,background:'rgba(0,0,0,0.25)' },
      { position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(to top,rgba(0,0,0,0.70) 0%,transparent 100%)' },
    ] },

  { id:'ruby', name:{sq:'Përvjetori Rubin',en:'Ruby Anniversary'}, category:'Celebration',
    thumb:{ background:'#2D0A18' },
    thumbPhoto:'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'38%',background:'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 100%)' },
    ] },

  { id:'birthday-bash', name:{sq:'Festë Ditëlindje',en:'Birthday Bash'}, category:'Celebration',
    thumb:{ background:'#FAFAFA' },
    thumbPhoto:'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=80&fit=crop',
    thumbLabel:"IT'S MY BIRTHDAY",
    thumbAccents:[
      { position:'absolute',inset:0,background:'rgba(0,0,0,0.18)' },
      { position:'absolute',bottom:0,left:0,right:0,height:'42%',background:'linear-gradient(to top,rgba(0,0,0,0.72) 0%,transparent 100%)' },
    ] },

  { id:'silver-25', name:{sq:'Argjend 25',en:'Silver 25th'}, category:'Celebration',
    thumb:{ background:'#E8EAF0' },
    thumbPhoto:'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'36%',background:'linear-gradient(to top,rgba(0,0,0,0.60) 0%,transparent 100%)' },
    ] },

  { id:'new-chapter', name:{sq:'Kapitull i Ri',en:'New Chapter'}, category:'Celebration',
    thumb:{ background:'#F8F6F0' },
    thumbPhoto:'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'35%',background:'linear-gradient(to top,rgba(0,0,0,0.58) 0%,transparent 100%)' },
    ] },

  { id:'milestone', name:{sq:'Pikë Kthese',en:'Milestone'}, category:'Celebration',
    thumb:{ background:'#FBF8F2' },
    thumbPhoto:'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=400&q=80&fit=crop',
    thumbLabel:'MILESTONE',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'38%',background:'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 100%)' },
    ] },

  { id:'editorial', name:{sq:'Editorial',en:'Editorial'}, category:'Modern',
    thumb:{ background:'#F8F8F6' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,right:0,height:22,background:'#111111' },
      { position:'absolute',top:22,left:0,right:0,height:4,background:'#E63946' },
      { position:'absolute',top:7,left:7,width:30,height:3,background:'rgba(255,255,255,0.65)',borderRadius:1 },
      { position:'absolute',bottom:8,left:8,right:8,height:13,background:'rgba(17,17,17,0.80)',borderRadius:1 },
    ] },

  { id:'nordic', name:{sq:'Minimaliste Nordike',en:'Nordic Minimal'}, category:'Modern',
    thumb:{ background:'#F2F0EC' },
    thumbAccents:[
      { position:'absolute',top:'43%',left:8,right:8,height:1,background:'#B8B4AE' },
      { position:'absolute',top:8,left:8,right:8,height:28,background:'rgba(0,0,0,0.045)',borderRadius:1 },
      { position:'absolute',bottom:8,left:8,right:8,height:18,background:'rgba(0,0,0,0.045)',borderRadius:1 },
    ] },

  { id:'blueprint', name:{sq:'Skicë',en:'Blueprint'}, category:'Modern',
    thumb:{ background:'#0A1929' },
    thumbAccents:[
      { position:'absolute',top:'33%',left:0,right:0,height:1,background:'rgba(0,180,216,0.30)' },
      { position:'absolute',top:'66%',left:0,right:0,height:1,background:'rgba(0,180,216,0.30)' },
      { position:'absolute',left:'45%',top:0,bottom:0,width:1,background:'rgba(0,180,216,0.30)' },
      { position:'absolute',top:6,left:6,right:6,bottom:6,border:'0.8px solid rgba(0,180,216,0.40)',borderRadius:1 },
    ] },

  { id:'darkroom', name:{sq:'Dhoma e Errët',en:'Darkroom'}, category:'Modern',
    thumb:{ background:'#080808' },
    thumbAccents:[
      { position:'absolute',top:10,left:10,right:10,bottom:10,border:'1px solid rgba(255,255,255,0.08)',borderRadius:1 },
      { position:'absolute',bottom:10,left:16,right:16,height:1,background:'rgba(255,255,255,0.16)' },
    ] },

  { id:'cinematic', name:{sq:'Kinematografik',en:'Cinematic'}, category:'Modern',
    thumb:{ background:'#111' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,right:0,height:16,background:'#000' },
      { position:'absolute',bottom:0,left:0,right:0,height:16,background:'#000' },
      { position:'absolute',bottom:20,left:8,width:28,height:2,background:'rgba(255,255,255,0.45)',borderRadius:1 },
    ] },

  { id:'photo-essay', name:{sq:'Ese Foto',en:'Photo Essay'}, category:'Modern',
    thumb:{ background:'#F6F4F0' },
    thumbAccents:[
      { position:'absolute',top:6,left:6,right:6,height:18,background:'#1A1A1A' },
      { position:'absolute',top:28,left:6,right:6,height:2,background:'#E63946' },
      { position:'absolute',bottom:8,left:6,right:6,height:16,background:'rgba(0,0,0,0.04)',borderRadius:1 },
    ] },

  { id:'swiss-type', name:{sq:'Tipografi Zvicerane',en:'Swiss Type'}, category:'Modern',
    thumb:{ background:'#FFFFFF',border:'1px solid #E0E0E0' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,bottom:0,width:3,background:'#E63946' },
      { position:'absolute',top:8,left:8,right:8,height:16,background:'rgba(0,0,0,0.06)',borderRadius:1 },
      { position:'absolute',top:28,left:8,right:8,height:28,background:'rgba(0,0,0,0.04)',borderRadius:1 },
    ] },

  { id:'polaroid-wall', name:{sq:'Muri Polaroid',en:'Polaroid Wall'}, category:'Modern',
    thumb:{ background:'#F0EDE6' },
    thumbAccents:[
      { position:'absolute',top:6,left:6,width:32,height:40,background:'white',boxShadow:'1px 2px 6px rgba(0,0,0,0.22)',borderRadius:1,transform:'rotate(-4deg)' },
      { position:'absolute',top:4,right:4,width:26,height:32,background:'white',boxShadow:'1px 2px 6px rgba(0,0,0,0.18)',borderRadius:1,transform:'rotate(3deg)' },
      { position:'absolute',bottom:4,left:10,width:30,height:36,background:'white',boxShadow:'1px 2px 6px rgba(0,0,0,0.20)',borderRadius:1,transform:'rotate(-2deg)' },
      { position:'absolute',bottom:6,right:6,width:28,height:34,background:'white',boxShadow:'1px 2px 6px rgba(0,0,0,0.18)',borderRadius:1,transform:'rotate(5deg)' },
    ] },

  { id:'minimalist-b', name:{sq:'Minimale e Zezë',en:'Black Minimal'}, category:'Modern',
    thumb:{ background:'#111' },
    thumbAccents:[
      { position:'absolute',inset:'10px',border:'0.5px solid rgba(255,255,255,0.12)',borderRadius:1 },
      { position:'absolute',bottom:12,left:'30%',right:'30%',height:1,background:'rgba(255,255,255,0.22)' },
    ] },

  { id:'bauhaus', name:{sq:'Bauhaus',en:'Bauhaus'}, category:'Modern',
    thumb:{ background:'#F0EEE8' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,right:0,height:10,background:'#222' },
      { position:'absolute',top:0,left:0,bottom:0,width:10,background:'#E63946' },
      { position:'absolute',bottom:0,left:0,right:0,height:10,background:'#222' },
      { position:'absolute',top:'-6px',right:'-6px',width:28,height:28,borderRadius:'50%',background:'#FECA57',opacity:0.85 },
    ] },

  { id:'classic-portrait', name:{sq:'Portret Klasik',en:'Classic Portrait'}, category:'Portrait',
    thumb:{ background:'#F8F4EE',border:'1px solid #E0D8CE' },
    thumbAccents:[
      { position:'absolute',inset:'6px',border:'1px solid #D0C8BC',borderRadius:1 },
      { position:'absolute',top:12,left:12,right:12,height:36,background:'rgba(0,0,0,0.05)',borderRadius:1 },
      { position:'absolute',bottom:10,left:16,right:16,height:1,background:'#C8C0B4' },
    ] },

  { id:'studio-noir', name:{sq:'Studio Noir',en:'Studio Noir'}, category:'Portrait',
    thumb:{ background:'#0C0C0C' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,right:0,height:22,background:'rgba(255,255,255,0.06)' },
      { position:'absolute',top:8,left:8,width:24,height:2,background:'rgba(255,255,255,0.40)',borderRadius:1 },
      { position:'absolute',bottom:10,left:8,right:8,height:12,background:'rgba(255,255,255,0.04)',borderRadius:1 },
    ] },

  { id:'ethereal', name:{sq:'Eterik',en:'Ethereal'}, category:'Portrait',
    thumb:{ background:'linear-gradient(160deg, #F5EEFE 0%, #FEF5F8 100%)' },
    thumbAccents:[
      { position:'absolute',top:'-12px',left:'50%',transform:'translateX(-50%)',width:44,height:44,borderRadius:'50%',background:'rgba(220,190,255,0.40)' },
      { position:'absolute',top:'-4px',right:'-4px',width:22,height:22,borderRadius:'50%',background:'rgba(255,180,200,0.35)' },
      { position:'absolute',top:10,left:10,right:10,height:28,background:'rgba(255,255,255,0.55)',borderRadius:5 },
    ] },

  { id:'golden-portrait', name:{sq:'Portret i Artë',en:'Golden Portrait'}, category:'Portrait',
    thumb:{ background:'#2A1A08' },
    thumbAccents:[
      { position:'absolute',top:4,left:4,right:4,bottom:4,border:'1px solid rgba(212,175,55,0.55)',borderRadius:1 },
      { position:'absolute',top:12,left:12,right:12,height:32,background:'rgba(212,175,55,0.06)',borderRadius:1 },
      { position:'absolute',bottom:10,left:'28%',right:'28%',height:1,background:'rgba(212,175,55,0.55)' },
    ] },

  { id:'forest-path', name:{sq:'Shtigjet e Pyllit',en:'Forest Path'}, category:'Nature',
    thumb:{ background:'#1C2E1A' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,right:0,bottom:'30%',background:'rgba(0,0,0,0.20)' },
      { position:'absolute',bottom:0,left:0,right:0,height:'30%',background:'#1A2C18' },
      { position:'absolute',bottom:16,left:10,width:28,height:3,background:'#70B050',borderRadius:1 },
    ] },

  { id:'ocean-calm', name:{sq:'Qetësia e Oqeanit',en:'Ocean Calm'}, category:'Nature',
    thumb:{ background:'linear-gradient(to bottom, #0D4F6C 0%, #1A7A9E 100%)' },
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'28%',background:'rgba(10,50,80,0.75)' },
      { position:'absolute',bottom:'28%',left:0,right:0,height:1,background:'rgba(100,200,240,0.35)' },
      { position:'absolute',top:10,left:10,width:32,height:2,background:'rgba(255,255,255,0.45)',borderRadius:1 },
    ] },

  { id:'wildflower', name:{sq:'Lulet e Egra',en:'Wildflower'}, category:'Nature',
    thumb:{ background:'#FBF5E8' },
    thumbAccents:[
      { position:'absolute',top:'-6px',right:'-6px',width:32,height:32,borderRadius:'50%',background:'#F5C842',opacity:0.50 },
      { position:'absolute',bottom:'-6px',left:'-6px',width:26,height:26,borderRadius:'50%',background:'#E8A840',opacity:0.45 },
      { position:'absolute',inset:'6px',border:'1px dashed rgba(184,130,40,0.30)',borderRadius:1 },
    ] },
];
