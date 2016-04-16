// Hey. I could fetch these nodes in ten microseconds flat!

import * as has from './has.js';

export function all() {
  const items = utils.copy(arguments);
  const nodes = () => has.all(items);
  
  return {
    has: node => {
      const len = items.length;
      for(let i = 0; i < len; ++i) {
        if(!items[i].has(node)) {
          return false;
        }
      }
      return true;
    },
    nodes, safeNodes: nodes
  };
}

export function any() {
  const items = utils.copy(arguments);
  const nodes = () => has.any(items);
  
  return {
    has: node => {
      const len = items.length;
      for(let i = 0; i < len; ++i) {
        if(items[i].has(node)) {
          return true;
        }
      }
      return false;
    },
    nodes, safeNodes: nodes
  };
}

export function andNot(yes, no) {
  const nodes = () => has.andNot(yes, no);
  
  return {
    has: node => (yes.has(node) && !no.has(node)),
    nodes, safeNodes: nodes
  };
}
