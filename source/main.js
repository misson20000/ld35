import {GFXCore, Color} from "./gfxcore.js";
import {WebGLCore} from "./webglcore.js";
import {SFXCore} from "./sfxcore.js";
import {ResourceManager} from "./resourcemanager.js";
import {LoaderState} from "./states/loader.js";
import {PlayState} from "./states/play.js";
import {Debug} from "./debugging.js";
import {AssetManager} from "./assetmanager.js";
import {InputManager} from "./inputmanager.js";
import {TmxProvider} from "./tmx.js";

class Game {
  constructor(canvas) {
    this.dbg = new Debug(this);
    this.resourceManager = new ResourceManager(this.dbg.silent("ResourceManager"));
    this.assetManager = new AssetManager(this.resourceManager, this.dbg.silent("AssetManager"));
    this.gfx = new WebGLCore(this, canvas, this.dbg.out("WebGLCore"));
    this.assetManager.gfx = this.gfx;
    this.sfx = new SFXCore(this);
    this.input = new InputManager(canvas, this.dbg);
    this.assetManager.addProvider(TmxProvider);
    //this.assetManager.addLoader("image", this.gfx.imageLoader());
    //this.assetManager.addLoader("sprite", this.gfx.spriteLoader());
    //this.assetManager.addLoader("sound", this.sfx.soundLoader());
    //this.assetManager.addLoader("music", this.sfx.musicLoader());
    //this.assetManager.addLoader("tmx", TmxLoader);
    this.state = new LoaderState(this, this.resourceManager, this.assetManager);

    this.realtime = {};
    this.realtime.now = performance.now();
    this.realtime.delta = 0;
    this.gametime = {};
    this.gametime.now = 0;
    this.gametime.delta = 0;
    this.gametime.factor = 1;

    window.requestAnimationFrame(this.chainrender);
  }

  chainrender(timestamp) {
    window.theGame.render(timestamp);
  }
  
  render(timestamp) {
    // Update Times
    this.realtime.delta = timestamp - this.realtime.now;
    this.realtime.now = timestamp;
    this.gametime.delta = this.realtime.delta * this.gametime.factor;
    this.gametime.now+= this.gametime.delta;

    this.gfx.resize(); //make sure we're the correct size

    this.gfx.beginFrame();
    this.input.beginFrame();
    this.state.render();
    //this.dbg.render();
    
    window.requestAnimationFrame(this.chainrender);
  }
}

window.addEventListener("load", () => {
  let game = window.theGame = new Game(document.getElementById("canvas"));
});
