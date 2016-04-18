import {Sprite, Batch, ShapeBatch, Framebuffer} from "../webglcore.js";

import {Vector} from "../vector.js";
import {Mat3} from "../math.js";

import {Tmx} from "../tmx.js";

import {PlayState} from "./play.js";

export class WinState {
  constructor(play) {
    game = play.game;
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
    
  }

  render() {
    this.fnt.draw(this.batch, -300, -100, "You win :)", 1, 1, 1);
    this.fnt.draw(this.batch, -300, -88, "Thank you for presisting");
    this.fnt.draw(this.batch, -300, -76, "through to the end!", 1, 1, 1);
    this.batch.flush();
  }
}
