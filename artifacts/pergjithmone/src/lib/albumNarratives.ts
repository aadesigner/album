/**
 * Curated dedication pages for Album AI — authentic Albanian (and English)
 * photobook voice. Each piece is unique; generators must not recycle the same
 * headline/body onto multiple pages in one album.
 */

export type NarrativePiece = {
  headline: string;
  body: string;
  /** Optional soft closing line under the body. */
  signoff?: string;
};

/** Unique pieces per category — keep lists long so large albums stay distinct. */
export const CATEGORY_NARRATIVES: Record<string, { sq: NarrativePiece[]; en: NarrativePiece[] }> = {
  Wedding: {
    sq: [
      {
        headline: 'Dashuria jonë',
        body: 'Ka ditë që mbeten në zemër më shumë se të tjerat. Dita kur thatë “po”, kur dora jote gjeti dorën time, dhe kur e gjithë bota u duk më e ngrohtë.\n\nKy album nuk është vetëm fotografi. Është rruga jonë — nga gazi i parë te premtimi që e mbajmë çdo mëngjes.',
        signoff: 'Për gjithmonë, së bashku.',
      },
      {
        headline: 'Ne dy',
        body: 'Nuk na duhej një skenë e madhe. Na mjaftoi një vështrim, një të qeshur, dhe vendimi i thjeshtë të ecim përpara së bashku.\n\nNë këto faqe janë dëshmitë e një dashurie të qetë dhe të fortë — ashtu siç e jetojmë ne.',
        signoff: 'Me zemër të hapur.',
      },
      {
        headline: 'Përjetë',
        body: 'Martesa jonë nuk filloi në altar. Filloi në bisedat e gjata, në mbështetjen e heshtur, në zgjedhjen e përditshme të qëndrojmë pranë njëri-tjetrit.\n\nLe të na kujtojnë këto foto se çfarë premtuam — dhe se sa bukur e mbajtëm.',
      },
      {
        headline: 'Fjala po',
        body: 'Një fjalë e shkurtër ndryshoi gjithçka. Pas saj erdhën duart që u mbajtën, këngët, dhe njerëzit që erdhën për të na gëzuar.\n\nKëtu ruajmë atë “po” — jo si ceremoni, por si fillim.',
        signoff: 'Me mirënjohje.',
      },
      {
        headline: 'Shtëpia jonë',
        body: 'Shtëpia nuk është vetëm muret. Është mëngjesi që ndajmë, heshtja e mbrëmjes, dhe dikush që të pret te dera.\n\nKëto foto tregojnë se ku u ndjemë më shumë në shtëpi: pranë njëri-tjetrit.',
      },
      {
        headline: 'Dita jonë',
        body: 'Dielli, muzika, fytyrat e dashura — dhe ne në mes, duke u përqafuar sikur koha të kishte ndaluar.\n\nKy album e mban atë ditë të gjallë, edhe kur kalendari shkon përpara.',
        signoff: 'E pamohueshme.',
      },
      {
        headline: 'Premtimi',
        body: 'Nuk ishte vetëm unaza. Ishte zgjedhja të qëndrojmë, të falim, të qeshim përsëri.\n\nNë faqe janë dëshmitë e vogla të një premtimi të madh.',
      },
      {
        headline: 'Bashkë',
        body: 'Ecëm në të njëjtën rrugë, edhe kur hapat nuk ishin të njëjtë. Ndonjëherë ti përpara, ndonjëherë unë — por gjithmonë në të njëjtin drejtim.\n\nKjo është dashuria jonë: e zakonshme dhe e jashtëzakonshme njëherësh.',
      },
    ],
    en: [
      {
        headline: 'Our love',
        body: 'Some days stay in the heart longer than the rest. The day you said yes, when your hand found mine, and the whole world felt warmer.\n\nThis album is not only photographs. It is our path — from the first laugh to the promise we keep every morning.',
        signoff: 'Forever, together.',
      },
      {
        headline: 'Just us',
        body: 'We did not need a grand stage. A look, a laugh, and the simple choice to walk forward together was enough.\n\nThese pages hold the proof of a quiet, steady love — the one we live.',
        signoff: 'With an open heart.',
      },
      {
        headline: 'Forever',
        body: 'Our marriage did not begin at the altar. It began in long talks, quiet support, and the daily choice to stay beside each other.\n\nLet these photos remind us what we promised — and how well we kept it.',
      },
      {
        headline: 'The yes',
        body: 'One short word changed everything. After it came held hands, songs, and people who came to celebrate us.\n\nHere we keep that yes — not as ceremony, but as a beginning.',
        signoff: 'With gratitude.',
      },
      {
        headline: 'Our home',
        body: 'Home is not only walls. It is the breakfast we share, the evening quiet, and someone waiting at the door.\n\nThese photos show where we felt most at home: next to each other.',
      },
      {
        headline: 'Our day',
        body: 'Sunlight, music, beloved faces — and us in the middle, holding on as if time had paused.\n\nThis album keeps that day alive even as the calendar moves on.',
        signoff: 'Undeniable.',
      },
      {
        headline: 'The promise',
        body: 'It was not only a ring. It was the choice to stay, to forgive, to laugh again.\n\nThese pages hold the small proofs of a large promise.',
      },
      {
        headline: 'Together',
        body: 'We walked the same road even when our steps did not match. Sometimes you ahead, sometimes me — always the same direction.\n\nThat is our love: ordinary and extraordinary at once.',
      },
    ],
  },
  Travel: {
    sq: [
      {
        headline: 'Udhëtimet tona',
        body: 'Çdo vend na la diçka: një erë të re, një tryezë të huaj, një foto të bërë me nxitim para se të perëndonte dielli.\n\nNë këto faqe janë rrugët që ecëm dhe qetësia që gjetëm larg shtëpisë — më pranë njëri-tjetrit.',
        signoff: 'Derisa të niset tjetri.',
      },
      {
        headline: 'Larg e afër',
        body: 'Harta u mbush me pika. Ajo që mbetet është ndjesia: të jesh i lirë, i kuriozuar, dhe pak i lodhur në mënyrën më të mirë.\n\nKëto foto janë dëshmi se guxuam të largohemi — dhe u kthyem më të pasur brenda.',
      },
      {
        headline: 'Kujtime rruge',
        body: 'Nuk i mbajtëm të gjitha biletat. I mbajtëm momentet: mëngjeset e hershme, dritaret e autobusit, të qeshurat larg rutinës.\n\nKy album është valixhja jonë e vogël e kujtimeve.',
      },
      {
        headline: 'Në rrugë',
        body: 'Valixhja ishte e rëndë, por zemra e lehtë. Çdo stacion solli një fytyrë të re, një kafe tjetër, një histori të shkurtër.\n\nKëtu janë kilometrat që na ndryshuan pak nga brenda.',
      },
      {
        headline: 'Horizonti',
        body: 'Sa herë që duket se e dimë botën, një vend i ri na e hap sërish. Qielli ndryshon ngjyrë, dhe ne ndryshojmë me të.\n\nKy album ruan ato horizonte — dhe ne duke i parë.',
      },
      {
        headline: 'Pasaporte',
        body: 'Vulat në faqe janë të thata. Kujtimet jo. Ato mbajnë zhurmën e tregjeve, kripën e detit, dhe qetësinë e hotelit natën vonë.\n\nUdhëtuam për të parë botën — dhe gjetëm veten.',
      },
      {
        headline: 'Kthimi',
        body: 'Më i ëmbli është kthimi: valixhja e hapur në dysheme, fotoja e parë në telefon, dhe fjalia “duhet të shkojmë përsëri”.\n\nDerisa të nisemi, i mbajmë këtu.',
      },
      {
        headline: 'Hartë e gjallë',
        body: 'Nuk na duhej plan i përsosur. Na duhej kuriozitet. U humbëm pak, gjetëm më shumë.\n\nKëto faqe janë harta jonë e gjallë.',
      },
    ],
    en: [
      {
        headline: 'Our journeys',
        body: 'Every place left us something: a new smell, a strange table, a photo taken in a hurry before sunset.\n\nThese pages hold the roads we walked and the quiet we found away from home — closer to each other.',
        signoff: 'Until the next departure.',
      },
      {
        headline: 'Far and near',
        body: 'The map filled with dots. What remains is the feeling: free, curious, and tired in the best way.\n\nThese photos prove we dared to leave — and came back richer inside.',
      },
      {
        headline: 'Road memories',
        body: 'We did not keep every ticket. We kept the moments: early mornings, bus windows, laughs far from routine.\n\nThis album is our small suitcase of memories.',
      },
      {
        headline: 'On the road',
        body: 'The bag was heavy, the heart light. Every stop brought a new face, another coffee, a short story.\n\nHere are the kilometres that changed us a little inside.',
      },
      {
        headline: 'Horizon',
        body: 'Just when we think we know the world, a new place opens it again. The sky changes colour, and so do we.\n\nThis album keeps those horizons — and us watching them.',
      },
      {
        headline: 'Passport',
        body: 'The stamps are dry. The memories are not. They hold market noise, sea salt, and the quiet of a late hotel night.\n\nWe travelled to see the world — and found ourselves.',
      },
      {
        headline: 'The return',
        body: 'The sweetest part is coming home: an open suitcase on the floor, the first photo on the phone, and “we have to go again”.\n\nUntil we leave, we keep them here.',
      },
      {
        headline: 'Living map',
        body: 'We did not need a perfect plan. We needed curiosity. We got a little lost and found more.\n\nThese pages are our living map.',
      },
    ],
  },
  'Baby & Family': {
    sq: [
      {
        headline: 'Familja jonë',
        body: 'Në shtëpinë tonë ka zhurmë të ëmbël, duar të vogla, dhe netë që duken të gjata derisa bie gjumi.\n\nKëto faqe ruajnë rritjen e shpejtë dhe dashurinë që nuk ka nevojë për fjalë të mëdha.',
        signoff: 'Me dashuri të thjeshtë.',
      },
      {
        headline: 'Fillimet tona',
        body: 'Çdo ditë sjell diçka të re: një hap, një fjalë, një të qeshur që e ndryshon gjithçka.\n\nKy album është për ata që e mbajnë zemrën tonë — dhe për ne që mësojmë duke e jetuar.',
      },
      {
        headline: 'Nën një çati',
        body: 'Jemi një ekip i vogël. Ndajmë bukën, lodhjen, dhe gëzimin e mëngjeseve të ngatërruara.\n\nNë foto duket e lehtë. Në të vërtetë është puna më e bukur që kemi bërë.',
      },
      {
        headline: 'Duart e vogla',
        body: 'Mbërthehen te gishtërinjtë tanë sikur e dinë rrugën. Ne mësojmë të ecim më ngadalë për të qëndruar pranë tyre.\n\nKëtu janë ditët që ikin shpejt — dhe që duam t’i mbajmë.',
      },
      {
        headline: 'Mami & babi',
        body: 'Nuk jemi të përsosur. Jemi të pranishëm. Kjo mjafton për të ndërtuar një fëmijëri të ngrohtë.\n\nKy album e dëshmon me gaz e me qetësi.',
      },
      {
        headline: 'Rritja',
        body: 'Veshjet u bënë të vogla. Dhoma u mbush me lodra. Ne u bëmë më të mëdhenj nga brenda.\n\nFaleminderit për çdo fazë.',
      },
      {
        headline: 'Gjenerata',
        body: 'Të njëjtat sy në fytyra të ndryshme. Gjyshërit, prindërit, fëmijët — një vijë e butë që vazhdon.\n\nKëto faqe e mbajnë vijën të dukshme.',
      },
      {
        headline: 'Shtëpi e ngrohtë',
        body: 'Eromë bukë, të qeshura në kuzhinë, dikush që thërret “hajde”.\n\nKjo është pasuria jonë e vërtetë.',
      },
    ],
    en: [
      {
        headline: 'Our family',
        body: 'Our home holds sweet noise, small hands, and nights that feel long until sleep finally comes.\n\nThese pages keep the fast growing and a love that does not need big words.',
        signoff: 'With simple love.',
      },
      {
        headline: 'Our beginnings',
        body: 'Every day brings something new: a step, a word, a laugh that changes everything.\n\nThis album is for those who hold our hearts — and for us, learning by living it.',
      },
      {
        headline: 'Under one roof',
        body: 'We are a small team. We share bread, tiredness, and the joy of messy mornings.\n\nIn photos it looks easy. In truth it is the most beautiful work we have done.',
      },
      {
        headline: 'Small hands',
        body: 'They grip our fingers as if they already know the way. We learn to walk slower to stay beside them.\n\nHere are the days that pass quickly — and that we want to keep.',
      },
      {
        headline: 'Mum & dad',
        body: 'We are not perfect. We are present. That is enough to build a warm childhood.\n\nThis album proves it with laughter and calm.',
      },
      {
        headline: 'Growing',
        body: 'Clothes grew small. The room filled with toys. We grew larger inside.\n\nThank you for every stage.',
      },
      {
        headline: 'Generations',
        body: 'The same eyes in different faces. Grandparents, parents, children — a soft line that continues.\n\nThese pages keep the line visible.',
      },
      {
        headline: 'A warm home',
        body: 'The smell of bread, laughs in the kitchen, someone calling “come”.\n\nThis is our real wealth.',
      },
    ],
  },
  Friendship: {
    sq: [
      {
        headline: 'Miqësia jonë',
        body: 'Ka njerëz që vijnë pa zhurmë dhe mbeten. Me ta koha kalon shpejt, dhe heshtja nuk është kurrë e rëndë.\n\nKy album është për ata që na njohin pa maskë.',
        signoff: 'Faleminderit që jeni.',
      },
      {
        headline: 'Me ju',
        body: 'Nuk na duhen data të mëdha. Na mjafton një darkë e gjatë, një telefonatë e papritur, një foto e bërë keq por e vërtetë.\n\nKëtu janë ditët që na mbajtën afër.',
      },
      {
        headline: 'E njëjta e qeshur',
        body: 'Vite kalojnë, dhe ende qeshim për të njëjtën gjë. Kjo është prova më e mirë se miqësia jeton.\n\nI mbajtëm këto çaste që të mos harrohen.',
      },
      {
        headline: 'Pa fjalë',
        body: 'Ndonjëherë mjafton të jesh aty. Pa këshilla, pa zhurmë — vetëm prani.\n\nFaleminderit për ato heshtje të mira.',
      },
      {
        headline: 'Ekipi',
        body: 'Në gëzim dhe në lodhje, ju ishit aty. Kjo na bëri më të fortë.\n\nKy album është për ekipin tonë të vogël.',
      },
      {
        headline: 'Histori të përbashkëta',
        body: 'Kemi histori që i kuptojmë vetëm ne. Një shikim mjafton për t’i hapur sërish.\n\nKëtu janë disa nga ato shikime.',
      },
      {
        headline: 'Besimi',
        body: 'Miqësia e vërtetë nuk bën zhurmë. Qëndron. Na mban kur ne nuk mundemi.\n\nJu faleminderit për besimin.',
      },
      {
        headline: 'Për gjithmonë',
        body: 'Nuk premtuam përsosmëri. Premtuam të jemi aty. Dhe ishit.\n\nKjo mjafton.',
      },
    ],
    en: [
      {
        headline: 'Our friendship',
        body: 'Some people arrive quietly and stay. With them time moves fast, and silence is never heavy.\n\nThis album is for those who know us without a mask.',
        signoff: 'Thank you for being here.',
      },
      {
        headline: 'With you',
        body: 'We do not need big dates. A long dinner, a sudden call, a badly taken but true photo is enough.\n\nHere are the days that kept us close.',
      },
      {
        headline: 'The same laugh',
        body: 'Years pass and we still laugh at the same thing. That is the best proof friendship lives.\n\nWe kept these moments so they are not forgotten.',
      },
      {
        headline: 'Without words',
        body: 'Sometimes it is enough to be there. No advice, no noise — only presence.\n\nThank you for those good silences.',
      },
      {
        headline: 'The team',
        body: 'In joy and in tiredness, you were there. That made us stronger.\n\nThis album is for our small team.',
      },
      {
        headline: 'Shared stories',
        body: 'We have stories only we understand. One look is enough to open them again.\n\nHere are some of those looks.',
      },
      {
        headline: 'Trust',
        body: 'Real friendship does not make noise. It stays. It holds us when we cannot.\n\nThank you for the trust.',
      },
      {
        headline: 'Forever friends',
        body: 'We did not promise perfection. We promised to show up. And you did.\n\nThat is enough.',
      },
    ],
  },
  Celebration: {
    sq: [
      {
        headline: 'Festë',
        body: 'Ka netë që fillojnë me muzikë dhe mbarojnë me këmbë të lodhura e zemra të lehta.\n\nNë këto faqe është gazi ynë — i lartë dhe i denjë për t’u mbajtur.',
        signoff: 'Edhe një herë, për shëndet!',
      },
      {
        headline: 'Kjo natë',
        body: 'E dimë që festa kalon. Por fotoja e mban: dritat, gotat, dhe fytyrat që ndriçojnë më shumë se dekorimet.\n\nLe të na kujtojë se dinim të gëzoheshim.',
      },
      {
        headline: 'Gëzim',
        body: 'Nuk e kursyem. Qeshëm me zë, kërcyem pa turp, përqafuam gjatë.\n\nKjo faqe e ruan atë tepricë të bukur.',
      },
      {
        headline: 'Për shëndet',
        body: 'Gotat u ngritën për jetën, për miqtë, për ata që mungonin dhe për ata që ishin.\n\nShëndet — edhe nesër.',
      },
      {
        headline: 'Dritat',
        body: 'Dritat e vogla bënë dhomën magjike. Ne u bëmë pjesë e asaj magjie.\n\nI mbajtëm që të ndriçojnë sërish kur t’i hapim albumin.',
      },
      {
        headline: 'Këmba në ritëm',
        body: 'Muzika na mori me vete. U lodhëm bukur.\n\nNesër do të na dhembin këmbët — dhe do të qeshim për këtë.',
      },
      {
        headline: 'Darka jonë',
        body: 'Tryeza e gjatë, biseda që nuk mbarojnë, ëmbëlsira e fundit.\n\nNjë darkë e thjeshtë u bë kujtim i madh.',
      },
      {
        headline: 'Urime',
        body: 'Urimet erdhën me zë dhe me përqafime. Ne i ndjemë të gjitha.\n\nFaleminderit që e bëtë natën më të ndritur.',
      },
    ],
    en: [
      {
        headline: 'Celebrate',
        body: 'Some nights begin with music and end with tired feet and light hearts.\n\nThese pages hold our joy — loud and worth keeping.',
        signoff: 'Once more — cheers!',
      },
      {
        headline: 'This night',
        body: 'We know the party passes. The photo keeps it: the lights, the glasses, and faces brighter than the decorations.\n\nLet it remind us we knew how to rejoice.',
      },
      {
        headline: 'Joy',
        body: 'We did not hold back. We laughed out loud, danced without shame, hugged for a long time.\n\nThis page keeps that beautiful excess.',
      },
      {
        headline: 'Cheers',
        body: 'Glasses rose for life, for friends, for those missing and those present.\n\nCheers — again tomorrow.',
      },
      {
        headline: 'Lights',
        body: 'Small lights made the room magic. We became part of that magic.\n\nWe kept them so they can shine again when we open the album.',
      },
      {
        headline: 'On the beat',
        body: 'The music took us with it. We tired ourselves beautifully.\n\nTomorrow our feet will hurt — and we will laugh about it.',
      },
      {
        headline: 'Our dinner',
        body: 'A long table, talks that would not end, the last dessert.\n\nA simple dinner became a large memory.',
      },
      {
        headline: 'Well wishes',
        body: 'Wishes came with voice and hugs. We felt them all.\n\nThank you for making the night brighter.',
      },
    ],
  },
  Portrait: {
    sq: [
      {
        headline: 'Ashtu siç jemi',
        body: 'Nuk kërkuam pozën e përsosur. Kërkuam vështrimin e vërtetë — atë që mbetet kur askush nuk po e sheh kamerën.\n\nKëto portrete janë një ndalesë e qetë në kohë.',
      },
      {
        headline: 'Pranë',
        body: 'Ndonjëherë mjafton të jesh vetvetja, me dritë të butë dhe pak kohë.\n\nKy album e ruan atë çast — pa zhurmë, pa nxitim.',
      },
      {
        headline: 'Pa maskë',
        body: 'Fytyra flet edhe kur goja hesht. Këtu e lejuam të flasë.\n\nFaleminderit për guximin të dukesh siç je.',
      },
      {
        headline: 'Dritë e butë',
        body: 'Drita e mirë nuk fsheh — zbulon. Në këto faqe jemi më afër të vërtetës sonë.',
      },
      {
        headline: 'Një ndalesë',
        body: 'Në mes të ditëve të shpejta, u ndalem. Një frymëmarrje. Një foto.\n\nMjafton.',
      },
      {
        headline: 'Shikimi',
        body: 'Ka shikime që nuk harrohen. I kapëm disa prej tyre.\n\nTani jetojnë këtu.',
      },
      {
        headline: 'Heshtje e bukur',
        body: 'Jo çdo portret ka nevojë për buzëqeshje të madhe. Ndonjëherë qetësia thotë më shumë.',
      },
      {
        headline: 'Ti, ashtu',
        body: 'Ky album nuk është për të tjerët. Është për ty — që të shohësh veten me dashamirësi.',
      },
    ],
    en: [
      {
        headline: 'As we are',
        body: 'We did not chase the perfect pose. We wanted the true look — the one that stays when no one is watching the camera.\n\nThese portraits are a quiet pause in time.',
      },
      {
        headline: 'Close',
        body: 'Sometimes it is enough to be yourself, with soft light and a little time.\n\nThis album keeps that moment — without noise, without rush.',
      },
      {
        headline: 'Unmasked',
        body: 'A face speaks even when the mouth is quiet. Here we let it speak.\n\nThank you for the courage to look like yourself.',
      },
      {
        headline: 'Soft light',
        body: 'Good light does not hide — it reveals. On these pages we are closer to our truth.',
      },
      {
        headline: 'A pause',
        body: 'In the middle of fast days, we stopped. One breath. One photo.\n\nEnough.',
      },
      {
        headline: 'The look',
        body: 'Some looks are not forgotten. We caught a few of them.\n\nNow they live here.',
      },
      {
        headline: 'Beautiful quiet',
        body: 'Not every portrait needs a big smile. Sometimes calm says more.',
      },
      {
        headline: 'Just you',
        body: 'This album is not for others. It is for you — to see yourself kindly.',
      },
    ],
  },
  Nature: {
    sq: [
      {
        headline: 'Në natyrë',
        body: 'Ajri ndryshon gjithçka. Mali, deti, pylli — na kthejnë në njerëz më të thjeshtë dhe më të qetë.\n\nKëto foto janë frymëmarrje: dritë, erë, dhe heshtje e bukur.',
        signoff: 'Derisa të dalim përsëri.',
      },
      {
        headline: 'Jashtë mureve',
        body: 'Larg ekraneve gjetëm ritmin tonë: hapa të ngadaltë, qiell të hapur, kohë që nuk na nxiton.\n\nKy album mban pjesën e botës që na qetësoi.',
      },
      {
        headline: 'Ujë e gur',
        body: 'Uji lëviz, guri qëndron. Ne u ndjemë mes tyre — të qetë dhe të gjallë.\n\nI mbajtëm këto peizazhe si kujtesë.',
      },
      {
        headline: 'Era',
        body: 'Era na çrregulloi flokët dhe na rregulloi mendjen.\n\nNdonjëherë kaq mjafton.',
      },
      {
        headline: 'Shi i lehtë',
        body: 'Edhe shiu ka bukurinë e tij. Gjethet shkëlqejnë, toka merr erë.\n\nU lagëm pak — dhe qeshëm.',
      },
      {
        headline: 'Mali',
        body: 'Hapat ishin të rëndë, pamja e lehtë. Nga lart gjithçka duket më e thjeshtë.\n\nDo të ngjitemi përsëri.',
      },
      {
        headline: 'Deti',
        body: 'Kripa në lëkurë, zhurma e valëve, dielli që bie ngadalë.\n\nDeti na mësoi të ngadalësojmë.',
      },
      {
        headline: 'Pylli',
        body: 'Nën pemë zëri ynë u bë më i ulët. Pylli kërkon respekt — dhe jep qetësi.',
      },
    ],
    en: [
      {
        headline: 'In nature',
        body: 'Air changes everything. Mountain, sea, forest — they return us to simpler, quieter people.\n\nThese photos are a breath: light, wind, and a beautiful silence.',
        signoff: 'Until we go out again.',
      },
      {
        headline: 'Outside the walls',
        body: 'Away from screens we found our rhythm: slow steps, open sky, time that does not rush us.\n\nThis album holds the part of the world that calmed us.',
      },
      {
        headline: 'Water and stone',
        body: 'Water moves, stone stays. We felt ourselves between them — calm and alive.\n\nWe kept these landscapes as memory.',
      },
      {
        headline: 'Wind',
        body: 'The wind messed our hair and settled our minds.\n\nSometimes that is enough.',
      },
      {
        headline: 'Soft rain',
        body: 'Even rain has its beauty. Leaves shine, earth smells alive.\n\nWe got a little wet — and laughed.',
      },
      {
        headline: 'Mountain',
        body: 'The steps were heavy, the view light. From above everything looks simpler.\n\nWe will climb again.',
      },
      {
        headline: 'Sea',
        body: 'Salt on skin, the sound of waves, the sun falling slowly.\n\nThe sea taught us to slow down.',
      },
      {
        headline: 'Forest',
        body: 'Under the trees our voices grew quieter. The forest asks for respect — and gives calm.',
      },
    ],
  },
  Locations: {
    sq: [
      {
        headline: 'Vendet tona',
        body: 'Çdo qytet ka zërin e vet. Ne e dëgjuam duke ecur, duke u humbur pak, dhe duke gjetur tryeza të vogla ku u ndamë.\n\nNë faqe mbeten rrugicat dhe ndjesia se ishim pikërisht aty ku duhej.',
      },
      {
        headline: 'Atje',
        body: 'Ndonjëherë “atje” bëhet shtëpi për pak ditë. Mjafton një shesh, një kafe, një foto e papritur.\n\nKy album i mban ato vende — dhe ne brenda tyre.',
      },
      {
        headline: 'Qyteti',
        body: 'Trotuari, dritat e natës, aroma e bukës nga një cep i rrugës.\n\nU bëmë pjesë e ritmit të tij për pak kohë.',
      },
      {
        headline: 'Rrugica',
        body: 'Rrugicat e ngushta na çuan ku nuk e planifikuam. Aty gjetëm foton më të mirë.',
      },
      {
        headline: 'Sheshi',
        body: 'Njerëz që kalojnë, muzikë në distancë, ne të ulur në mes.\n\nSheshi na dha një pushim të bukur.',
      },
      {
        headline: 'Dritarja',
        body: 'Nga dritarja e hotelit qyteti dukej si skenë. Ne ishim spektatorë të qetë.',
      },
      {
        headline: 'Mëngjes në qytet',
        body: 'Para se të zgjohej zhurma, dolëm herët. Qyteti ishte ynë për një orë.',
      },
      {
        headline: 'Natë jashtë',
        body: 'Dritat u ndezën, dhe ne vazhduam. Një qytet natën ka një fytyrë tjetër — më të butë.',
      },
    ],
    en: [
      {
        headline: 'Our places',
        body: 'Every city has its own voice. We heard it while walking, getting a little lost, and finding small tables to share.\n\nThese pages keep the alleys and the feeling we were exactly where we needed to be.',
      },
      {
        headline: 'There',
        body: 'Sometimes “there” becomes home for a few days. A square, a coffee, an unexpected photo is enough.\n\nThis album keeps those places — and us inside them.',
      },
      {
        headline: 'The city',
        body: 'Pavement, night lights, the smell of bread from a street corner.\n\nWe became part of its rhythm for a little while.',
      },
      {
        headline: 'Side streets',
        body: 'Narrow streets took us where we did not plan. There we found the best photo.',
      },
      {
        headline: 'The square',
        body: 'People passing, music in the distance, us sitting in the middle.\n\nThe square gave us a beautiful pause.',
      },
      {
        headline: 'The window',
        body: 'From the hotel window the city looked like a stage. We were quiet spectators.',
      },
      {
        headline: 'Morning in the city',
        body: 'Before the noise woke up, we went out early. The city was ours for an hour.',
      },
      {
        headline: 'Night out',
        body: 'The lights came on and we kept going. A city at night has another face — a softer one.',
      },
    ],
  },
  Modern: {
    sq: [
      {
        headline: 'Historia jonë',
        body: 'Nuk e shkruam me fjalë të mëdha. E shkruam me ditë të zakonshme që u bënë të rëndësishme.\n\nKy album i mbledh ato — me dritë, me hije, dhe me të vërtetën tonë.',
      },
      {
        headline: 'Tani',
        body: 'Para se koha të kalojë më shpejt, e ndaluam pak. Një faqe, një foto, një kujtim.\n\nLe të mbetet këtu — e thjeshtë dhe e qartë.',
      },
      {
        headline: 'Pa filter',
        body: 'Jo gjithçka ishte e përsosur. Ishte e vërtetë. Kjo ka më shumë vlerë.',
      },
      {
        headline: 'Çastet',
        body: 'Jetojmë shpejt. Prandaj i ndalëm disa çaste këtu — që të kthehemi te ato.',
      },
      {
        headline: 'Ne së bashku',
        body: 'Ky nuk është një album për të tjerët. Është për ne — që të mos harrojmë se kush ishim në këto ditë.',
      },
      {
        headline: 'Dritë & hije',
        body: 'Edhe hijet tregojnë diçka. Së bashku me dritën, bëjnë foton e plotë të jetës sonë.',
      },
      {
        headline: 'Kujtesë e gjallë',
        body: 'Telefoni e mbush galerinë. Ky album e zgjedh atë që ka rëndësi.',
      },
      {
        headline: 'Vazhdon',
        body: 'Faqja e fundit nuk është fundi. Është një ndalesë para kapitullit tjetër.',
      },
    ],
    en: [
      {
        headline: 'Our story',
        body: 'We did not write it with big words. We wrote it with ordinary days that became important.\n\nThis album gathers them — with light, with shadow, and with our truth.',
      },
      {
        headline: 'Now',
        body: 'Before time moves faster, we paused a little. One page, one photo, one memory.\n\nLet it stay here — simple and clear.',
      },
      {
        headline: 'No filter',
        body: 'Not everything was perfect. It was true. That is worth more.',
      },
      {
        headline: 'Moments',
        body: 'We live fast. So we stopped a few moments here — to return to them.',
      },
      {
        headline: 'Just us two',
        body: 'This is not an album for others. It is for us — so we do not forget who we were in these days.',
      },
      {
        headline: 'Light & shadow',
        body: 'Even shadows tell something. Together with light, they make the full picture of our life.',
      },
      {
        headline: 'Living memory',
        body: 'The phone fills the gallery. This album chooses what matters.',
      },
      {
        headline: 'To be continued',
        body: 'The last page is not the end. It is a pause before the next chapter.',
      },
    ],
  },
};

/** Short line captions — large pool so pages do not repeat. */
export const CATEGORY_CAPTIONS: Record<string, { sq: string[]; en: string[] }> = {
  Wedding: {
    sq: [
      'Një vështrim mjaftonte.', 'Dora jote. Dora ime.', 'E tha zemra para fjalëve.', 'Në këtë dritë qëndrojmë.',
      'Po — dhe gjithçka ndryshoi.', 'Bashkë, hap pas hapi.', 'E qeshura jote.', 'Në krahët e njëri-tjetrit.',
      'Unaza e re, premtimi i vjetër.', 'Vetëm ne në botë.', 'Përjetë fillon sot.', 'Me ty është shtëpi.',
    ],
    en: [
      'One look was enough.', 'Your hand. Mine.', 'The heart spoke first.', 'We stay in this light.',
      'Yes — and everything changed.', 'Together, step by step.', 'Your laugh.', 'In each other’s arms.',
      'A new ring, an old promise.', 'Only us in the world.', 'Forever starts today.', 'With you it is home.',
    ],
  },
  Travel: {
    sq: [
      'Para se të niseshim.', 'Rruga e panjohur.', 'Këtu u ndalëm.', 'Dielli i fundit i ditës.',
      'Bileta në dorë.', 'Dritarja e trenit.', 'Një kafe në qytet të ri.', 'U humbëm bukur.',
      'Deti na thirri.', 'Mali na priti.', 'Pasaportë e hapur.', 'Kthimi i ëmbël.',
    ],
    en: [
      'Before we left.', 'The unknown road.', 'We stopped here.', 'The last light of the day.',
      'Ticket in hand.', 'Train window.', 'Coffee in a new city.', 'Beautifully lost.',
      'The sea called.', 'The mountain waited.', 'Open passport.', 'The sweet return.',
    ],
  },
  'Baby & Family': {
    sq: [
      'Duart e vogla.', 'Në krahët tanë.', 'Mëngjes i ngatërruar.', 'Qetësi e shkurtër.',
      'Hapi i parë.', 'E qeshura e re.', 'Gjyshi dhe unë.', 'Nënë e bir.',
      'Lojëra në dysheme.', 'Netë pa gjumë.', 'Familja e plotë.', 'Dashuri e thjeshtë.',
    ],
    en: [
      'Small hands.', 'In our arms.', 'A messy morning.', 'A short quiet.',
      'First step.', 'A new laugh.', 'Grandpa and me.', 'Mother and child.',
      'Games on the floor.', 'Sleepless nights.', 'The full family.', 'Simple love.',
    ],
  },
  Friendship: {
    sq: [
      'Si gjithmonë.', 'Pa fjalë të shumta.', 'Me ju është lehtë.', 'E njëjta e qeshur.',
      'Darkë e gjatë.', 'Telefonatë në mesnatë.', 'Ekipi ynë.', 'Pa maskë.',
      'Histori të vjetra.', 'Përqafim i gjatë.', 'Faleminderit.', 'Përsëri së shpejti.',
    ],
    en: [
      'As always.', 'Without many words.', 'Easy with you.', 'The same laugh.',
      'A long dinner.', 'A midnight call.', 'Our team.', 'Unmasked.',
      'Old stories.', 'A long hug.', 'Thank you.', 'Again soon.',
    ],
  },
  Celebration: {
    sq: [
      'Deri vonë.', 'Për shëndet!', 'Këmba në ritëm.', 'Kjo natë mbetet.',
      'Gotat lart.', 'Tortë dhe dritë.', 'Urime!', 'Kërcim pa turp.',
      'Miqtë erdhën.', 'Muzikë e lartë.', 'Gazi ynë.', 'Edhe një këngë.',
    ],
    en: [
      'Until late.', 'Cheers!', 'Feet on the beat.', 'This night stays.',
      'Glasses up.', 'Cake and light.', 'Congratulations!', 'Dance without shame.',
      'Friends arrived.', 'Loud music.', 'Our joy.', 'One more song.',
    ],
  },
  Portrait: {
    sq: [
      'Pa maskë.', 'Dritë e butë.', 'Ashtu siç je.', 'Një ndalesë.',
      'Shikimi yt.', 'Heshtje e bukur.', 'Afër.', 'E vërtetë.',
      'Pa filter.', 'Ti.', 'Qetësi.', 'Këtu e tani.',
    ],
    en: [
      'Unmasked.', 'Soft light.', 'As you are.', 'A pause.',
      'Your look.', 'Beautiful quiet.', 'Close.', 'True.',
      'No filter.', 'You.', 'Calm.', 'Here and now.',
    ],
  },
  Nature: {
    sq: [
      'Ajër i pastër.', 'Hapa të ngadaltë.', 'Qielli hapet.', 'Heshtje e mirë.',
      'Era e detit.', 'Gurë e ujë.', 'Hije peme.', 'Shi i lehtë.',
      'Mali larg.', 'Diell i butë.', 'Këmbë zbathur.', 'Kthimi në qytet.',
    ],
    en: [
      'Clean air.', 'Slow steps.', 'The sky opens.', 'A good silence.',
      'Sea wind.', 'Stone and water.', 'Tree shade.', 'Soft rain.',
      'Far mountain.', 'Gentle sun.', 'Bare feet.', 'Back to the city.',
    ],
  },
  Locations: {
    sq: [
      'Në qytetin e ri.', 'Rruga e ngushtë.', 'Dritarja e hotelit.', 'Sheshi në darkë.',
      'Mëngjes herët.', 'Kafe në cep.', 'Autobus i vonuar.', 'Hartë në dorë.',
      'Ura e vjetër.', 'Tregu lokal.', 'Natë me drita.', 'Lamtumirë, qytet.',
    ],
    en: [
      'In the new city.', 'The narrow street.', 'The hotel window.', 'The square at night.',
      'Early morning.', 'Corner coffee.', 'A late bus.', 'Map in hand.',
      'The old bridge.', 'Local market.', 'Night lights.', 'Goodbye, city.',
    ],
  },
  Modern: {
    sq: [
      'Ky çast.', 'Pa filter.', 'E vërteta jonë.', 'Tani e këtu.',
      'Dritë & hije.', 'Pa zhurmë.', 'Ne.', 'Vazhdon.',
      'Kujtesë.', 'E thjeshtë.', 'E qartë.', 'E gjallë.',
    ],
    en: [
      'This moment.', 'No filter.', 'Our truth.', 'Now and here.',
      'Light & shadow.', 'Without noise.', 'Us.', 'Continued.',
      'Memory.', 'Simple.', 'Clear.', 'Alive.',
    ],
  },
};

export function narrativesFor(categoryKey: string, lang: 'sq' | 'en'): NarrativePiece[] {
  const pack = CATEGORY_NARRATIVES[categoryKey] ?? CATEGORY_NARRATIVES.Modern;
  const list = pack[lang]?.length ? pack[lang] : pack.sq;
  if (list?.length) return list;
  return CATEGORY_NARRATIVES.Modern.sq;
}

export function captionsFor(categoryKey: string, lang: 'sq' | 'en'): string[] {
  const pack = CATEGORY_CAPTIONS[categoryKey] ?? CATEGORY_CAPTIONS.Modern;
  const list = pack[lang]?.length ? pack[lang] : pack.sq;
  if (list?.length) return list;
  return CATEGORY_CAPTIONS.Modern.sq;
}
