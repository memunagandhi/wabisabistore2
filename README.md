# Wabi Sabi Store – Express + MongoDB + Razorpay (Render-ready)

Features: 100-product catalogue, category pages, FAQ, About, blog with FAQ schema, llms.txt, dynamic sitemap + robots.txt (see SEO-PLAN.md),
signature verification, order tracking API, server-rendered product pages with Product schema,
blog (Article schema), dynamic sitemap.xml, robots.txt, canonical/OG tags.

## 1. Database (free) – MongoDB Atlas
1. atlas → create free M0 cluster → Database Access: add user → Network Access: allow 0.0.0.0/0
2. Copy the connection string into MONGODB_URI (add `/wabisabi` before the `?`).

## 2. Payment – Razorpay
1. Sign up at razorpay.com → Settings → API Keys → generate TEST keys.
2. Put them in RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET. Switch to LIVE keys only after KYC is approved.

## 3. Run locally
    cp .env.example .env     # fill the values
    npm install
    npm run seed             # inserts 100 products + 3 blog posts
    npm start                # http://localhost:3000
Test card/UPI details are in Razorpay's test-mode docs.

## 4. Deploy on Render
1. Push this folder to GitHub.  2. Render → New → Web Service → connect repo.
3. Build: `npm install`   Start: `npm start`
4. Environment: add every variable from .env.example (BASE_URL = your final https URL).
5. After first deploy run `npm run seed` once (Render Shell, or locally with the Atlas URI).

## 5. Go-live SEO checklist
- Google Search Console → add property → submit `/sitemap.xml`; Bing Webmaster Tools too.
- Upload `og-image.jpg` (1200x630) to /public and your own product photos to a CDN (Cloudinary etc.),
  named `<product-slug>.jpg`, then set CDN_BASE and re-run `npm run seed`.
- Write 800+ word blog posts (edit seed.js or insert into the `posts` collection).
- Test with PageSpeed Insights + Google Rich Results Test (product pages and blog).
- Add Privacy Policy, Terms, Shipping and Returns pages before taking real payments (Razorpay requires them).
