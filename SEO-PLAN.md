# Wabi Sabi – SEO + GEO + LLM plan (portfolio ready)

## 1. Keyword map (one primary keyword per page)
| Page | Primary keyword | Supporting keywords |
|---|---|---|
| / | online clothing store India | men's clothing, women's clothing, free shipping, COD |
| /men-clothing | men's clothing online | oversized t-shirts for men, cargo joggers, slim fit jeans |
| /women-clothing | women's clothing online | maxi dresses, crop tops, high waist jeans |
| /accessories | fashion accessories online | tote bags, laptop backpack, baseball cap |
| /product/<slug> | <product name> buy online | auto-generated per product |
| /blog/<slug> | see `kw` field in seed.js | how-to / guide keywords |
| /faq | wabisabi faq | shipping, return policy, COD |

Note: Google ignores the meta keywords tag. Rankings come from the keyword in the title, H1, URL, first 100 words and internal links. The tag is kept for portfolio completeness and for Bing/other tools.

## 2. Technical SEO (already built in)
Canonical + hreflang en-IN, robots meta, dynamic sitemap.xml, robots.txt, breadcrumb schema, Product/Offer (shipping + return policy), CollectionPage/ItemList, FAQPage, BlogPosting, Organization schema, server-rendered pages, gzip, lazy images, internal links (home > category > product > blog).

## 3. On-page checklist (per page)
Title 50-60 chars with keyword first - meta description 140-160 chars with price/benefit - one H1 - keyword in first paragraph - descriptive alt text - 2-3 internal links - FAQ block - unique content (never copy competitor text).

## 4. GEO (Generative Engine Optimization)
- Answer-first sentences: every page opens with a one-paragraph, quotable summary with concrete facts (prices, policy numbers).
- Keep facts consistent everywhere (site, schema, llms.txt, Google Business Profile): shipping, returns, payment, address, phone, email.
- Add real reviews, size charts, comparison tables and original photos; AI engines cite pages with clear facts.
- Fill `SOCIAL` in .env with your Instagram/Facebook/LinkedIn/Pinterest URLs (becomes Organization sameAs).
- Get mentioned on other sites (blogs, Reddit, Quora answers, directories): brand mentions help AI answers.
- Update blog posts regularly and keep the "Updated" date honest.

## 5. LLM readiness
- /llms.txt (summary + key links) and /llms-full.txt (every product with price and URL) are served automatically.
- robots.txt allows GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended, Applebot-Extended. Change to Disallow if you do not want AI training/answers.
- llms.txt is a proposed convention; not every AI engine reads it yet, so rely on good HTML + schema first.

## 6. Off-page
Google Business Profile - Pinterest boards for outfits - Instagram Reels linking to category pages - guest posts on fashion blogs - fashion directories - HARO-style PR - influencer product reviews with links - answer questions on Quora/Reddit helpfully (no spam).

## 7. Tools to prove results in your portfolio
Google Search Console (impressions/clicks) - PageSpeed Insights (Core Web Vitals) - Rich Results Test - Bing Webmaster - Screaming Frog (free to 500 URLs) - before/after screenshots.
