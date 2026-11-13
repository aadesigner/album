/**
 * Curated dedication pages for Album AI — authentic Albanian (and English)
 * photobook voice, not generic chatbot filler. One page every few photo pages.
 */

export type NarrativePiece = {
  headline: string;
  body: string;
  /** Optional soft closing line under the body. */
  signoff?: string;
};

/** Multiple pieces per category so each generation picks a different voice. */
export const CATEGORY_NARRATIVES: Record<string, { sq: NarrativePiece[]; en: NarrativePiece[] }> = {
  Wedding: {
    sq: [
      {
        headline: 'Dashuria jonë',
        body:
          'Ka ditë që mbeten në zemër më shumë se të tjerat. Dita kur thatë “po”, kur dora jote gjeti dorën time, dhe kur e gjithë bota u duk më e ngrohtë.\n\nKy album nuk është vetëm fotografi. Është rruga jonë — nga gazi i parë te premtimi që e mbajmë çdo mëngjes.',
        signoff: 'Për gjithmonë, së bashku.',
      },
      {
        headline: 'Ne dy',
        body:
          'Nuk na duhej një skenë e madhe. Na mjaftoi një vështrim, një të qeshur, dhe vendimi i thjeshtë të ecim përpara së bashku.\n\nNë këto faqe janë dëshmitë e një dashurie të qetë dhe të fortë — ashtu siç e jetojmë ne.',
        signoff: 'Me zemër të hapur.',
      },
      {
        headline: 'Përjetë',
        body:
          'Martesa jonë nuk filloi në altar. Filloi në bisedat e gjata, në mbështetjen e heshtur, në zgjedhjen e përditshme të qëndrojmë pranë njëri-tjetrit.\n\nLe të na kujtojnë këto foto se çfarë premtuam — dhe se sa bukur e mbajtëm.',
      },
    ],
    en: [
      {
        headline: 'Our love',
        body:
          'Some days stay in the heart longer than the rest. The day you said yes, when your hand found mine, and the whole world felt warmer.\n\nThis album is not only photographs. It is our path — from the first laugh to the promise we keep every morning.',
        signoff: 'Forever, together.',
      },
      {
        headline: 'Just us',
        body:
          'We did not need a grand stage. A look, a laugh, and the simple choice to walk forward together was enough.\n\nThese pages hold the proof of a quiet, steady love — the one we live.',
        signoff: 'With an open heart.',
      },
    ],
  },
  Travel: {
    sq: [
      {
        headline: 'Udhëtimet tona',
        body:
          'Çdo vend na la diçka: një erë të re, një tryezë të huaj, një foto të bërë me nxitim para se të perëndonte dielli.\n\nNë këto faqe janë rrugët që ecëm, trenat që kapëm në minutën e fundit, dhe qetësia që gjetëm larg shtëpisë — dhe më pranë njëri-tjetrit.',
        signoff: 'Derisa të niset tjetri.',
      },
      {
        headline: 'Larg e afër',
        body:
          'Harta u mbush me pika. Por ajo që mbetet është ndjesia: të jesh i lirë, i kuriozuar, dhe pak i lodhur në mënyrën më të mirë.\n\nKëto foto janë dëshmi se guxuam të largohemi — dhe u kthyem më të pasur brenda.',
      },
      {
        headline: 'Kujtime rruge',
        body:
          'Nuk i mbajtëm të gjitha biletat. I mbajtëm momentet: mëngjeset e hershme, dritaret e autobusit, dhe të qeshurat që i dëgjon vetëm kur je larg rutines.\n\nKy album është valixhja jonë e vogël e kujtimeve.',
      },
    ],
    en: [
      {
        headline: 'Our journeys',
        body:
          'Every place left us something: a new smell, a strange table, a photo taken in a hurry before sunset.\n\nThese pages hold the roads we walked, the trains we caught at the last minute, and the quiet we found away from home — and closer to each other.',
        signoff: 'Until the next departure.',
      },
      {
        headline: 'Far and near',
        body:
          'The map filled with dots. What remains is the feeling: free, curious, and tired in the best way.\n\nThese photos prove we dared to leave — and came back richer inside.',
      },
    ],
  },
  'Baby & Family': {
    sq: [
      {
        headline: 'Familja jonë',
        body:
          'Në shtëpinë tonë ka zhurmë të ëmbël, duar të vogla, dhe netë që duken të gjata derisa bie gjumi.\n\nKëto faqe ruajnë rritjen e shpejtë, përqafimet e papritura, dhe dashurinë që nuk ka nevojë për fjalë të mëdha.',
        signoff: 'Me dashuri të thjeshtë.',
      },
      {
        headline: 'Fillimet tona',
        body:
          'Çdo ditë sjell diçka të re: një hap, një fjalë, një të qeshur që e ndryshon gjithçka.\n\nKy album është për ata që e mbajnë zemrën tonë — dhe për ne, që mësojmë të jemi prindër duke e jetuar.',
      },
      {
        headline: 'Nën një çati',
        body:
          'Jemi një ekip i vogël. Ndajmë bukën, lodhjen, dhe gëzimin e mëngjeseve të ngatërruara.\n\nNë foto duket e lehtë. Në të vërtetë është puna më e bukur që kemi bërë.',
      },
    ],
    en: [
      {
        headline: 'Our family',
        body:
          'Our home holds sweet noise, small hands, and nights that feel long until sleep finally comes.\n\nThese pages keep the fast growing, the sudden hugs, and a love that does not need big words.',
        signoff: 'With simple love.',
      },
      {
        headline: 'Our beginnings',
        body:
          'Every day brings something new: a step, a word, a laugh that changes everything.\n\nThis album is for those who hold our hearts — and for us, learning to be parents by living it.',
      },
    ],
  },
  Friendship: {
    sq: [
      {
        headline: 'Miqësia jonë',
        body:
          'Ka njerëz që vijnë pa zhurmë dhe mbeten. Me ta koha kalon shpejt, dhe heshtja nuk është kurrë e rëndë.\n\nKy album është për ata që na njohin pa maskë — dhe që na bëjnë të qeshim edhe kur jemi të lodhur.',
        signoff: 'Faleminderit që jeni.',
      },
      {
        headline: 'Me ju',
        body:
          'Nuk na duhen data të mëdha. Na mjafton një darkë e gjatë, një telefonatë e papritur, një foto e bërë keq por e vërtetë.\n\nKëtu janë ditët që na mbajtën afër.',
      },
    ],
    en: [
      {
        headline: 'Our friendship',
        body:
          'Some people arrive quietly and stay. With them time moves fast, and silence is never heavy.\n\nThis album is for those who know us without a mask — and who make us laugh even when we are tired.',
        signoff: 'Thank you for being here.',
      },
      {
        headline: 'With you',
        body:
          'We do not need big dates. A long dinner, a sudden call, a badly taken but true photo is enough.\n\nHere are the days that kept us close.',
      },
    ],
  },
  Celebration: {
    sq: [
      {
        headline: 'Festë',
        body:
          'Ka netë që fillojnë me muzikë dhe mbarojnë me këmbë të lodhura e zemra të lehta.\n\nNë këto faqe është gazi ynë — i lartë, i pakujdesshëm, dhe i denjë për t’u mbajtur.',
        signoff: 'Edhe një herë, për shëndet!',
      },
      {
        headline: 'Kjo natë',
        body:
          'E dimë që festa kalon. Por fotoja e mban: dritat, gotat, dhe fytyrat që ndriçojnë më shumë se dekorimet.\n\nLe të na kujtojë se dinim të gëzoheshim — plotësisht.',
      },
    ],
    en: [
      {
        headline: 'Celebrate',
        body:
          'Some nights begin with music and end with tired feet and light hearts.\n\nThese pages hold our joy — loud, careless, and worth keeping.',
        signoff: 'Once more — cheers!',
      },
      {
        headline: 'This night',
        body:
          'We know the party passes. The photo keeps it: the lights, the glasses, and faces brighter than the decorations.\n\nLet it remind us we knew how to rejoice — fully.',
      },
    ],
  },
  Portrait: {
    sq: [
      {
        headline: 'Ashtu siç jemi',
        body:
          'Nuk kërkuam pozën e përsosur. Kërkuam vështrimin e vërtetë — atë që mbetet kur askush nuk po e sheh kamerën.\n\nKëto portrete janë një ndalesë e qetë në kohë.',
      },
      {
        headline: 'Pranë',
        body:
          'Ndonjëherë mjafton të jesh vetvetja, me dritë të butë dhe pak kohë.\n\nKy album e ruan atë çast — pa zhurmë, pa nxitim.',
      },
    ],
    en: [
      {
        headline: 'As we are',
        body:
          'We did not chase the perfect pose. We wanted the true look — the one that stays when no one is watching the camera.\n\nThese portraits are a quiet pause in time.',
      },
    ],
  },
  Nature: {
    sq: [
      {
        headline: 'Në natyrë',
        body:
          'Ajri ndryshon gjithçka. Mali, deti, pylli — na kthejnë në njerëz më të thjeshtë dhe më të qetë.\n\nKëto foto janë frymëmarrje: dritë, erë, dhe heshtje e bukur.',
        signoff: 'Derisa të dalim përsëri.',
      },
      {
        headline: 'Jashtë mureve',
        body:
          'Larg ekraneve gjetëm ritmin tonë: hapa të ngadaltë, qiell të hapur, dhe kohë që nuk na nxiton.\n\nKy album mban pjesën e botës që na qetësoi.',
      },
    ],
    en: [
      {
        headline: 'In nature',
        body:
          'Air changes everything. Mountain, sea, forest — they return us to simpler, quieter people.\n\nThese photos are a breath: light, wind, and a beautiful silence.',
        signoff: 'Until we go out again.',
      },
    ],
  },
  Locations: {
    sq: [
      {
        headline: 'Vendet tona',
        body:
          'Çdo qytet ka zërin e vet. Ne e dëgjuam duke ecur, duke u humbur pak, dhe duke gjetur tryeza të vogla ku u ndamë.\n\nNë faqe mbeten rrugicat, dritaret, dhe ndjesia se ishim pikërisht aty ku duhej.',
      },
      {
        headline: 'Atje',
        body:
          'Ndonjëherë “atje” bëhet shtëpi për pak ditë. Mjafton një shesh, një kafe, një foto e papritur.\n\nKy album i mban ato vende — dhe ne brenda tyre.',
      },
    ],
    en: [
      {
        headline: 'Our places',
        body:
          'Every city has its own voice. We heard it while walking, getting a little lost, and finding small tables to share.\n\nThese pages keep the alleys, the windows, and the feeling we were exactly where we needed to be.',
      },
    ],
  },
  Modern: {
    sq: [
      {
        headline: 'Historia jonë',
        body:
          'Nuk e shkruam me fjalë të mëdha. E shkruam me ditë të zakonshme që u bënë të rëndësishme.\n\nKy album i mbledh ato — me dritë, me hije, dhe me të vërtetën tonë.',
      },
      {
        headline: 'Tani',
        body:
          'Para se koha të kalojë më shpejt, e ndaluam pak. Një faqe, një foto, një kujtim.\n\nLe të mbetet këtu — e thjeshtë dhe e qartë.',
      },
    ],
    en: [
      {
        headline: 'Our story',
        body:
          'We did not write it with big words. We wrote it with ordinary days that became important.\n\nThis album gathers them — with light, with shadow, and with our truth.',
      },
    ],
  },
};

/** Short line captions for photo+text / breathing pages — still category-true. */
export const CATEGORY_CAPTIONS: Record<string, { sq: string[]; en: string[] }> = {
  Wedding: {
    sq: ['Një vështrim mjaftonte.', 'Dora jote. Dora ime.', 'E tha zemra para fjalëve.', 'Në këtë dritë qëndrojmë.'],
    en: ['One look was enough.', 'Your hand. Mine.', 'The heart spoke first.', 'We stay in this light.'],
  },
  Travel: {
    sq: ['Para se të niseshim.', 'Rruga e panjohur.', 'Këtu u ndalëm.', 'Dielli i fundit i ditës.'],
    en: ['Before we left.', 'The unknown road.', 'We stopped here.', 'The last light of the day.'],
  },
  'Baby & Family': {
    sq: ['Duart e vogla.', 'Në krahët tanë.', 'Mëngjes i ngatërruar.', 'Qetësi e shkurtër.'],
    en: ['Small hands.', 'In our arms.', 'A messy morning.', 'A short quiet.'],
  },
  Friendship: {
    sq: ['Si gjithmonë.', 'Pa fjalë të shumta.', 'Me ju është lehtë.', 'E njëjta e qeshur.'],
    en: ['As always.', 'Without many words.', 'Easy with you.', 'The same laugh.'],
  },
  Celebration: {
    sq: ['Deri vonë.', 'Për shëndet!', 'Këmba në ritëm.', 'Kjo natë mbetet.'],
    en: ['Until late.', 'Cheers!', 'Feet on the beat.', 'This night stays.'],
  },
  Portrait: {
    sq: ['Pa maskë.', 'Dritë e butë.', 'Ashtu siç je.', 'Një ndalesë.'],
    en: ['Unmasked.', 'Soft light.', 'As you are.', 'A pause.'],
  },
  Nature: {
    sq: ['Ajër i pastër.', 'Hapa të ngadaltë.', 'Qielli hapet.', 'Heshtje e mirë.'],
    en: ['Clean air.', 'Slow steps.', 'The sky opens.', 'A good silence.'],
  },
  Locations: {
    sq: ['Në qytetin e ri.', 'Rruga e ngushtë.', 'Dritarja e hotelit.', 'Sheshi në darkë.'],
    en: ['In the new city.', 'The narrow street.', 'The hotel window.', 'The square at night.'],
  },
  Modern: {
    sq: ['Ky çast.', 'Pa filter.', 'E vërteta jonë.', 'Tani e këtu.'],
    en: ['This moment.', 'No filter.', 'Our truth.', 'Now and here.'],
  },
};

export function narrativesFor(categoryKey: string, lang: 'sq' | 'en'): NarrativePiece[] {
  const pack = CATEGORY_NARRATIVES[categoryKey] ?? CATEGORY_NARRATIVES.Modern;
  return pack[lang]?.length ? pack[lang] : pack.sq;
}

export function captionsFor(categoryKey: string, lang: 'sq' | 'en'): string[] {
  const pack = CATEGORY_CAPTIONS[categoryKey] ?? CATEGORY_CAPTIONS.Modern;
  return pack[lang]?.length ? pack[lang] : pack.sq;
}
