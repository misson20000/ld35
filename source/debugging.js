import {Color} from "./gfxcore.js";
import {NullCamera} from "./camera.js";
import {PlayState} from "./states/play.js";

export class DebugOutput {
  constructor(out, prefix="") {
    this.out = out;
    this.prefix = prefix;
  }

  log(str) {
    this.out.log(this.prefix + str);
  }

  wrap(prefix="") {
    return new DebugOutput(this, prefix);
  }
}

let OVERLAY_COLOR = new Color(0, 0, 0, 70);
let PROMPT_COLOR = new Color(0, 0, 0, 200);
let TEXT_COLOR = new Color(220, 220, 200);

export class Debug {
  constructor(game) {
    this.active = false;
    this.game = game;
    this.camera = new NullCamera();
    this.consoleArea = {x: 0, y: 0, w: 500, h: 500};
    this.promptArea = {x: 0, y: 500, w: 500, h: 15};
    this.dropdownVel = 0;
    this.dropdownY = -500;
    this._log = [];
    this.logColors = {
      normal: new Color(220, 220, 220),
      error: new Color(220, 20, 20)
    };
    this.commandHistory = [];
    this.commandFuture = [];

    let stateMap = {
      play: PlayState,
    };
    
    this.commands = {
      set: (parts) => {
        let a, b;
        if(parts.length == 2) {
          a = parts[0];
          b = parts[1];
        } else {
          let i = parts.indexOf("to");
          if(i == undefined) {
            this.logError("Invalid syntax. Usage: set <a> [to] <b> / set <a> <b> if a and b are each only one word");
            return;
          }
          a = parts.slice(0, i).join(" ");
          b = parts.slice(i+1).join(" ");
        }
        switch(a) {
        case "state":
          if(!stateMap[b]) {
            this.logError("No such state '" + b + "'");
            return;
          }
          this.game.state = new stateMap[b](this.game);
          break;
        default:
          this.logError("'" + a + "' not recognized");
          return;
        }
      },
      reload: (parts) => {
        if(parts[0] == "all") {
          if(parts[1] == "assets") {
            this.log("reloading assets...");
            this.game.assetManager.reloadAll();
          } else {
            this.logError("'" + parts[1] + "' not recognized.");
          }
        } else if(parts[0] == "asset") {
          if(this.game.assetManager.directAssets[parts[1]]) {
            this.log("reloading '" + parts[1] + "'");
            this.game.assetManager.directAssets[parts[1]].reload();
          } else {
            this.logError("no such asset");
          }
        } else {
          if(this.game.assetManager.directAssets[parts[0]]) {
            this.log("reloading '" + parts[0] + "'");
            this.game.assetManager.directAssets[parts[0]].reload();
          } else {
            this.logError("'" + parts[0] + "' not recognized.");
          }          
        }
      }
    };
    
    this.prompt = {
      before: "",
      cursor: " ",
      after: "",

      blinkState: true,
      blinkTimer: 0
    };
  }
  
  log(str) {
    console.log(str);
    this._log.push({mode: "normal", msg: str});
  }

  logError(str) {
    console.log(str);
    this._log.push({mode: "error", msg: str});
  }
  
  out(prefix) {
    return new DebugOutput(this, prefix + ": ");
  }

  silent(prefix) {
    return {
      log: () => {}
    };
  }
  
  key(evt) {
    if(evt.ctrlKey) {
      let preventDefault = true;
      switch(evt.code) {
      case "KeyA":
        this.prompt.blinkState = true;
        this.prompt.blinkTimer = 500;
        let t = this.prompt.before + this.prompt.cursor + this.prompt.after;
        this.prompt.before = "";
        this.prompt.cursor = t[0];
        this.prompt.after = t.slice(1);
        break;
      case "KeyE":
        this.prompt.blinkState = true;
        this.prompt.blinkTimer = 500;
        this.prompt.before = (this.prompt.before + this.prompt.cursor + this.prompt.after).slice(0, -1);
        this.prompt.cursor = " ";
        this.prompt.after = "";
        break;
      case "KeyK":
        this.prompt.kill = (this.prompt.cursor + this.prompt.after).slice(0, -1);
        this.prompt.cursor = " ";
        this.prompt.after = "";
        break;
      case "KeyY":
        this.prompt.before+= this.prompt.kill;
        break;
      default:
        preventDefault = false;
      }

      if(preventDefault) { evt.preventDefault(); }
    } else {
      if(evt.key.length == 1) {
        this.prompt.before+= evt.key;
      } else {
        switch(evt.code) {
        case "ArrowLeft":
          if(this.prompt.before.length > 0) {
            this.prompt.after = this.prompt.cursor + this.prompt.after;
            this.prompt.cursor = this.prompt.before[this.prompt.before.length-1];
          }
        case "Backspace": //fall-through
          this.prompt.blinkState = true;
          this.prompt.blinkTimer = 500;
          
          if(this.prompt.before.length > 0) {
            this.prompt.before = this.prompt.before.slice(0, -1);
          }
          break;
        case "ArrowRight":
          if(this.prompt.after.length > 0) {
            this.prompt.before+= this.prompt.cursor;
          }
        case "Delete": //fall-through
          this.prompt.blinkState = true;
          this.prompt.blinkTimer = 500;
          if(this.prompt.after.length > 0) {
            this.prompt.cursor = this.prompt.after[0];
            this.prompt.after = this.prompt.after.slice(1);
          }
          break;
        case "ArrowUp":
          if(this.commandHistory.length > 0) {
            this.commandFuture.push((this.prompt.before + this.prompt.cursor + this.prompt.after).slice(0, -1));
            this.prompt.before = this.commandHistory.pop();
            this.prompt.cursor = " ";
            this.prompt.after = "";
          }
          break;
        case "ArrowDown":
          if(this.commandFuture.length > 0) {
            this.commandHistory.push((this.prompt.before + this.prompt.cursor + this.prompt.after).slice(0, -1));
            this.prompt.before = this.commandFuture.pop();
            this.prompt.cursor = " ";
            this.prompt.after = "";
          }
          break;
        case "End":
          this.prompt.blinkState = true;
          this.prompt.blinkTimer = 500;
          this.prompt.before = (this.prompt.before + this.prompt.cursor + this.prompt.after).slice(0, -1);
          this.prompt.cursor = " ";
          this.prompt.after = "";
          break;
        case "Home":
          this.prompt.blinkState = true;
          this.prompt.blinkTimer = 500;
          let t = this.prompt.before + this.prompt.cursor + this.prompt.after;
          this.prompt.before = "";
          this.prompt.cursor = t[0];
          this.prompt.after = t.slice(1);
          break;
        case "Enter":
          this.prompt.blinkState = true;
          this.prompt.blinkTimer = 500;
          this.handleCommand((this.prompt.before + this.prompt.cursor + this.prompt.after).slice(0, -1));
          this.prompt.before = this.prompt.after = "";
          this.prompt.cursor = " ";
        }
      }
    }
  }

  handleCommand(cmd) {
    this.commandHistory = this.commandHistory.concat(this.commandFuture);
    if(this.commandFuture.length > 0) {
      this.commandHistory.pop();
    }
    this.commandFuture = [];
    this.commandHistory.push(cmd);
    let parts = cmd.split(" ");
    if(parts.length == 0) {
      this.logError("empty command");
      return;
    }
    if(cmd.startsWith("js: ")) {
      this.log("> " + new Function(cmd.slice(4))().toString());
    } else {
      if(this.commands[parts[0]]) {
        this.commands[parts.shift()](parts);
      } else {
        this.logError(parts[0] + ": command not found");
      }
    }
  }
  
  render() {
    if(this.active) {
      if(this.dropdownY < 0) {
        this.dropdownY+= this.dropdownVel * this.game.realtime.delta;
        this.dropdownVel+= .01 * this.game.realtime.delta;
      }
      if(this.dropdownY >= 0) {
        this.dropdownY = 0;
        this.dropdownVel = 0;
      }
    } else {
      if(this.dropdownY > -515) {
        this.dropdownY+= this.dropdownVel * this.game.realtime.delta;
        this.dropdownVel-= .01 * this.game.realtime.delta;
      } else {
        this.dropdownY = -515;
        this.dropdownVel = 0;
      }
    }

    if(this.active) {
      this.prompt.blinkTimer-= this.game.realtime.delta;
      if(this.prompt.blinkTimer <= 0) {
        this.prompt.blinkTimer = 500;
        this.prompt.blinkState = !this.prompt.blinkState;
      }
    }
    
    this.consoleArea.y = this.dropdownY;
    this.promptArea.y = this.dropdownY + this.consoleArea.h;
    
    this.game.gfx.lookThrough(this.camera);
    this.game.gfx.fillRect(this.consoleArea.x, this.consoleArea.y, this.consoleArea.w, this.consoleArea.h, OVERLAY_COLOR);
    this.game.gfx.fillRect(this.promptArea.x, this.promptArea.y, this.promptArea.w, this.promptArea.h, PROMPT_COLOR);

    if(this.dropdownY > -500) {
      let x = 5;
      let y = this.promptArea.y + 11;
      x+= this.game.gfx.drawText(this.prompt.before, x, y, TEXT_COLOR);
      let cw = this.game.gfx.textWidth(this.prompt.cursor);
      if(this.prompt.blinkState) {
        this.game.gfx.fillRect(x, y-10, cw, 12, TEXT_COLOR);
      }
      this.game.gfx.drawText(this.prompt.cursor, x, y, this.prompt.blinkState ? this.game.gfx.black : TEXT_COLOR);
      x+= cw;
      x+= this.game.gfx.drawText(this.prompt.after,  x, y, TEXT_COLOR);
    }

    let y = 13;
    for(let i = Math.max(0, this._log.length-Math.floor(500/14)); i < this._log.length; i++) {
      if(this.dropdownY + 500 > y) {
        this.game.gfx.drawText(this._log[i].msg, 2, y, this.logColors[this._log[i].mode]);
        y+= 14;
      }
    }
  }
}
