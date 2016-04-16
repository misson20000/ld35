import * as utils from './utils.js';

export function node() {
  let self;
  const nodeMap = new Map();
  
  const set = (node, value) => {
    if((value === undefined && !nodeMap.has(node)) || nodeMap.get(node) !== value) {
      nodeMap.set(node, value);
      node.set(self, value);
      return true;
    }
    return false;
  };
  const link = (value) => {
    let n = node();
    self.set(n, value);
    return n;
  };
  const remove = node => {
    if(nodeMap.has(node)) {
      nodeMap.delete(node);
      node.remove(self);
      return true;
    }
    return false;
  };
  const removeB = (a, b) => remove(b);
  const clear = () => {
    nodeMap.forEach(removeB);
  };
  const has = node => nodeMap.has(node);
  const get = node => nodeMap.get(node);
  const nodes = () => {
    let keys = [];
    nodeMap.forEach(utils.pushB, keys);
    return keys;
  };
  return self = {
    set, remove, clear, has, get, nodes, link, safeNodes: nodes
  };
}

function alertify(node) {
  const adders = [], updaters = [], removers = [];
  
  const nhas = node.has, nset = node.set, nremove = node.remove, nnodes = node.nodes;
  const set = node.set = (node, value) => {
    const haveIt = nhas(node);
    if(nset(node, value)) {
      const alerts = (haveIt ? updaters : adders), len = alerts.length;
      for(let i = 0; i < len; ++i) {
        alerts[i](node, value);
      }
      return true;
    }
    return false;
  };
  const remove = node.remove = node => {
    if(nremove(node)) {
      utils.executeAll(removers, node);
      return true;
    }
    return false;
  };
  const clear = node.clear = () => {
    const nodes = nnodes(), len = nodes.length;
    for(let i = 0; i < len; ++i) {
      remove(nodes[i]);
    }
  };
  
  const onAdd = utils.onFunc(adders);
  const onUpdate = utils.onFunc(updaters);
  const onSet = setter => {
    adders.push(setter);
    updaters.push(setter);
  };
  const onRemove = utils.onFunc(removers);
  const offAdd = utils.offFunc(adders);
  const offUpdate = utils.offFunc(updaters);
  const offSet = setter => {
    if(setter) {
      const adder = utils.remove(adders, setter);
      return utils.remove(updaters, setter) || adder;
    }
    adders.length = updaters.length = 0;
  };
  const offRemove = utils.offFunc(removers);
  const off = () => {
    adders.length = updaters.length = removers.length = 0;
  }
  return utils.merge(node, {
    set, remove, clear,
    onAdd, onUpdate, onSet, onRemove,
    offAdd, offUpdate, offSet, offRemove, off
  });
}

export function alertNode() {
  return alertify(node());
}
