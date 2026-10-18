require('dotenv').config();
const dns = require('dns');
// Set custom DNS resolvers to avoid querySrv ECONNREFUSED errors on networks with limited SRV support (e.g. Windows/local ISPs)
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom DNS cannot be configured
}

const express = require('express'), mongoose = require('mongoose'), crypto = require('crypto');
const path = require('path'), fs = require('fs');
const Razorpay = require('razorpay'), compression = require('compression');
const helmet = require('helmet'), rateLimit = require('express-rate-limit');
const { Product, Order, Post, Message } = require('./models');

const BASE = (process.env.BASE_URL || process.env.RENDER_EXTERNAL_URL || 'https://wabisabistore.onrender.com').replace(/\/$/, '');
const rzp = process.env.RAZORPAY_KEY_ID
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) : null;
const A = fn => (q, s, n) => fn(q, s, n).catch(n);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateStr = d => new Date(d).toISOString().slice(0, 10);

const app = express();
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  crossOriginOpenerPolicy: false
}), compression(), express.json({ limit: '50kb' }));
app.use('/api', rateLimit({ windowMs: 60000, max: 120 }));

/* ---------- Theme injection middleware: injects theme.css + inline anti-flash script before </head> and theme.js before </body> ---------- */
app.use((req, res, next) => {
  const _send = res.send;
  res.send = function (body) {
    if (typeof body === 'string' && body.includes('</head>')) {
      const headInjection = '<link rel="stylesheet" href="/theme.css"><script>(function(){try{var t=localStorage.getItem("theme")||(matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",t);document.documentElement.dataset.theme=t;if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();</script>';
      if (!body.includes('/theme.css')) {
        body = body.replace('</head>', `${headInjection}</head>`);
      }
      if (!body.includes('/theme.js') && body.includes('</body>')) {
        body = body.replace('</body>', '<script src="/theme.js"></script></body>');
      }
    }
    return _send.call(this, body);
  };
  next();
});

/* ---------- SEO page shell for server-rendered pages (products, blog) ---------- */
const ORG = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Wabi Sabi', url: BASE,
  email: process.env.CONTACT_EMAIL || 'moong4770@gmail.com', sameAs: (process.env.SOCIAL || '').split(',').map(x => x.trim()).filter(Boolean) };
const crumbLd = c => ({ '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: c.map(([n, p], i) => ({ '@type': 'ListItem', position: i + 1, name: n, item: BASE + p })) });
const faqLd = f => ({ '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: f.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
const faqHtml = f => f.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('');

const sharedHeader = `<header><a href="/"><b>WABISABI 侘び寂び</b></a><a href="/men-clothing">Men</a><a href="/women-clothing">Women</a><a href="/accessories">Accessories</a><a href="/blog">Blog</a><a href="/faq">FAQ</a><a href="/about">About</a><button class="theme-btn" id="theme-toggle" aria-label="Toggle dark mode" data-theme-toggle>◐</button></header><div class="bdr"></div>`;

const page = ({ title, desc, path: p, body, ld, og, kw, crumbs }) => {
  const graph = [].concat(ld || [], crumbs ? crumbLd(crumbs) : [], ORG);
  return `<!DOCTYPE html><html lang="en-IN" data-theme="light"><head><meta charset="utf-8">
<script>(function(){try{var t=localStorage.getItem('theme')||localStorage.getItem('sh_theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');if(t.charAt(0)=='"')t=JSON.parse(t);document.documentElement.setAttribute('data-theme',t);document.documentElement.dataset.theme=t;if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();</script>
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">${kw ? `<meta name="keywords" content="${esc(kw)}">` : ''}
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<link rel="canonical" href="${BASE}${p}"><link rel="alternate" hreflang="en-in" href="${BASE}${p}">
<meta property="og:site_name" content="Wabi Sabi"><meta property="og:locale" content="en_IN">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${BASE}${p}"><meta property="og:type" content="website">${og ? `<meta property="og:image" content="${esc(og)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/theme.css">
<style>:root{--fg:#14111f;--on:#14111f;--line:#14111f;--paper:#fff7ec;--card:#fff;--pink:#ff3d81;--yel:#ffe14d;--cyan:#3de0ff;--lav:#b69cff;--muted:#5f5873;--b:3px solid var(--line);--r:18px}
body{margin:0;font:16px/1.7 'Space Grotesk',system-ui,sans-serif;background:var(--paper);color:var(--fg);transition:background .3s,color .3s}a{color:var(--pink);font-weight:700}
header{padding:14px 24px;background:var(--yel);color:var(--on);border-bottom:var(--b);display:flex;align-items:center;gap:8px;flex-wrap:wrap}
footer{padding:14px 24px;border-top:var(--b);border-bottom:0;margin-top:30px;background:#14111f;color:#e7e0f5}
header a,footer a{color:inherit;text-decoration:none;margin-right:18px;font-weight:700}header a:hover,footer a:hover{text-decoration:underline}
main{max-width:1000px;margin:auto;padding:28px 20px}h1,h2{font-family:'Dela Gothic One',Georgia,serif;font-weight:400;line-height:1.15}
.btn{display:inline-block;background:var(--pink);color:var(--on)!important;padding:11px 26px;border-radius:99px;text-decoration:none;font-weight:700;border:var(--b);box-shadow:4px 4px 0 var(--line);transition:transform .12s,box-shadow .12s}
.btn:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--line)}
.bc{font-size:.85rem;color:var(--muted)}.bc a{color:var(--muted)}.pr{font-family:'Dela Gothic One';font-size:1.7rem}img{max-width:100%;border:var(--b);border-radius:18px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:18px;list-style:none;padding:0}.g li{background:var(--card);border-radius:16px;padding:12px;border:var(--b);box-shadow:4px 4px 0 var(--line);transition:transform .15s,box-shadow .15s}.g li:hover{transform:translate(-2px,-2px);box-shadow:7px 7px 0 var(--line)}.g a{color:var(--fg);text-decoration:none}
details{background:var(--card);border:var(--b);border-radius:14px;padding:12px 16px;margin-bottom:12px;box-shadow:3px 3px 0 var(--line)}summary{font-weight:700;cursor:pointer}details p{color:var(--muted);margin-top:8px}
.bdr{height:20px;border-top:3px solid var(--line);border-bottom:3px solid var(--line);background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='18'%3E%3Crect width='36' height='18' fill='%23ffe14d'/%3E%3Cpath d='M18 2l8 7-8 7-8-7z' fill='%23ff3d81' stroke='%2314111f' stroke-width='1.5'/%3E%3Ccircle cx='3' cy='9' r='2.5' fill='%2300a8a8'/%3E%3Ccircle cx='33' cy='9' r='2.5' fill='%2300a8a8'/%3E%3C/svg%3E") repeat-x center/36px 18px}
.theme-btn{background:var(--card);color:var(--fg);border:var(--b);border-radius:99px;height:38px;min-width:38px;padding:0 10px;font:700 .95rem 'Space Grotesk';cursor:pointer;box-shadow:3px 3px 0 var(--line);transition:.12s;margin-left:auto}
.theme-btn:hover{transform:translate(-1px,-1px);box-shadow:5px 5px 0 var(--line)}
s{color:var(--muted)}
</style></head>
<body>${sharedHeader}
<main>${body}</main><footer>© ${new Date().getFullYear()} Wabi Sabi · <a href="/">Home</a><a href="/about">About</a><a href="/faq">FAQ</a><a href="/blog">Blog</a><a href="/#contact">Contact</a></footer>
<script src="/theme.js"></script></body></html>`;
};

const CATPATH = { men: '/men-clothing', women: '/women-clothing', accessories: '/accessories' };
const CATS = {
  'men-clothing': { c: 'men', name: "Men's Clothing", h1: "Men's Clothing Online",
    title: "Men's Clothing Online – T-Shirts, Shirts, Jeans & Jackets | Wabi Sabi",
    desc: "Shop men's clothing online: oversized graphic t-shirts, cotton shirts, cargo joggers, hoodies and jeans from ₹499. Free shipping over ₹999, COD available.",
    kw: "men's clothing online, oversized t-shirts for men, cargo joggers, men's hoodies, slim fit jeans, buy men's fashion online India",
    intro: "Wabi Sabi's men's clothing collection includes graphic oversized t-shirts, printed cotton shirts, cargo joggers, zip hoodies, bomber jackets, slim fit jeans and casual shorts, priced from ₹499. Every order ships free above ₹999, can be paid with UPI, card or cash on delivery, and is covered by a 30-day return policy.",
    faq: [["What is the price range of men's clothing at Wabi Sabi?", "Men's clothing at Wabi Sabi starts at ₹499 for graphic t-shirts and goes up to ₹1,999 for bomber jackets."],
      ["Which men's fit is best for casual wear?", "Oversized t-shirts and cargo joggers suit relaxed everyday wear, while slim fit jeans and printed shirts suit smart-casual looks."]] },
  'women-clothing': { c: 'women', name: "Women's Clothing", h1: "Women's Clothing Online",
    title: "Women's Clothing Online – Dresses, Tops, Jeans & Cardigans | Wabi Sabi",
    desc: "Shop women's clothing online: floral maxi dresses, crop tops, high-waist jeans, cardigans and trousers from ₹449. Free shipping over ₹999, COD available.",
    kw: "women's clothing online, maxi dresses, crop tops, high waist jeans, cardigans for women, buy women's fashion online India",
    intro: "Wabi Sabi's women's clothing collection includes floral maxi dresses, midi dresses, cropped tops, boyfriend fit tees, high-waist jeans, knit cardigans and wide leg trousers, priced from ₹449. Orders above ₹999 ship free, with UPI, card and cash on delivery options and 30-day returns.",
    faq: [["What is the price range of women's clothing at Wabi Sabi?", "Women's clothing at Wabi Sabi starts at ₹449 for cropped tops and goes up to ₹1,399 for high-waist jeans."],
      ["Which women's outfits are best for summer?", "Floral maxi dresses, midi dresses and cropped tops in light cotton are the most comfortable choices for summer."]] },
  'accessories': { c: 'accessories', name: 'Accessories', h1: 'Fashion Accessories Online',
    title: 'Fashion Accessories Online – Bags, Backpacks & Caps | Wabi Sabi',
    desc: 'Shop fashion accessories online: canvas tote bags, backpacks, sling bags and baseball caps from ₹349. Free shipping over ₹999, COD available.',
    kw: 'fashion accessories online, tote bags, laptop backpack, sling bag, baseball cap, buy accessories online India',
    intro: 'Wabi Sabi accessories include canvas tote bags, everyday laptop backpacks, compact sling bags and adjustable baseball caps, priced from ₹349. Orders above ₹999 ship free and can be returned within 30 days.',
    faq: [['What accessories does Wabi Sabi sell?', 'Wabi Sabi sells canvas tote bags, backpacks, sling bags and baseball caps in several colours.'],
      ['Are the backpacks suitable for laptops?', 'The everyday backpack has padded straps and a spacious main compartment designed for daily use with a laptop.']] }
};
const FAQS = [
  ['Does Wabi Sabi offer free shipping?', 'Yes. Orders of ₹999 or more ship free anywhere in India. Orders below ₹999 pay a flat ₹79 shipping fee.'],
  ['What is the return policy?', 'You can return products within 30 days of delivery for a refund or exchange, as long as they are unused with tags attached.'],
  ['Which payment methods are accepted?', 'Wabi Sabi accepts UPI, debit and credit cards and net banking through Razorpay, plus Cash on Delivery.'],
  ['Is Cash on Delivery available?', 'Yes, Cash on Delivery is available on all orders.'],
  ['How long does delivery take?', 'Most orders are delivered within 3–7 business days.'],
  ['How do I track my order?', 'Use your order ID and the email address used at checkout to check the order status.'],
  ['How do I choose the right size?', 'Measure your chest and waist, compare them with the size chart, and size down if you want a regular fit in an oversized style.'],
  ['What sizes are available?', 'Clothing is available in sizes XS to XL. Accessories are one size.'],
  ['Are the payments secure?', 'Yes. Online payments are processed by Razorpay and Wabi Sabi never stores your card details.'],
  ['How can I contact Wabi Sabi?', 'Email moong4770@gmail.com or use the contact form on the home page. Support hours are Monday to Friday, 9AM to 6PM.']
];

/* ---------- Home (served via fs.readFileSync + res.send so injection middleware runs) ---------- */
app.get('/', (q, s) => {
  const html = fs.readFileSync(path.join(__dirname, 'views/home.html'), 'utf8').split('https://wabisabistore.onrender.com').join(BASE);
  s.type('html').send(html);
});

/* ---------- Products API ---------- */
const pub = p => ({ id: p.pid, n: p.n, slug: p.slug, c: p.c, p: p.p, o: p.o, col: p.col, t: p.t, r: p.r, rv: p.rv, nw: p.nw, img: p.img });
app.get('/api/products', A(async (q, s) => {
  s.set('Cache-Control', 'public, max-age=300');
  if (mongoose.connection.readyState !== 1) return s.json([]);
  s.json((await Product.find().sort({ pid: 1 }).limit(500).lean()).map(pub));
}));

/* ---------- Checkout: prices are ALWAYS recalculated on the server ---------- */
app.post('/api/checkout', A(async (req, res) => {
  const { customer: c = {}, method, items } = req.body || {};
  const phone = String(c.phone || '').replace(/\D/g, '').slice(-10);
  if (!c.name || !/^\S+@\S+\.\S+$/.test(c.email || '') || !c.addr || phone.length !== 10)
    return res.status(400).json({ error: 'Please enter name, valid email, 10-digit phone and address' });
  if (!Array.isArray(items) || !items.length || items.length > 30) return res.status(400).json({ error: 'Cart is empty' });
  const ps = await Product.find({ pid: { $in: items.map(i => +i.id) } }).lean();
  const by = Object.fromEntries(ps.map(p => [p.pid, p]));
  const lines = []; let sub = 0;
  for (const i of items) {
    const p = by[+i.id]; if (!p) continue;
    const q = Math.min(10, Math.max(1, parseInt(i.q) || 1));
    lines.push({ pid: p.pid, n: p.n, s: String(i.s || 'M').slice(0, 4), q, p: p.p }); sub += p.p * q;
  }
  if (!lines.length) return res.status(400).json({ error: 'Products not found' });
  const shipping = sub >= 999 ? 0 : 79, total = sub + shipping;
  const orderId = 'SH' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
  const online = method !== 'COD';
  const o = await Order.create({
    orderId, customer: { name: String(c.name).slice(0, 80), email: String(c.email).slice(0, 120), phone, addr: String(c.addr).slice(0, 300) },
    items: lines, shipping, total, method: online ? 'ONLINE' : 'COD', status: online ? 'pending_payment' : 'placed'
  });
  if (!online) return res.json({ orderId, total });
  if (!rzp) return res.status(503).json({ error: 'Online payment is not configured yet. Please choose Cash on Delivery.' });
  const r = await rzp.orders.create({ amount: total * 100, currency: 'INR', receipt: orderId });
  o.rzpOrderId = r.id; await o.save();
  res.json({ orderId, total, rzp: { key: process.env.RAZORPAY_KEY_ID, id: r.id, amount: r.amount } });
}));

/* ---------- Razorpay signature verification (never trust the browser alone) ---------- */
app.post('/api/pay/verify', A(async (req, res) => {
  const { orderId, razorpay_order_id: ro, razorpay_payment_id: pi, razorpay_signature: sg } = req.body || {};
  const o = await Order.findOne({ orderId: String(orderId) });
  if (!o || !sg || o.rzpOrderId !== ro) return res.status(400).json({ ok: false });
  const exp = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(ro + '|' + pi).digest('hex');
  const a = Buffer.from(exp), b = Buffer.from(String(sg));
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (ok) { o.status = 'paid'; o.paymentId = pi; await o.save(); }
  res.status(ok ? 200 : 400).json({ ok });
}));

/* ---------- Order tracking: needs order id + email ---------- */
app.get('/api/orders/:id', A(async (req, res) => {
  const o = await Order.findOne({ orderId: req.params.id }).lean();
  if (!o || String(req.query.email || '').toLowerCase() !== o.customer.email.toLowerCase()) return res.status(404).json({ error: 'Order not found' });
  res.json({ orderId: o.orderId, status: o.status, total: o.total, items: o.items, createdAt: o.createdAt });
}));

app.post('/api/contact', A(async (req, res) => {
  const { name, email, msg } = req.body || {};
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || !msg) return res.status(400).json({ error: 'Invalid' });
  await Message.create({ name: String(name).slice(0, 80), email: String(email).slice(0, 120), msg: String(msg).slice(0, 2000) });
  res.json({ ok: true });
}));

/* ---------- Server-rendered product pages (best for SEO) ---------- */
app.get('/product/:slug', A(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return next();
  const p = await Product.findOne({ slug: req.params.slug }).lean(); if (!p) return next();
  const url = `/product/${p.slug}`, cp = CATPATH[p.c], cn = CATS[cp.slice(1)].name;
  const rel = await Product.find({ c: p.c, pid: { $ne: p.pid } }).limit(4).lean();
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.n, description: p.desc, sku: 'SH' + p.pid,
    image: p.img || undefined, brand: { '@type': 'Brand', name: 'Wabi Sabi' }, category: cn,
    aggregateRating: { '@type': 'AggregateRating', ratingValue: p.r, reviewCount: p.rv },
    offers: { '@type': 'Offer', url: BASE + url, price: p.p, priceCurrency: 'INR', availability: 'https://schema.org/InStock',
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: p.p >= 999 ? 0 : 79, currency: 'INR' }, shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' } },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', applicableCountry: 'IN', returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: 30 } }
  };
  res.send(page({
    title: `${p.n} – Buy Online | Wabi Sabi`, desc: `${p.desc} ₹${p.p}. Free shipping over ₹999, COD available.`, path: url, ld, og: p.img,
    kw: `${p.n.toLowerCase()}, buy ${p.n.toLowerCase()} online, ${cn.toLowerCase()}`, crumbs: [['Home', '/'], [cn, cp], [p.n, url]],
    body: `<p class="bc"><a href="/">Home</a> › <a href="${cp}">${esc(cn)}</a> › ${esc(p.n)}</p><h1>${esc(p.n)}</h1>
${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.n)}" width="600" height="750">` : ''}
<p class="pr">₹${p.p}${p.o ? ` <s style="font-size:1rem;font-weight:400">₹${p.o}</s>` : ''}</p><p>${esc(p.desc)}</p>
<p>⭐ ${p.r} (${p.rv} reviews) · Free shipping over ₹999 · 30-day returns · Cash on Delivery</p><a class="btn" href="/#products">Shop &amp; add to cart</a>
<h2>More from ${esc(cn)}</h2><ul class="g">${rel.map(r => `<li><a href="/product/${r.slug}"><b>${esc(r.n)}</b></a><br>₹${r.p}</li>`).join('')}</ul>`
  }));
}));

/* ---------- Blog ---------- */
app.get('/blog', A(async (req, res) => {
  const posts = mongoose.connection.readyState === 1 ? await Post.find().sort({ createdAt: -1 }).lean() : [];
  res.send(page({
    title: 'Fashion Blog – Style Tips & Trends | Wabi Sabi', desc: 'Outfit ideas, styling guides and fashion trends from Wabi Sabi.', path: '/blog',
    ld: { '@context': 'https://schema.org', '@type': 'Blog', name: 'Wabi Sabi Blog', url: BASE + '/blog' },
    body: `<h1>Wabi Sabi Fashion Blog</h1>${posts.map(b => `<article><h2><a href="/blog/${b.slug}">${esc(b.title)}</a></h2><p>${esc(b.excerpt)}</p><small>${dateStr(b.createdAt)}</small></article>`).join('') || '<p>Posts coming soon.</p>'}`
  }));
}));
app.get('/blog/:slug', A(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) return next();
  const b = await Post.findOne({ slug: req.params.slug }).lean(); if (!b) return next();
  const faq = (b.faq || []).map(f => [f.q, f.a]), url = `/blog/${b.slug}`;
  const more = await Post.find({ slug: { $ne: b.slug } }).limit(3).lean();
  res.send(page({
    title: `${b.title} | Wabi Sabi Blog`, desc: b.excerpt, path: url, kw: b.kw, crumbs: [['Home', '/'], ['Blog', '/blog'], [b.title, url]],
    ld: [{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: b.title, description: b.excerpt, datePublished: b.createdAt, dateModified: b.updatedAt, author: { '@type': 'Organization', name: 'Wabi Sabi' }, publisher: { '@type': 'Organization', name: 'Wabi Sabi' }, mainEntityOfPage: BASE + url }].concat(faq.length ? faqLd(faq) : []),
    body: `<p class="bc"><a href="/">Home</a> › <a href="/blog">Blog</a></p><h1>${esc(b.title)}</h1><small>Updated ${dateStr(b.updatedAt || b.createdAt)}</small>${b.body}
${b.cat && CATPATH[b.cat] ? `<p><a class="btn" href="${CATPATH[b.cat]}">Shop ${esc(CATS[CATPATH[b.cat].slice(1)].name)}</a></p>` : ''}
${faq.length ? `<h2>Frequently asked questions</h2>${faqHtml(faq)}` : ''}
<h2>Keep reading</h2><ul>${more.map(m => `<li><a href="/blog/${m.slug}">${esc(m.title)}</a></li>`).join('')}</ul>`
  }));
}));

/* ---------- Category pages (SEO landing pages) ---------- */
app.get('/:cat(men-clothing|women-clothing|accessories)', A(async (req, res) => {
  const k = CATS[req.params.cat], url = '/' + req.params.cat;
  const [ps, posts] = mongoose.connection.readyState === 1
    ? await Promise.all([Product.find({ c: k.c }).sort({ pid: 1 }).lean(), Post.find({ cat: k.c }).limit(3).lean()])
    : [[], []];
  res.send(page({
    title: k.title, desc: k.desc, path: url, kw: k.kw, crumbs: [['Home', '/'], [k.name, url]],
    ld: [{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: k.name, url: BASE + url, description: k.desc },
      { '@context': 'https://schema.org', '@type': 'ItemList', itemListElement: ps.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: BASE + '/product/' + p.slug, name: p.n })) },
      faqLd(k.faq)],
    body: `<p class="bc"><a href="/">Home</a> › ${esc(k.name)}</p><h1>${esc(k.h1)}</h1><p>${esc(k.intro)}</p>
<ul class="g">${ps.map(p => `<li><a href="/product/${p.slug}">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.n)}" width="300" height="375" loading="lazy">` : ''}<b>${esc(p.n)}</b></a><br>₹${p.p}${p.o ? ` <s>₹${p.o}</s>` : ''}</li>`).join('')}</ul>
${posts.length ? `<h2>Style guides</h2><ul>${posts.map(b => `<li><a href="/blog/${b.slug}">${esc(b.title)}</a></li>`).join('')}</ul>` : ''}
<h2>${esc(k.name)} FAQs</h2>${faqHtml(k.faq)}`
  }));
}));

/* ---------- FAQ + About (answer-first content that AI engines can quote) ---------- */
app.get('/faq', (q, s) => s.send(page({
  title: 'FAQ – Shipping, Returns, Payments & Sizing | Wabi Sabi', desc: 'Answers about Wabi Sabi shipping, 30-day returns, Cash on Delivery, UPI payments, delivery time and size guide.',
  path: '/faq', kw: 'wabisabi faq, shipping policy, return policy, cash on delivery, size guide', ld: faqLd(FAQS), crumbs: [['Home', '/'], ['FAQ', '/faq']],
  body: `<p class="bc"><a href="/">Home</a> › FAQ</p><h1>Frequently Asked Questions</h1>${faqHtml(FAQS)}`
})));
app.get('/about', (q, s) => s.send(page({
  title: 'About Wabi Sabi – Online Fashion Store for Men & Women', desc: 'Wabi Sabi is an online fashion store selling men\'s and women\'s clothing and accessories with free shipping over ₹999, COD and 30-day returns.',
  path: '/about', ld: { '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About Wabi Sabi', url: BASE + '/about' }, crumbs: [['Home', '/'], ['About', '/about']],
  body: `<p class="bc"><a href="/">Home</a> › About</p><h1>About Wabi Sabi</h1>
<p>Wabi Sabi is an online fashion store that sells men's clothing, women's clothing and accessories at affordable prices. It offers free shipping on orders above ₹999, Cash on Delivery, UPI, card and net banking payments, and a 30-day return policy.</p>
<h2>What we sell</h2><p>Graphic t-shirts, shirts, jeans, joggers, hoodies, jackets, dresses, tops, cardigans, tote bags, backpacks and caps. Browse <a href="/men-clothing">men's clothing</a>, <a href="/women-clothing">women's clothing</a> and <a href="/accessories">accessories</a>.</p>
<h2>Contact</h2><p>Email: ${esc(ORG.email)}. Support hours: Monday to Friday, 9AM to 6PM. See our <a href="/faq">FAQ</a> for shipping and returns.</p>`
})));
app.get('/privacy', (q, s) => s.send(page({
  title: 'Privacy Policy | Wabi Sabi', desc: 'Privacy Policy and data protection practices for Wabi Sabi store.',
  path: '/privacy', crumbs: [['Home', '/'], ['Privacy Policy', '/privacy']],
  body: `<p class="bc"><a href="/">Home</a> › Privacy Policy</p><h1>Privacy Policy</h1><p>At Wabi Sabi, we value your privacy. We collect minimal customer information strictly to process and deliver your orders. Payment card numbers are processed via Razorpay and never stored on our servers.</p>`
})));
app.get('/terms', (q, s) => s.send(page({
  title: 'Terms & Conditions | Wabi Sabi', desc: 'Terms and conditions of purchase, delivery, and returns for Wabi Sabi store.',
  path: '/terms', crumbs: [['Home', '/'], ['Terms & Conditions', '/terms']],
  body: `<p class="bc"><a href="/">Home</a> › Terms &amp; Conditions</p><h1>Terms &amp; Conditions</h1><p>By placing an order with Wabi Sabi, you agree to our 30-day return policy and shipping terms. Free shipping applies on orders over ₹999 across India.</p>`
})));
app.get('/favicon.ico', (q, s) => {
  s.type('image/svg+xml').send(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='40' fill='%23ff3d3d'/><text x='50' y='65' font-size='45' text-anchor='middle' fill='white'>侘</text></svg>`);
});
app.get('/og-image.jpg', (q, s) => {
  s.type('image/svg+xml').sendFile(path.join(__dirname, 'public/og-image.svg'));
});

/* ---------- llms.txt: a plain-text summary for AI assistants / answer engines ---------- */
app.get('/llms.txt', (q, s) => s.type('text/plain').send(`# Wabi Sabi

> Wabi Sabi is an online fashion store in India selling men's clothing, women's clothing and accessories. Free shipping over ₹999, 30-day returns, Cash on Delivery, and UPI/card/net banking payments via Razorpay.

## Main pages
- [Men's Clothing](${BASE}/men-clothing): t-shirts, shirts, joggers, hoodies, jackets, jeans, shorts (from ₹499)
- [Women's Clothing](${BASE}/women-clothing): dresses, tops, jeans, cardigans, trousers (from ₹449)
- [Accessories](${BASE}/accessories): tote bags, backpacks, sling bags, caps (from ₹349)
- [FAQ](${BASE}/faq): shipping, returns, payments, sizing, tracking
- [Blog](${BASE}/blog): styling guides and fashion trends
- [About](${BASE}/about): who we are and how to contact us

## Policies
- Shipping: free over ₹999, otherwise ₹79
- Returns: 30 days from delivery
- Payments: UPI, cards, net banking, Cash on Delivery

## Optional
- [Full product list](${BASE}/llms-full.txt)
- [Sitemap](${BASE}/sitemap.xml)
`));
app.get('/llms-full.txt', A(async (q, s) => {
  const ps = mongoose.connection.readyState === 1 ? await Product.find().sort({ pid: 1 }).lean() : [];
  s.type('text/plain').send(`# Wabi Sabi – full product list\n\n${ps.map(p => `## ${p.n}\n- Category: ${CATS[CATPATH[p.c].slice(1)].name}\n- Price: ₹${p.p}${p.o ? ` (MRP ₹${p.o})` : ''}\n- Rating: ${p.r}/5 from ${p.rv} reviews\n- ${p.desc}\n- URL: ${BASE}/product/${p.slug}\n`).join('\n')}`);
}));

/* ---------- robots.txt + dynamic sitemap.xml ---------- */
app.get('/robots.txt', (q, s) => s.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /api/

# AI search / answer-engine crawlers are allowed so Wabi Sabi can appear in AI answers.
# To opt out of AI training only, change "Allow: /" to "Disallow: /" for GPTBot, Google-Extended, Applebot-Extended and ClaudeBot.
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-User
User-agent: Claude-SearchBot
User-agent: PerplexityBot
User-agent: Perplexity-User
User-agent: Google-Extended
User-agent: Applebot-Extended
Allow: /
Disallow: /api/

Sitemap: ${BASE}/sitemap.xml
`));
app.get('/sitemap.xml', A(async (q, s) => {
  const [ps, bs] = mongoose.connection.readyState === 1
    ? await Promise.all([Product.find({}, 'slug updatedAt').lean(), Post.find({}, 'slug updatedAt').lean()])
    : [[], []];
  const u = (loc, d, pr) => `<url><loc>${BASE}${loc}</loc>${d ? `<lastmod>${dateStr(d)}</lastmod>` : ''}<priority>${pr}</priority></url>`;
  s.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${u('/', 0, '1.0')}${u('/blog', 0, '0.7')}${['men-clothing', 'women-clothing', 'accessories'].map(c => u('/' + c, 0, '0.9')).join('')}${u('/faq', 0, '0.6')}${u('/about', 0, '0.4')}${ps.map(p => u('/product/' + p.slug, p.updatedAt, '0.8')).join('')}${bs.map(b => u('/blog/' + b.slug, b.updatedAt, '0.6')).join('')}</urlset>`);
}));

app.use(express.static(path.join(__dirname, 'public'), { index: false, maxAge: '7d' }));
app.use((q, s) => s.status(404).send(page({ title: 'Page not found | Wabi Sabi', desc: 'Page not found', path: q.path, body: '<h1>404 – Page not found</h1><p><a href="/">Back to home</a></p>' })));
app.use((e, q, s, n) => { console.error(e); s.status(500).json({ error: 'Server error' }); });

const PORT = process.env.PORT || 3000;
const DEFAULT_MONGO_URI = 'mongodb+srv://gandhimemuna123_db_user:Y8H8wrjeZcOMeTay@wabisabistore.j96bpvo.mongodb.net/?appName=wabisabistore';
let mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || DEFAULT_MONGO_URI;

// Start HTTP server immediately so platforms like Render pass health checks without timing out
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Wabi Sabi running on port ${PORT}`);
});

if (mongoUri) {
  mongoose.connect(mongoUri)
    .then(() => console.log('✅ Connected to MongoDB successfully!'))
    .catch(e => {
      console.error('❌ DB connection failed:', e.message);
      console.error('👉 Tip: Check MongoDB Atlas Network Access (ensure 0.0.0.0/0 is allowed) and credentials.');
    });
}
