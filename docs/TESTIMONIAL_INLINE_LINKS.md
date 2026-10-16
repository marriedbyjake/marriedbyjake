# Testimonial inline link selections

This mapping adds optional links to phrases already present in the live review text. Every text value matches the displayed review exactly; it never draws from vendor credits. The mapping is keyed by testimonial slug, and each review has at most two links. The renderer leaves unmatched entries untouched.

Selections favor a specific service phrase, then a clear wedding phrase such as “marry us”, “our wedding day”, or “our wedding”. A second link appears only when the review itself mentions elopements/destination weddings or Jake acting as MC/master of ceremonies. Region links use the CMS location field when it identifies a supported service region; otherwise the link goes to the general wedding celebrant page. No location is inferred from a generic venue name.

## Contextual landing-page reviews

`src/components/testimonials/ContextualReviews.astro` and `src/lib/contextual-reviews.ts` reuse published CMS data to show at most three review excerpts. Featured reviews come first, then publication date, with a stable slug tie-break. The existing formatter separates vendor credits before selection or excerpting; excerpts preserve review words and end at a word boundary, with an ellipsis when shortened.

For Brisbane, Sydney, Byron Bay, Gold Coast and Sunshine Coast, a comma-, semicolon-, slash- or pipe-delimited part of the CMS location must name that city explicitly (optionally followed by QLD, NSW or their full names). Case and whitespace are ignored. Suburbs, venue names, map coordinates, review prose and old inline-link destinations do not establish a city association. This intentionally leaves some local weddings unmatched until their CMS metadata explicitly identifies the city.

The wedding celebrant, MC and elopement service pages use this existing reviewed mapping: the selection must point to that service and its exact phrase must still occur at word boundaries in the current review, outside vendor credits. New unmapped reviews are not automatically assigned to a service. Add a reviewed inline-link selection through the existing workflow when justified by the quote; do not add tags or infer an association from a generic wedding venue.

The component emits ordinary links to full testimonials. If no reliable review matches, it shows a neutral “What couples say” heading and a link to browse all reviews, without presenting unrelated reviews as local. No CMS schema or published content change is needed.

The directory retains 24 cards per page, adds direct numbered links, and includes each valid self-canonical directory URL in the sitemap. The count uses the same pagination helper as the directory and changes with the published collection. Page one uses the query-free URL; page aliases and invalid page values redirect to the normalized URL. These are distinct review lists, rather than filters or alternate sort orders, consistent with [Google's pagination guidance](https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading).

## Coverage (historical inline-link inventory)

Of 613 live testimonials, 554 receive at least one inline link from this mapping; 59 have no selected phrase.

Actual inline link counts returned by the live renderer:

| Destination | Links |
| --- | ---: |
| /sunshine-coast | 49 |
| /wedding-celebrant | 250 |
| /gold-coast | 100 |
| /brisbane | 112 |
| /master-of-ceremonies | 74 |
| /byron-bay | 8 |
| /sydney | 25 |
| /elopements | 15 |

Uncovered testimonials (no suitable existing phrase): 2791, aaron-natasha, adam-catherine-gardens-cafe-brisbane-botanic-gardens, aj66fqy3npga8od78mjb4qdpsrco4l, alex-jasmine, alex-kayla-brisbane-racing-club-wedding, alex-natalie, andrew-and-kim, andrew-maha, andy-and-layla, angus-jessica-coolibah-downs, antini-and-mia, ben-and-sarah, brendan-angela, brock-lexi, brydie-and-jordan, chris-melanie, curtis-rachelle-boomerang-farm-wedding, dan-steph, dylan-and-kim, elise-and-nik, emily-and-alex, emma-and-james, hannah-and-brad, jacob-brianna, james-and-hayley, jamie-and-michael, jason-braidi, jason-emily, jesse-and-ashleigh, jessica-and-khan, jock-and-laura, joel-cass, john-keira, justin-laura-sydney-harbour-wedding, kate-and-geoff, katie-and-josh, katreena-and-matt, kristoffer-jaimi-leigh, kylie-and-stephen, lara-and-firas, laura-and-zac, lauren-and-clayton, lewa-and-cory, luke-and-michelle, maddy-and-dylan, madi-and-ricky, maree-and-fabrice, mark-nerissa, mathieu-and-fay, mel-and-rick, paris-and-adam, rhiannon-and-jesse, richard-and-cylvi, simon-and-kacie, tahlia-and-elia, tahnee-and-steve, tanya-and-scott, tisha-and-david
