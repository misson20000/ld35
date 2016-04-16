import {Asset} from "./assetmanager.js";
import {FilePromiseReader} from "./util.js";

export class Sound {
  constructor(src, gain) {
    this.src = src;
    this.gain = gain;
  }
}

export class Music {
  constructor(aud, src, gain) {
    this.aud = aud;
    this.src = src;
    this.gain = gain;
  }
}

export class SFXCore {
  constructor(game) {
    this.ctx = new AudioContext();
  }

  soundLoader() {
    let loader = {load: (res, mgr, opt) => {
      return new FilePromiseReader(res.blob).arrayBuffer().then((ab) => {
        return this.ctx.decodeAudioData(ab);
      });
    }};

    return loader;
  }

  musicLoader() {
    let loader = {load: (url, mgr, opt) => {
      return new Promise((resolve, reject) => {
        resolve(url);
      });
    }, streaming: true};
    
    return loader;
  }
  
  playSound(ast, vol=1.0) {
    let src = this.ctx.createBufferSource();
    src.buffer = ast.data;
    let gain = this.ctx.createGain();
    src.connect(gain);
    gain.gain.value = vol;
    gain.connect(this.ctx.destination);
    src.start();
    return new Sound(src, gain);
  }

  playMusic(ast, vol=1.0, loop=true) {
    let aud = new Audio();
    aud.src = ast.data;
    aud.autoplay = true;
    aud.loop = loop;
    let src = this.ctx.createMediaElementSource(aud);
    let gain = this.ctx.createGain();
    src.connect(gain);
    gain.gain.value = vol;
    gain.connect(this.ctx.destination);
    return new Music(aud, src, gain);
  }
}
