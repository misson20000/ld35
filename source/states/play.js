import {Sprite, Batch, ShapeBatch, Framebuffer} from "../webglcore.js";

import {Vector} from "../vector.js";
import {Mat3} from "../math.js";

import {Tmx} from "../tmx.js";

export class PlayState {
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
    this.shapes = new ShapeBatch(gfx);

    this.raw = new Framebuffer(gfx);
  }
    
  render() {
    this.raw.bind();
    let s = this.shapes;
    s.color(1.0, 1.0, 1.0);
    for(let x = -300; x < 300; x+= 30) {
      for(let y = -300; y < 300; y+= 30) {
        s.rect(x, y, x+20, y+20);
      }
    }
    s.flush();

    this.gfx.bindScreen();
    this.gfx.postProcess(this.assets.shader.post.tint_blue,   {"tex": this.raw.texture});
  }
}
