/**
 * Prezidox Academy — Blog seed
 * Inserts a set of curated, genuinely useful study/exam-prep articles.
 * Idempotent: skips any post whose slug already exists, so it's safe to re-run
 * and safe to trigger from the admin panel.
 *
 * Run:  node prisma/seedBlog.js
 * Or trigger via the admin API: POST /api/admin/blog/seed-samples (superadmin)
 */

const prisma = require('../src/utils/prisma');

// Reliable, distinct featured image per post (seeded so it's stable).
const cover = (slug) => `https://picsum.photos/seed/prezidox-${slug}/800/450`;

const P = (title, slug, category, excerpt, content) => ({
  title, slug, category, excerpt, coverImage: cover(slug),
  content: content.trim(),
});

const POSTS = [
  P('The Complete UNILAG Post-UTME Preparation Guide for 2026', 'unilag-post-utme-guide-2026', 'post-utme',
    'A step-by-step plan for the UNILAG Post-UTME: format, subject combination, and a realistic study schedule.',
    `<p>The UNILAG Post-UTME screening is a Computer-Based Test that, combined with your JAMB score, decides your admission aggregate. Preparing well is what separates candidates who get in from those who narrowly miss out.</p>
     <h2>Understand the format first</h2>
     <p>Most candidates sit a timed CBT covering Use of English, Mathematics, General Knowledge, and subjects tied to their course. Practising under real timing is the single most useful thing you can do — it trains pacing, not just knowledge.</p>
     <h2>A four-week plan that works</h2>
     <ul>
       <li><strong>Week 1:</strong> Diagnose. Sit one full mock and note your weakest subjects.</li>
       <li><strong>Week 2–3:</strong> Attack weak areas with topic drills, then re-test.</li>
       <li><strong>Week 4:</strong> Full timed mocks every other day; review every wrong answer.</li>
     </ul>
     <p>Always confirm the current cut-off marks and requirements on the official UNILAG website, as they can change each year.</p>`),

  P('OAU Post-UTME 2026: What to Expect and How to Prepare', 'oau-post-utme-what-to-expect-2026', 'post-utme',
    'The OAU screening rewards speed and accuracy. Here is how to train for both.',
    `<p>Obafemi Awolowo University runs a competitive Post-UTME screening. Strong candidates combine solid subject knowledge with the ability to answer quickly and calmly under pressure.</p>
     <h2>Build accuracy, then speed</h2>
     <p>Do not chase speed before your accuracy is high. Master the content first, then add a timer. Speed without accuracy just multiplies mistakes.</p>
     <h2>Practise the exact subjects you'll face</h2>
     <p>Use of English, Mathematics and General Knowledge are compulsory; add the subjects for your intended course. Practising the real mix mirrors exam day and removes surprises.</p>
     <p>Check OAU's official portal for the latest screening dates and requirements.</p>`),

  P('How Post-UTME Aggregate Scores Are Calculated', 'how-post-utme-aggregate-is-calculated', 'post-utme',
    'JAMB plus Post-UTME determines your aggregate. Understand the maths so you know your target.',
    `<p>Nigerian universities combine your JAMB UTME score with your Post-UTME (and sometimes O'level) into a single aggregate that decides admission.</p>
     <h2>The general idea</h2>
     <p>A common approach scales your JAMB score (out of 400) and your Post-UTME score to a shared total, often weighting each around 50%. The exact formula varies by school and year.</p>
     <h2>Why this matters for strategy</h2>
     <p>A strong Post-UTME can rescue a moderate JAMB score, and a weak Post-UTME can undo a great one. Never treat the screening as a formality. Confirm your school's exact weighting on their official site.</p>`),

  P('7 Common Mistakes Candidates Make in CBT Exams', '7-common-mistakes-in-cbt-exams', 'tips',
    'Small, avoidable errors cost real marks. Here are seven to eliminate before exam day.',
    `<p>Most lost marks in CBT exams come from avoidable habits, not lack of knowledge. Fix these and your score improves without learning anything new.</p>
     <ol>
       <li>Not reading the full question before choosing an answer.</li>
       <li>Spending too long on one hard question instead of moving on.</li>
       <li>Ignoring the timer until it's almost over.</li>
       <li>Second-guessing correct answers into wrong ones.</li>
       <li>Never practising on a computer beforehand.</li>
       <li>Leaving questions blank when there's no penalty for guessing.</li>
       <li>Skipping the review of flagged questions at the end.</li>
     </ol>
     <p>Practising full mocks trains you out of every one of these.</p>`),

  P('Active Recall and Spaced Repetition for JAMB', 'active-recall-spaced-repetition-jamb', 'tips',
    'Two evidence-based study methods that beat re-reading for exam retention.',
    `<p>Reading your notes over and over feels productive but fades fast. Two techniques consistently outperform it: active recall and spaced repetition.</p>
     <h2>Active recall</h2>
     <p>Close the book and try to retrieve the answer from memory before checking. Every practice question you attempt is active recall in action — which is why timed drills work so well.</p>
     <h2>Spaced repetition</h2>
     <p>Review material at growing intervals (a day, then three days, then a week). This fights the forgetting curve and locks knowledge in for exam day.</p>
     <p>Combine both: test yourself on weak topics, then revisit them on a schedule.</p>`),

  P('How to Manage Your Time During a CBT Exam', 'time-management-in-cbt-exams', 'tips',
    'A simple pacing system so you answer every question without rushing.',
    `<p>Running out of time is one of the most common reasons candidates underperform. A simple pacing plan fixes it.</p>
     <h2>Divide and conquer</h2>
     <p>Divide total time by number of questions to get your per-question budget. If a question exceeds double that budget, flag it and move on.</p>
     <h2>Three passes</h2>
     <ul>
       <li><strong>Pass 1:</strong> Answer everything you know quickly.</li>
       <li><strong>Pass 2:</strong> Return to flagged questions with the time you saved.</li>
       <li><strong>Pass 3:</strong> Review and make sure nothing is left blank.</li>
     </ul>`),

  P('How to Score Above 300 in JAMB', 'how-to-score-above-300-in-jamb', 'jamb',
    'High JAMB scores are built on past questions, timing, and consistency, not last-minute cramming.',
    `<p>Scoring above 300 in JAMB is achievable with a focused routine. It rewards steady practice far more than intensity in the final week.</p>
     <h2>Master past questions</h2>
     <p>JAMB reuses patterns. Working through several years of past questions per subject teaches you how examiners think and what topics carry weight.</p>
     <h2>Practise on the clock</h2>
     <p>JAMB is time-pressured. Train with a timer so exam-day pacing feels normal, not stressful.</p>
     <h2>Be consistent</h2>
     <p>An hour a day for weeks beats a marathon the night before. Consistency builds durable memory.</p>`),

  P('JAMB Use of English: How to Gain Easy Marks', 'jamb-use-of-english-easy-marks', 'jamb',
    'Comprehension, lexis, and structure carry heavy weight. Here is where the quick marks are.',
    `<p>Use of English is compulsory and high-yield. A few focused habits raise your score reliably.</p>
     <h2>Comprehension</h2>
     <p>Read the questions first, then scan the passage for answers. Practise identifying the main idea quickly.</p>
     <h2>Lexis and structure</h2>
     <p>Learn common synonyms, antonyms, and word roots. Many questions test vocabulary in context — build it steadily.</p>
     <h2>Oral English</h2>
     <p>Practise word stress and vowel/consonant sounds; these questions are pure recall once you've drilled them.</p>`),

  P('Mathematics for Post-UTME: High-Yield Topics', 'mathematics-post-utme-high-yield-topics', 'post-utme',
    'Focus your revision on the topics that appear most often in Post-UTME maths.',
    `<p>You cannot revise everything, so revise smart. These topics repeatedly show up in Post-UTME mathematics.</p>
     <ul>
       <li>Algebra: quadratic and simultaneous equations, progressions.</li>
       <li>Statistics and probability.</li>
       <li>Trigonometry: SOHCAHTOA and identities.</li>
       <li>Indices, logarithms and surds.</li>
       <li>Sets, and basic calculus for science candidates.</li>
     </ul>
     <p>Drill each with timed questions until the method is automatic. Speed on maths frees time for harder sections.</p>`),

  P('Building a Study Timetable You Will Actually Follow', 'study-timetable-you-will-follow', 'tips',
    'A realistic, flexible timetable beats an ambitious one you abandon in three days.',
    `<p>The best timetable is the one you keep. Ambitious plans collapse; realistic ones compound.</p>
     <h2>Start from your real life</h2>
     <p>Block out school, chores and rest first, then slot study into what remains. Aim for focused sessions, not marathon days.</p>
     <h2>Rotate subjects</h2>
     <p>Mixing subjects across a week (interleaving) improves retention more than studying one subject for days.</p>
     <h2>Review weekly</h2>
     <p>Every Sunday, check what worked and adjust. A timetable is a living tool, not a contract.</p>`),

  P('How to Find and Fix Your Weak Subjects', 'find-and-fix-weak-subjects', 'tips',
    'Data from practice tests tells you exactly where to spend your revision time.',
    `<p>Guessing where you're weak wastes time. Let your practice data decide.</p>
     <h2>Track your results</h2>
     <p>After each mock, note your score per subject and per topic. Patterns appear fast: the topics you consistently miss are your priority list.</p>
     <h2>Fix, then re-test</h2>
     <p>Study a weak topic, then immediately do more questions on it. Re-testing confirms the fix and moves the topic off your list. Prezidox's performance analytics do this tracking for you automatically.</p>`),

  P('Exam-Day Checklist: What to Do the Night Before and Morning Of', 'exam-day-checklist', 'tips',
    'Reduce avoidable stress with a simple checklist for the hours around your exam.',
    `<p>Exam performance isn't only about study — logistics and calm matter too.</p>
     <h2>The night before</h2>
     <ul>
       <li>Pack your slip, ID and required materials.</li>
       <li>Confirm your centre location and travel time.</li>
       <li>Sleep — cramming past midnight costs more than it gains.</li>
     </ul>
     <h2>The morning of</h2>
     <ul>
       <li>Eat something light.</li>
       <li>Arrive early to settle your nerves.</li>
       <li>Breathe slowly before you start; a calm mind reads questions correctly.</li>
     </ul>`),

  P('How to Handle Exam Anxiety', 'how-to-handle-exam-anxiety', 'tips',
    'Practical techniques to keep nerves from stealing marks you have earned.',
    `<p>Some nerves are normal and even helpful. The goal is to keep them from tipping into panic.</p>
     <h2>Prepare to feel confident</h2>
     <p>The strongest anti-anxiety tool is preparation. Full mock exams make the real thing feel familiar.</p>
     <h2>In the moment</h2>
     <p>If you freeze, breathe slowly for four counts in and four out, then answer the easiest question you can find to rebuild momentum. Skip and return to anything that stalls you.</p>`),

  P('WAEC and NECO: How to Prepare Alongside Post-UTME', 'waec-neco-alongside-post-utme', 'waec',
    'Balancing school exams and university screening without burning out.',
    `<p>Many candidates juggle WAEC/NECO with Post-UTME preparation. With overlap and planning, it's manageable.</p>
     <h2>Use the overlap</h2>
     <p>Core subjects like English and Mathematics serve both exams. Studying them well covers double the ground.</p>
     <h2>Protect your energy</h2>
     <p>Alternate heavy and light study days, and keep short breaks. Sustainable effort over weeks beats burnout.</p>`),

  P('Understanding University Cut-Off Marks', 'understanding-university-cut-off-marks', 'news',
    'What cut-off marks mean, how they vary by course, and how to use them to set targets.',
    `<p>Cut-off marks are the minimum aggregate a school considers for admission, and they vary widely by course.</p>
     <h2>Course competition matters</h2>
     <p>Highly competitive courses (Medicine, Law, Engineering) typically demand higher aggregates than less competitive ones. Aim comfortably above the stated minimum for a safety margin.</p>
     <h2>Set a personal target</h2>
     <p>Use last year's figures as a guide, then aim higher. Always confirm the current cut-offs on the official school website before relying on them.</p>`),

  P('How to Win Nigerian Undergraduate Scholarships', 'nigerian-undergraduate-scholarships', 'news',
    'Where to look, what they want, and how to make your application stand out.',
    `<p>Scholarships ease the cost of university and reward strong students. Competition is real, but preparation pays off.</p>
     <h2>Where to look</h2>
     <p>Check federal and state schemes, company and foundation scholarships, and your school's bursary office. Apply to several — volume improves your odds.</p>
     <h2>What they reward</h2>
     <p>Strong grades, a clear personal story, and neat, on-time applications. Keep your academic records and documents organised so you can apply quickly when windows open.</p>`),

  P('Choosing the Right Course and University', 'choosing-the-right-course-and-university', 'news',
    'A practical framework for a decision that shapes the next several years.',
    `<p>Choosing a course and school is a major decision. A simple framework prevents regret.</p>
     <h2>Balance interest and reality</h2>
     <p>Pick something you can sustain interest in, but weigh admission competitiveness and your likely aggregate. A slightly less competitive course you love can beat a prestige course you can't get into.</p>
     <h2>Research the school</h2>
     <p>Look at course content, facilities, and past cut-offs. Talk to current students where you can. Confirm requirements on official portals.</p>`),

  P('Past Questions: How to Use Them the Right Way', 'how-to-use-past-questions', 'tips',
    'Past questions are gold — but only if you use them actively, not passively.',
    `<p>Past questions reveal patterns, but reading them like notes wastes their power.</p>
     <h2>Attempt before you check</h2>
     <p>Always try to answer before looking at the solution. The struggle is where learning happens.</p>
     <h2>Review every miss</h2>
     <p>For each wrong answer, write down why you missed it and the correct method. Patterns in your mistakes point straight at your weak topics.</p>`),

  P('Study Techniques That Actually Work', 'study-techniques-that-actually-work', 'tips',
    'Cut through study myths with methods backed by how memory really works.',
    `<p>Not all study methods are equal. These are the ones research consistently supports.</p>
     <ul>
       <li><strong>Practice testing:</strong> the single most effective technique for exams.</li>
       <li><strong>Spaced practice:</strong> spread study over time, not in one block.</li>
       <li><strong>Interleaving:</strong> mix related topics rather than blocking one at a time.</li>
       <li><strong>Elaboration:</strong> explain ideas in your own words.</li>
     </ul>
     <p>Highlighting and re-reading feel good but do little. Trade them for the methods above.</p>`),

  P('From JAMB to Admission: The Full Journey', 'from-jamb-to-admission-journey', 'news',
    'A clear map of the steps from registering for JAMB to accepting your admission.',
    `<p>The road to university has several stages. Knowing them keeps you from missing deadlines.</p>
     <ol>
       <li>Register for JAMB and choose your institutions and course.</li>
       <li>Sit the UTME and check your score.</li>
       <li>Register and sit each school's Post-UTME screening.</li>
       <li>Watch for admission lists and accept your offer promptly.</li>
       <li>Complete acceptance, registration and clearance.</li>
     </ol>
     <p>Follow official channels for every deadline; missing one can cost you a place.</p>`),
];

async function seedBlog() {
  let created = 0, skipped = 0;
  for (const post of POSTS) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: post.slug } });
    if (existing) { skipped++; continue; }
    await prisma.blogPost.create({
      data: { ...post, published: true, publishedAt: new Date() },
    });
    created++;
  }
  return { created, skipped, total: POSTS.length };
}

module.exports = { seedBlog, POSTS };

// Allow running directly: node prisma/seedBlog.js
if (require.main === module) {
  seedBlog()
    .then((r) => { console.log('[seedBlog]', r); return prisma.$disconnect(); })
    .then(() => process.exit(0))
    .catch((e) => { console.error('[seedBlog] error', e); process.exit(1); });
}
