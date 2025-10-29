#!/usr/bin/env node
/**
 * Create curated list of rehab/prehab exercises
 * Focus: bodyweight + bands, low-impact, safe for recovery
 */

const exerciseDatabase = require('./exercisedb-complete-index.json');
const fs = require('fs');

console.log('🏥 CREATING REHAB/PREHAB EXERCISE LIST\n');

// Filter for bodyweight and bands only
const equipmentFilter = ['body weight', 'band', 'resistance band'];
const filtered = exerciseDatabase.filter(ex =>
  equipmentFilter.includes(ex.equipment)
);

console.log(`Total exercises: ${exerciseDatabase.length}`);
console.log(`Bodyweight + Bands: ${filtered.length}\n`);

// Exclude high-impact/advanced exercises (not suitable for rehab)
const excludeKeywords = [
  'pull-up', 'chin-up', 'muscle up', 'handstand',
  'burpee', 'jump', 'explosive', 'plyometric',
  'advanced', 'kipping', 'pistol', 'one arm'
];

const rehabFriendly = filtered.filter(ex => {
  const name = ex.name.toLowerCase();
  return !excludeKeywords.some(keyword => name.includes(keyword));
});

console.log(`After excluding high-impact exercises: ${rehabFriendly.length}\n`);

// Group by body part for rehab context
const byBodyPart = {};
rehabFriendly.forEach(ex => {
  if (!byBodyPart[ex.bodyPart]) {
    byBodyPart[ex.bodyPart] = {};
  }
  if (!byBodyPart[ex.bodyPart][ex.target]) {
    byBodyPart[ex.bodyPart][ex.target] = [];
  }
  byBodyPart[ex.bodyPart][ex.target].push(ex);
});

console.log('📍 REHAB EXERCISES BY BODY PART & TARGET:');
console.log('='.repeat(80));

let totalCount = 0;
Object.entries(byBodyPart)
  .sort((a, b) => {
    const countA = Object.values(a[1]).flat().length;
    const countB = Object.values(b[1]).flat().length;
    return countB - countA;
  })
  .forEach(([bodyPart, targets]) => {
    const bodyPartTotal = Object.values(targets).flat().length;
    totalCount += bodyPartTotal;

    console.log(`\n${bodyPart.toUpperCase()} (${bodyPartTotal} exercises)`);
    console.log('-'.repeat(80));

    Object.entries(targets)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([target, exercises]) => {
        console.log(`\n  ${target} (${exercises.length})`);

        // Show all exercises (these are curated)
        exercises.forEach(ex => {
          const equipment = ex.equipment === 'body weight' ? 'bodyweight' : 'band';
          console.log(`    • ${ex.name} [${equipment}] [ID: ${ex.id}]`);
        });
      });
  });

// Create organized JSON for AI prompt
const rehabExerciseList = {
  metadata: {
    purpose: 'Curated list for physical therapy, prehab, and rehab',
    equipment: ['bodyweight', 'resistance bands'],
    totalExercises: rehabFriendly.length,
    excludedTypes: [
      'Pull-ups/chin-ups (requires equipment)',
      'Plyometric/jumping exercises (high-impact)',
      'Advanced calisthenics (not suitable for injury recovery)',
      'One-arm variations (too advanced for most rehab)'
    ],
    generatedAt: new Date().toISOString(),
  },
  instructions: {
    forAI: 'When generating exercise plans, ONLY use exercise names from this list. Use the exact "name" field. Do not make up exercise names.',
    matching: 'The exercise ID will be used to fetch GIFs from ExerciseDB API.',
  },
  exercises: rehabFriendly.map(ex => ({
    id: ex.id,
    name: ex.name,
    bodyPart: ex.bodyPart,
    target: ex.target,
    equipment: ex.equipment,
  })),
  byBodyPart,
};

const outputPath = './scripts/rehab-exercise-list.json';
fs.writeFileSync(outputPath, JSON.stringify(rehabExerciseList, null, 2));

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Saved ${rehabFriendly.length} rehab-appropriate exercises to:`);
console.log(`   ${outputPath}\n`);

// Create simplified list for AI prompts (just names by body part)
const simplifiedForAI = {
  instructions: 'Use these exact exercise names in your rehab plans. Do not create new exercise names.',
  byCondition: {
    'knee': {
      bodyParts: ['upper legs', 'lower legs'],
      sampleExercises: byBodyPart['upper legs'] ?
        Object.values(byBodyPart['upper legs']).flat().slice(0, 10).map(ex => ex.name) : [],
    },
    'lower back': {
      bodyParts: ['back', 'waist'],
      sampleExercises: byBodyPart['waist'] ?
        Object.values(byBodyPart['waist']).flat().slice(0, 10).map(ex => ex.name) : [],
    },
    'shoulder': {
      bodyParts: ['shoulders', 'upper arms'],
      sampleExercises: byBodyPart['shoulders'] ?
        Object.values(byBodyPart['shoulders']).flat().slice(0, 10).map(ex => ex.name) : [],
    },
  },
  allExerciseNames: rehabFriendly.map(ex => ex.name).sort(),
};

const simplifiedPath = './scripts/rehab-exercises-for-ai.json';
fs.writeFileSync(simplifiedPath, JSON.stringify(simplifiedForAI, null, 2));
console.log(`✅ Saved AI-friendly version to:`);
console.log(`   ${simplifiedPath}\n`);

console.log('💡 NEXT STEPS:');
console.log('1. Review the exercises above - do they look appropriate for rehab?');
console.log('2. Update AI service to use this curated list');
console.log('3. AI should select exercises by body part (e.g., "upper legs" for knee rehab)');
console.log('4. Perfect matching: AI uses exact name → lookup by name → get ID → fetch GIF\n');
