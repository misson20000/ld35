import * as utils from './utils.js';

function getNodes(item) {
  return item.nodes();
}
export function all() {
  let nodes = arguments[0];
  if(!Array.isArray(nodes)) {
    nodes = utils.copy(arguments);
  }
  return utils.all(nodes.map(getNodes));
}

function getNodes2(item, index) {
  return index ? item.nodes() : item.safeNodes();
}
export function any() {
  let nodes = arguments[0];
  if(!Array.isArray(nodes)) {
    nodes = utils.copy(arguments);
  }
  return utils.any(nodes.map(getNodes2));
}

export function andNot(yes, no) {
  return utils.andNot(yes.nodes(), no.nodes());
}
