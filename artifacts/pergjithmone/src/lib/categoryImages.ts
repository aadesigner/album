/** Unsplash (and legacy) backgrounds keyed by category nameAl from the API. */
export const CAT_IMG: Record<string, string> = {
  Dasmë: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=700&q=88&fit=crop&crop=top',
  Udhëtime: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=700&q=88&fit=crop&crop=center',
  Familje: 'https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=700&q=88&fit=crop&crop=top',
  Ditëlindje: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=700&q=88&fit=crop',
  Miqësi: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&q=88&fit=crop&crop=top',
  Festash: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=88&fit=crop',
  // Alternate spellings / legacy
  Dasëm: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=700&q=88&fit=crop&crop=top',
  Udhëtim: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=700&q=88&fit=crop&crop=center',
  Graduim: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=700&q=88&fit=crop&crop=top',
  Fëmijëri: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=700&q=88&fit=crop',
  Fëmijë: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=700&q=88&fit=crop',
  Natyrë: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=88&fit=crop&crop=center',
  Çifte: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=700&q=88&fit=crop',
  Dashurinë: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=700&q=88&fit=crop',
  Festë: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=88&fit=crop',
  Festim: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=88&fit=crop',
  'Kafshë shtëpie': 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=700&q=88&fit=crop',
  'Vit i ri': 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?w=700&q=88&fit=crop',
  Nostalgjia: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=700&q=88&fit=crop',
  Shtatzëni: 'https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=700&q=88&fit=crop',
  Bebe: 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=700&q=88&fit=crop',
  Peizazh: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=700&q=88&fit=crop',
  Arkitekturë: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=700&q=88&fit=crop',
  Sport: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=700&q=88&fit=crop',
  Ushqim: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=700&q=88&fit=crop',
};

export const CAT_IMG_DEFAULT =
  'https://images.unsplash.com/photo-1474552226712-ac0f0961a954?w=700&q=88&fit=crop&crop=center';

const CAT_SPINE: Record<string, string> = {
  dasme: '#8B6F47',
  udhetime: '#C47A30',
  familje: '#5C7A5A',
  ditelindje: '#7A5C7A',
  miqesi: '#5A6B7A',
  festash: '#8B5A5A',
};

const CAT_SUBLABEL: Record<string, { sq: string; en: string }> = {
  dasme: { sq: 'Kujtime të çmuara për gjithë jetën', en: 'Cherished memories for life' },
  udhetime: { sq: 'Aventurat tuaja, të fiksuara', en: 'Your adventures, captured' },
  familje: { sq: 'Momentet e vogla, mëdha', en: 'Small moments, big meaning' },
  ditelindje: { sq: 'Dhurata perfekte, e personalizuar', en: 'The perfect personalised gift' },
  miqesi: { sq: 'Miqësia që mbetet në faqe', en: 'Friendship that lasts on the page' },
  festash: { sq: 'Festat që nuk harrohen', en: 'Celebrations you will not forget' },
};

export function getCategoryImage(nameAl: string, coverImage?: string | null): string {
  if (coverImage) return coverImage;
  return CAT_IMG[nameAl] || CAT_IMG_DEFAULT;
}

export function getCategorySpine(slug: string): string {
  return CAT_SPINE[slug] || '#8B6F47';
}

export function getCategorySublabel(slug: string): { sq: string; en: string } {
  return (
    CAT_SUBLABEL[slug] || {
      sq: 'Krijo albumin tuaj',
      en: 'Create your album',
    }
  );
}
