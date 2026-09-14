import catalog from '../../../../docs/knowledge/materials/b01.json';
import b02 from '../../../../docs/knowledge/materials/b02.json';
import b03 from '../../../../docs/knowledge/materials/b03.json';
import b04 from '../../../../docs/knowledge/materials/b04.json';
import b05 from '../../../../docs/knowledge/materials/b05.json';
import b06 from '../../../../docs/knowledge/materials/b06.json';
import b07 from '../../../../docs/knowledge/materials/b07.json';
import b08 from '../../../../docs/knowledge/materials/b08.json';
import b09 from '../../../../docs/knowledge/materials/b09.json';
import b10 from '../../../../docs/knowledge/materials/b10.json';
import b11 from '../../../../docs/knowledge/materials/b11.json';
import b12 from '../../../../docs/knowledge/materials/b12.json';

export const learningMaterialCatalog = catalog;
export const learningMaterialCatalogs = [catalog, b02, b03, b04, b05, b06, b07, b08, b09, b10, b11, b12];
export type LearningChapter = (typeof catalog.chapters)[number];
const chapters = learningMaterialCatalogs.flatMap((batch) => batch.chapters);

function sectionAnchor(heading: string) {
  return heading.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-');
}

export function chapterHref(chapter: LearningChapter, heading?: string) {
  const path = `/knowledge/materials/${chapter.guide}/${chapter.anchor}`;
  return heading ? `${path}#${encodeURIComponent(sectionAnchor(heading))}` : path;
}

export function findLearningChapter(guide: string) {
  return chapters.find((chapter) => chapter.guide === guide);
}

export function findLearningBatch(guide: string) {
  return learningMaterialCatalogs.find((batch) => batch.chapters.some((chapter) => chapter.guide === guide));
}

export function canonicalMaterialHref(guide: string, anchor: string) {
  const chapter = findLearningChapter(guide);
  const concept = chapter?.concepts.find((item) => sectionAnchor(item.heading) === anchor);
  return chapter && concept ? chapterHref(chapter, concept.heading) : null;
}

export function chapterConnections(chapter: LearningChapter) {
  return chapter.connections.flatMap((connection) => {
    for (const owner of chapters) {
      const concept = owner.concepts.find((item) => item.id === connection.concept);
      if (concept) return [{ ...connection, title: concept.heading, chapterId: owner.id, href: chapterHref(owner, concept.heading) }];
    }
    return [];
  });
}
