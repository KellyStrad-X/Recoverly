/**
 * Create refined rehab-focused exercise list
 *
 * Strategy:
 * 1. Remove obvious fitness/hypertrophy exercises (25 identified)
 * 2. Remove advanced calisthenics that aren't suitable for rehab
 * 3. Keep anything that could reasonably be used in PT/rehab
 * 4. Simplify overly complex names
 * 5. Keep the ambiguous ones (err on side of inclusion)
 */

const fs = require('fs');
const path = require('path');

const exercisesPath = path.join(__dirname, '../functions/src/rehab-exercises.json');
const exercisesData = JSON.parse(fs.readFileSync(exercisesPath, 'utf8'));

// DEFINITE REMOVES - Fitness/Hypertrophy (from analysis)
const FITNESS_REMOVES = [
  'air bike',
  'clock push-up',
  'cocoons',
  'decline crunch',
  'decline push-up',
  'decline sit-up',
  'flutter kicks',
  'gironda sternum chin',
  'groin crunch',
  'incline close-grip push-up',
  'pull up (neutral grip)',
  'spider crawl push up',
  'band bicycle crunch',
  'muscle-up (on vertical bar)',
  'bodyweight squatting row (with towel)',
  'bodyweight squatting row',
  'archer pull up',
  'archer push up',
  'front lever reps',
  'front lever',
  'back lever',
  'l-sit on floor',
  'quads (bodyweight squat)',
  'walking high knees lunge',
  'standing archer'
];

// ADDITIONAL REMOVES - Advanced calisthenics not suitable for rehab
const ADVANCED_REMOVES = [
  'elevator', // Advanced pull-up variation
  'hands bike', // Cardio/fitness
  'burpee', // High impact
  'jack burpee', // High impact
  'jack jump', // Plyometric
  'alternating v-up', // Advanced abs
  'around the world', // Advanced shoulder
  'suspended push-up', // TRX-style (requires equipment)
  'suspended row', // TRX-style
  'inverted row with straps', // Requires straps
  'inverted row on bench', // Requires specific equipment
  'superman push-up', // Too advanced
  'typewriter pull-up', // Too advanced
  'bottle weighted front raise', // Uses weights (bottle)
  'gorilla chin', // Advanced calisthenics
  'elbow dips', // Unusual/not common in PT
  'single leg platform slide', // Requires platform
  'run', // Cardio
  'butt kicks', // Cardio/fitness
  'mountain climber', // More fitness than rehab
  'skater', // Plyometric
  'ski step', // Cardio
  'split jack', // Plyometric
];

// Combine all removes
const ALL_REMOVES = [...FITNESS_REMOVES, ...ADVANCED_REMOVES].map(e => e.toLowerCase());

// Name simplifications (keep exercise, just simplify name)
const NAME_SIMPLIFICATIONS = {
  'flexion leg sit up (bent knee)': 'leg raise (bent knee)',
  'flexion leg sit up (straight arm)': 'leg raise (straight arm)',
  'hanging straight twisting leg hip raise': 'hanging leg raise with twist',
  'hip raise (bent knee)': 'hip raise',
  'hyperextension (on bench)': 'bench hyperextension',
  'incline leg hip raise (leg straight)': 'incline leg raise',
  'inverted row v. 2': 'inverted row',
  'push-up (wall) v. 2': 'wall push-up',
  'self assisted inverse leg curl (on floor)': 'assisted leg curl',
  'side bridge v. 2': 'side bridge',
  'sit-up v. 2': 'sit-up',
  'vertical leg raise (on parallel bars)': 'vertical leg raise',
  'band single leg reverse calf raise': 'band single leg calf raise (reverse)',
  'band straight back stiff leg deadlift': 'band stiff leg deadlift',
  'dynamic chest stretch (male)': 'dynamic chest stretch',
  'chest and front of shoulder stretch': 'front shoulder stretch',
  'band two legs calf raise - (band under both legs) v. 2': 'band calf raise (both legs)',
  'calf stretch with hands against wall': 'wall calf stretch',
  'seated calf stretch (male)': 'seated calf stretch',
  'calf push stretch with hands against wall': 'wall calf push stretch',
  'modified push up to lower arms': 'forearm push-up',
  'standing calf raise (on a staircase)': 'standing calf raise',
  'oblique crunch v. 2': 'oblique crunch',
  'squat to overhead reach with twist': 'overhead reach with twist',
  'elbow lift - reverse push-up': 'reverse push-up',
  'arm slingers hanging bent knee legs': 'hanging knee raises',
  'wide-grip chest dip on high parallel bars': 'wide-grip chest dip',
  'bridge - mountain climber (cross body)': 'bridge with knee drive',
  'band fixed back close grip pulldown': 'band pulldown (close grip)',
  'resistance band seated straight back row': 'band seated row',
  'bodyweight standing close-grip row': 'standing row (close grip)',
  'bodyweight standing row (with towel)': 'standing row (towel)',
  'bodyweight standing row': 'standing row',
  'circles knee stretch': 'knee circles',
  'alternate heel touchers': 'heel touches',
  'crunch (hands overhead)': 'overhead crunch',
  'elbow-to-knee': 'elbow to knee crunch',
  'groin stretch': 'groin stretch',
  'kneeling push-up (male)': 'kneeling push-up',
  'lying (side) quads stretch': 'side-lying quad stretch',
  'push-up (wall)': 'wall push-up',
  'rear decline bridge': 'decline bridge',
  'bench dip (knees bent)': 'bench dip',
  'close-grip push-up (on knees)': 'close-grip push-up (kneeling)',
  'plank to pike': 'pike plank',
  'single leg platform slide': 'single leg slide',
  'bottoms-up': 'reverse crunch',
};

console.log('🧹 CREATING REFINED REHAB EXERCISE LIST\n');
console.log('═══════════════════════════════════════════\n');

// Filter exercises
let kept = [];
let removed = [];

exercisesData.exercises.forEach(exercise => {
  const nameLower = exercise.name.toLowerCase();

  if (ALL_REMOVES.includes(nameLower)) {
    removed.push({
      name: exercise.name,
      reason: 'Fitness/advanced calisthenics'
    });
  } else {
    // Check if name should be simplified
    let finalName = exercise.name;
    if (NAME_SIMPLIFICATIONS[exercise.name]) {
      finalName = NAME_SIMPLIFICATIONS[exercise.name];
      console.log(`📝 Simplified: "${exercise.name}" → "${finalName}"`);
    }

    kept.push({
      ...exercise,
      name: finalName
    });
  }
});

console.log(`\n📊 RESULTS:\n`);
console.log(`Original: ${exercisesData.exercises.length} exercises`);
console.log(`Removed: ${removed.length} exercises`);
console.log(`Kept: ${kept.length} exercises`);
console.log(`Simplified: ${Object.keys(NAME_SIMPLIFICATIONS).filter(key => kept.some(e => e.name === NAME_SIMPLIFICATIONS[key])).length} names\n`);

// Group by body part
const byBodyPart = kept.reduce((acc, ex) => {
  if (!acc[ex.bodyPart]) acc[ex.bodyPart] = 0;
  acc[ex.bodyPart]++;
  return acc;
}, {});

console.log('📋 BY BODY PART:\n');
Object.entries(byBodyPart)
  .sort((a, b) => b[1] - a[1])
  .forEach(([bodyPart, count]) => {
    const original = exercisesData.exercises.filter(e => e.bodyPart === bodyPart).length;
    console.log(`${bodyPart.toUpperCase()}: ${count} (was ${original})`);
  });

// Show removed exercises
console.log('\n\n❌ REMOVED EXERCISES:\n');
removed.forEach(e => {
  console.log(`  • ${e.name} - ${e.reason}`);
});

// Create new JSON structure
const refinedData = {
  metadata: {
    purpose: "Curated list for REHAB and PREHAB focused on recovery and injury prevention",
    equipment: [
      "bodyweight",
      "resistance bands"
    ],
    totalExercises: kept.length,
    removedExercises: removed.length,
    excludedTypes: [
      "Advanced calisthenics (muscle-ups, levers, etc.)",
      "High-impact plyometrics (burpees, jumps)",
      "Pure hypertrophy movements",
      "Exercises requiring specialized equipment",
      "Advanced gymnastics movements"
    ],
    focusAreas: [
      "Mobility and flexibility",
      "Core stability",
      "Postural correction",
      "Joint rehabilitation",
      "Pain management",
      "Movement restoration"
    ],
    refinedAt: new Date().toISOString()
  },
  instructions: {
    forAI: "When generating exercise plans, ONLY use exercise names from this list. Use the exact \"name\" field. These exercises are specifically selected for rehabilitation and recovery, NOT muscle building or advanced fitness.",
    matching: "The exercise ID will be used to fetch GIFs from ExerciseDB API."
  },
  exercises: kept
};

// Save new file
const outputPath = path.join(__dirname, '../functions/src/rehab-exercises-refined.json');
fs.writeFileSync(outputPath, JSON.stringify(refinedData, null, 2));
console.log(`\n\n✅ Saved refined list to: rehab-exercises-refined.json`);

// Create backup of original
const backupPath = path.join(__dirname, '../functions/src/rehab-exercises-backup.json');
fs.writeFileSync(backupPath, JSON.stringify(exercisesData, null, 2));
console.log(`💾 Backed up original to: rehab-exercises-backup.json`);

// Create summary CSV
const summaryContent = [
  'Exercise Name,Body Part,Equipment,Status',
  ...kept.map(e => `"${e.name}","${e.bodyPart}","${e.equipment}","KEPT"`),
  ...removed.map(e => `"${e.name}","","","REMOVED - ${e.reason}"`)
].join('\n');

const summaryPath = path.join(__dirname, '../exercise-refinement-summary.csv');
fs.writeFileSync(summaryPath, summaryContent);
console.log(`📄 Summary CSV saved to: exercise-refinement-summary.csv`);

console.log('\n\n💡 NEXT STEPS:\n');
console.log('1. Review the refined list in rehab-exercises-refined.json');
console.log('2. If satisfied, replace rehab-exercises.json:');
console.log('   mv functions/src/rehab-exercises-refined.json functions/src/rehab-exercises.json');
console.log('3. Update AI system prompt in functions/src/index.ts with new exercise list');
console.log('4. Re-run YouTube research with refined list');
console.log('\nThis refined list focuses on:');
console.log('  ✅ Therapeutic movements for recovery');
console.log('  ✅ Mobility and flexibility work');
console.log('  ✅ Core stability exercises');
console.log('  ✅ Basic strengthening appropriate for rehab');
console.log('  ✅ Exercises suitable for injured/recovering individuals');
