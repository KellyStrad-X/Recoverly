#!/usr/bin/env node
/**
 * Analyze exercise matching quality
 * Shows top 5 matches for common PT exercises
 */

const Fuse = require('fuse.js');
const exerciseDatabase = require('./exercisedb-complete-index.json');

// Initialize Fuse.js with current settings
const fuse = new Fuse(exerciseDatabase, {
  keys: ['name'],
  threshold: 0.4,
  includeScore: true,
});

// Common PT exercise names
const testExercises = [
  'Hip Bridges',
  'Calf Raises',
  'Squats',
  'Lunges',
  'Plank',
  'Hamstring Curls',
  'Leg Raises',
  'Wall Sits',
  'Step-Ups',
  'Clamshells',
];

console.log('🔍 EXERCISE MATCHING ANALYSIS\n');
console.log('Current settings:');
console.log('- Fuzzy threshold: 0.4 (0=exact, 1=anything)');
console.log('- Matching on: name only\n');
console.log('='.repeat(80));

testExercises.forEach((exerciseName) => {
  console.log(`\n📝 "${exerciseName}"`);
  console.log('-'.repeat(80));

  const results = fuse.search(exerciseName);

  if (results.length === 0) {
    console.log('❌ No matches found');
    return;
  }

  // Show top 5 matches
  const topMatches = results.slice(0, 5);
  topMatches.forEach((match, index) => {
    const icon = index === 0 ? '⭐' : '  ';
    const score = match.score.toFixed(3);
    const { name, bodyPart, target, equipment } = match.item;

    console.log(`${icon} [${score}] ${name}`);
    console.log(`     └─ Body: ${bodyPart} | Target: ${target} | Equipment: ${equipment}`);
  });
});

console.log('\n' + '='.repeat(80));
console.log('\n💡 OBSERVATIONS:');
console.log('- Lower score = better match (0.000 = perfect)');
console.log('- ⭐ = Currently selected match');
console.log('- Check if the selected match makes sense for PT exercises\n');
