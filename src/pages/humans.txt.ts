import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

export const GET: APIRoute = async () => {
  const [posts, testimonials, services] = await Promise.all([
    getCollection("posts"),
    getCollection("weddingtestimonials"),
    getCollection("services"),
  ]);

  const lastUpdated = new Date().toISOString().slice(0, 10);

  const body = `/* TEAM */

Celebrant: Jake Smith aka Married By Jake
Site: https://marriedbyjake.com
Location: Brisbane, Queensland, Australia
Authorisation: Commonwealth Civil Marriage Celebrant
              (Attorney-General's Department of Australia)
Distinction: Australia's most-reviewed wedding celebrant
            (${testimonials.length} published reviews and counting)

~^^^^^^^^^^^^^^^^^^^^^^^^:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::^^^^^^^^
^^^^^^^^^^^^^^^^^^^^^^^^:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::^^^^^^^
^^^^^^^^^^^^^^^^^^^^^^^::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::^^^^^
^^^^^^^^^^^^^^^^^^^^^^::::::::::::::::::::::~JY?!!~^:::::::::::::::::::::::::::::::::::::::::::::^^^
^^^^^^^^^^^^^^^^^^^^:::::::::::::::::::::^?JPBG55PP5YJ?J7!!~^:::::::::::::::::::::::::::::::::::::^^
^^^^^^^^^^^^^^^:::::::::::::::::::::::::!YYJ?7!!77??J5GBGGBBP5J!^:::::::::::::::::::::::::::::::::^^
^^^^^^^^^^^^^^^::::::::::::::::::::::::!YYJ7!~~^^^~~~7YPGG#####BG?:::::::::::::::::::::::::::::::::^
^^^^^^^^^^::::::::::::::::::::::::::::!Y?7!^^^^^:^^^^~!J5PB######BJ^::::::::::::::::::::::::::::::::
^^^^^^^^::::::::::::::::::::::::::::::!~!~^^^::::::^^^~!?YG########7::::::::::::::::::::::::::::::::
^^^^^^^::::::::::::::::::::::::::::::^!7!~~^::::::::^^~!7?5BB######Y::::::::::::::::::::::::::::::::
^^^^^^:::::::::::::::::::::::::::::::~P5Y!!~~~~!!~~^~~!J5555G######P^:::::::::::::::::::::::::::::::
^^^^^^:::::::::::::::::::::::::::::::~?G?~!!~~7?7Y7~77!~?#BYPB#####G^:::::::::::::::::::::::::::::::
^^^^^^:::::::::::::::::::::::::::::::^!Y?~^^~7?~~5J~^~!!5#PJ~B######!:::::::::::::::::::::::::::::::
^^^^^::::::::::::::::::::::::::::::::^!!~~^~~!~:~?7!~~!7J55!5######5^:::::::::::::::::::::::::::::::
^^^^^:::::::::::::::::::::::::::::::::!~^^^^^^^^~!!^^:^~!YPY######B~:^::::::::::::::::::::::::::::::
^^^^^:::::::::::::::::::::::::::::::::^~^:^!!~^^^~!7~^^^^?B#######J:^^::::::::::::::::::::::::::::::
^^^^:::::::::::::::::::::::::::::::::::~^^^^~~^^^~7!^^^^~5#######P~^^^::::::::::::::::::::::::::::::
^^^^^:::::::::::::::::::::::::::::::::::^~^^^^^^^^~~~~~7P#######J~^^^^^:::::::::::::::::::::::::::::
^^^^^::::::::::::::::::::::::::::::::::::!7~^^^^^^~!77??!J######?^^^^^^^::::::::::::::::::::::::::::
^^^^^::::::::::::::::::::::::::::::::::::!?7!~~~~!77!!^::~5B#&###5!^:^^^^^::::::::::::::::::::::::::
^^^^^:::::::::::::::::::::::::::::::::!J7!7!~~~~~~^::.:^:!Y5PB##&&#57^:::^^:::::::::::::::::::::::::
^^^^^::::::::::::::::::::::::::::^!7J5#&#J!!!!!77:...:::~JYYYY5GB#&&#GY7~^::::::::::::::::::::::::::
^^^^^::::::::::::::::::::::::!?Y5PPPG&&&&&##B#&&P...::::JYYYYYYYP5GB#&&#GY7~^:::::::::::::::::::::::
^^^^^^:::::::::::::::::::::^JGGPPPGGB#&&&BG#&###!...:::?YYJYYYYY5555PGB#&&#BY7~^:::::::::::::::::::^
^^^^^^::::::::::::::::::::^YPP55PPGP?!P5?^:~P##5::::::?YYYYYYYY5YY5555PGGB#&&#B5?~^:::::::::::::::^^
^^^^^^::::::::::::::::::::JPPP5PPGP?:::::.^?:?J::::::7YJJJYY55Y5YYYYYYYY5PGB###&#BPJ!^:::::::::::^^^
^^^^^^:::::::::::::::::::!PPPPPPPPJ^:::::...:..:::::7YJJJJYGB5YYYYYYYJYJY5PPGB######BY^:^^^:::::^:^^
^^^^^^^::::::::::::::::::5PPPP5PPY~:::::..::::::::.!JJJJJYYYYYJJJJJJJYYYYY5PPB########7:^^^^^:^:^^^^
^^^^^^^^::::::::::::::::!GPPPP5P57:::::..::::..:..~JJJJJYYYYJJJYYJJJYJYJY555PBB#######Y^^^^^^^^:^^^^
^^^^^^^^::::::::::::::^:?GGPPPPPJ^::::..:::..::..^JJ?JYJJYYJJJJYYJJYYYJYYYY5PGB#######B!^^^^^^^:^^^^
^^^^^^^^^^:::::::::::::^GPGGP5PY7::::.:^:..::..::?J?JJJJYJJJJJJYYJY5YJYJJY55PPBB#######5^^^^^^^:^^^^
^^^^^^^^^^^::::::::::^:JBPPG5P5Y^::::.~7..::.::.7J?JJJJJYPGGPYJ5YY55JJJJYYY55PGB#######B!^^^^^^^^^^^
^^^^^^^^^^^:::::::::::^GBPPG55Y?:::::....:::::.~J?JJJJJJG&&&&#YYJ55YJYYYJYY555GGB#######?^^^^^::::^^
^^^^^^^^^^^^^:::::::^:?BBGGGP5Y7::::...::::::.:?JJJYYYYB&#&&&&BYJPYJJJJJY5555PGBG#######Y^^^^^^:::^^
^^^^^^^^^^^^^:^:::^^^^PGGGPBP5Y!.:::..:::::::.!YYYY5YJGBBB####BYYPYJJJJYYYY5YPGBB######B7^^^^^::::::
^^^^^^^^^^^^^^^::^^^:7BGPPPBP5Y7::::.:::::::.:?YYJ5Y??JJJJJJJJJY5GYJJJJYYYJYY5G########B~^^^^^::::::
^^^^^^^^^^^^^^^::^^^~GBGGP5GPYYY^^::^:::::::::JYY5PJJ??JJJJ?JJJ55G5JJJJJJJJYY5PB#######G~^^^^^::::::
^^^^^^^^^^^^^^^^:^^:7BGGPP5GPJYJ:^::?^:::::::^YYYP5JJJ???JJJJJY55G5YJJJJJJJY55PB#######B~^^^^^::::^^
^^^^^^^^^^^^^^^^^^^^PGPPP55G5?57::...:::::::.~YYYGYJJJJJJJ??JJY55G5YYJJJJJJYY5PG#######B!:^^^^::::::
^^^^^^^^^^^^^^^^^^:!GP5YY55GYJ5~::..:::::::::~JJYPYYYJJJJJJJJJYY5PYJJJJJJJJYY5PG########?^^^^^::::::
^^^^^^^^^^^^^^^^^^:YGP5YYYYGY?5^:::.::::::::.~J?PYJYYJJJJJJJYYY55GPYJJJJYYYYYY5GB#######Y^^^^^::::::
^^^^^^^^^^^^^^^^^:~GP5YYYY5BYJ5^^...:::::::..~JJGJJYYYYJJJJJYJY55G555YJJYYYYYY5GB#######J^^^^:::::::
^^^^^^^^^^^^^^^^^:?BP55YYYPBPYY::^!::::::::..~YP5JJJYYYJJJJJYYYY5GGYYJJJJJJ555PGB#######Y^^^^:::::::
^^^^^^^^^^^^^^^^^^GGP5YYY5GBG5J::^!::::::::..~5GJJJJJYYJJJJYYY5Y5PPP5YJJJJY55PPGB#######J^^^^^::::::
^^^^^^^^^^^^^^^^:?BP5YYY5PGBP57::.:::::::::::^GGYJJJJJYYYJJYY5555PGY5YYYYY555PPGB######B!:^^^^::^^^:
^^^^^^^^^^^^^^^^^PGP5YYY5PGBPP!^::::::::::::::5GPYJYJJJYYJJJY5555GGPPYJYYYY5PPGB#######P^:^^^^^^^^^^
^^^^^^^^^^^^^^^:7BG55YY5PGBGPG~::::::::::::::.7PPGYYYJJJJYJYYY55PBG555JJJYY5PGBB######B?^^^^^^^^^^^^
^^^^^^^^^^^^^^^:YGP5YY5GGBBGPB!:.::^^::::::::::Y5PGP5YJJJYJY555PGBG55YJJJY5PPPB#######Y^^^^^^^^^^^^^
^^^^^^^^^^^^^^^!BG55YY5PB&BBG#!^^7^^^^^^:::::::~5Y5GGPYJJYYYY5PPGGP55JJJYYPPPG#######P~^^^^^^^^^^^^^
~^^^^^^^^^^^^^:Y#G5YY5PG#&BGG&7^:~:^^^^^^:^:::::7YY5PBG5YYYYY55PGPPYYJJYY5P5PB######B7^^^^^^^^^^^^^^
~^^^^^^^^^^^^^^GGP5Y55PG#&BGG@5^...::::::::::^^^^7YYY5GGP5JYYYPGP5Y5YJJYY5PPB&######5^^^^^^^^^^^^^^^
~~^^^^^^^^^^^^!BGPYY55G###BG#@&5^:::::::::::::::::7YY555GPJJY5PP5YY5YJJJY5PG#######B7^^^^^^^^^^^^^^^
~~~^^^^^^^^^^^!J77777JB&##GG&@&&BPYJ7!~^^:......::^!P5JY5PYJY5P55YYYYJYY5PPB&######B!^^^^^^^^^^^^^^^
~~~^^^^^^^^^^~?7~~^^^7B##BGB@&&&&&@&&##BG5YYJJY5PG##&#GYYPGY5PGYYYYJJYYY5PG&&#######P~^^^^^^^^^^^^^^
~~~~~^^^^^^^^7!~~?7~~P&#5PG#@&&&&&&&&@&&&@@@@&@@&&&&&&#GP5PGGGPG5YYYYYYYYPB&BB#######5~^^^^^^^^^^^^^
~~~~~~^^^^^^^~!~Y5?!!G##BGG&@&&&&&&#&&&&&&&&&&&&&&&&&&&&&#GP555Y5YJJYY5PGB&BGB######BBY^^^^^^^^^^^^^
~~~~~~~~^^^^^~!^PY7~~P&#BGB@&&&&&&&&#############&&&&&&&&&&GYJ5YJYYY55PGG#B5PGBBGPG##BB?^^^^^^^^^^^^
~~~~~~~~~^^^^^!!5Y?!!7G##G#@&&&&&&&&&############&&&&&#&&&B5JJJY5YYY55PP#&GPPPGB5^!J5GBG?^^^^^^^^^^^
~~~~~~~~~~~~^^~!?Y?J~^~5#G&&&&&&&&&&&&###########&&&&&&&&#GYJJJJYYY55PG#####BGGGBY^^~!?55!^^^^^^^^^^
~~~~~~~~~~~~~~^^~7~~^^^YB#&&&&&&&&&&&&&##############&&&&B5YYYYYYYPPPG#######57JPG7^^^^^~~^^^^^^^^^^
~~~~~~~~~~~~~~~~^^~^~^~B#&##&&&&&&&&&&&&&############&&&&#PYYYYY5PPPG#######G!^^~~^^^^^^^^^^^^^^^^^^
~~~~~~~~~~~~~~~~~~~~~^?&#####&&&&&&&&&&&&&&&#########&&&&&&G5YY55PGB#####GPPJ~^^^^^^^^^^^^^^^^^^^^^^
~~~~~~~~~~~~~~~~~~~~~^J&#######&&&&&&&&&&&&&&&&########&&&&&#GP5PPB######J~~^^^^^^^^^^^^^^^^^^^^^^^^
~~~~~~~~~~~~~~~~~~~~~^J&########&&&&&&&&&&&&&&&&&&######&&&&&&&GB#######G!^^^^^^^^~~~~~~~~~^^^^^^^^^
~~~~~~~~~~~~~~~~~~~~~~Y##########&&&&&&&&&&&&&&&&&&&&#&&&&&&&&&&&&###BBB5~^^^~~~~~~~~~~~~~~~~~~~~~~~

Web developer, designer & SEO: Josh Withers
Josh's site: https://joshwithers.au
SEO & growth: https://unpopular.au
Static site design studio: https://theinternet.com.au
Celebrant work (yes, also a celebrant): https://marriedbyjosh.com
From: Tasmania, Australia

/* ABOUT JAKE & JOSH */

Jake Smith and Josh Withers are friends and colleagues — Josh used to be Brisbane-based,
both wedding celebrants, both spending more weekends than they can count
standing in front of couples saying "I now pronounce you ...".

/* THANKS */

To every couple who has trusted Jake to be part of their wedding day —
${testimonials.length} reviews and counting. You can read them all at
https://marriedbyjake.com/weddingtestimonials.

/* SITE */

Last update: ${lastUpdated}
Language: English (en-AU)
Standards: HTML5, CSS3, JSON-LD, RSS, llms.txt
Components: Astro 6, Tailwind CSS v4
Software: Astro, Vercel
Counts: ${services.length} services, ${posts.length} blog posts, ${testimonials.length} testimonials
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
