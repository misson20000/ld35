export function pushB(a, b) {
  this.push(b);
}

export function executeAll(array, arg) {
  const len = array.length;
  for(let i = 0; i < len; ++i) {
    array[i](arg);
  }
}

export function copy(array) {
  const len = array.length, out = Array(len);
  for(let i = 0; i < len; ++i) {
    out[i] = array[i];
  }
  return out;
}

export function remove(array, item) {
  const index = array.indexOf(item);
  if(index !== -1) {
    array.splice(index, 1);
    return true;
  }
  return false;
}

export function merge() {
  const out = {}, len = arguments.length;
  for(let i = 0; i < len; ++i) {
    const obj = arguments[i];
    for(let key in obj) {
      if(Object.hasOwnProperty.call(obj, key)) {
        out[key] = obj[key];
      }
    }
  }
  return out;
}

export function all(arrays) {
  return arrays[0].filter(item => {
    const len = arrays.length;
    for(let i = 1; i < len; ++i) {
      if(arrays[i].indexOf(item) === -1) {
        return false;
      }
    }
    return true;
  });
}

export function any(arrays) {
  const out = arrays[0], len = arrays.length;
  for(let i = 1; i < len; ++i) {
    const arr = arrays[i], len = arr.length;
    for(let j = 0; j < len; ++j) {
      const item = arr[j];
      if(out.indexOf(item) === -1) {
        out.push(item);
      }
    }
  }
  return out;
}

export function andNot(yes, no) {
  return yes.filter(item => no.indexOf(item) === -1);
}

export function onFunc(alerts) {
  return alert => {
    alerts.push(alert);
  };
}

export function offFunc(alerts) {
  return alert => alert ? remove(alerts, alert) : alerts.length = 0;
}
