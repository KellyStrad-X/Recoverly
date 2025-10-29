#!/usr/bin/env node
/**
 * Analyze ExerciseDB for PT-appropriate exercises
 * Filter by equipment type and body part
 */

const exerciseDatabase = require('./exercisedb-complete-index.json');
const fs = require('fs');

console.log('🏥 ANALYZING EXERCISEDB FOR PHYSICAL THERAPY EXERCISES\n');
console.log(`Total exercises in database: ${exerciseDatabase.length}\n`);

// Group by equipment type
const byEquipment = {};
exerciseDatabase.forEach(ex => {
  if (!byEquipment[ex.equipment]) {
    byEquipment[ex.equipment] = [];
  }
  byEquipment[ex.equipment].push(ex);
});

console.log('📊 EXERCISES BY EQUIPMENT TYPE:');
console.log('='.repeat(80));
Object.entries(byEquipment)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([equipment, exercises]) => {
    console.log(`${equipment.padEnd(30)} ${exercises.length} exercises`);
  });

// PT-friendly equipment types
const ptEquipment = [
  'body weight',
  'resistance band',
  'stability ball',
  'foam roll',
  'medicine ball',
  'dumbbell',
  'kettlebell',
  'band',
];

const ptFriendly = exerciseDatabase.filter(ex =>
  ptEquipment.some(eq => ex.equipment.toLowerCase().includes(eq))
);

console.log(`\n✅ PT-Friendly exercises (${ptEquipment.join(', ')}): ${ptFriendly.length}`);

// Group PT-friendly by body part
const byBodyPart = {};
ptFriendly.forEach(ex => {
  if (!byBodyPart[ex.bodyPart]) {
    byBodyPart[ex.bodyPart] = [];
  }
  byBodyPart[ex.bodyPart].push(ex);
});

console.log('\n📍 PT-FRIENDLY EXERCISES BY BODY PART:');
console.log('='.repeat(80));
Object.entries(byBodyPart)
  .sort((a, b) => b[1].length - a[1].length)
  .forEach(([bodyPart, exercises]) => {
    console.log(`\n${bodyPart.toUpperCase()} (${exercises.length} exercises)`);
    console.log('-'.repeat(80));

    // Group by target muscle
    const byTarget = {};
    exercises.forEach(ex => {
      if (!byTarget[ex.target]) byTarget[ex.target] = [];
      byTarget[ex.target].push(ex);
    });

    Object.entries(byTarget)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([target, exs]) => {
        console.log(`  ${target} (${exs.length})`);
        // Show first 5 examples
        exs.slice(0, 5).forEach(ex => {
          console.log(`    - ${ex.name} [${ex.equipment}]`);
        });
        if (exs.length > 5) {
          console.log(`    ... and ${exs.length - 5} more`);
        }
      });
  });

// Save PT-friendly exercises to JSON
const outputPath = './scripts/pt-friendly-exercises.json';
fs.writeFileSync(outputPath, JSON.stringify(ptFriendly, null, 2));
console.log(`\n💾 Saved ${ptFriendly.length} PT-friendly exercises to: ${outputPath}`);

// Create organized version by body part
const organized = {
  metadata: {
    totalExercises: ptFriendly.length,
    equipment: ptEquipment,
    generatedAt: new Date().toISOString(),
  },
  byBodyPart: {},
};

Object.entries(byBodyPart).forEach(([bodyPart, exercises]) => {
  organized.byBodyPart[bodyPart] = {
    count: exercises.length,
    exercises: exercises.map(ex => ({
      id: ex.id,
      name: ex.name,
      target: ex.target,
      equipment: ex.equipment,
    })),
  };
});

const organizedPath = './scripts/pt-exercises-by-bodypart.json';
fs.writeFileSync(organizedPath, JSON.stringify(organized, null, 2));
console.log(`💾 Saved organized version to: ${organizedPath}`);

console.log('\n' + '='.repeat(80));
console.log('\n💡 RECOMMENDATIONS:');
console.log('1. Use pt-exercises-by-bodypart.json in your AI prompts');
console.log('2. Tell AI to only use exercises from this list');
console.log('3. AI can select by body part (e.g., "upper legs" for knee pain)');
console.log('4. Perfect 1:1 matching - no fuzzy search needed\n');
