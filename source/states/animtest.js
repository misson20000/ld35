import {Sprite, Batch, ShapeBatch, Framebuffer} from "../webglcore.js";

import {Vector} from "../vector.js";
import {Mat3} from "../math.js";

import {Tmx} from "../tmx.js";

export class AnimTestState {
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
    this.tmpmat = new Mat3();
    this.dim = new Diamond(0, 0);
  }

  render() {
    if(this.game.input.test.justPressed()) {
      this.dim.state = "split";
    }
    
    let rock = Math.sin(this.game.gametime.now/1000)/40;
    
    this.gfx.clear();
    let s = this.shapes;

    s.mat.identity();
    s.imm_mat.identity();
    s.imm_mat.rotate(rock);
    let w = this.gfx.width/2*Math.sqrt(2);
    let h = this.gfx.height/2*Math.sqrt(2);
    let m = Math.max(w, h);
    
    //s.mat.translate(-sq/2, -sq/2);
    //s.mat.rotate(this.game.gametime.now/1000);

    // DRAW CHECKERBOARD BG
    for(let x = -w; x < w; x+= 20) {
      for(let y = -h; y < h; y+= 20) {
        if(Math.floor(x/20+y/20)%2 == 0) {
          s.color(0.025, 0.025, 0.025);
        } else {
          s.color(0.03, 0.03, 0.03);
        }
        s.rect(x, y, x+20, y+20);
      }
    }

    s.imm_mat.identity();
    s.color(0.8, 0.8, 0.8);
    this.dim.render(s, this.game.gametime.delta);
    s.flush();
  }
}

class Diamond {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.split = 0;
    this.tmpmat = new Mat3();
    this.tmpmat2 = new Mat3();
    this.state = "merge";
    this.tgtX = 200;
    this.tgtY = 200;
  }

  trapezoid(s, minx, maxx, off) {
    let miny = 25-Math.abs(minx);
    let maxy = 25-Math.abs(maxx); // NOTE: gulp compile dies if you declare 2 variables with the same name?
    if(minx < 0 && maxx <= 0) {
      s.rect(minx, -miny, maxx, miny);
      s.tri(minx, miny, maxx, miny, maxx, maxy);
      s.tri(minx, -miny, maxx, -miny, maxx, -maxy);
    } else {
      s.rect(minx, -maxy, maxx, maxy);
      s.tri(minx, miny, maxx, maxy, minx, maxy);
      s.tri(minx, -miny, maxx, -maxy, minx, -maxy);

    }
  }
  
  render(s, time) {
    if(this.state == "split" && this.split < 1) {
      this.split+= time/30;
      if(this.split >= 1) {
        this.split = 1;
        this.state = "merge";
        this.x = this.tgtX;
        this.y = this.tgtY;
        this.tgtX = -this.x;
      } else if(this.split >= 0.2 && this.tgtX == this.x && this.tgtY == this.y) {
        this.split = 0.2;
        this.state = "merge";
      }
    } else if(this.state == "merge" && this.split > 0) {
      this.split-= time/30;
      if(this.split < 0) {
        this.split = 0;
      }
    }
    
    this.tmpmat.load(s.imm_mat);
    s.imm_mat.translate(this.x, this.y);
    this.tmpmat2.load(s.imm_mat);
    let split = this.split * 25;

    s.color(0.8, 0.8, 0.8, 0);
    
    for(let x = -25; x < 25; x+= 5) {
      s.imm_mat.translate(0, split);
      this.trapezoid(s, x, x+5, split);
      split*= -1;
      s.imm_mat.load(this.tmpmat2);
    }
    s.imm_mat.load(this.tmpmat);
  }
}
