import { bi, img, type PageSlug } from './marketingPages';

export const PAGE_DEFAULTS: Record<PageSlug, Record<string, unknown>> = {
  home: {
    seo: { title: bi('Albume Foto Premium', 'Premium Photo Albums'), description: bi('Kthejini kujtimet në albume foto që i mbani në dorë. I përgatitni online. I printojmë me cilësi galerie. Dërgesa kudo në Shqipëri.', 'Turn your memories into photo albums you can hold. Design online. Printed at gallery quality. Delivered across Albania.') },
    hero: {
      eyebrow: bi('Albume foto', 'Photo albums'),
      headline: bi('Ruaj kujtimet', 'Keep the memories'),
      brand: bi('Përgjithmonë', 'Përgjithmonë'),
      sub: bi('I përgatitni online. I printojmë me cilësi galerie.', 'Design it online. We print it at gallery quality.'),
      cta: bi('Krijo albumin', 'Create your album'),
      secondaryCta: bi('Shiko shembujt', 'See examples'),
      explore: bi('Shfleto', 'Browse'),
    },
    styles: [
      { label: bi('Dasmë', 'Wedding'), line: bi('Një ditë. Një album. Për gjithmonë.', 'One day. One album. Forever yours.'), wallpaper: img('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=700&q=88&fit=crop&crop=top') },
      { label: bi('Udhëtime', 'Travel'), line: bi('Shkoni larg. Mbajini afër.', 'Go far. Keep it close.'), wallpaper: img('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&q=88&fit=crop&crop=center') },
      { label: bi('Familje', 'Family'), line: bi('Vitet e vogla. Album i madh.', 'Little years. Big album.'), wallpaper: img('https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=700&q=88&fit=crop&crop=top') },
      { label: bi('Miqësi', 'Friendship'), line: bi('Miqësia që nuk zbehet.', 'Friendship that doesn’t fade.'), wallpaper: img('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&q=88&fit=crop&crop=top') },
      { label: bi('Festash', 'Celebrations'), line: bi('Festa mbaron. Albumi mbetet.', 'The party ends. The album stays.'), wallpaper: img('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=88&fit=crop') },
    ],
    starter: {
      title: bi('Cilat kujtime do t’i lini në një album?', 'Which memories belong in an album?'),
      sub: bi('Zgjidhni stilin. Editori hapet me atë kopertinë, gati për fotot tuaja.', 'Pick a style. The editor opens with that cover, ready for your photos.'),
      browse: bi('Shiko të gjitha stilet', 'Browse all styles'),
    },
    ticker: [
      bi('letër mat 200g', 'matte 200g paper'),
      bi('hapje e sheshtë', 'lay-flat binding'),
      bi('printim premium', 'premium printing'),
      bi('dërgesë në 10–16 ditë', '10–16 day delivery'),
      bi('dizajn profesional', 'professional design'),
      bi('garanci 30 ditë', '30-day guarantee'),
    ],
    ai: {
      badge: bi('E re · me AI', 'New · powered by AI'),
      title: bi('Ngarkoni fotot — AI-ja e krijon albumin', 'Upload your photos, let AI build the album'),
      body: bi('Zgjidhni një kategori, ngarkoni 25+ foto — sistemi zgjedh vetë paraqitjen, ngjyrat dhe dizajnin e çdo faqeje. Më pas e rregulloni si të doni.', 'Pick a category, upload 25+ photos — our system automatically chooses the layout, colors, and design of every page. Fine-tune anything afterwards.'),
      cta: bi('Provo albumin me AI', 'Try the AI album maker'),
      note: bi('Gati brenda sekondave', 'Ready in seconds'),
    },
    categories: {
      kicker: bi('koleksionet tona', 'our collections'),
      title: bi('Albume për çdo moment të veçantë', 'An album for every special moment'),
      all: bi('të gjitha', 'all collections'),
    },
    spread: {
      kicker: bi('si duket brenda', "what's inside"),
      title: bi('Faqet që tregojnë historinë tuaj', 'Pages that tell your story'),
      body: bi('Përgatitni çdo faqe dyshe si t’ju pëlqejë — dy faqe krah për krah, si një album i vërtetë. Zgjidhni paraqitjen, shtoni fotot dhe tekstin.', 'Design each spread as you like — two pages side by side, like a real album. Pick a layout, add your photos and text.'),
      tag: bi('Faqja 6–7 · pamja e plotë', 'Page 6–7 · full spread view'),
      stats: [
        { num: bi('9+', '9+'), label: bi('modele faqesh', 'page layouts') },
        { num: bi('20+', '20+'), label: bi('dizajne të gatshme', 'premade designs') },
        { num: bi('∞', '∞'), label: bi('foto në faqe', 'photos per page') },
        { num: bi('3', '3'), label: bi('madhësi albumi', 'album sizes') },
      ],
      photos: {
        a: img('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=400&q=80&fit=crop'),
        b: img('https://images.unsplash.com/photo-1606800052052-a08af7148866?w=300&q=80&fit=crop'),
        c: img('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=300&q=80&fit=crop'),
        d: img('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80&fit=crop'),
      },
    },
    materials: {
      kicker: bi('çfarë e bën të veçantë', 'what makes it special'),
      items: [
        { title: bi('Letër mat 200g', 'Matte 200g paper'), desc: bi('Cilësi premium, pa pasqyrim', 'Premium quality, no glare') },
        { title: bi('Lidhje e sheshtë', 'Lay-flat binding'), desc: bi('Hapet fare, pa humbje të fotos', 'Full open, no image loss') },
        { title: bi('Printim CMYK', 'CMYK printing'), desc: bi('Ngjyra të gjalla, të sakta', 'Vivid, accurate colours') },
        { title: bi('Kuti mbrojtëse', 'Protective box'), desc: bi('Dërgesë e sigurt, gjithmonë', 'Safe delivery, always') },
      ],
    },
    process: {
      kicker: bi('procesi', 'the process'),
      title: bi('Tre hapa deri te albumi juaj', 'Three steps to your album'),
      cta: bi('Krijo tani — falas', 'Start now — free'),
      note: bi('Pa kartë krediti', 'No credit card required'),
      steps: [
        {
          title: bi('Zgjidhni stilin', 'Choose a style'),
          desc: bi('Zgjidhni madhësinë dhe temën. 5 stile, secili me ngjyrat dhe shkronjat e veta.', 'Pick your size and visual theme. 5 styles with ready-made colours and fonts.'),
          detail: bi('Nga dasma te udhëtimi, kemi një stil për çdo moment. Çdo stil ka 4–6 variante ngjyrash dhe 3 madhësi albumi (20×20, 30×30, A4).', 'From weddings to travel, we have styles for every occasion. Each style has 4–6 colour variants and 3 album sizes (20×20, 30×30, A4).'),
        },
        {
          title: bi('Ngarkoni fotot', 'Upload your photos'),
          desc: bi('Dizajnoni çdo faqe me editorin tonë. Tërhiqni fotot dhe i vendosni si të doni.', 'Design every page with our editor. Drag photos and arrange freely.'),
          detail: bi('Ngarkoni drejtpërdrejt nga telefoni ose kompjuteri. Ndryshoni tekstin, zgjidhni paraqitjet dhe shtoni dekorime. Funksionon në çdo pajisje.', 'Upload directly from your phone or computer. Edit text, choose layouts and add decorations. Works on any device.'),
        },
        {
          title: bi('Porositni dhe merrni', 'Order and receive'),
          desc: bi('Printuar dhe dërguar te dera juaj brenda 10–16 ditëve pune.', 'Printed and delivered straight to your door within 10–16 working days.'),
          detail: bi('Printim me cilësi galerie, letër mat 200g, lidhje e sheshtë. Dërgesë e sigurt me kuti mbrojtëse. Garanci kthimi 30 ditë.', 'Gallery-quality printing, matte 200g paper, lay-flat binding. Safe delivery with protective box. 30-day return guarantee.'),
        },
      ],
    },
    testimonial: {
      quote: bi('"Cilësia e letrës dhe printimit është thjesht e mrekullueshme. Është vërtet një album që do të mbetet në familjen tonë."', '"The paper and print quality is simply beautiful. Truly an album that will stay in our family."'),
      name: bi('Era M.', 'Era M.'),
      place: bi('Tiranë, Shqipëri', 'Tirana, Albania'),
      photo: img('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&fit=crop&crop=face'),
    },
    cta: {
      kicker: bi('— filloni sot', '— start today'),
      title: bi('Fotot meritojnë të jenë kujtim', 'Photos deserve to become a memory'),
      body: bi('Pa regjistrim. Pa kartë krediti. Filloni falas dhe porositni vetëm kur jeni gati.', "No registration. No credit card. Start free and only order when you're ready."),
      button: bi('Krijo albumin tuaj falas →', 'Create your album — free →'),
      note: bi('Nga 3.100 LEK · Dërgesë falas mbi 5.000 LEK', 'From 3,100 LEK · Free delivery over 5,000 LEK'),
    },
  },

  'how-it-works': {
    seo: { title: bi('Si Funksionon', 'How It Works'), description: bi('Tre hapa të thjeshtë: zgjidhni madhësinë dhe stilin, përgatitni faqet online, dhe merrni albumin tuaj brenda 10–16 ditësh.', 'Three simple steps: choose your size and style, design the pages online, and receive your album within 10–16 days.') },
    hero: {
      kicker: bi('si funksionon', 'how it works'),
      title: bi('Katër hapa deri te albumi juaj', 'Four steps to your album'),
      body: bi('Procesi është i thjeshtë: zgjidhni, përgatitni, porositni. Albumi arrin i printuar me cilësi galerie.', 'The process is simple: choose, design, order. Your album arrives printed at gallery quality.'),
    },
    steps: [
      { title: bi('Zgjidhni rastin', 'Pick your occasion'), desc: bi('Filloni me dasëm, udhëtim, familje ose çfarëdo rasti special. Çdo kategori ka modele të dizajnuara enkas për ato momente.', 'Start with wedding, travel, family or any special moment. Each category comes with layouts crafted for those exact memories.'), visual: bi('Dasmë · Udhëtim · Familje · Ditëlindje · Miqësi', 'Wedding · Travel · Family · Birthday · Friendship') },
      { title: bi('Ngarkoni fotot tuaja', 'Upload your photos'), desc: bi('Shtoni fotot nga celulari ose kompjuteri. Mbështesim çdo format dhe rezolucion. Sistemi organizon fotot automatikisht.', 'Add photos from your phone or computer. We support every format and resolution. The system arranges them automatically.'), visual: bi('JPG · PNG · HEIC · Tërhiqni & Lëshoni', 'JPG · PNG · HEIC · Drag & Drop') },
      { title: bi('Personalizoni çdo faqe', 'Personalise every page'), desc: bi('Lëvizni fotot, ndryshoni tekstet, zgjidhni fontet dhe personalizoni kopertinën. Kontroll i plotë mbi çdo detaj të albumit tuaj.', 'Move photos, edit text, pick fonts, personalise the cover. Full control over every detail — the way only you would want it.'), visual: bi('Tekst · Ngjyra · Fontet · Faqosjet', 'Text · Colors · Fonts · Layouts') },
      { title: bi('Printim dhe Dërgim', 'Printing & Delivery'), desc: bi('Ne printojmë albumin tuaj me letër premium 200g dhe teknologji lay-flat. Arrihet te ju i paketuar me kujdes brenda 10–16 ditësh.', 'We print your album on premium 200g paper with lay-flat binding. It arrives carefully packaged within 10–16 working days.'), visual: bi('200g Letër mat · Lay-flat · Kuti premium', '200g Matte paper · Lay-flat · Premium box') },
    ],
    quality: {
      kicker: bi('Standardet e cilësisë', 'Quality standards'),
      items: [
        { value: bi('200g', '200g'), label: bi('Letër premium', 'Premium paper'), desc: bi('Mat, pa reflektime', 'Matte, glare-free') },
        { value: bi('180°', '180°'), label: bi('Hapje e sheshtë', 'Lay-flat binding'), desc: bi('Asnjë buzë e bardhë', 'Zero white border') },
        { value: bi('300', '300'), label: bi('Rezolucion printimi', 'Print resolution'), desc: bi('DPI — të mprehta gjithmonë', 'DPI — always sharp') },
        { value: bi('30', '30'), label: bi('Garanci cilësie', 'Quality guarantee'), desc: bi('ditë rikthim falas', 'day free return') },
      ],
    },
    why: {
      title: bi('Pse të zgjidhni Përgjithmonë?', 'Why choose Përgjithmonë?'),
      items: [
        { title: bi('Cilësi e garantuar', 'Guaranteed quality'), desc: bi('30 ditë rikthim pa pyetje', '30-day no-questions return') },
        { title: bi('Të dhënat tuaja private', 'Your data private'), desc: bi('Fotot nuk ndahen me askënd', 'Photos never shared with anyone') },
        { title: bi('Dërgesë e garantuar', 'Guaranteed delivery'), desc: bi('10–16 ditë pune, kudo në Shqipëri', '10–16 days, anywhere in Albania') },
      ],
    },
    cta: {
      title: bi('Gati për të filluar?', 'Ready to start?'),
      body: bi('Krijoni albumin tuaj falas. Paguani vetëm kur jeni të kënaqur.', "Create your album for free. Pay only when you're happy with it."),
      button: bi('Krijo albumin tuaj', 'Create your album'),
      note: bi('Pa regjistrim · Pa kartë krediti', 'No sign-up · No credit card'),
    },
  },

  pricing: {
    seo: { title: bi('Çmimet', 'Pricing'), description: bi('Çmime të qarta për albume foto premium — nga 2.900 lekë. Letër mat 200g, hapje e sheshtë, printim galerie. Dërgesa falas mbi 5.000 lekë.', 'Clear pricing for premium photo albums — from 2,900 lek. Matte 200g paper, lay-flat binding, gallery-quality printing. Free delivery over 5,000 lek.') },
    hero: {
      kicker: bi('— çmimet', '— pricing'),
      title: bi('Çmime të qarta, pa surpriza', 'Clear pricing, no surprises'),
      body: bi('Cilësi premium pa kompromise. Çmime transparente, pa kosto të fshehura.', 'Premium quality without compromise. Transparent pricing, no hidden costs.'),
    },
    plans: [
      {
        name: bi('Katror', 'Square'),
        desc: bi('Perfekt për Instagram, dhurata dhe albume të përditshme.', 'Perfect for Instagram, gifts and everyday albums.'),
        badge: bi('Më e kërkuara', 'Most popular'),
        extra: bi('+100 LEK / fletë shtesë', '+100 LEK / extra leaf'),
        cta: bi('Krijo albumin tuaj', 'Create your album'),
        features: [
          bi('Kopertinë e fortë me printim cilësor', 'Hard cover with quality printing'),
          bi('Letër premium mat 200g', 'Premium matte 200g paper'),
          bi('Hapje e sheshtë (lay-flat)', 'Lay-flat binding'),
          bi('24 faqe të përfshira (12 fletë)', '24 pages included (12 leaves)'),
          bi('Paketim premium', 'Premium packaging'),
        ],
      },
      {
        name: bi('Portret', 'Portrait'),
        desc: bi('Elegancë klasike për dasma dhe ngjarje madhështore.', 'Classic elegance for weddings and grand occasions.'),
        badge: bi('', ''),
        extra: bi('+150 LEK / fletë shtesë', '+150 LEK / extra leaf'),
        cta: bi('Krijo albumin tuaj', 'Create your album'),
        features: [
          bi('Kopertinë e fortë me printim cilësor', 'Hard cover with quality printing'),
          bi('Letër premium mat 200g', 'Premium matte 200g paper'),
          bi('Hapje e sheshtë (lay-flat)', 'Lay-flat binding'),
          bi('24 faqe të përfshira (12 fletë)', '24 pages included (12 leaves)'),
          bi('Paketim premium', 'Premium packaging'),
        ],
      },
    ],
    delivery: {
      title: bi('Dërgesa kudo në Shqipëri', 'Delivery anywhere in Albania'),
      body: bi('Brenda 10–16 ditësh pune me korrier. Kostoja llogaritet sipas qytetit tuaj në momentin e porosisë.', 'Within 10–16 working days by courier. Cost is calculated based on your city at the time of ordering.'),
      badge: bi('✦ Falas mbi 5,000 LEK', '✦ Free over 5,000 LEK'),
    },
    quality: [
      { num: bi('200g', '200g'), label: bi('letër mat premium', 'premium matte paper'), sub: bi('pa reflektime', 'glare-free') },
      { num: bi('300', '300'), label: bi('DPI printim', 'DPI printing'), sub: bi('gjithmonë të mprehta', 'always sharp') },
      { num: bi('30d', '30d'), label: bi('garanci cilësie', 'quality guarantee'), sub: bi('rikthim falas', 'free returns') },
    ],
    faq: {
      title: bi('Pyetjet e shpeshta', 'Frequently asked questions'),
      more: bi('Keni pyetje të tjera? ', 'More questions? '),
      items: [
        { q: bi('Sa faqe mund të shtoj?', 'How many pages can I add?'), a: bi('Çdo format fillon me 24 faqe. Mund të shtoni sa fletë dëshironi me çmim shtesë për çdo 2 faqe.', 'Every format starts with 24 pages. You can add as many leaves as you want at an extra charge per 2 pages.') },
        { q: bi('Sa kohë zgjat dërgesa?', 'How long does delivery take?'), a: bi('Albumi arrin tek ju brenda 10–16 ditësh pune pasi të keni vendosur porosinë. Dërgojmë kudo në Shqipëri.', 'Your album arrives within 10–16 working days after placing your order. We deliver anywhere in Albania.') },
        { q: bi('A mund ta kthej albumin nëse nuk jam i/e kënaqur?', "Can I return the album if I'm not satisfied?"), a: bi('30 ditë garanci cilësie. Nëse ka ndonjë problem me printimin, e zëvendësojmë falas.', "30-day quality guarantee. If there's any printing issue, we replace it for free.") },
        { q: bi('Si paguaj?', 'How do I pay?'), a: bi('Paguani me kartë krediti/debiti ose me para në dorëzim.', 'Pay by credit/debit card or cash on delivery.') },
        { q: bi('A ka dërgesë falas?', 'Is there free delivery?'), a: bi('Dërgesë falas për porosi mbi 5.000 LEK. Kostoja llogaritet sipas qytetit tuaj.', 'Free delivery on orders over 5,000 LEK. Delivery cost is calculated based on your city.') },
      ],
    },
    cta: {
      title: bi('Gati të filloni?', 'Ready to start?'),
      body: bi('Krijoni albumin tuaj tani. Paguani vetëm kur jeni të kënaqur.', 'Create your album now. Pay only when you\'re satisfied.'),
      button: bi('Krijo albumin tuaj', 'Create your album'),
    },
  },

  examples: {
    seo: { title: bi('Shembuj Albumeve', 'Photo Album Examples'), description: bi('Shikoni albume reale Përgjithmonë — dasma, udhëtime, familje. Letër mat 200g, hapje e sheshtë, printim galerie. Dërgesa në Shqipëri.', 'See real Përgjithmonë photo albums — weddings, travel, family. Matte 200g paper, lay-flat binding, gallery print. Delivered across Albania.') },
    hero: {
      kicker: bi('studio · albume reale', 'studio · real albums'),
      title: bi('Nga telefoni, në një album që e mbani në dorë', 'From your phone, into an album you can hold'),
      body: bi('Hapni një album të vërtetë: kopertinë e fortë, faqe që hapen fare, letër mat 200g. Pastaj krijojeni tuajin — faqe pas faqeje, ose me AI.', 'Open a real album: hardcover, lay-flat spreads, matte 200g paper. Then make yours — page by page, or with AI.'),
      cta: bi('Hap albumin demonstrues', 'Open the demo album'),
      secondaryCta: bi('Krijo tënden', 'Create yours'),
    },
    stats: [
      { value: bi('200g', '200g'), label: bi('letër mat premium', 'premium matte paper') },
      { value: bi('Lay-flat', 'Lay-flat'), label: bi('faqe që hapen fare', 'spreads that open fully') },
      { value: bi('10–16 ditë', '10–16 days'), label: bi('dërgesë në Shqipëri', 'delivered in Albania') },
    ],
    demo: {
      byline: bi('Ana & Erjon · Dasmë, Sarandë', 'Ana & Erjon · Wedding, Saranda'),
      browse: bi('Shfletoni faqet e brendshme', 'Browse the inside pages'),
      rotate: bi('Tërhiqeni albumin për ta rrotulluar', 'Drag the album to rotate'),
      caption: bi('Kopertinë e fortë · lidhje lay-flat · letër mat 200g', 'Hardcover · lay-flat binding · matte 200g paper'),
      cta: bi('Fillo me këtë stil dasme', 'Start with this wedding style'),
      coverTitle: bi('Ana & Erjon', 'Ana & Erjon'),
      coverSub: bi('12 Qershor 2023  ·  Sarandë', '12 June 2023  ·  Saranda'),
      quote: bi('"Çdo foto është një moment që kohës ia kemi shpëtuar"', '"Every photo is a moment we saved from time"'),
      quoteBy: bi('— Ana & Erjon', '— Ana & Erjon'),
    },
    photos: {
      cover: img('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=82&fit=crop&crop=center'),
      p2a: img('https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=900&q=82&fit=crop&crop=center'),
      p2b: img('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=82&fit=crop'),
      p2c: img('https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600&q=82&fit=crop&crop=top'),
      p3: img('https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=900&q=82&fit=crop&crop=center'),
      p5a: img('https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&q=82&fit=crop'),
      p5b: img('https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=82&fit=crop'),
      p6: img('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=82&fit=crop'),
      p7: img('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=82&fit=crop'),
      back: img('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=82&fit=crop&crop=center'),
    },
    gallery: {
      kicker: bi('paraqitje reale', 'real layouts'),
      title: bi('Faqe të dizajnuara me kujdes', 'Pages designed with care'),
      link: bi('fillo albumin tuaj →', 'start your album →'),
      note: bi('Çdo album është unik — i dizajnuar plotësisht nga ju me editorin tonë online.', 'Every album is unique — designed entirely by you with our online editor.'),
      albums: [
        { title: bi('Ana & Erjon', 'Ana & Erjon'), category: bi('Dasmë', 'Wedding') },
        { title: bi('Kujtime · Ana & Erjon', 'Memories · Ana & Erjon'), category: bi('Familje', 'Family') },
        { title: bi('Ana & Erjon · Vera në Jug', 'Ana & Erjon · Summer in the South'), category: bi('Udhëtim', 'Travel') },
      ],
    },
    occasions: {
      kicker: bi('për çdo kujtim', 'for every memory'),
      title: bi('Një album, i bërë për historinë tuaj', 'An album made for your story'),
      body: bi('Zgjidhni stilin. Editori hapet me atë kopertinë, gati për fotot tuaja — dasmë, udhëtim, familje, miqësi ose festë.', 'Pick a style. The editor opens with that cover, ready for your photos — wedding, travel, family, friendship or a celebration.'),
      cta: bi('Krijo këtë stil', 'Create this style'),
      items: [
        { category: bi('Dasmë', 'Wedding'), title: bi('Dita juaj, e mbajtur përgjithmonë', 'Your day, kept forever'), line: bi('Kopertinë e fortë, faqe të gjera për portrete dhe momentet e vogla.', 'A hardcover made for portraits and the small moments.'), photo: img('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=900&q=86&fit=crop&crop=top') },
        { category: bi('Udhëtime', 'Travel'), title: bi('Shkoni larg. Mbajini afër.', 'Go far. Keep it close.'), line: bi('Peizazhe, harta dhe shënime — një album që udhëton me ju.', 'Landscapes, maps and notes — an album that travels with you.'), photo: img('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=900&q=86&fit=crop') },
        { category: bi('Familje', 'Family'), title: bi('Vitet e vogla. Album i madh.', 'Little years. Big album.'), line: bi('Fëmijët rriten. Faqet mbeten — për t’i shfletuar së bashku.', 'Children grow. The pages stay — to turn together.'), photo: img('https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=900&q=86&fit=crop&crop=top') },
        { category: bi('Miqësi', 'Friendship'), title: bi('Miqësia që nuk zbehet', 'Friendship that does not fade'), line: bi('Netët, udhëtimet, të qeshurat — të mbledhura në një album.', 'Nights, trips, laughter — gathered in one album.'), photo: img('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=86&fit=crop&crop=top') },
        { category: bi('Festash', 'Celebrations'), title: bi('Festa mbaron. Albumi mbetet.', 'The party ends. The album stays.'), line: bi('Ditëlindje, përvjetorë, darka — kujtimi mbetet në dorë.', 'Birthdays, anniversaries, dinners — the memory stays in your hands.'), photo: img('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=900&q=86&fit=crop') },
      ],
    },
    craft: {
      kicker: bi('çfarë pret në kuti', 'what arrives in the box'),
      title: bi('Printuar si një objekt, jo si një skedar', 'Printed as an object, not a file'),
      body: bi('I njëjti standard për çdo album: letër galerie, hapje e sheshtë, kopertinë e fortë dhe dërgesë e kujdesshme në Shqipëri.', 'The same standard for every album: gallery paper, lay-flat opening, hardcover, and careful delivery across Albania.'),
      items: [
        { title: bi('Letër mat 200g', 'Matte 200g paper'), desc: bi('E butë në prekje, pa shkëlqim. Ngjyrat qëndrojnë të pasura në dritë ditore.', 'Soft to the touch, no glare. Colours stay rich in daylight.') },
        { title: bi('Hapje e sheshtë', 'Lay-flat binding'), desc: bi('Faqja dyshe hapet fare — asnjë foto nuk humbet në mes të albumit.', 'The spread opens fully — no photo lost in the gutter.') },
        { title: bi('Kopertinë e fortë', 'Hardcover'), desc: bi('Lidhje e qëndrueshme, e menduar të rrijë në tryezë dhe në raft.', 'A durable cover, meant to live on a table and a shelf.') },
        { title: bi('Kuti & dërgesë', 'Box & delivery'), desc: bi('Paketim mbrojtës. 10–16 ditë në Shqipëri. Mund të paguani edhe në dorëzim.', 'Protective packaging. 10–16 days in Albania. Cash on delivery too.') },
      ],
    },
    paths: {
      kicker: bi('dy rrugë, i njëjti printim', 'two paths, the same print'),
      title: bi('Dizajnoni çdo faqe, ose lëreni AI-në ta nisi', 'Design every page, or let AI start it'),
      designTitle: bi('Editori ynë', 'Our editor'),
      designBody: bi('Zgjidhni stilin, madhësinë dhe paraqitjen. Vendosni fotot, tekstin dhe shkronjat — pikërisht si një album i vërtetë, faqe dyshe.', 'Pick style, size and layout. Place photos, type and fonts — like a real album, spread by spread.'),
      designCta: bi('Hap editorin', 'Open the editor'),
      aiTitle: bi('Album me AI', 'AI album'),
      aiBody: bi('Ngarkoni 25+ foto. Sistemi zgjedh paraqitjen dhe paletën. Pastaj e rregulloni çdo faqe para se të printojmë.', 'Upload 25+ photos. The system chooses layout and palette. Then you fine-tune every page before we print.'),
      aiCta: bi('Provo me AI', 'Try with AI'),
    },
    quotes: {
      kicker: bi('nga shtëpitë që i kanë hapur', 'from homes that opened them'),
      items: [
        { text: bi('"Letra mat e bën albumin të ndihet si album galerie, jo si printim i zakonshëm. E mbajmë në tryezën e ndenjes."', '"The matte paper makes it feel like a gallery album, not a regular print. It lives on our living-room table."'), name: bi('Ana M.', 'Ana M.'), occasion: bi('Dasmë · Tiranë', 'Wedding · Tirana') },
        { text: bi('"Faqet lay-flat i mbajnë peizazhet të plota. Udhëtimi ynë në jug duket siç e kujtojmë."', '"Lay-flat pages keep the landscapes whole. Our trip south looks the way we remember it."'), name: bi('Erjon B.', 'Erjon B.'), occasion: bi('Udhëtim · Sarandë', 'Travel · Saranda') },
        { text: bi('"E porosita si dhuratë. Erdhi në kuti, i rëndë, i qetë. Mbetën pa fjalë."', '"I ordered it as a gift. It arrived boxed, heavy, quiet. They were speechless."'), name: bi('Mirela K.', 'Mirela K.'), occasion: bi('Ditëlindje · Durrës', 'Birthday · Durrës') },
      ],
    },
    cta: {
      title: bi('Albumi juaj, i printuar këtu', 'Your album, printed here'),
      body: bi('Filloni falas. Paguani kur jeni të kënaqur — kartë ose para në dorëzim, kudo në Shqipëri.', 'Start free. Pay when you are happy — card or cash on delivery, anywhere in Albania.'),
      button: bi('Krijo albumin', 'Create your album'),
      note: bi('Nga 3.100 LEK · dërgesë 10–16 ditë', 'From 3,100 LEK · 10–16 day delivery'),
    },
  },

  about: {
    seo: { title: bi('Rreth Nesh', 'About Us'), description: bi('Mësoni rreth Përgjithmonë — shtëpisë shqiptare që kthen kujtimet tuaja në albume foto me cilësi galerie.', 'Learn about Përgjithmonë — the Albanian studio that turns your memories into gallery-quality photo albums.') },
    hero: {
      title: bi('Rreth Nesh', 'About Us'),
      quote: bi('"Ne besojmë se disa kujtime janë shumë të çmuara për të mbetur në një telefon."', '"We believe some memories are too precious to stay on a phone."'),
    },
    p1: bi('Përgjithmonë lindi nga një dëshirë e thjeshtë: t’i nxjerrim fotot nga telefoni dhe t’i kthejmë në albume që i shfletojmë me familjen.', 'Përgjithmonë was born from a simple wish: to take photos off the phone and turn them into albums we can turn with family.'),
    p2: bi('Në një botë ku bëjmë qindra foto në ditë, ato më të rëndësishmet humbasin në galeri. E ngritëm këtë platformë që t’i mblidhni ato momente dhe t’i ktheni në album.', 'In a world of hundreds of photos a day, the important ones get lost in the gallery. We built this so you can gather those moments and turn them into an album.'),
    qualityTitle: bi('Cilësia, e para', 'Quality first'),
    p3: bi('Nuk bëjmë kompromis me cilësinë. Letra është zgjedhur për ngjyra të pasura dhe për prekje të butë. Kopertinat janë të forta, të menduara të qëndrojnë vite.', 'We do not compromise on quality. The paper is chosen for rich colour and a soft touch. The covers are hard, made to last for years.'),
    p4: bi('Çdo album printohet dhe lidhet me vëmendje maksimale ndaj detajeve, sepse ne e dimë që brenda tij ndodhen kujtimet tuaja më të dashura.', 'Every album is printed and bound with the utmost attention to detail, because we know that inside it live your most precious memories.'),
    missionTitle: bi('Misioni Ynë', 'Our Mission'),
    p5: bi('Të jemi shtëpia e kujtimeve shqiptare. Duam që çdo familje të ketë albumin e saj — që kalon nga brezi te brezi.', 'To be the home of Albanian memories. We want every family to have an album of their own — one that passes from generation to generation.'),
  },

  faq: {
    seo: { title: bi('Pyetje të Shpeshta', 'Frequently Asked Questions'), description: bi('Gjeni përgjigjet për pyetjet tuaja rreth albumeve Përgjithmonë — porosi, dërgesa, cilësia e printimit dhe garancitë tona.', 'Find answers to your questions about Përgjithmonë photo albums — orders, delivery, print quality and our guarantees.') },
    hero: {
      title: bi('Pyetje të Shpeshta', 'Frequently Asked Questions'),
      body: bi('Gjeni përgjigjet për pyetjet më të zakonshme rreth Përgjithmonë.', 'Find answers to the most common questions about Përgjithmonë.'),
    },
    items: [
      { q: bi('Sa kohë duhet për të marrë albumin tim?', 'How long does it take to receive my album?'), a: bi('Pas konfirmimit të porosisë, procesi i printimit kërkon 2–3 ditë pune. Dërgesa merr 1–2 ditë shtesë për qytetet brenda Shqipërisë.', 'After order confirmation, the printing process takes 2–3 working days. Delivery takes an additional 1–2 days for cities within Albania.') },
      { q: bi('Çfarë cilësi letre përdorni?', 'What quality paper do you use?'), a: bi('Ne përdorim letër premium mat prej 200g. Është një letër luksoze, e butë në prekje, që thekson ngjyrat pa krijuar reflekse shqetësuese.', 'We use premium matte 200g paper. It is a luxurious, soft-to-the-touch paper that enhances colours without any distracting glare.') },
      { q: bi('A mund të ndryshoj albumin pasi ta kem porositur?', 'Can I change my album after ordering?'), a: bi('Pasi të klikoni butonin "Porosit" dhe të konfirmoni dizajnin përfundimtar, albumi kalon menjëherë në procesin e printimit. Për këtë arsye, ndryshimet pas këtij hapi nuk janë të mundura.', 'Once you click the "Order" button and confirm your final design, the album immediately enters the printing process. Changes after this point are therefore not possible.') },
      { q: bi('Si mund të paguaj?', 'How can I pay?'), a: bi("Për momentin ofrojmë pagesë në dorëzim (Cash on Delivery). Pasi t'ju mbërrijë albumi nga korrieri, ju mund t'ia paguani shumën.", 'We currently offer payment on delivery (Cash on Delivery). Once the courier delivers your album, you pay the amount.') },
      { q: bi('Sa faqe mund të ketë maksimalisht një album?', 'What is the maximum number of pages an album can have?'), a: bi('Albumet tona bazë vijnë me 24 faqe (12 fletë). Ju mund të shtoni deri në 100 faqe (50 fletë) me një kosto shtesë për fletë.', 'Our base albums come with 24 pages (12 leaves). You can add up to 100 pages (50 leaves) at an additional cost per leaf.') },
    ],
    still: {
      title: bi('Keni ende pyetje?', 'Still have questions?'),
      body: bi("Jemi këtu për t'ju ndihmuar me çdo paqartësi.", 'We are here to help with anything you need.'),
      link: bi('Na kontaktoni', 'Contact us'),
    },
  },

  contact: {
    seo: { title: bi('Na Kontaktoni', 'Contact Us'), description: bi('Keni pyetje rreth albumit tuaj? Na shkruani dhe ekipi ynë ju ndihmon me çdo detaj — porosi, dizajn dhe dërgesa.', 'Have questions about your album? Write to us and our team will help with every detail — orders, design and delivery.') },
    hero: {
      title: bi('Na Kontaktoni', 'Contact Us'),
      body: bi("Jemi këtu për t'ju ndihmuar me çdo pyetje apo kërkesë që keni.", 'We are here to help with any question or request you may have.'),
    },
    find: bi('Na gjeni', 'Find us'),
    whatsapp: {
      note: bi('Përgjigjemi brenda pak orësh', 'We reply within a few hours'),
      number: bi('+355 69 00 00 000', '+355 69 00 00 000'),
    },
    email: {
      note: bi('Për kërkesa zyrtare dhe suport', 'For official requests and support'),
      address: bi('hello@pergjithmone.al', 'hello@pergjithmone.al'),
    },
    studio: {
      address: bi('Tiranë, Shqipëri\nRruga e Kavajës', 'Tirana, Albania\nRruga e Kavajës'),
    },
    form: {
      title: bi('Dërgoni një mesazh', 'Send a message'),
      name: bi('Emri', 'Name'),
      namePh: bi('Emri juaj', 'Your name'),
      email: bi('Emaili', 'Email'),
      message: bi('Mesazhi', 'Message'),
      messagePh: bi("Si mund t'ju ndihmojmë?", 'How can we help you?'),
      send: bi('Dërgo Mesazhin', 'Send Message'),
    },
  },
};
