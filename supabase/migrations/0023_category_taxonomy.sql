-- 0023 Category taxonomy
--
-- Replaces the original six-shelf list with a full bookstore taxonomy in the
-- shape readers expect from KDP or Kobo: six top-level sections, and many
-- shelves inside each one. Sections exist so the storefront can group ~60
-- shelves without turning the homepage into a wall of tiles.
--
-- Section slugs are mirrored in lib/data/categories.ts (CATEGORY_SECTIONS).
-- Adding a section there means adding one here too — the check constraint
-- below is deliberately strict so a typo cannot create a hidden seventh
-- section that no page knows how to render.

alter table public.categories
  add column if not exists section text not null default 'non-fiction';

alter table public.categories
  drop constraint if exists categories_section_check;

alter table public.categories
  add constraint categories_section_check check (
    section in (
      'fiction',
      'non-fiction',
      'business-money',
      'poetry-drama',
      'children-young-adult',
      'textbooks-academic'
    )
  );

create index if not exists categories_section_order_idx
  on public.categories (section, sort_order);

-- sort_order is banded per section (100s fiction, 200s non-fiction, ...), so
-- ordering stays stable when a shelf is added later.
insert into public.categories (slug, name, note, blurb, section, sort_order) values

  -- ---------------------------------------------------------------- Fiction
  ('literary-fiction','Literary Fiction','Novels & stories','Character-led novels and story collections built to be re-read.','fiction',110),
  ('general-fiction','General Fiction','Novels','Contemporaries, family sagas and books that simply tell a good story.','fiction',120),
  ('mystery-thriller','Mystery, Thriller & Suspense','Page-turners','Detectives, disappearances and plots that keep the light on.','fiction',130),
  ('crime-detective','Crime & Detective','Cases & cops','Police procedurals, cosy mysteries and courtroom puzzles.','fiction',140),
  ('romance','Romance','Love stories','Slow burns, second chances and love with something at stake.','fiction',150),
  ('science-fiction','Science Fiction','Futures & tech','Speculative futures, first contact and the machinery of tomorrow.','fiction',160),
  ('fantasy','Fantasy','Worlds & magic','Invented worlds, old magic and quests worth the journey.','fiction',170),
  ('horror','Horror','Dread & dark','Ghost stories, folk horror and things that should not be.','fiction',180),
  ('historical-fiction','Historical Fiction','The past','Novels set in real places and times, researched and imagined.','fiction',190),
  ('action-adventure','Action & Adventure','Chase & journey','Pursuits, expeditions and plots that will not sit still.','fiction',195),
  ('humour-satire','Humour & Satire','Comic fiction','Comic novels, satire and stories that laugh at power.','fiction',196),
  ('short-stories','Short Stories & Anthologies','Collections','Collected stories and anthologies from one author or many.','fiction',197),
  ('african-fiction','African & Diaspora Fiction','Continental voices','Novels from Africa and its diaspora, in their own registers.','fiction',198),
  ('comics-graphic-novels','Comics & Graphic Novels','Drawn stories','Graphic novels, comics and illustrated long-form stories.','fiction',199),

  -- ------------------------------------------------------------ Non-fiction
  ('essays-criticism','Essays & Criticism','Long-form','Long-form thinking on art, cities, faith and culture.','non-fiction',210),
  ('memoir','Memoir & Biography','Lives & accounts','First-person accounts and lives told with care.','non-fiction',220),
  ('history','History','The record','Nations, movements and ordinary lives, put in order.','non-fiction',230),
  ('politics-society','Politics & Society','Public life','Power, policy, citizenship and the arguments between them.','non-fiction',240),
  ('religion-spirituality','Religion & Spirituality','Faith & practice','Belief, devotion, scripture and the search for meaning.','non-fiction',250),
  ('philosophy','Philosophy','Ideas','Arguments about how to live, how to know and how to decide.','non-fiction',260),
  ('psychology','Psychology & the Mind','Behaviour','How minds work, break, adapt and mend.','non-fiction',270),
  ('self-help','Self-Help & Personal Growth','Habits & change','Practical books on habits, attention and starting again.','non-fiction',280),
  ('health-fitness','Health, Fitness & Diet','Body & wellbeing','Movement, food, sleep and looking after the body.','non-fiction',290),
  ('cooking-food','Cooking, Food & Drink','Kitchen','Recipes, technique and food culture from home kitchens.','non-fiction',300),
  ('travel','Travel & Places','Going elsewhere','Journeys, city guides and writing about elsewhere.','non-fiction',310),
  ('parenting-family','Parenting & Family','Raising people','Pregnancy, early years, teenagers and family life.','non-fiction',320),
  ('art-photography','Art & Photography','Visual','Art history, criticism, practice and photobooks.','non-fiction',330),
  ('music-film','Music, Film & Performing Arts','Stage & screen','Music, film, theatre and the people who make them.','non-fiction',340),
  ('true-crime','True Crime','Real cases','Reported cases, investigations and their aftermath.','non-fiction',350),
  ('education-teaching','Education & Teaching','Schools','Teaching practice, policy and learning in the classroom.','non-fiction',360),
  ('language-reference','Language & Reference','Words & dictionaries','Language learning, grammar, dictionaries and reference.','non-fiction',370),
  ('sports-outdoors','Sports & Outdoors','Play & wilderness','Sport, training, walking, climbing and the outdoors.','non-fiction',380),
  ('environment-climate','Environment & Climate','Planet','Climate, conservation and how we live on the earth.','non-fiction',390),
  ('science-nature','Science & Nature','Curiosity','Physics, biology, the natural world and how it is studied.','non-fiction',391),
  ('technology-society','Technology & Society','Digital life','Platforms, data and what technology does to the people using it.','non-fiction',392),
  ('letters-diaries','Letters, Diaries & Journals','Private writing','Correspondence, journals and writing kept for the drawer.','non-fiction',393),

  -- -------------------------------------------------------- Business & Money
  ('business-leadership','Business & Leadership','Practice & craft','Practical books on building organisations with integrity.','business-money',410),
  ('entrepreneurship','Entrepreneurship & Startups','Founding','Starting, funding and running something of your own.','business-money',420),
  ('personal-finance','Personal Finance & Investing','Money','Saving, investing, debt and the long view.','business-money',430),
  ('marketing-sales','Marketing & Sales','Customers','Brand, storytelling, selling and reaching the right people.','business-money',440),
  ('careers-work','Careers & Work','Working life','Job hunting, negotiation, freelancing and building a career.','business-money',450),
  ('economics','Economics','The economy','Markets, trade, money and the systems built around them.','business-money',460),
  ('digital-business','Digital Business & Creators','Online work','Selling online, publishing, creators and independent income.','business-money',470),

  -- --------------------------------------------------------- Poetry & Drama
  ('poetry','Poetry','Collections','Collections with a distinct ear. Short, exact, unhurried.','poetry-drama',510),
  ('drama-plays','Drama & Plays','For the stage','Plays and screenplays written to be performed.','poetry-drama',520),
  ('poetry-anthologies','Poetry Anthologies','Gathered voices','Anthologies and edited collections from more than one poet.','poetry-drama',530),

  -- -------------------------------------------------- Children & Young Adult
  ('children-young-readers','Children & Young Readers','Illustrated','Illustrated stories and early readers, typographically considered.','children-young-adult',610),
  ('picture-books','Picture Books','Read aloud','Illustrated stories to be read aloud, again and again.','children-young-adult',620),
  ('early-readers','Early Readers','First books','Short, confident books for children learning to read.','children-young-adult',630),
  ('middle-grade','Middle Grade','Ages 8–12','Adventure and school stories for readers aged eight to twelve.','children-young-adult',640),
  ('young-adult','Young Adult','Teen','Teenage voices, first decisions and stories that take them seriously.','children-young-adult',650),

  -- ---------------------------------------------------- Textbooks & Academic
  ('textbooks','Textbooks & Study Guides','Course texts','Course-aligned texts for secondary and university study.','textbooks-academic',710),
  ('academic-research','Academic & Research','Scholarship','Monographs, edited collections and research writing.','textbooks-academic',720),
  ('exams-test-prep','Exams & Test Prep','Revision','Practice, revision and study guides for major exams.','textbooks-academic',730),
  ('law','Law','Statutes & cases','Legal texts, commentary and casebooks.','textbooks-academic',740),
  ('medicine-health-sciences','Medicine & Health Sciences','Clinical','Clinical texts, nursing and public health.','textbooks-academic',750),
  ('engineering','Engineering & Technology','Applied','Engineering practice, design and applied technology.','textbooks-academic',760),
  ('computing-it','Computing & IT','Code & systems','Programming, data, systems and software practice.','textbooks-academic',770),
  ('mathematics','Mathematics & Statistics','Numbers','Mathematics, statistics and quantitative methods.','textbooks-academic',780)

on conflict (slug) do update
  set section    = excluded.section,
      sort_order = excluded.sort_order;
