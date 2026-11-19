import type { FrameworkChoice, LearningPreferences } from '@career-atlas/shared';
import { rawDb } from '../../db/index.js';
export function getLearningPreferences(): LearningPreferences {
  return rawDb.prepare('SELECT framework_choice AS frameworkChoice, revision, updated_at AS updatedAt FROM learning_preferences WHERE id = ?').get('local') as LearningPreferences;
}
export function saveLearningPreferences(frameworkChoice: FrameworkChoice, expectedRevision: number) {
  return rawDb.transaction(() => {
    const current = getLearningPreferences();
    if (current.revision !== expectedRevision) return { conflict: true, current };
    if (current.frameworkChoice !== frameworkChoice) rawDb.prepare('UPDATE learning_preferences SET framework_choice = ?, revision = revision + 1, updated_at = ? WHERE id = ?').run(frameworkChoice, new Date().toISOString(), 'local');
    return { conflict: false, current: getLearningPreferences() };
  }).immediate();
}
