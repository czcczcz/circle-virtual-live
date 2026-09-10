// Only explicit, audited node names are trusted. Generic mesh/material names in
// the supplied GLBs represent the whole body, so fuzzy matching is unsafe.
export function instrumentTargets(root, names = []) {
  const targets = [];
  root.traverse((node) => {
    if (node !== root && names.includes(node.name))
      targets.push({ node, visible: node.visible });
  });
  return targets;
}
export function showInstruments(targets, show) {
  for (const target of targets) target.node.visible = show && target.visible;
}
