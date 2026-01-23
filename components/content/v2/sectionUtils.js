export function normalizeSectionComponents(section) {
  const rawComponents = section?.layout || [];
  const seenIds = new Set();

  return rawComponents.map((component, index) => {
    let uniqueId = component?.id;

    if (!uniqueId || seenIds.has(uniqueId)) {
      uniqueId = `${section?.id || 'section'}_${component?.type || 'component'}_${index}`;
    }

    seenIds.add(uniqueId);

    if (uniqueId !== component?.id) {
      return { ...component, id: uniqueId, _originalId: component?.id };
    }

    return component;
  });
}

export function mapSectionAnswers(section, rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== "object") return {};
  const normalized = normalizeSectionComponents(section);
  const mapped = {};

  normalized.forEach((component) => {
    const originalId = component?._originalId || component?.id;
    if (!component?.id) return;
    if (Object.prototype.hasOwnProperty.call(rawAnswers, originalId)) {
      mapped[component.id] = rawAnswers[originalId];
    } else if (Object.prototype.hasOwnProperty.call(rawAnswers, component.id)) {
      mapped[component.id] = rawAnswers[component.id];
    }
  });

  return mapped;
}

export function mapSectionResults(section, rawResults) {
  if (!rawResults || typeof rawResults !== "object") return rawResults || {};
  const normalized = normalizeSectionComponents(section);
  const mapped = {};

  normalized.forEach((component) => {
    const originalId = component?._originalId || component?.id;
    if (!component?.id) return;
    if (Object.prototype.hasOwnProperty.call(rawResults, originalId)) {
      mapped[component.id] = rawResults[originalId];
    } else if (Object.prototype.hasOwnProperty.call(rawResults, component.id)) {
      mapped[component.id] = rawResults[component.id];
    }
  });

  return mapped;
}
