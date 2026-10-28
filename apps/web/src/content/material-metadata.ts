import pronunciationBatches from '../../scripts/pronunciation-batches.json';
import { learningMaterialCatalogs } from './learning-material-catalog';

/** 阅读器直接使用资料目录和发音生成清单，新增批次时无需再维护页面副本。 */
export const scopedMainGuides = new Set(
  learningMaterialCatalogs.flatMap(batch => batch.chapters.map(chapter => chapter.guide)),
);

export const scopedMainKnowledgePointCodes = new Set(
  learningMaterialCatalogs.flatMap(batch => batch.chapters.map(chapter => chapter.id)),
);

export const pronunciationBatchByGuide = new Map(
  Object.entries(pronunciationBatches).flatMap(([batch, guides]) => guides.map(guide => [guide, batch] as const)),
);

export const atomicPrerequisiteGuides = new Set(
  [...pronunciationBatchByGuide.keys()].filter(guide => !scopedMainGuides.has(guide)),
);
