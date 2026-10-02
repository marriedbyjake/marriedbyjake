# Testimonial inline link selections

This mapping adds optional links to phrases already present in the live review text. Every text value matches the displayed review exactly; it never draws from vendor credits. The mapping is keyed by testimonial slug, and each review has at most two links. The renderer leaves unmatched entries untouched.

Selections favor a specific service phrase, then a clear wedding phrase such as “marry us”, “our wedding day”, or “our wedding”. A second link appears only when the review itself mentions elopements/destination weddings or Jake acting as MC/master of ceremonies. Region links use the CMS location field when it identifies a supported service region; otherwise the link goes to the general wedding celebrant page. No location is inferred from a generic venue name.

## Coverage

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
