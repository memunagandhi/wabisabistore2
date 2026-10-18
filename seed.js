/* Run: npm run seed  -> inserts/updates 100 products + 3 blog posts (safe to re-run) */
require('dotenv').config();
if (process.env.DNS_FIX) require('dns').setServers(['8.8.8.8', '1.1.1.1']); // set DNS_FIX=1 in .env if you get 'querySrv ECONNREFUSED'
const mongoose = require('mongoose');
const { Product, Post } = require('./models');
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const CDN = (process.env.CDN_BASE || '').replace(/\/$/, '');

// [name, category, svg-shape, price, mrp, description keywords]
const BASES = [
  ['Graphic Oversized T-Shirt', 'men', 'shirt', 499, 799, 'soft cotton oversized fit graphic tee for everyday style'],
  ['Printed Cotton Shirt', 'men', 'shirt', 899, 1299, 'breathable printed casual shirt for men'],
  ['Cargo Joggers', 'men', 'pants', 1099, 1599, 'comfortable cargo joggers with multiple pockets'],
  ['Zip Hoodie', 'men', 'jacket', 1399, 1999, 'warm fleece zip-up hoodie for winter'],
  ['Bomber Jacket', 'men', 'jacket', 1999, 2799, 'trendy lightweight bomber jacket'],
  ['Slim Fit Jeans', 'men', 'pants', 1299, 1799, 'stretch denim slim fit jeans'],
  ['Casual Shorts', 'men', 'pants', 599, 899, 'easy everyday cotton shorts'],
  ['Floral Maxi Dress', 'women', 'dress', 1199, 1699, 'flowy floral maxi dress for summer outings'],
  ['Cropped Top', 'women', 'shirt', 449, 699, 'stylish cropped top for casual wear'],
  ['Boyfriend Fit Tee', 'women', 'shirt', 549, 799, 'relaxed boyfriend fit t-shirt for women'],
  ['High-Waist Jeans', 'women', 'pants', 1399, 1899, 'high-waist denim jeans with a flattering fit'],
  ['Knit Cardigan', 'women', 'jacket', 1299, 1799, 'cozy knit cardigan to layer in any season'],
  ['Midi Skirt Dress', 'women', 'dress', 999, 1499, 'elegant midi dress for work and parties'],
  ['Wide Leg Trousers', 'women', 'pants', 1099, 1499, 'comfortable wide leg trousers'],
  ['Canvas Tote Bag', 'accessories', 'bag', 399, 599, 'durable canvas tote bag for daily use'],
  ['Everyday Backpack', 'accessories', 'bag', 899, 1299, 'spacious laptop backpack with padded straps'],
  ['Baseball Cap', 'accessories', 'cap', 349, 549, 'adjustable cotton baseball cap'],
  ['Sling Bag', 'accessories', 'bag', 649, 999, 'compact crossbody sling bag']
];
const VARS = [['Midnight', '#1f2a44'], ['Sunset', '#d9775a'], ['Olive', '#5a6b3a'], ['Sand', '#c8b08a'], ['Berry', '#7a2f55'], ['Sky', '#4a86b8']];

const products = Array.from({ length: 100 }, (_, i) => {
  const [bn, c, t, p, o, d] = BASES[i % BASES.length], [vn, col] = VARS[Math.floor(i / BASES.length)];
  const n = `${vn} ${bn}`, slug = slugify(n);
  return {
    pid: i + 1, n, slug, c, t, p, o, col, nw: i % 4 === 0,
    r: +(4 + ((i * 7) % 10) / 10).toFixed(1), rv: 20 + ((i * 37) % 300),
    img: CDN ? `${CDN}/${slug}.jpg` : '',
    desc: `${n}: ${d}. Available in sizes XS to XL. Free shipping over ₹999, easy 30-day returns and Cash on Delivery.`
  };
});

const posts = [
  ['How to Style an Oversized T-Shirt in 5 Ways', 'Five easy outfit ideas to make an oversized tee look put-together, from college to weekend plans.', 'men', 'how to style oversized t-shirt, oversized tee outfits, graphic tee styling',
   '<p>You can style an oversized t-shirt by pairing it with cargo joggers, half-tucking it into high-waist jeans, layering it under a bomber jacket, wearing it with shorts, or belting it as a dress.</p><h2>1. With cargo joggers</h2><p>Pair a graphic tee with cargo joggers and white sneakers for a street-style look.</p><h2>2. Tucked into high-waist jeans</h2><p>A half-tuck defines the waist and keeps the fit balanced.</p><h2>3. Under a bomber jacket</h2><p>Layering adds depth in cooler weather.</p><h2>4. With shorts</h2><p>Perfect for summer; keep colours tonal.</p><h2>5. As a dress</h2><p>Add a belt and sandals for an instant casual dress.</p>',
   [['What size should I buy for an oversized fit?', 'Order your usual size for an oversized look, or one size down for a relaxed regular fit.'], ['Which pants go best with an oversized t-shirt?', 'Cargo joggers, slim fit jeans and shorts all work well because they balance the loose top.']]],
  ['Summer Fashion Trends That Are Actually Comfortable', 'Light fabrics, relaxed fits and bold colours: the summer trends worth buying this season.', 'women', 'summer fashion trends, summer outfits india, floral dress',
   '<p>The best summer fashion trends combine breathable cotton, relaxed silhouettes, floral prints and simple accessories.</p><h2>Light cotton everything</h2><p>Cotton shirts and dresses keep you cool in humid weather.</p><h2>Floral prints</h2><p>Floral maxi dresses remain a favourite for outings.</p><h2>Statement accessories</h2><p>A tote bag or cap completes the look at low cost.</p>',
   [['Which fabric is best for hot weather?', 'Lightweight cotton is the most breathable and comfortable fabric for hot and humid weather.']]],
  ['Size Guide: How to Choose the Right Fit Online', 'Not sure which size to order? Use these simple measuring tips to get the right fit first time.', 'all', 'size guide, how to choose clothing size online, clothing fit guide',
   '<p>To choose the right size online, measure your chest and waist, compare them with the size chart, and check whether the style is slim, regular or oversized.</p><h2>Measure your chest and waist</h2><p>Use a soft tape and compare with our size chart.</p><h2>Check the fit type</h2><p>Oversized and slim fits run differently: size down for oversized if you want a regular look.</p><h2>Easy returns</h2><p>If the fit is off, return within 30 days.</p>',
   [['What if the size does not fit?', 'You can return or exchange the product within 30 days of delivery.']]],
  ['Best Winter Jackets for Men Under ₹2000', 'Bomber jackets and zip hoodies that keep you warm without a heavy price tag.', 'men', 'winter jackets for men, bomber jacket under 2000, zip hoodie',
   '<p>A bomber jacket or a fleece zip hoodie is the best winter option for men under ₹2000 because both are warm, light and easy to style.</p><h2>Bomber jacket</h2><p>Works over tees and shirts, and suits both casual and smart-casual outfits.</p><h2>Zip hoodie</h2><p>Ideal for mild winters and layering under a jacket.</p>',
   [['Which jacket is best for mild winters?', 'A fleece zip hoodie gives enough warmth for mild winters and is easy to layer.']]],
  ['How to Wear a Maxi Dress for Any Occasion', 'Simple styling ideas to take a floral maxi dress from brunch to evening.', 'women', 'how to wear maxi dress, floral maxi dress outfit, maxi dress styling',
   '<p>You can wear a floral maxi dress for any occasion by changing the footwear, bag and layers: sneakers for the day, heels or sandals for the evening.</p><h2>Day look</h2><p>Add white sneakers and a canvas tote bag.</p><h2>Evening look</h2><p>Swap to heels and add a belt to define the waist.</p>',
   [['Can I wear a maxi dress in winter?', 'Yes, layer it with a knit cardigan or a jacket.']]],
  ['How to Choose an Everyday Backpack', 'What to look for in a daily backpack: padding, space, material and fit.', 'accessories', 'how to choose backpack, laptop backpack, everyday backpack',
   '<p>Choose a backpack with padded straps, a main compartment large enough for a laptop, durable fabric and a size that sits close to your back.</p><h2>Padding and straps</h2><p>Padded straps reduce shoulder strain.</p><h2>Capacity</h2><p>Pick a size that fits your laptop, a bottle and daily essentials.</p>',
   [['What backpack size is best for daily use?', 'A backpack that fits a laptop plus daily essentials is enough for most people.']]]
].map(([title, excerpt, cat, kw, body, faq]) => ({ title, slug: slugify(title), excerpt, cat, kw, body, faq: faq.map(([q, a]) => ({ q, a })) }));

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  await Product.bulkWrite(products.map(p => ({ updateOne: { filter: { pid: p.pid }, update: { $set: p }, upsert: true } })));
  await Post.bulkWrite(posts.map(p => ({ updateOne: { filter: { slug: p.slug }, update: { $set: p }, upsert: true } })));
  console.log(`Seeded ${products.length} products and ${posts.length} posts`);
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });