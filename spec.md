# RevSpace — SEO Keywords Integration

## Current State
- `index.html` has basic SEO meta tags: title, description, keywords (short list), Open Graph, Twitter Card, and two JSON-LD blocks (WebSite + Organization)
- `sitemap.xml` covers 8 URLs, no lastmod dates
- `robots.txt` is minimal
- LoginScreen has no keyword-rich visible/hidden text for SEO crawlers
- FeedPage and other pages have no per-page meta or keyword-rich content sections

## Requested Changes (Diff)

### Add
- Comprehensive `<meta name="keywords">` tag in `index.html` covering all provided keyword categories
- Keyword-rich `<meta name="description">` that naturally incorporates primary SEO terms
- Updated `<title>` to include top-priority keywords
- Updated Open Graph and Twitter Card descriptions with primary keywords
- Enhanced JSON-LD with keywords array, same-as social links, and richer Organization schema
- `SoftwareApplication` JSON-LD schema block for app-store style SEO
- Hidden SEO landmark `<section>` in LoginScreen with h2/p tags containing keyword-rich copy (visually hidden via sr-only, but crawlable)
- Additional sitemap entries for all built pages: `/forum`, `/build-battle`, `/featured`, `/revbucks`, `/pro`, `/guide`, `/about`, `/model-reels`, `/model-gallery`, `/mechanics`, `/dyno-os`
- `lastmod` dates on all sitemap entries

### Modify
- `<meta name="keywords">` — replace short existing list with the full comprehensive keyword set
- `<meta name="description">` — rewrite to incorporate primary keyword phrases naturally
- `<title>` — update to: "RevSpace — Import Car Community & JDM Car Enthusiast Social Network"
- Open Graph title/description to match
- Twitter Card title/description to match
- JSON-LD WebSite description to incorporate keywords naturally

### Remove
- Nothing removed

## Implementation Plan
1. Rewrite `index.html` head section:
   - New title: "RevSpace — Import Car Community & JDM Car Enthusiast Social Network"
   - New meta description (~160 chars) with primary keywords
   - New meta keywords with full list from all categories
   - Updated OG/Twitter tags
   - Enhanced JSON-LD with keywords property and SoftwareApplication type
2. Update `sitemap.xml` with all 19+ pages and `lastmod` for each
3. Add visually-hidden SEO content block in `LoginScreen.tsx` with h2/p tags covering keyword categories (car community, JDM, tuner, build sharing, meets, marketplace, etc.)
4. Add visually-hidden SEO content block in `FeedPage.tsx` for the homepage feed text
