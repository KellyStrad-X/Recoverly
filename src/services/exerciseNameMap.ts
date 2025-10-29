/**
 * Exercise Name Mapping for ExerciseDB
 *
 * Manual mapping of common physical therapy exercise names to ExerciseDB names
 * This solves the naming mismatch problem while we investigate API limitations
 *
 * Format: { "Our PT Exercise Name": "ExerciseDB Name" }
 */

export const EXERCISE_NAME_MAP: Record<string, string> = {
  // Bridge variations
  'Hip Bridges': 'bridge',
  'Glute Bridges': 'bridge',
  'Bridge': 'bridge',
  'Single Leg Bridge': 'single leg bridge',

  // Calf exercises
  'Calf Raises': 'calf raise',
  'Standing Calf Raises': 'standing calf raise',
  'Seated Calf Raises': 'seated calf raise',

  // Squat variations
  'Squats': 'squat',
  'Air Squats': 'squat',
  'Bodyweight Squats': 'squat',
  'Wall Squats': 'wall squat',

  // Lunges
  'Lunges': 'lunge',
  'Forward Lunges': 'lunge',
  'Reverse Lunges': 'reverse lunge',
  'Walking Lunges': 'walking lunge',

  // Plank variations
  'Plank': 'plank',
  'Front Plank': 'plank',
  'Side Plank': 'side plank',

  // Core
  'Crunches': 'crunch',
  'Sit-ups': 'sit-up',
  'Bird Dog': 'bird dog',
  'Dead Bug': 'dead bug',

  // Arm exercises
  'Bicep Curls': 'bicep curl',
  'Dumbbell Curls': 'dumbbell curl',
  'Tricep Dips': 'tricep dip',
  'Push-ups': 'push-up',
  'Wall Push-ups': 'push-up',

  // Shoulder
  'Shoulder Press': 'shoulder press',
  'Lateral Raises': 'lateral raise',
  'Front Raises': 'front raise',
  'Shoulder Shrugs': 'shrug',

  // Back
  'Rows': 'row',
  'Bent Over Rows': 'bent over row',
  'Lat Pulldowns': 'lat pulldown',

  // Leg exercises
  'Leg Raises': 'leg raise',
  'Leg Curls': 'leg curl',
  'Leg Extensions': 'leg extension',
  'Hip Abduction': 'hip abduction',
  'Hip Adduction': 'hip adduction',

  // Stretches (if ExerciseDB has them)
  'Hamstring Stretch': 'hamstring stretch',
  'Quad Stretch': 'quad stretch',
  'Calf Stretch': 'calf stretch',
};

/**
 * Get ExerciseDB-compatible name from PT exercise name
 */
export const getExerciseDBName = (ptExerciseName: string): string => {
  // Try exact match first
  if (EXERCISE_NAME_MAP[ptExerciseName]) {
    return EXERCISE_NAME_MAP[ptExerciseName];
  }

  // Try case-insensitive match
  const lowerName = ptExerciseName.toLowerCase();
  for (const [key, value] of Object.entries(EXERCISE_NAME_MAP)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // No mapping found - return original
  return ptExerciseName.toLowerCase();
};
