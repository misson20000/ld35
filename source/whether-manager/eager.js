import * as utils from './utils.js';
import * as has from './has.js';

export function collect(alert, current) {
  const nodes = current !== false ? alert.safeNodes() : [];
  alert.onAdd(node => nodes.push(node));
  alert.onRemove(node => utils.remove(nodes, node));
  return utils.merge(alert, {
    nodes: () => nodes, safeNodes: () => utils.copy(nodes)
  })
}

function construct(nodes, adders, removers) {
  return {
    has: node => nodes.indexOf(node) !== -1,
    nodes: () => nodes,
    safeNodes: () => utils.copy(nodes),
    onAdd: utils.onFunc(adders),
    onRemove: utils.onFunc(removers),
    offAdd: utils.offFunc(adders),
    offRemove: utils.offFunc(removers),
    off: () => {
      adders.length = removers.length = 0;
    }
  }
}

export function all() {
  const alerts = utils.copy(arguments), len = alerts.length;
  const nodes = has.all(alerts);
  const adders = [], removers = [];
  
  const adder = node => {
    const len = alerts.length;
    for(let i = 0; i < len; ++i) {
      if(!alerts[i].has(node)) {
        return;
      }
    }
    nodes.push(node);
    utils.executeAll(adders, node);
  };
  const remover = node => {
    if(utils.remove(nodes, node)) {
      utils.executeAll(removers, node);
    }
  };
  
  for(let i = 0; i < len; ++i) {
    alerts[i].onAdd(adder);
    alerts[i].onRemove(remover);
  }
  
  return construct(nodes, adders, removers);
}

export function any() {
  const alerts = utils.copy(arguments), len = alerts.length;
  const nodes = has.any(alerts);
  const adders = [], removers = [];
  
  const adder = node => {
    if(nodes.indexOf(node) === -1) {
      nodes.push(node);
      utils.executeAll(adders, node);
    }
  };
  const remover = node => {
    const len = alerts.length;
    for(let i = 0; i < len; ++i) {
      if(alerts[i].has(node)) {
        return;
      }
    }
    nodes.splice(nodes.indexOf(node), 1);
    utils.executeAll(removers, node);
  };
  
  for(let i = 0; i < len; ++i) {
    alerts[i].onAdd(adder);
    alerts[i].onRemove(remover);
  }
  
  return construct(nodes, adders, removers);
}

export function andNot(yes, no) {
  const nodes = has.andNot(yes, no);
  const adders = [], removers = [];
  
  yes.onAdd(node => {
    if(!no.has(node)) {
      nodes.push(node);
      utils.executeAll(adders, node);
    }
  });
  const remover = node => {
    if(utils.remove(nodes, node)) {
      utils.executeAll(removers, node);
    }
  };
  yes.onRemove(remover);
  no.onAdd(remover);
  no.onRemove(node => {
    if(yes.has(node)) {
      nodes.push(node);
      utils.executeAll(adders, node);
    }
  });
  
  return construct(nodes, adders, removers);
}
