import { WhyWhyAnalysis, WhyWhyBranch, WhyNode, BranchAxis, Judgement, RepairLog } from '../types';

/**
 * Creates an empty or initial WhyNode
 */
export function createWhyNode(description: string = '', isRoot: boolean = false): WhyNode {
  return {
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    description,
    children: [],
    changePointOk: true,
    judgement: 'PENDING',
    isRootCause: false
  };
}

/**
 * Creates a new branch with a specified axis and initial root Why 1 node
 */
export function createWhyWhyBranch(axis: BranchAxis, initialDescription: string = ''): WhyWhyBranch {
  return {
    id: `br-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    axis,
    root: createWhyNode(initialDescription, true),
    reverseLogicCheck: ''
  };
}

/**
 * Creates a default initial Why-Why analysis for a repair
 */
export function createDefaultWhyWhyAnalysis(
  phenomenon: string = '',
  technician: string = '',
  relatedRepairIds: string[] = []
): WhyWhyAnalysis {
  return {
    id: `ww-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    phenomenon,
    occurrenceType: relatedRepairIds.length > 0 ? 'recurrence' : 'first',
    relatedRepairIds,
    branches: [createWhyWhyBranch('occurrence', phenomenon)],
    analyzedBy: technician || 'ช่างซ่อมบำรุง',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Lazy migration: converts legacy why1..why5 into a 1-branch linear tree (axis='occurrence')
 * whyN are nested as children. Leaf = last non-empty whyN (judgement='PENDING', changePointOk=true),
 * leaf gets correctiveAction as countermeasure.
 * Does NOT overwrite database completely, only generates in-memory structure when loaded.
 */
export function migrateLegacyWhyToTree(repair: Partial<RepairLog>): WhyWhyAnalysis {
  const whys = [repair.why1, repair.why2, repair.why3, repair.why4, repair.why5]
    .map(w => (w || '').trim())
    .filter(Boolean);

  let rootNode: WhyNode;

  if (whys.length === 0) {
    rootNode = {
      id: `node-${repair.id || 'new'}-1`,
      description: repair.symptoms || '',
      children: [],
      changePointOk: true,
      judgement: 'PENDING',
      isRootCause: false,
      countermeasure: repair.correctiveAction || ''
    };
  } else {
    // Leaf is why[last]
    let current: WhyNode = {
      id: `node-${repair.id || 'old'}-${whys.length}`,
      description: whys[whys.length - 1],
      children: [],
      changePointOk: true,
      judgement: 'PENDING',
      isRootCause: false,
      countermeasure: repair.correctiveAction || ''
    };

    // Nest predecessors backwards
    for (let i = whys.length - 2; i >= 0; i--) {
      current = {
        id: `node-${repair.id || 'old'}-${i + 1}`,
        description: whys[i],
        children: [current],
        changePointOk: true,
        judgement: 'PENDING',
        isRootCause: false
      };
    }
    rootNode = current;
  }

  const branch: WhyWhyBranch = {
    id: `br-${repair.id || 'migrated'}-occ`,
    axis: 'occurrence',
    root: rootNode,
    reverseLogicCheck: ''
  };

  return {
    id: `ww-${repair.id || Date.now()}`,
    phenomenon: repair.symptoms || '',
    occurrenceType: 'first',
    relatedRepairIds: [],
    branches: [branch],
    analyzedBy: repair.technician || 'ช่างซ่อมบำรุง',
    updatedAt: new Date().toISOString()
  };
}

/**
 * Extracts linear why1..why5 from the first or occurrence branch of WhyWhyAnalysis
 * to maintain backward compatibility with legacy tables and exports.
 */
export function extractLegacyWhys(analysis?: WhyWhyAnalysis): {
  why1: string;
  why2: string;
  why3: string;
  why4: string;
  why5: string;
} {
  const result = { why1: '', why2: '', why3: '', why4: '', why5: '' };
  if (!analysis || !analysis.branches || analysis.branches.length === 0) {
    return result;
  }

  // Prefer occurrence branch, else first branch
  const targetBranch = analysis.branches.find(b => b.axis === 'occurrence') || analysis.branches[0];
  if (!targetBranch || !targetBranch.root) return result;

  const chain: string[] = [];
  let curr: WhyNode | undefined = targetBranch.root;
  while (curr && chain.length < 5) {
    if (curr.description) {
      chain.push(curr.description);
    }
    // follow primary child
    curr = curr.children && curr.children.length > 0 ? curr.children[0] : undefined;
  }

  if (chain[0]) result.why1 = chain[0];
  if (chain[1]) result.why2 = chain[1];
  if (chain[2]) result.why3 = chain[2];
  if (chain[3]) result.why4 = chain[3];
  if (chain[4]) result.why5 = chain[4];

  return result;
}

/**
 * Recursively adds a child node under targetParentId
 */
export function addChildNode(root: WhyNode, parentId: string, newNode: WhyNode): WhyNode {
  if (root.id === parentId) {
    return {
      ...root,
      children: [...root.children, newNode]
    };
  }
  return {
    ...root,
    children: root.children.map(child => addChildNode(child, parentId, newNode))
  };
}

/**
 * Recursively adds a sibling node parallel to targetNodeId
 */
export function addSiblingNode(root: WhyNode, targetNodeId: string, newNode: WhyNode): { root: WhyNode; added: boolean } {
  // Check if target is among root's immediate children
  const idx = root.children.findIndex(c => c.id === targetNodeId);
  if (idx !== -1) {
    const updated = [...root.children];
    updated.splice(idx + 1, 0, newNode);
    return { root: { ...root, children: updated }, added: true };
  }

  // Recurse into children
  let anyAdded = false;
  const newChildren = root.children.map(child => {
    const res = addSiblingNode(child, targetNodeId, newNode);
    if (res.added) anyAdded = true;
    return res.root;
  });

  return { root: { ...root, children: newChildren }, added: anyAdded };
}

/**
 * Recursively updates a node in the tree matching targetId
 */
export function updateNodeInTree(root: WhyNode, targetId: string, patch: Partial<WhyNode>): WhyNode {
  if (root.id === targetId) {
    return { ...root, ...patch };
  }
  return {
    ...root,
    children: root.children.map(child => updateNodeInTree(child, targetId, patch))
  };
}

/**
 * Recursively removes a node matching targetId from the tree (cannot delete root if it's the only one)
 */
export function deleteNodeFromTree(root: WhyNode, targetId: string): { root: WhyNode; deleted: boolean } {
  if (root.id === targetId) {
    return { root, deleted: false }; // Cannot delete tree root through child filter
  }

  const filtered = root.children.filter(child => child.id !== targetId);
  if (filtered.length !== root.children.length) {
    return { root: { ...root, children: filtered }, deleted: true };
  }

  let wasDeleted = false;
  const newChildren = root.children.map(child => {
    const res = deleteNodeFromTree(child, targetId);
    if (res.deleted) wasDeleted = true;
    return res.root;
  });

  return { root: { ...root, children: newChildren }, deleted: wasDeleted };
}

/**
 * Counts total nodes in a branch
 */
export function countBranchNodes(root: WhyNode): number {
  return 1 + root.children.reduce((acc, child) => acc + countBranchNodes(child), 0);
}

/**
 * Finds maximum depth in a tree
 */
export function getMaxDepth(root: WhyNode, depth: number = 1): number {
  if (!root.children || root.children.length === 0) return depth;
  return Math.max(...root.children.map(child => getMaxDepth(child, depth + 1)));
}
