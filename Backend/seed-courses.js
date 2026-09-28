require('./config');
const { openDatabase } = require('./database');
const { setupCourses } = require('./courses');
const courses = [
    ...require('./starter-tech-courses'),
    { id: 'brush-lettering-first-strokes', title: 'Brush Calligraphy: Your First Strokes', category: 'Calligraphy', difficulty: 'easy', description: 'A short introductory practice course: explore brush pressure and build a basic-stroke practice sheet. Start here before moving on to letterforms.', materials: 'A flexible brush pen and smooth paper. Teaching is free; bring or purchase your own supplies. No prior experience required.', outcome: 'Make a practice sheet with contrasting thin upstrokes and thick downstrokes, then compare the consistency of your marks.', status: 'published', lessons: [
        { id: 'brush-watch', module: 'Getting started', title: 'Meet the basic brush strokes', videoId: 'ENj1xxj9STs', creator: 'Destination Decoration', minutes: 20, practice: 'Watch the linked introduction. On scrap paper, try gentle upward marks and firmer downward marks. Keep your grip relaxed; pause if your hand feels strained.' },
        { id: 'brush-practice', module: 'Practice', title: 'Build a stroke practice sheet', videoId: '', creator: '', minutes: 20, practice: 'Draw three rows of light upstrokes and three rows of thicker downstrokes. Leave space between marks. Circle three marks you find most consistent and repeat them on a fresh row. Revisit the previous video if you need a demonstration.' },
        { id: 'brush-project', module: 'Mini project', title: 'Create your first pattern card', videoId: '', creator: '', minutes: 20, practice: 'Fold paper into a card. Decorate its border with a repeating pattern of thin and thick strokes. Compare the beginning and end of your pattern. Note one improvement and one thing to practise next. This introduction covers strokes; lettering words is a later step.' },
    ] },
    { id: 'piano-first-five-notes', title: 'Piano: Your First Five Notes', category: 'Piano', difficulty: 'easy', description: 'A short written practice guide to locating C and playing a five-note pattern. This starter guide has no video lessons yet.', materials: 'Access to a piano or keyboard and a comfortable seat. Lessons are free; an instrument is not included. No music-reading experience required.', outcome: 'Locate C on the keyboard and play C–D–E–F–G slowly with your right hand.', status: 'published', lessons: [
        { id: 'piano-find', module: 'Keyboard basics', title: 'Find C on your keyboard', videoId: '', creator: '', minutes: 10, practice: 'Look for repeating groups of two and three black keys. The white key immediately to the left of a group of two black keys is C. Find several Cs. Choose one near the middle of your keyboard for the next exercise.' },
        { id: 'piano-five', module: 'First pattern', title: 'Play five neighbouring notes', videoId: '', creator: '', minutes: 15, practice: 'Place your right thumb on C, index finger on D, middle finger on E, ring finger on F, and little finger on G. With a relaxed hand, play one note at a time: C, D, E, F, G. Go slowly, release each note, and stop if you feel discomfort.' },
        { id: 'piano-return', module: 'Mini project', title: 'Play up and back down', videoId: '', creator: '', minutes: 15, practice: 'Play C–D–E–F–G–F–E–D–C. Aim for evenly spaced notes rather than speed. Repeat three times with a short break between attempts. Record an attempt for your own comparison if you wish. This is a first coordination exercise, not a complete piano curriculum.' },
    ] },
];
async function seed() {
    const db = openDatabase();
    try {
        await db.ready; await setupCourses(db);
        for (const c of courses) await db.run('INSERT OR IGNORE INTO courses (id,title,category,difficulty,description,materials,outcome,status,lessons,prerequisites) VALUES (?,?,?,?,?,?,?,?,?,?)', [c.id,c.title,c.category,c.difficulty,c.description,c.materials,c.outcome,c.status,JSON.stringify(c.lessons),JSON.stringify(c.prerequisites || [])]);
        console.log('Starter courses ready. Existing courses were not overwritten.');
    } finally { await db.close(); }
}
if (require.main === module) seed().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { courses };
