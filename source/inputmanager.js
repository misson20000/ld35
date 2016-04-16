let kc = (e) => {
  if(e.code) {
    return e.code;
  }
  switch(e.which) {
  case 37: return "ArrowLeft";
  case 38: return "ArrowUp";
  case 39: return "ArrowRight";
  case 40: return "ArrowDown";
  case 87: return "KeyW";
  case 65: return "KeyA";
  case 83: return "KeyS";
  case 68: return "KeyD";
  case 192: return "Backquote";
  default:
    return "Unknown"
  }
}

export class InputManager {
  constructor(elem, debug) {
    this.dbg = debug;
    this.element = elem;
    this._lastInput = [];
    this._betweenInput = [];
    this._input = [];
    this._keys = [];
    this._keymap = {};
    
    this.up    = new Key(this, ["ArrowUp"   , "KeyW"]);
    this.left  = new Key(this, ["ArrowLeft" , "KeyA"]);
    this.down  = new Key(this, ["ArrowDown" , "KeyS"]);
    this.right = new Key(this, ["ArrowRight", "KeyD"]);
    
    document.addEventListener("keydown", (e) => {
      if(kc(e) == "Backquote") {
        this.dbg.active = !this.dbg.active;
      } else if(this.dbg.active) {
        this.dbg.key(e);
      } else if(this._keymap[kc(e)]) {
        this._betweenInput[this._keymap[kc(e)]] = true;
      }
    });

    document.addEventListener("keyup", (e) => {
      if(!this.dbg.active && this._keymap[kc(e)]) {
        this._betweenInput[this._keymap[kc(e)]] = false;
      }
    });
  }

  beginFrame() {
    for(let k in this._input) {
      this._lastInput[k] = this._input[k];
    }
    for(let k in this._betweenInput) {
      this._input[k] = this._betweenInput[k];
    }
  }
}

class Key {
  constructor(input, keys) {
    this.input = input;
    this.id = input._keys.length;
    for(let k in keys) {
      input._keymap[keys[k]] = this.id;
    }
    input._keys.push(this);
  }

  pressed() {
    return this.input._input[this.id];
  }

  justPressed() {
    return this.input._input[this.id] && !this.input._lastInput[this.id];
  }

  justReleased() {
    return this.input._input[this.id] && !this.input._lastInput[this.id];
  }
}
