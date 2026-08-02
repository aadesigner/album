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
  'Dasmë':   'Wedding', 'Dasëm': 'Wedding',
  'Udhëtime':'Travel',  'Udhëtim':'Travel',
  'Familje': 'Baby & Family', 'Fëmijë':'Baby & Family', 'Bebe':'Baby & Family', 'Fëmijëri':'Baby & Family',
  'Ditëlindje':'Celebration','Festash':'Celebration','Festë':'Celebration','Festim':'Celebration',
  'Natyrë':  'Nature',  'Peizazh':'Nature',
  'Çifte':   'Portrait','Dashurinë':'Portrait',
  'Miqësi':  'Modern',  'Sport':'Modern','Arkitekturë':'Modern','Graduim':'Modern',
};

export const DESIGN_METAS: DesignMeta[] = [
  // ── WEDDING ──────────────────────────────────────────────────────────────
  { id:'blush-garden', name:{sq:'Kopshti Rozë',en:'Blush Garden'}, category:'Wedding',
    thumb:{ background:'#FBF5EE' },
    thumbAccents:[
      { position:'absolute',top:'-10px',right:'-10px',width:44,height:44,borderRadius:'50%',background:'#F4BEBA',opacity:0.55 },
      { position:'absolute',bottom:'-8px',left:'-8px',width:38,height:38,borderRadius:'50%',background:'#EEB0AC',opacity:0.48 },
      { position:'absolute',top:8,left:8,right:8,height:42,background:'rgba(0,0,0,0.05)',borderRadius:2 },
      { position:'absolute',bottom:12,left:16,right:16,height:1,background:'#DBABAA',opacity:0.6 },
    ] },
  { id:'midnight-vows', name:{sq:'Betimi i Natës',en:'Midnight Vows'}, category:'Wedding',
    thumb:{ background:'#1A2040' },
    thumbAccents:[
      { position:'absolute',top:5,left:5,right:5,bottom:5,border:'1px solid rgba(200,168,75,0.60)',borderRadius:2 },
      { position:'absolute',top:13,left:13,right:13,bottom:13,border:'0.5px solid rgba(200,168,75,0.35)',borderRadius:1 },
      { position:'absolute',top:20,left:20,right:20,height:30,background:'rgba(200,168,75,0.10)',borderRadius:1 },
      { position:'absolute',bottom:14,left:'30%',right:'30%',height:1,background:'rgba(200,168,75,0.65)' },
    ] },
  { id:'pure-vows', name:{sq:'Betim i Pastër',en:'Pure Vows'}, category:'Wedding',
    thumb:{ background:'#FFFFFF',border:'1px solid #E2DED8' },
    thumbAccents:[
      { position:'absolute',inset:'5px',border:'1px solid #D0CCC6',borderRadius:1 },
      { position:'absolute',inset:'11px',border:'0.5px solid #E2DED8',borderRadius:1 },
      { position:'absolute',top:18,left:18,right:18,height:32,background:'#F6F3EF',borderRadius:1 },
      { position:'absolute',bottom:14,left:20,right:20,height:1,background:'#C8C4BE' },
    ] },
  { id:'boho-warmth', name:{sq:'Ngrohtësi Boho',en:'Boho Warmth'}, category:'Wedding',
    thumb:{ background:'#F2E8DA' },
    thumbAccents:[
      { position:'absolute',top:'-10px',right:'-10px',width:42,height:42,borderRadius:'50%',border:'2px solid rgba(196,144,88,0.65)',background:'transparent' },
      { position:'absolute',bottom:'-8px',left:'-8px',width:34,height:34,borderRadius:'50%',border:'1.5px solid rgba(196,144,88,0.55)',background:'transparent' },
      { position:'absolute',top:8,left:8,right:8,height:40,background:'rgba(0,0,0,0.055)',borderRadius:2 },
      { position:'absolute',inset:'6px',border:'1px dashed rgba(180,120,60,0.32)',borderRadius:1 },
    ] },
  { id:'garden-vows', name:{sq:'Dasma në Kopsht',en:'Garden Vows'}, category:'Wedding',
    thumb:{ background:'#E4EBE0' },
    thumbAccents:[
      { position:'absolute',left:0,top:0,width:14,bottom:0,background:'rgba(74,122,84,0.16)' },
      { position:'absolute',top:8,left:20,right:8,height:36,background:'rgba(0,0,0,0.05)',borderRadius:2 },
      { position:'absolute',bottom:10,left:20,right:8,height:1,background:'rgba(74,122,84,0.55)' },
    ] },
  { id:'venetian-lace', name:{sq:'Dantelë Veneciane',en:'Venetian Lace'}, category:'Wedding',
    thumb:{ background:'#FAF7F2',border:'1px solid #E0D8CE' },
    thumbAccents:[
      { position:'absolute',top:4,left:4,right:4,bottom:4,border:'1px solid #D6CCBE',borderRadius:1 },
      { position:'absolute',top:10,left:10,right:10,bottom:10,border:'0.5px solid #EAE4DA',borderRadius:1 },
      { position:'absolute',top:'-6px',left:'50%',transform:'translateX(-50%)',width:16,height:16,borderRadius:'50%',background:'#D6CCBE' },
      { position:'absolute',bottom:10,left:16,right:16,height:1,background:'#C8BEB0' },
    ] },
  { id:'dusty-rose', name:{sq:'Trëndafil i Thatë',en:'Dusty Rose'}, category:'Wedding',
    thumb:{ background:'#F0E0DA' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,bottom:0,width:10,background:'#C8908A' },
      { position:'absolute',top:8,left:14,right:8,height:36,background:'rgba(255,255,255,0.40)',borderRadius:2 },
      { position:'absolute',bottom:12,left:14,right:12,height:1,background:'rgba(180,100,90,0.45)' },
    ] },
  { id:'sage-vows', name:{sq:'Betimi i Sherebelës',en:'Sage Vows'}, category:'Wedding',
    thumb:{ background:'#EBF0E6' },
    thumbAccents:[
      { position:'absolute',top:6,left:6,right:6,bottom:6,border:'1px solid rgba(90,130,80,0.38)',borderRadius:1 },
      { position:'absolute',top:0,right:0,width:22,height:22,background:'rgba(90,130,80,0.22)' },
      { position:'absolute',bottom:0,left:0,width:22,height:22,background:'rgba(90,130,80,0.22)' },
      { position:'absolute',top:12,left:12,right:12,height:30,background:'rgba(0,0,0,0.06)',borderRadius:1 },
    ] },
  { id:'noir-romance', name:{sq:'Romancë Noir',en:'Noir Romance'}, category:'Wedding',
    thumb:{ background:'#0E0E0E' },
    thumbAccents:[
      { position:'absolute',top:6,left:6,right:6,bottom:6,border:'1px solid rgba(255,255,255,0.14)',borderRadius:1 },
      { position:'absolute',top:12,left:12,right:12,height:32,background:'rgba(255,255,255,0.05)',borderRadius:1 },
      { position:'absolute',bottom:8,left:16,right:16,height:1,background:'rgba(255,255,255,0.22)' },
    ] },
  { id:'rustic-barn', name:{sq:'Fshatar Rustik',en:'Rustic Barn'}, category:'Wedding',
    thumb:{ background:'#F5EBD8' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,right:0,height:18,background:'#8B5A2B',opacity:0.85 },
      { position:'absolute',bottom:0,left:0,right:0,height:18,background:'#8B5A2B',opacity:0.85 },
      { position:'absolute',top:20,left:6,right:6,bottom:20,border:'1px dashed rgba(139,90,43,0.30)',borderRadius:1 },
    ] },
  { id:'art-deco-wedding', name:{sq:'Dasmë Art Deco',en:'Art Deco'}, category:'Wedding',
    thumb:{ background:'#1A1408' },
    thumbAccents:[
      { position:'absolute',top:0,left:'35%',right:'35%',height:8,background:'rgba(212,175,55,0.80)' },
      { position:'absolute',bottom:0,left:'35%',right:'35%',height:8,background:'rgba(212,175,55,0.80)' },
      { position:'absolute',top:8,left:6,right:6,bottom:8,border:'0.8px solid rgba(212,175,55,0.45)' },
      { position:'absolute',top:14,left:'30%',right:'30%',height:1,background:'rgba(212,175,55,0.55)' },
    ] },
  { id:'silver-bride', name:{sq:'Nusja e Argjendtë',en:'Silver Bride'}, category:'Wedding',
    thumb:{ background:'#F4F4F6' },
    thumbAccents:[
      { position:'absolute',top:5,left:5,right:5,bottom:5,border:'1px solid #B8BCC8',borderRadius:1 },
      { position:'absolute',top:12,left:12,right:12,bottom:12,border:'0.5px solid #D4D8E4',borderRadius:1 },
      { position:'absolute',bottom:14,left:'28%',right:'28%',height:1,background:'#9AA0B4' },
    ] },

  // ── TRAVEL ───────────────────────────────────────────────────────────────
  { id:'explorer', name:{sq:'Eksplorues',en:'Explorer'}, category:'Travel',
    thumb:{ background:'#1B3020' },
    thumbPhoto:'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'38%',background:'linear-gradient(to top,rgba(0,0,0,0.72) 0%,transparent 100%)' },
    ] },
  { id:'golden-hour', name:{sq:'Ora e Artë',en:'Golden Hour'}, category:'Travel',
    thumb:{ background:'linear-gradient(to bottom, #E8841C 0%, #A84408 100%)' },
    thumbPhoto:'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80&fit=crop',
    thumbLabel:'GOLDEN HOUR',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 100%)' },
    ] },
  { id:'film-diary', name:{sq:'Ditari i Filmit',en:'Film Diary'}, category:'Travel',
    thumb:{ background:'#E6DFC8' },
    thumbPhoto:'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'35%',background:'linear-gradient(to top,rgba(0,0,0,0.58) 0%,transparent 100%)' },
    ] },
  { id:'city-noir', name:{sq:'Qyteti Noir',en:'City Noir'}, category:'Travel',
    thumb:{ background:'#080808' },
    thumbPhoto:'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80&fit=crop',
    thumbLabel:'CITY NOIR',
    thumbAccents:[
      { position:'absolute',inset:0,background:'rgba(0,0,0,0.30)' },
      { position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(to top,rgba(0,0,0,0.75) 0%,transparent 100%)' },
    ] },
  { id:'passport-stamp', name:{sq:'Pullë Pasaporte',en:'Passport Stamp'}, category:'Travel',
    thumb:{ background:'#EDE4D0' },
    thumbPhoto:'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&q=80&fit=crop',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'36%',background:'linear-gradient(to top,rgba(0,0,0,0.60) 0%,transparent 100%)' },
    ] },
  { id:'desert-dunes', name:{sq:'Dunjet e Shkretëtirës',en:'Desert Dunes'}, category:'Travel',
    thumb:{ background:'linear-gradient(to bottom, #E8B870 0%, #C47A30 100%)' },
    thumbPhoto:'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80&fit=crop',
    thumbLabel:'SAHARA',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'38%',background:'linear-gradient(to top,rgba(0,0,0,0.62) 0%,transparent 100%)' },
    ] },
  { id:'ocean-atlas', name:{sq:'Atlasi i Detit',en:'Ocean Atlas'}, category:'Travel',
    thumb:{ background:'#0D3B5C' },
    thumbPhoto:'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80&fit=crop',
    thumbLabel:'OCEAN',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'38%',background:'linear-gradient(to top,rgba(0,0,0,0.60) 0%,transparent 100%)' },
    ] },
  { id:'mountain-peak', name:{sq:'Maja e Malit',en:'Mountain Peak'}, category:'Travel',
    thumb:{ background:'linear-gradient(to bottom, #1A2840 0%, #2E4860 100%)' },
    thumbPhoto:'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80&fit=crop',
    thumbLabel:'SUMMIT',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'40%',background:'linear-gradient(to top,rgba(0,0,0,0.68) 0%,transparent 100%)' },
    ] },
  { id:'vintage-postcard', name:{sq:'Kartë Postale Vintage',en:'Vintage Postcard'}, category:'Travel',
    thumb:{ background:'#F0E8D0' },
    thumbPhoto:'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=80&fit=crop',
    thumbLabel:'PARIS',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'42%',background:'linear-gradient(to top,rgba(0,0,0,0.70) 0%,transparent 100%)' },
    ] },
  { id:'jungle-journal', name:{sq:'Ditar i Xhunglës',en:'Jungle Journal'}, category:'Travel',
    thumb:{ background:'#1A2E18' },
    thumbPhoto:'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80&fit=crop',
    thumbLabel:'JUNGLE',
    thumbAccents:[
      { position:'absolute',bottom:0,left:0,right:0,height:'38%',background:'linear-gradient(to top,rgba(0,0,0,0.65) 0%,transparent 100%)' },
    ] },

  // ── BABY & FAMILY ─────────────────────────────────────────────────────────
  { id:'cloud-nine', name:{sq:'Re e Nëntë',en:'Cloud Nine'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #C8E8F8 0%, #EDF8FF 100%)' },
    thumbAccents:[
      { position:'absolute',top:'-10px',left:'-10px',width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.65)' },
      { position:'absolute',top:'-6px',left:'20%',width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.50)' },
      { position:'absolute',top:8,left:8,right:8,height:36,background:'rgba(255,255,255,0.45)',borderRadius:6 },
    ] },
  { id:'cherry-blossom', name:{sq:'Lulëzimi i Qershisë',en:'Cherry Blossom'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(135deg, #FBE8F0 0%, #FFF6F9 100%)' },
    thumbAccents:[
      { position:'absolute',top:'-10px',right:'-10px',width:40,height:40,borderRadius:'50%',background:'#F4BCCC',opacity:0.68 },
      { position:'absolute',bottom:'-8px',left:'-8px',width:32,height:32,borderRadius:'50%',background:'#F0B0C4',opacity:0.60 },
      { position:'absolute',top:8,left:8,right:8,height:36,background:'rgba(255,255,255,0.52)',borderRadius:6 },
    ] },
  { id:'family-portrait', name:{sq:'Portret Familjar',en:'Family Portrait'}, category:'Baby & Family',
    thumb:{ background:'#FBF4EC' },
    thumbAccents:[
      { position:'absolute',left:0,top:0,bottom:0,width:4,background:'rgba(212,168,112,0.60)' },
      { position:'absolute',top:6,left:10,width:28,height:52,background:'rgba(0,0,0,0.07)',borderRadius:2 },
      { position:'absolute',top:6,right:6,left:'54%',height:28,background:'rgba(0,0,0,0.07)',borderRadius:2 },
    ] },
  { id:'honey', name:{sq:'Mjaltë',en:'Honey'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #FFF8E0 0%, #FFFDF5 100%)' },
    thumbAccents:[
      { position:'absolute',top:'-10px',right:'-10px',width:40,height:40,borderRadius:'50%',background:'#F0C840',opacity:0.28 },
      { position:'absolute',bottom:'-6px',left:'-6px',width:30,height:30,borderRadius:'50%',background:'#F0C840',opacity:0.22 },
      { position:'absolute',top:5,left:5,right:5,bottom:5,border:'1px solid rgba(224,184,64,0.45)',borderRadius:2 },
    ] },
  { id:'mint-nursery', name:{sq:'Çerdhe Balsami',en:'Mint Nursery'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #D4EDE6 0%, #EEF8F4 100%)' },
    thumbAccents:[
      { position:'absolute',top:'-8px',left:'-8px',width:34,height:34,borderRadius:'50%',background:'rgba(255,255,255,0.65)' },
      { position:'absolute',top:10,left:10,right:10,height:32,background:'rgba(255,255,255,0.48)',borderRadius:6 },
      { position:'absolute',bottom:6,right:6,width:22,height:22,borderRadius:'50%',background:'rgba(80,180,140,0.28)' },
    ] },
  { id:'rainbow-kids', name:{sq:'Ylberi i Fëmijëve',en:'Rainbow Kids'}, category:'Baby & Family',
    thumb:{ background:'#FFFDF8' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,right:0,height:10,background:'#FF6B6B' },
      { position:'absolute',top:10,left:0,right:0,height:10,background:'#FF9F43' },
      { position:'absolute',top:20,left:0,right:0,height:10,background:'#FECA57' },
      { position:'absolute',bottom:8,left:8,right:8,height:14,background:'rgba(0,0,0,0.05)',borderRadius:1 },
    ] },
  { id:'lavender-lullaby', name:{sq:'Ninull Lavande',en:'Lavender Lullaby'}, category:'Baby & Family',
    thumb:{ background:'linear-gradient(160deg, #E8E0F5 0%, #F8F4FF 100%)' },
    thumbAccents:[
      { position:'absolute',top:'-10px',right:'-10px',width:36,height:36,borderRadius:'50%',background:'#D0B8E8',opacity:0.60 },
      { position:'absolute',bottom:'-8px',left:'-8px',width:28,height:28,borderRadius:'50%',background:'#C8AADC',opacity:0.52 },
      { position:'absolute',top:8,left:8,right:8,height:30,background:'rgba(255,255,255,0.50)',borderRadius:5 },
    ] },
  { id:'storybook', name:{sq:'Libri i Tregimeve',en:'Storybook'}, category:'Baby & Family',
    thumb:{ background:'#FBF5E8' },
    thumbAccents:[
      { position:'absolute',top:0,left:0,bottom:0,width:8,background:'#E8C070',opacity:0.70 },
      { position:'absolute',top:6,left:12,right:6,height:30,background:'rgba(0,0,0,0.07)',borderRadius:2 },
      { position:'absolute',bottom:10,left:12,right:12,height:1,background:'rgba(184,120,40,0.40)' },
    ] },

  // ── CELEBRATION ───────────────────────────────────────────────────────────
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

  // ── MODERN ────────────────────────────────────────────────────────────────
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

  // ── PORTRAIT ─────────────────────────────────────────────────────────────
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

  // ── NATURE ────────────────────────────────────────────────────────────────
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
