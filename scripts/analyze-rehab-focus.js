/**
 * Analyze exercises to identify true rehab/prehab movements
 * vs fitness/hypertrophy exercises
 */

const fs = require('fs');
const path = require('path');

const exercisesPath = path.join(__dirname, '../functions/src/rehab-exercises.json');
const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

// Keywords that indicate FITNESS/HYPERTROPHY (not rehab)
const FITNESS_KEYWORDS = [
  'muscle-up', 'pull-up', 'pull up', 'chin-up', 'chin up',
  'lever', 'l-sit', 'handstand', 'archer', 'clapping',
  'one-arm', 'one arm', 'pistol', 'explosive', 'plyometric',
  'burpee', 'jump', 'jumping', 'flutter kick', 'high knees',
  'bicycle', 'air bike', 'groin crunch', 'cocoons',
  'clock push', 'spider crawl', '360°', 'gironda',
  'bodyweight squat', 'decline', 'incline close-grip'
];

// Keywords that indicate TRUE REHAB/PREHAB
const REHAB_KEYWORDS = [
  'stretch', 'pelvic tilt', 'bird dog', 'dead bug',
  'bridge', 'cat', 'calf raise', 'ankle circle',
  'neck', 'scapula', 'rotator', 'glute activation',
  'hip flexor', 'hamstring', 'quadriceps stretch',
  'external rotation', 'internal rotation', 'band y-raise',
  'band reverse fly', 'band wrist', 'side bend'
];

// Keywords for OVERLY COMPLEX names
const COMPLEX_INDICATORS = [
  '(bent knee)', '(straight arm)', '(male)', '(on bench)',
  '(with towel)', 'v. 2', 'v. 3', '- reverse',
  'straight twisting', 'straight leg bent hip'
];

function analyzeExercise(exercise) {
  const nameLower = exercise.name.toLowerCase();

  let category = 'UNCLEAR';
  let reasons = [];

  // Check for fitness keywords
  const fitnessMatches = FITNESS_KEYWORDS.filter(kw => nameLower.includes(kw));
  if (fitnessMatches.length > 0) {
    category = 'FITNESS/HYPERTROPHY';
    reasons.push(`Contains: ${fitnessMatches.join(', ')}`);
  }

  // Check for rehab keywords (overrides fitness if both present)
  const rehabMatches = REHAB_KEYWORDS.filter(kw => nameLower.includes(kw));
  if (rehabMatches.length > 0) {
    category = 'REHAB/PREHAB';
    reasons.push(`Contains: ${rehabMatches.join(', ')}`);
  }

  // Check complexity
  const complexMatches = COMPLEX_INDICATORS.filter(kw => nameLower.includes(kw));
  const isComplex = complexMatches.length > 0 || exercise.name.split(' ').length > 5;

  if (isComplex) {
    reasons.push(`Complex name: ${complexMatches.join(', ') || 'too many words'}`);
  }

  return {
    name: exercise.name,
    bodyPart: exercise.bodyPart,
    equipment: exercise.equipment,
    category,
    isComplex,
    reasons: reasons.join(' | ')
  };
}

// Analyze all exercises
const analyzed = exercisesData.exercises.map(analyzeExercise);

// Statistics
const stats = {
  total: analyzed.length,
  rehab: analyzed.filter(e => e.category === 'REHAB/PREHAB').length,
  fitness: analyzed.filter(e => e.category === 'FITNESS/HYPERTROPHY').length,
  unclear: analyzed.filter(e => e.category === 'UNCLEAR').length,
  complex: analyzed.filter(e => e.isComplex).length
};

console.log('📊 EXERCISE ANALYSIS RESULTS\n');
console.log('═══════════════════════════════════════════\n');
console.log(`Total Exercises: ${stats.total}`);
console.log(`Rehab/Prehab: ${stats.rehab} (${(stats.rehab/stats.total*100).toFixed(1)}%)`);
console.log(`Fitness/Hypertrophy: ${stats.fitness} (${(stats.fitness/stats.total*100).toFixed(1)}%)`);
console.log(`Unclear: ${stats.unclear} (${(stats.unclear/stats.total*100).toFixed(1)}%)`);
console.log(`Complex Names: ${stats.complex} (${(stats.complex/stats.total*100).toFixed(1)}%)\n`);

// Group by body part
const byBodyPart = analyzed.reduce((acc, ex) => {
  if (!acc[ex.bodyPart]) acc[ex.bodyPart] = [];
  acc[ex.bodyPart].push(ex);
  return acc;
}, {});

console.log('📋 BY BODY PART:\n');
Object.entries(byBodyPart).forEach(([bodyPart, exercises]) => {
  const rehab = exercises.filter(e => e.category === 'REHAB/PREHAB').length;
  const fitness = exercises.filter(e => e.category === 'FITNESS/HYPERTROPHY').length;
  const unclear = exercises.filter(e => e.category === 'UNCLEAR').length;

  console.log(`${bodyPart.toUpperCase()} (${exercises.length} total)`);
  console.log(`  Rehab: ${rehab} | Fitness: ${fitness} | Unclear: ${unclear}`);
});

console.log('\n\n🚨 FITNESS/HYPERTROPHY EXERCISES TO REMOVE:\n');
analyzed
  .filter(e => e.category === 'FITNESS/HYPERTROPHY')
  .forEach(e => {
    console.log(`❌ ${e.name} (${e.bodyPart}) - ${e.reasons}`);
  });

console.log('\n\n⚠️  COMPLEX NAMES TO SIMPLIFY:\n');
analyzed
  .filter(e => e.isComplex && e.category !== 'FITNESS/HYPERTROPHY')
  .slice(0, 30) // Show first 30
  .forEach(e => {
    console.log(`📝 ${e.name} (${e.bodyPart})`);
  });

console.log('\n\n✅ CORE REHAB EXERCISES (SAMPLE):\n');
analyzed
  .filter(e => e.category === 'REHAB/PREHAB')
  .slice(0, 30)
  .forEach(e => {
    console.log(`✓ ${e.name} (${e.bodyPart})`);
  });

// Save detailed CSV
const csvContent = [
  'Exercise Name,Body Part,Equipment,Category,Is Complex,Reasons',
  ...analyzed.map(e =>
    `"${e.name}","${e.bodyPart}","${e.equipment}","${e.category}","${e.isComplex}","${e.reasons}"`
  )
].join('\n');

const outputPath = path.join(__dirname, '../exercise-analysis.csv');
fs.writeFileSync(outputPath, csvContent);
console.log(`\n\n💾 Full analysis saved to: exercise-analysis.csv`);

// Recommendations
console.log('\n\n💡 RECOMMENDATIONS:\n');
console.log(`1. Remove ${stats.fitness} fitness/hypertrophy exercises`);
console.log(`2. Simplify ${stats.complex} complex exercise names`);
console.log(`3. Manually review ${stats.unclear} unclear exercises`);
console.log(`4. Target refined list: ~150-200 core rehab exercises`);
console.log(`\nThis will:`);
console.log(`  ✅ Focus on therapeutic movements only`);
console.log(`  ✅ Improve YouTube search results (PT-specific videos)`);
console.log(`  ✅ Align with Recoverly's recovery/rehab mission`);
console.log(`  ✅ Make AI assignment more specific and relevant`);
