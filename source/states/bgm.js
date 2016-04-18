import {Sprite, Batch, ShapeBatch, Framebuffer} from "../webglcore.js";

import {Vector} from "../vector.js";
import {Mat3} from "../math.js";

import {Tmx} from "../tmx.js";

import {PlayState} from "./play.js";

export class BgmLoadState {
  constructor(game) {
    this.game = game;
    this.assets = game.assetManager.assets;

    let gfx = this.gfx = game.gfx;
    let gl = gfx.gl;
    
    gfx.flat_texture_shader = this.assets.shader.flat.texture;
    gfx.flat_color_shader = this.assets.shader.flat.color;
    
    this.sprites = [];
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    this.batch = new Batch(gfx);
    this.fnt = this.assets.fnt.main;
    
    this.bgm = this.game.sfx.playMusic(this.assets.bgm.track1, 1.0, false);
    this.bgm.gain.gain.value = 0;
  }

  render() {
    if(this.bgm.aud.readyState == 4 && this.game.gametime.now > 2500) {
      this.game.state = new PlayState(this.game, this.bgm);
    }

    this.fnt.draw(this.batch, -300, -100, "WARNING: Flashing Lights.", 1, 1, 1);
    this.batch.flush();
  }
}
