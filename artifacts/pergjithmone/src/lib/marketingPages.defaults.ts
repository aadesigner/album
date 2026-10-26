import { bi, img, type PageSlug } from './marketingPages';

export const PAGE_DEFAULTS: Record<PageSlug, Record<string, unknown>> = {
  home: {
    seo: { title: bi('Albume Foto Premium', 'Premium Photo Books'), description: bi('Kthejini kujtimet tuaja në albume foto të bukura, të shtypura me cilësi galerie. Dizajnoni vetë online. Dërgesa në të gjithë Shqipërinë.', 'Turn your memories into beautiful, gallery-quality photo books. Design online, printed and delivered across Albania.') },
    hero: {
      eyebrow: bi('Album fotografie', 'Photobook atelier'),
      headline: bi('Ruaj kujtimet', 'Keep the memories'),
      brand: bi('Përgjithmonë', 'Përgjithmonë'),
      sub: bi('Krijojeni online. Printohen me cilësi galerie.', 'Design online. Printed at gallery quality.'),
      cta: bi('Krijo albumin', 'Create your book'),
      secondaryCta: bi('Shiko shembujt', 'See examples'),
      explore: bi('Eksploro', 'Explore'),
    },
    styles: [
      { label: bi('Dasmë', 'Wedding'), line: bi('Një ditë. Një libër. Për gjithmonë.', 'One day. One book. Forever yours.'), wallpaper: img('https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=700&q=88&fit=crop&crop=top') },
      { label: bi('Udhëtime', 'Travel'), line: bi('Shkoni larg. Mbajini afër.', 'Go far. Keep it close.'), wallpaper: img('https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=700&q=88&fit=crop&crop=center') },
      { label: bi('Familje', 'Family'), line: bi('Vitet e vogla. Libër i madh.', 'Little years. Big book.'), wallpaper: img('https://images.unsplash.com/photo-1581952976147-5a2d15560349?w=700&q=88&fit=crop&crop=top') },
      { label: bi('Miqësi', 'Friendship'), line: bi('Miqësia që nuk zbehet.', 'Friendship that doesn’t fade.'), wallpaper: img('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=700&q=88&fit=crop&crop=top') },
      { label: bi('Festash', 'Celebrate'), line: bi('Festa mbaron. Libri mbetet.', 'The party ends. The book stays.'), wallpaper: img('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=700&q=88&fit=crop') },
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
      title: bi('Albume për çdo moment të veçantë', 'A book for every special moment'),
      all: bi('të gjitha', 'all collections'),
    },
    spread: {
      kicker: bi('si duket brenda', "what's inside"),
      title: bi('Faqet që tregojnë historinë tuaj', 'Pages that tell your story'),
      body: bi('Dizajnoni çdo faqe dyshe si të doni — dy faqe krah për krah, si një libër i vërtetë. Zgjidhni paraqitjen, shtoni fotot dhe tekstin.', 'Design each spread exactly as you want — two pages side by side, like a real book. Pick a layout, add your photos and text.'),
      tag: bi('Faqja 6–7 · pamja e plotë', 'Page 6–7 · full spread view'),
      stats: [
        { num: bi('9+', '9+'), label: bi('modele faqesh', 'page layouts') },
        { num: bi('20+', '20+'), label: bi('dizajne të gatshme', 'premade designs') },
        { num: bi('∞', '∞'), label: bi('foto në faqe', 'photos per page') },
        { num: bi('3', '3'), label: bi('madhësi albumi', 'book sizes') },
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
      title: bi('Tre hapa deri te albumi juaj', 'Three steps to your photobook'),
      cta: bi('Krijo tani — falas', 'Start now — free'),
      note: bi('Pa kartë krediti', 'No credit card required'),
      steps: [
        {
          title: bi('Zgjidhni stilin', 'Choose a style'),
          desc: bi('Zgjidhni madhësinë dhe temën. 5 stile, secili me ngjyrat dhe shkronjat e veta.', 'Pick your size and visual theme. 5 styles with ready-made colours and fonts.'),
          detail: bi('Nga dasma te udhëtimi, kemi një stil për çdo moment. Çdo stil ka 4–6 variante ngjyrash dhe 3 madhësi albumesh (20×20, 30×30, A4).', 'From weddings to travel, we have styles for every occasion. Each style has 4–6 colour variants and 3 book sizes (20×20, 30×30, A4).'),
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
      quote: bi('"Cilësia e letrës dhe printimit është thjesht fantastike. Është vërtet një libër që do të qëndrojë përgjithmonë në familjen tonë."', '"The paper and print quality is simply fantastic. Truly a book that will stay in our family forever."'),
      name: bi('Era M.', 'Era M.'),
      place: bi('Tiranë, Shqipëri', 'Tirana, Albania'),
      photo: img('https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80&fit=crop&crop=face'),
    },
    cta: {
      kicker: bi('— filloni sot', '— start today'),
      title: bi('Fotot meritojnë të jenë kujtim', 'Photos deserve to become a memory'),
      body: bi('Pa regjistrim. Pa kartë krediti. Filloni falas dhe porositni vetëm kur jeni gati.', "No registration. No credit card. Start free and only order when you're ready."),
      button: bi('Krijo albumin tënd falas →', 'Create your photobook free →'),
      note: bi('Nga 3.100 LEK · Dërgesë falas mbi 5.000 LEK', 'From 3,100 LEK · Free delivery over 5,000 LEK'),
    },
  },

  'how-it-works': {
    seo: { title: bi('Si Funksionon', 'How It Works'), description: bi('Tre hapa të thjeshtë: zgjidhni madhësinë dhe stilin, dizajnoni faqet online me editorin tonë, dhe merrni librin tuaj brenda 10–16 ditësh.', 'Three simple steps: choose your size and style, design pages online with our editor, and receive your book within 10–16 days.') },
    hero: {
      kicker: bi('si funksionon', 'how it works'),
      title: bi('Katër hapa drejt albumit të ëndrrave', 'Four steps to your dream photobook'),
      body: bi("Procesi ynë është i thjeshtë, elegant dhe i dizajnuar për t'ju dhënë produktin më cilësor të mundshëm.", 'Our process is simple, elegant and designed to give you the highest quality product possible.'),
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
      button: bi('Krijo albumin tënd', 'Create your photobook'),
      note: bi('Pa regjistrim · Pa kartë krediti', 'No sign-up · No credit card'),
    },
  },

  pricing: {
    seo: { title: bi('Çmimet', 'Pricing'), description: bi('Çmime transparente për libra foto premium — nga 2,900 lekë. Letër mat 200g, lidhje lay-flat, printim galerie. Dërgesa falas mbi 5,000 lekë.', 'Transparent pricing for premium photo books — from 2,900 lek. Matte 200g paper, lay-flat binding, gallery-quality printing. Free delivery over 5,000 lek.') },
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
        cta: bi('Krijo albumin tënd', 'Create your photobook'),
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
        cta: bi('Krijo albumin tënd', 'Create your photobook'),
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
        { q: bi('Si paguaj?', 'How do I pay?'), a: bi('Paguani me kartë kredie/debiti ose me para në dorë gjatë dorëzimit (Cash on Delivery).', 'Pay by credit/debit card or cash on delivery (COD).') },
        { q: bi('A ka dërgim falas?', 'Is there free delivery?'), a: bi('Dërgim falas për porosi mbi 5,000 LEK. Kostoja e dërgimit llogaritet sipas qytetit tuaj.', 'Free delivery on orders over 5,000 LEK. Delivery cost is calculated based on your city.') },
      ],
    },
    cta: {
      title: bi('Gati të filloni?', 'Ready to start?'),
      body: bi('Krijoni albumin tuaj tani. Paguani vetëm kur jeni të kënaqur.', 'Create your album now. Pay only when you\'re satisfied.'),
      button: bi('Krijo albumin tënd', 'Create your photobook'),
    },
  },

  examples: {
    seo: { title: bi('Shembuj Librash Foto', 'Photo Book Examples'), description: bi('Shikoni koleksionin e librave foto të realizuara me Përgjithmonë — dasma, udhëtime, familje dhe shumë më tepër.', 'Browse our collection of photo books made with Përgjithmonë — weddings, travel, family and much more.') },
    hero: {
      kicker: bi('shembuj · demonstrim', 'examples · live demo'),
      title: bi('Shikoni çfarë mund të krijoni', 'See what you can create'),
      body: bi('Eksploroni librin 3D dhe shfletoni faqe reale — rrotulloni, sodisni, frymëzohuni.', 'Explore the 3D demo book and browse real page layouts — spin it, page through it, get inspired.'),
    },
    stats: [
      { value: bi('1,000+', '1,000+'), label: bi('albume të printuara', 'albums printed') },
      { value: bi('99%', '99%'), label: bi('klientë të kënaqur', 'happy customers') },
      { value: bi('200g', '200g'), label: bi('letër premium mat', 'premium paper') },
    ],
    demo: {
      byline: bi('Ana & Erjon · Dasmë 2023', 'Ana & Erjon · Wedding 2023'),
      browse: bi('shfletoni faqet', 'browse the pages'),
      rotate: bi('tërhiqni për të rrotulluar', 'drag to rotate'),
      cta: bi('krijoni albumin tuaj', 'create your own album'),
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
      link: bi('fillo albumin tënd →', 'start your album →'),
      note: bi('Çdo album është unik — i dizajnuar plotësisht nga ju me editorin tonë online.', 'Every album is unique — designed entirely by you with our online editor.'),
      albums: [
        { title: bi('Ana & Erjon', 'Ana & Erjon'), category: bi('Dasmë', 'Wedding') },
        { title: bi('Kujtime · Ana & Erjon', 'Memories · Ana & Erjon'), category: bi('Familje', 'Family') },
        { title: bi('Ana & Erjon · Vera në Jug', 'Ana & Erjon · Summer in the South'), category: bi('Udhëtim', 'Travel') },
      ],
    },
    quotes: {
      kicker: bi('çfarë thonë klientët', 'what customers say'),
      items: [
        { text: bi('"Albumi doli saktësisht ashtu si e imagjinova. Cilësia e letrës është e mahnitshme."', '"The album turned out exactly as I imagined. The paper quality is stunning."'), name: bi('Ana M.', 'Ana M.'), occasion: bi('Dasmë', 'Wedding') },
        { text: bi('"Procesi ishte shumë i lehtë. E rekomandoj me zemër të plotë."', '"The process was so easy. I wholeheartedly recommend it for any occasion."'), name: bi('Erjon B.', 'Erjon B.'), occasion: bi('Udhëtim', 'Travel') },
        { text: bi('"Dhurata më e bukur që mund t\'i bësh dikujt. Mbeti pa fjalë."', '"The most beautiful gift you can give. They were absolutely speechless."'), name: bi('Mirela K.', 'Mirela K.'), occasion: bi('Ditëlindje', 'Birthday') },
      ],
    },
    cta: {
      title: bi('Krijoni albumin tuaj sot', 'Create your album today'),
      body: bi('Filloni falas. Paguani vetëm kur jeni plotësisht të kënaqur.', "Start free. Pay only when you're completely satisfied."),
      button: bi('fillo tani', 'start now'),
    },
  },

  about: {
    seo: { title: bi('Rreth Nesh', 'About Us'), description: bi('Mësoni rreth Përgjithmonë — kompanisë shqiptare që sjell kujtimet tuaja në jetë me libra foto premium të shtypura me cilësi galerie.', 'Learn about Përgjithmonë — the Albanian company bringing your memories to life with premium, gallery-quality photo books.') },
    hero: {
      title: bi('Rreth Nesh', 'About Us'),
      quote: bi('"Ne besojmë se disa kujtime janë shumë të çmuara për të mbetur në një telefon."', '"We believe some memories are too precious to stay on a phone."'),
    },
    p1: bi("Përgjithmonë lindi nga një dëshirë e thjeshtë: të kthejmë fotot tona dixhitale në objekte fizike, të prekshme dhe të bukura që mund t'i shfletojmë me familjen tonë.", 'Përgjithmonë was born from a simple desire: to turn our digital photos into physical, tangible and beautiful objects that we can browse through with our family.'),
    p2: bi("Në një botë ku ne bëjmë qindra foto çdo ditë, fotot më të rëndësishme shpesh humbasin në galeritë tona pafund. Ne krijuam këtë platformë për t'ju dhënë një mjet të thjeshtë por të fuqishëm për të kuruar këto momente dhe për t'i kthyer ato në art.", 'In a world where we take hundreds of photos every day, the most important ones often get lost in our endless galleries. We built this platform to give you a simple but powerful tool to curate those moments and turn them into art.'),
    qualityTitle: bi('Cilësia si Prioritet', 'Quality First'),
    p3: bi('Nuk bëjmë kompromise kur bëhet fjalë për cilësinë. Letra që përdorim është zgjedhur me kujdes për të ofruar ngjyra të pasura dhe një ndjesi premium në prekje. Kopertinat tona janë të forta, të punuara për të rezistuar gjatë ndër vite.', 'We make no compromises when it comes to quality. The paper we use has been carefully selected to deliver rich colours and a premium feel to the touch. Our covers are hard, crafted to last for years to come.'),
    p4: bi('Çdo album printohet dhe lidhet me vëmendje maksimale ndaj detajeve, sepse ne e dimë që brenda tij ndodhen kujtimet tuaja më të dashura.', 'Every album is printed and bound with the utmost attention to detail, because we know that inside it live your most precious memories.'),
    missionTitle: bi('Misioni Ynë', 'Our Mission'),
    p5: bi('Të jemi shtëpia e memories shqiptare. Duam që çdo familje të ketë mundësinë të krijojë arkivën e saj vizuale, me albume që kalojnë nga brezi në brez.', 'To be the home of Albanian memory. We want every family to have the opportunity to create their own visual archive, with albums that pass from generation to generation.'),
  },

  faq: {
    seo: { title: bi('Pyetje të Shpeshta', 'Frequently Asked Questions'), description: bi('Gjeni përgjigjet për pyetjet tuaja rreth librave foto Përgjithmonë — porosi, dërgesa, cilësia e printimit dhe garancitë tona.', 'Find answers to your questions about Përgjithmonë photo books — orders, delivery, print quality and our guarantees.') },
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
    seo: { title: bi('Na Kontaktoni', 'Contact Us'), description: bi("Keni pyetje rreth librit tuaj foto? Na shkruani dhe ekipi ynë do t'ju ndihmojë me çdo detaj — porosi, dizajn dhe dërgesa.", 'Have questions about your photo book? Write to us and our team will help you with every detail — orders, design and delivery.') },
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
