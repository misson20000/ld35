import {Sprite, LightBatch, Batch, ShapeBatch, Framebuffer} from "../webglcore.js";

import {Vector} from "../vector.js";
import {Mat3} from "../math.js";

import {Tmx} from "../tmx.js";
import {WinState} from "./win.js";

let lerp = (a, min, max) => {
  return a*(max-min) + min;
}

let meas = {
  grid: 1802/100
};

let LIGHTING = true;

export class PlayState {
  constructor(game, bgm) {
    this.bpm = 170;
    this.millispb = 60000/this.bpm;
    this.millispm = this.millispb*4; //millis per measure
    this.game = game;
    this.assets = game.assetManager.assets;

    let gfx = this.gfx = game.gfx;
    let gl = gfx.gl;
    
    gfx.flat_texture_shader = this.assets.shader.flat.texture;
    gfx.flat_color_shader = this.assets.shader.flat.color;
    gfx.light_shader = this.assets.shader.light;
    
    this.sprites = [];
    
    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    this.shapes = new ShapeBatch(gfx);
    this.sLight = new LightBatch(gfx);
    this.tmpmat = new Mat3();

    this.bgm = bgm;
    
    this.reset(true);
    
    this.fnt = this.assets.fnt.main;
    this.batch = new Batch(this.gfx);
    this.diffuse = new Framebuffer(this.gfx);
    this.light = new Framebuffer(this.gfx);
  }  

  reset(first=false) {
    this.game.gametime.now = 0;
    
    this.bgm.aud.currentTime = 0;
    this.bgm.gain.gain.setTargetAtTime(1.0, this.game.sfx.ctx.currentTime, 0.1);
    this.bgm.gain.gain.value = 1.0;
    
    this.deadscreen = {
      txtpos: 1,
      txttgt: 1,
      wallpos: -1,
      walltgt: 1
    };
    
    this.lastsplit = this.game.gametime.now;
    this.player = {
      x: 0,
      y: 0,
      split: 0,
      splitState: "break",
      targetx: 0,
      targety: 0,
      hp: 3,
      death: 0
    };
    this.grid = {
      state: "square",
      play: this,
      x: 0,
      y: 0,
      yspeed: 4/this.millispm,
      yspeed_tgt: 4/this.millispm,
      orientation: 0, //0: vertical 1: horizontal
      orientation_tgt: 0,
      lines: 2,
      lines_tgt: 2,
      kaboom: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      bullet_dir: -1
    };
    this.ambient = {
      r: 1,
      g: 1,
      b: 1
    };
    this.obcolor = {
      r: 1,
      g: 1,
      b: 1
    };

    this.bullets = [];
    
    this.oblightamp = 0;
    this.oblightoff = 1.5;
    this.state = 0;
    this.genObstacles(this.assets.tex.level);
    this.dead = false;
    this.blendext = this.gfx.gl.getExtension("EXT_blend_minmax");

    this.shake = {
      intensity: 0,
      x: 0,
      y: 0,
      xoff: Math.random()*2*Math.PI,
      xpermult: Math.random()+0.5,
      ypermult: Math.random()+0.5
    };
    
    if(this.blendext) {
      this.lightblend = this.blendext.MAX_EXT;
    } else {
      this.lightblend = this.gfx.gl.ADD;
    }
  }
  
  genObstacles(ast) {
    let cnv = document.createElement("canvas");
    let ctx = cnv.getContext("2d");

    cnv.width = ast.img.width;
    cnv.height = ast.img.height;

    ctx.drawImage(ast.img, 0, 0, ast.img.width, ast.img.height);
    let dat = ctx.getImageData(0, 0, ast.img.width, ast.img.height);

    this.obstacles = [];
    
    for(let i = 0; i < dat.data.length; i+=4) {
      let idx = i/4;
      let x = idx%dat.width;
      let y = dat.height - Math.floor(idx/dat.width);

      if(dat.data[i+1] == 0) {
        if(dat.data[i] == 0) {
          this.obstacles.push(new Obstacle(x-3, y, this.grid));
        } else {
          this.obstacles.push(new Bomb(x-3, y, this.grid));
        }
      }
    }
  }
  
  shiftTo(x, y) {
    this.player.targetx = x;
    this.player.targety = y;
    this.player.splitState = "break";
  }

  shiftDelta(x, y) {
    if(this.grid.orientation > 0.5) {
      let tmp = x
      x = y
      y = -tmp
    }
    this.player.targetx+= x;
    this.player.targety+= y;
    this.player.splitState = "break";
  }

  approachGrid(val, tgt, change) {
    if(this.grid[val] > this.grid[tgt]) {
      this.grid[val]-= change;
      if(this.grid[val] < this.grid[tgt]) {
        this.grid[val] = this.grid[tgt];
      }
    } else if(this.grid[val] < this.grid[tgt]) {
      this.grid[val]+= change;
      if(this.grid[val] > this.grid[tgt]) {
        this.grid[val] = this.grid[tgt];
      }
    }
  }

  die() {
    this.deadscreen.txttgt = 0;
    this.deadscreen.tod = this.game.gametime.now;
    this.dead = true;
    this.bgm.gain.gain.setTargetAtTime(0, this.game.sfx.ctx.currentTime, 0.2);
  }

  drawPlayer(s, sf) {
    let margin = 9;
    let split = this.player.split;
    //let offx = 25*split;
    let offy = (30-(2*margin))/-2*split;

    s.imm_mat.identity();
    s.imm_mat.rotate(this.player.split*Math.PI/8);
    s.imm_mat.translate(this.player.x, this.player.y + this.grid.y);
    s.imm_mat.rotate(this.grid.orientation*Math.PI/2);
    s.imm_mat.scale(sf);
    
    //s.rect(offx, offy, offx+30, offy+margin);
    //s.tri(offx, offy+margin, offx+30, offy+margin, offx+0, offy+30-margin);

    //s.tri(-offx, 30-margin-offy, 30-offx, 30-margin-offy, 30-offx, margin-offy);
    //s.rect(-offx, 30-margin-offy, 30-offx, 30-offy);

    let psz = 1/5;
    
    s.tri(-psz, -psz, 0, -psz, -psz, 0);
    s.tri(0, -psz, psz, -psz, psz, 0);
    s.tri(-psz, psz, -psz, 0, 0, psz);
    s.tri(0, psz, psz, psz, psz, 0);


    switch(this.player.hp) {
    case 3:
      s.tri(0, 0, -psz, 0, 0, -psz);
    case 2:
      s.tri(0, 0, psz, 0, 0, -psz);
    case 1:
      s.tri(0, 0, psz, 0, 0, psz);
    case 0:
      s.tri(0, 0, -psz, 0, 0, psz);
    }
  }

  applyShake(mult=1) {
    this.shapes.imm_mat.translate(mult*this.shake.x, mult*this.shake.y);
  }

  applyShakeLight(mult=1) {
    this.sLight.imm_mat.translate(mult*this.shake.x, mult*this.shake.y);
  }
  
  render() {
    this.shake.x = (Math.random()*2-1)*this.shake.intensity;
    this.shake.y = (Math.random()*2-1)*this.shake.intensity;
    this.shake.intensity-= this.shake.intensity * Math.pow(0.9, this.game.gametime.delta);
    
    this.bgm.aud.playbackRate = this.game.gametime.factor;
    this.bgm.aud.preservedPitch = false;
    this.bgm.aud.mozPreservesPitch = false;
    this.bgm.aud.webkitPreservesPitch = false;
    
    let gl = this.gfx.gl;
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if(LIGHTING) {
      this.diffuse.bind();
    } else {
      this.gfx.bindScreen();
    }
    let frozen = this.dead;
    
    this.deadscreen.txtpos+= (this.deadscreen.txttgt - this.deadscreen.txtpos) * Math.pow(0.9, this.game.gametime.delta);
    this.deadscreen.wallpos+= (this.deadscreen.walltgt - this.deadscreen.wallpos) * Math.pow(0.9, this.game.gametime.delta);
    if(this.dead && this.game.gametime.now - this.deadscreen.tod > 1500) {
      this.deadscreen.txttgt = 2;
      this.deadscreen.walltgt = -1;
    }
    if(this.dead && this.deadscreen.wallpos < -0.99) {
      this.reset();
    }
    
    // handle input
    if(!frozen) {
      if(this.game.input.left.justPressed()) {
        this.shiftDelta(-1, 0);
      }
      if(this.game.input.right.justPressed()) {
        this.shiftDelta(1, 0);
      }
      if(this.game.input.up.justPressed()) {
        this.shiftDelta(0, -1);
      }
      if(this.game.input.down.justPressed()) {
        this.shiftDelta(0, 1);
      }
      
      switch(this.state) {
      case 0:
        if(this.game.gametime.now > this.millispm*4) {
          this.ambient.r = 0.2;
          this.ambient.g = 0.2;
          this.ambient.b = 0.2;
          this.obcolor.r = 1;
          this.obcolor.g = 1;
          this.obcolor.b = 1;
          this.oblightamp = 0;
          this.oblightoff = 1;
          
          this.state++;
        }
        break;
      case 1:
        if(this.game.gametime.now > this.millispm*8) {
          this.ambient.r = 0;
          this.ambient.g = 0;
          this.ambient.b = 0;
          this.obcolor.oscillate = [
            {r: 1, g: 0, b: 0},
            {r: 1, g: 1, b: 0},
            {r: 0, g: 0, b: 1},
            {r: 0, g: 1, b: 0}
          ];
          this.oblightamp = 2;
          this.oblightoff = 2;
          this.state++;
        }
        break;
      case 2:
        if(this.game.gametime.now > this.millispb*28) {
          this.grid.lines_tgt = 4;
          this.state++;
        }
        break;
      case 3:
        if(this.game.gametime.now > this.millispm*16) {
          this.grid.yspeed_tgt = 6/this.millispm;
          this.state++;
        }
        break;
      case 4:
        if(this.game.gametime.now > this.millispm*20) {
          this.grid.yspeed_tgt = 4/this.millispm;
          this.state++;
        }
        break;
      case 5:
        if(this.game.gametime.now > this.millispm*22) {
          this.grid.lines_tgt = 2;
          this.state++;
        }
      case 6:
        if(this.game.gametime.now > this.millispb*26*4) {
          this.grid.yspeed_tgt = 0;
          this.obcolor.oscillate = null;
          this.ambient.r = 0.2;
          this.ambient.g = 0.2;
          this.ambient.b = 0.2;
          this.obcolor.r = 1;
          this.obcolor.g = 1;
          this.obcolor.b = 1;
          this.oblightamp = 0.5;
          this.oblightoff = 1;

          this.state++;
        }
        break;
      case 7:
        if(this.game.gametime.now > this.millispb*28*4) {
          this.game.gametime.factor = 1;
          this.grid.orientation_tgt = 1;
          this.grid.bullet_dir = 1;
          this.state++;
        }
        break;
      case 8:
        if(this.game.gametime.now > this.millispb*30*4) {
          this.grid.yspeed_tgt = 4/this.millispm;
          this.state++;
        }
        break;
      case 9:
        if(this.game.gametime.now > this.millispb*30*4) {
          this.grid.yspeed_tgt = -4/this.millispm;
          for(let i = 0; i < this.obstacles.length; i++) {
            this.obstacles[i].kill();
          }
          this.genObstacles(this.assets.tex.level2);
          this.ambient.r = 0.2;
          this.ambient.g = 0;
          this.ambient.b = 0;
          this.obcolor.oscillate = [
            {r: 1, g: 0, b: 0},
            {r: 1, g: 0.6, b: 0},
            {r: 1, g: 0, b: 0},
            {r: 1, g: 0.6, b: 0}
          ];
          this.oblightamp = 2;
          this.oblightoff = 2;

          this.state++;
        }
        break;
      case 10:
        if(this.game.gametime.now > this.millispm*35.75) {
          this.grid.yspeed_tgt = -6/this.millispm;
          this.state++;
        }
        break;
      case 11:
        if(this.game.gametime.now > this.millispm*40) {
          this.grid.yspeed_tgt = -2/this.millispm;
          this.state++;
        }
        break;
      case 12:
        if(this.game.gametime.now > this.millispm*44) {
          this.grid.yspeed_tgt = -4/this.millispm;
          this.grid.lines_tgt = 4;
          this.ambient.r = 0;
          this.ambient.g = 0;
          this.ambient.b = 0;
          this.obcolor.oscillate = [
            {r: 1, g: 0, b: 0},
            {r: 1, g: 1, b: 0},
            {r: 0, g: 0, b: 1},
            {r: 0, g: 1, b: 0}
          ];
          this.oblightamp = 2;
          this.oblightoff = 2;

          this.state++;
        }
        break;
      case 13:
        if(this.game.gametime.now > this.millispm*52) {
          this.grid.yspeed_tgt = -2/this.millispm;
          this.state++;
        }
        break;
      case 14:
        if(this.game.gametime.now > this.millispm*58) {
          this.game.state = new WinState(this);
        }
      }
    }
    
    // animate and move player
    let t = 50;
    if(this.player.splitState == "break") {
      this.player.split+= this.game.gametime.delta/t;
      if(this.player.split > 1) {
        this.player.split = 1;
        let tx = this.player.targetx;
        let ty = this.player.targety;
        if(tx <= -this.grid.lines) {
          this.player.targetx = this.player.x;
          this.player.targety = this.player.y;
        }
        if(tx >= this.grid.lines) {
          this.player.targetx = this.player.x;
          this.player.targety = this.player.y;
        }
        for(let i = 0; i < this.obstacles.length; i++) {
          if(this.obstacles[i].collides(tx, ty)) {
            this.obstacles[i].doSplit();
            this.player.targetx = this.player.x;
            this.player.targety = this.player.y;
            this.player.hp--;
            if(this.player.hp < 0) {
              this.die();
            }
            this.game.sfx.playSound(this.assets.sfx.hit);
          }
        }
        this.player.x = this.player.targetx;
        this.player.y = this.player.targety;
        this.player.splitState = "merge";
      }
    }
    
    if(this.player.splitState == "merge") {
      this.player.split-= this.game.gametime.delta/t;
      if(this.player.split < 0) {
        this.player.split = 0;
        this.player.splitState = "merged";
      }
    }

    if(!frozen) {
      // handle grid transitions
      this.approachGrid("yspeed", "yspeed_tgt", this.game.gametime.delta);
      this.approachGrid("orientation", "orientation_tgt", this.game.gametime.delta/2000);
      this.approachGrid("lines", "lines_tgt", this.game.gametime.delta/2000);

      this.grid.y+= this.game.gametime.delta*this.grid.yspeed;
    }
    
    let rock = Math.sin(this.game.gametime.now/1000)/40;
    
    this.gfx.clear();
    let s = this.shapes;
    
    s.mat.identity();
    s.imm_mat.identity();
    this.applyShake(10);
    s.imm_mat.rotate(rock);
    let w = this.gfx.width/2*Math.sqrt(2);
    let h = this.gfx.height/2*Math.sqrt(2);
    let m = Math.max(w, h);
    
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
    
    // DRAW LINES
    
    let pixel = 18/this.gfx.width;
    let sf = this.gfx.width/18;
    
    m*= pixel;

    if(!this.frozen) {      
      if(this.game.input.fire.justPressed()) {
        this.bullets.push({x: this.player.x, y: this.player.y, oy: this.player.y});
      }
    }
    
    s.imm_mat.identity();
    this.applyShake();
    s.imm_mat.scale(sf);
    s.imm_mat.rotate(this.grid.orientation*Math.PI/2);

    // DRAW DANGER LINES
    s.color(0.8, 0.07, 0.07);
    let allowed_range = 4;

    s.rect(-this.grid.lines+1, allowed_range, this.grid.lines-1, allowed_range+pixel);
    s.rect(-this.grid.lines+1, -allowed_range, this.grid.lines-1, -allowed_range+pixel);

    if(!this.dead && Math.abs(this.player.y + this.grid.y) > 4) {
      this.die();
    }

    if(!this.dead && this.grid.kaboom[10+this.player.x] > 0.9) {
      this.die();
    }
    
    // DRAW GRID LINES

    // horiz
    s.color(0.07, 0.07, 0.07);
    for(let y = 0; y <= m; y+= 1) {      
      s.rect(-Math.round(this.grid.lines)+1, y+this.grid.y%1, Math.round(this.grid.lines)-1, y+pixel+this.grid.y%1);
      s.rect(-Math.round(this.grid.lines)+1, -y+this.grid.y%1, Math.round(this.grid.lines)-1, -y+pixel+this.grid.y%1);
    }

    //vert
    for(let x = 0; x <= this.grid.lines; x++) {
      if(this.grid.kaboom[10+x] > 0) {
        this.grid.kaboom[10+x]-= this.game.gametime.delta/1000;
        if(this.grid.kaboom[10+x] < 0) {
          this.grid.kaboom[10+x] = 0;
        }
      }
      if(this.grid.kaboom[10-x] > 0) {
        this.grid.kaboom[10-x]-= this.game.gametime.delta/1000;
        if(this.grid.kaboom[10-x] < 0) {
          this.grid.kaboom[10-x] = 0;
        }
      }
      let ak = this.grid.kaboom[10+x];
      let bk = this.grid.kaboom[10-x];
      let ahw = ak*0.3/2+pixel/2;
      let bhw = bk*0.3/2+pixel/2;
      s.color(lerp(ak, 0.5, 1.0), lerp(ak, 0.5, 69/255), lerp(ak, 0.5, 0));
      s.rect(x-ahw, -m, x+ahw, lerp(this.grid.lines-x, -m, m));
      s.color(lerp(bk, 0.5, 1.0), lerp(bk, 0.5, 69/255), lerp(bk, 0.5, 0));
      s.rect(-x-bhw, -m, -x+bhw, lerp(this.grid.lines-x, -m, m));
    }


    s.imm_mat.identity();
    this.applyShake();
    s.imm_mat.translate(0, this.grid.y);
    s.imm_mat.rotate(this.grid.orientation*Math.PI/2);
    s.imm_mat.scale(sf);
    
    //bullets
    s.color(1.0, 1.0, 1.0);
    for(let i = 0; i < this.bullets.length; i++) {
      let b = this.bullets[i];
      let del = false;
      for(let j = 0; j < this.obstacles.length; j++) {
        if(this.obstacles[j].bullet(b, this.game.gametime.now)) {
          this.bullets.splice(i, 1);
          this.shake.intensity+= 0.2;
          i--;
          del = true;
          break;
        }
      }
      if(del) {
        continue;
      }

      s.rect(b.x-3*pixel, Math.min(b.y+2, b.oy), b.x+3*pixel, b.y);
      
      b.y += this.grid.bullet_dir*this.game.gametime.delta/50;
    }
    
    s.color(0.8, 0.8, 0.8);
    s.imm_mat.identity();
    this.applyShake();
    s.imm_mat.translate(0, this.grid.y);

    for(let i = 0; i < this.obstacles.length; i++) {
      this.obstacles[i].render(s, this.game.gametime, this.grid, sf);
    }

    // DRAW PLAYER
    this.drawPlayer(s, sf);
    
    s.flush();

    this.batch.flush();

    if(LIGHTING) {
      this.light.bind();
      gl.blendEquation(this.lightblend);
      gl.blendFunc(gl.ONE, gl.ONE);

      this.gfx.clear(this.ambient.r, this.ambient.g, this.ambient.b);

      this.sLight.imm_mat.identity();
      this.applyShakeLight();
      this.sLight.imm_mat.scale(sf);
      this.sLight.imm_mat.rotate(this.grid.orientation*Math.PI/2);

      // DRAW GRID LIGHTS

      let gridrad = sf*0.3;

      this.sLight.color(1, 0, 0, 1);
      this.sLight.line(-this.grid.lines+1, allowed_range, this.grid.lines-1, allowed_range, gridrad, gridrad*sf);
      this.sLight.line(-this.grid.lines+1, -allowed_range, this.grid.lines-1, -allowed_range, gridrad, gridrad*sf);

      
      this.sLight.color(1, 1, 1, 0.4);
      for(let y = 0; y <= m; y+= 1) {      
        this.sLight.line(-this.grid.lines+1, y+this.grid.y%1, this.grid.lines-1, y+this.grid.y%1, gridrad, gridrad*sf);
        if(y != 0) {
          this.sLight.line(-this.grid.lines+1, -y+this.grid.y%1, this.grid.lines-1, -y+this.grid.y%1, gridrad, gridrad*sf);
        }
      }
      
      for(let x = 0; x <= this.grid.lines; x++) {
        let ak = this.grid.kaboom[10+x];
        let bk = this.grid.kaboom[10-x];

        let ar = gridrad + 0.3*ak;
        let br = gridrad + 0.3*bk;
        
        let r,g,b;
        
        if(x + 1 >= this.grid.lines) {
          r = 0;
          g = 1;
          b = 0;
        } else {
          r = 1;
          b = 1;
          g = 1;
        }

        this.sLight.color(lerp(ak, r, 1.0), lerp(ak, g, 69/255), lerp(ak, b, 0));
        this.sLight.line(x, -m, x, lerp(this.grid.lines-x, -m, m), ar, ar*sf);
        
        if(x != 0) {
          this.sLight.color(lerp(bk, r, 1.0), lerp(bk, g, 69/255), lerp(bk, b, 0));
          this.sLight.line(-x, -m, -x, lerp(this.grid.lines-x, -m, m), br, br*sf);
        }
      }

      this.sLight.imm_mat.identity();
      this.applyShakeLight();
      this.sLight.imm_mat.translate(0, this.grid.y);
      this.sLight.imm_mat.rotate(this.grid.orientation*Math.PI/2);
      this.sLight.imm_mat.scale(sf);
      
      //bullets
      this.sLight.color(0.0, 0.0, 1.0, 1.0);
      for(let i = 0; i < this.bullets.length; i++) {
        let b = this.bullets[i];
        this.sLight.line(b.x, Math.min(b.y+2, b.oy), b.x, b.y, sf, sf*sf);
      }
      

      this.sLight.flush();

      gl.disable(gl.BLEND);
      
      // OBSCURE GRID LIGHTS
      if(!(this.ambient.r == this.ambient.g == this.ambient.b == 1)) {
        s.color(0.1, 0.1, 0.1, 1.0);
        this.drawPlayer(s, sf);
        
        s.imm_mat.identity();
        this.applyShakeLight();
        s.imm_mat.translate(0, this.grid.y);
        
        for(let i = 0; i < this.obstacles.length; i++) {
          this.obstacles[i].render(s, this.game.gametime, this.grid, sf, false);
        }
        s.flush();
      }

      gl.enable(gl.BLEND);
      gl.blendEquation(this.lightblend);
      gl.blendFunc(gl.ONE, gl.ONE);
      
      this.sLight.imm_mat.identity();
      this.applyShakeLight();
      this.sLight.imm_mat.translate(0, this.grid.y);    
      
      let rad = (
        Math.sin((this.game.gametime.now/this.millispb)*2*Math.PI)
          *this.oblightamp)+(this.oblightoff);

      let obc = this.obcolor;
      if(this.obcolor.oscillate) {
        obc = this.obcolor.oscillate[Math.floor((this.game.gametime.now/this.millispm)%this.obcolor.oscillate.length)];
      }
      this.sLight.color(obc.r, obc.g, obc.b, 1.0);
      for(let i = 0; i < this.obstacles.length; i++) {
        this.obstacles[i].renderLight(this.sLight, this.game.gametime.delta, this.grid, sf, rad);
      }

      this.sLight.flush();
      
      this.gfx.bindScreen();
      this.gfx.postProcess(this.assets.shader.post.light, {
        diffuse: this.diffuse.texture,
        light: this.light.texture
      });
    }

    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    
    s.color(0.01, 0.01, 0.01, 1);
    s.imm_mat.identity();
    s.rect(-this.gfx.width/2, this.gfx.height/2*this.deadscreen.wallpos, this.gfx.width/2, this.gfx.height/2*this.deadscreen.wallpos + this.gfx.height);
    s.flush();
    
    this.fnt.draw(this.batch, -this.gfx.width*3/8, this.deadscreen.txtpos*this.gfx.height-6, "dead", 1, 1, 1);
    this.batch.flush();

    for(let i = 0; i < this.obstacles.length; i++) {
      if(this.obstacles[i].dead) {
        this.obstacles[i].splice(i, 1);
        i--;
      }
    }
  }
}

class Obstacle {
  constructor(x, y, grid) {
    this.x = x;
    this.y = y*-1;
    this.grid = grid;
    this.split = 0;
    this.tmpmat = new Mat3();
    this.tmpmat2 = new Mat3();
    this.state = "merge";
    this.tgtX = this.x;
    this.tgtY = this.y;
    this.oscstates = [];
    this.oscspeed = 0;
    this.osctimer = 0;
    this.oscindex = 0;
    this.visible = true;
    this.visible_tgt = true;
    this.dying = false;
  }

  kill() {
    this.invis();
    this.dying = true;
  }
  
  invis() {
    if(this.visible_tgt) {
      this.visible_tgt = false;
      this.doSplit();
    }
  }

  vis() {
    if(!this.visible_tgt) {
      this.visible = true;
      this.visible_tgt = true;
      this.split = 0;
      this.state = "merge";
    }
  }
  
  oscillate(states, speed) {
    this.oscspeed = speed;
    this.oscstates = states;
    this.osctimer = speed;
    this.oscindex = 0;
    return this;
  }

  collides(x, y) {
    return this.visible_tgt && x == this.x && y == this.y;
  }

  bullet(b, time) {
    if(this.visible) {
      if(this.grid.bullet_dir < 0) {
        if(b.x == this.x && b.y > this.y - 1/2 && b.y < this.y + 1/5) {
          this.doSplit();
          return true;
        }
      } else {
        if(b.x == this.x && b.y > this.y - 1/5 && b.y < this.y + 1/2) {
          this.doSplit();
          return true;
        }

      }
    }
    return false;
  }
  
  doSplit() {
    this.state = "split";
  }
  
  warpTo(x, y) {
    this.tgtX = x;
    this.tgtY = y*-1;
    this.state = "split";
  }
  
  trapezoid(s, minx, maxx) {
    let miny = 1/4-Math.abs(minx);
    let maxy = 1/4-Math.abs(maxx); // NOTE: gulp compile dies if you declare 2 variables with the same name?
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

  renderLight(s, time, grid, sf, rad) {
    if(this.visible) {
      this.tmpmat.load(s.imm_mat);
      s.imm_mat.translate(this.x, this.y);
      s.imm_mat.rotate(this.grid.orientation*Math.PI/2);
      s.imm_mat.scale(sf);
      s.point(0, 0, rad*4, rad*sf);
      s.imm_mat.load(this.tmpmat);
    }
  }
  
  render(s, time, grid, sf, logic=true) {
    if(Math.abs(this.x) + 1 > grid.lines + 0.5) {
      this.invis();
    } else {
      if(!this.dying) {
        this.vis();
      }
    }
    
    if(this.oscspeed > 0) {
      this.osctimer-= time.delta;
      if(this.osctimer <= 0) {
        this.oscindex++;
        if(this.oscindex >= this.oscstates.length) {
          this.oscindex-= this.oscstates.length;
        }
        let state = this.oscstates[this.oscindex];
        if(state == null) {
          this.invis();
        } else {
          this.warpTo(this.oscstates[this.oscindex], -this.y);
          this.vis();
        }
        this.osctimer = this.oscspeed;
      }
    }
    
    if(this.state == "split" && this.split < 1) {
      this.split+= time.delta/30;
      if(this.split >= 1) {
        this.split = 1;
        this.state = "merge";
        this.x = this.tgtX;
        this.y = this.tgtY;
        this.visible = this.visible_tgt;
        if(this.dying) {
          this.dead = true;
        }
      } else if(this.split >= 0.2 && this.tgtX == this.x && this.tgtY == this.y && this.visible == this.visible_tgt && !this.dying) {
        this.split = 0.2;
        this.state = "merge";
        this.visible = this.visible_tgt;
      }
    } else if(this.state == "merge" && this.split > 0) {
      this.split-= time.delta/30;
      if(this.split < 0) {
        this.split = 0;
      }
    }

    if(this.visible) {
      this.tmpmat.load(s.imm_mat);
      s.imm_mat.translate(this.x, this.y);
      s.imm_mat.rotate(this.grid.orientation*Math.PI/2);
      this.tmpmat2.load(s.imm_mat);
      let split = this.split/4;
      
      for(let x = -1/4; x < 1/4; x+= 1/20) {
        s.imm_mat.translate(0, split);
        s.imm_mat.scale(sf);
        this.trapezoid(s, x, x+1/20);
        split*= -1;
        s.imm_mat.load(this.tmpmat2);
      }
      s.imm_mat.load(this.tmpmat);
    }
  }

}


class Bomb {
  constructor(x, y, grid) {
    this.x = x;
    this.y = y*-1;
    this.grid = grid;
    this.split = 3;
    this.tmpmat = new Mat3();
    this.tmpmat2 = new Mat3();
    this.state = "merge";
    this.tgtX = this.x;
    this.tgtY = this.y;
    this.oscstates = [];
    this.oscspeed = 0;
    this.osctimer = 0;
    this.oscindex = 0;
    this.visible = true;
    this.visible_tgt = true;
    this.dying = false;
  }

  invis() {
    if(this.visible_tgt) {
      this.visible_tgt = false;
      this.doSplit();
    }
  }

  kill() {
    this.invis();
    this.dying = true;
  }
  
  vis() {
    if(!this.visible_tgt) {
      this.visible = true;
      this.visible_tgt = true;
      this.split = 3;
      this.state = "merge";
    }
  }
  
  oscillate(states, speed) {
    this.oscspeed = speed;
    this.oscstates = states;
    this.osctimer = speed;
    this.oscindex = 0;
    return this;
  }

  collides(x, y) {
    return this.visible_tgt && x == this.x && y == this.y;
  }

  bullet(b, time) {
    if(this.visible && b.x == this.x && b.y < this.y + 1/5 && b.y > this.y - 2) {
      this.visible_tgt = true;
      this.doSplit();
      this.hit = true;
      this.hitTimer = 500;
      return true;
    }
    return false;
  }
  
  doSplit() {
    this.state = "split";
  }
  
  warpTo(x, y) {
    this.tgtX = x;
    this.tgtY = y*-1;
    this.state = "split";
  }
  
  trapezoid(s, minx, maxx) {
    let miny = 1/4-Math.abs(minx);
    let maxy = 1/4-Math.abs(maxx); // NOTE: gulp compile dies if you declare 2 variables with the same name?
    if(minx < 0 && maxx <= 0) {
      s.tri(minx, miny, maxx, miny, maxx, maxy);
      s.tri(minx, -miny, maxx, -miny, maxx, -maxy);
      if(minx > -1/4) {
        s.tri(minx, miny, maxx, miny, minx, miny-1/20);
        s.tri(minx, -miny, maxx, -miny, minx, -miny+1/20);
      }
    } else {
      s.tri(minx, miny, maxx, maxy, minx, maxy);
      s.tri(minx, -miny, maxx, -maxy, minx, -maxy);
      if(maxx < 1/4) {
        s.tri(minx, maxy, maxx, maxy, maxx, maxy-1/20);
        s.tri(minx, -maxy, maxx, -maxy, maxx, -maxy+1/20);
      }
    }
  }

  renderLight(s, time, grid, sf, rad) {
    if(this.visible) {
      this.tmpmat.load(s.imm_mat);
      s.imm_mat.translate(this.x, this.y);
      s.imm_mat.rotate(this.grid.orientation*Math.PI/2);
      s.imm_mat.scale(sf);
      s.point(0, 0, rad*4, rad*sf);
      s.imm_mat.load(this.tmpmat);
    }
  }
  
  render(s, time, grid, sf, logic=true) {
    if(logic) {
      this.hitTimer-= time.delta;
      if(this.hit && !this.boom && this.hitTimer <= 0) {
        this.invis();
        grid.kaboom[this.x+10] = 1;
        grid.play.shake.intensity = 0.6;
        this.boom = true;
      }
      
      if(Math.abs(this.x) + 1 > grid.lines + 0.5) {
        this.invis();
      } else {
        if(!this.hit && !this.boom && !this.dying) {
          this.vis();
        }
      }

      if(this.boom) {
        this.invis();
      }
      
      if(this.oscspeed > 0) {
        this.osctimer-= time.delta;
        if(this.osctimer <= 0) {
          this.oscindex++;
          if(this.oscindex >= this.oscstates.length) {
            this.oscindex-= this.oscstates.length;
          }
          let state = this.oscstates[this.oscindex];
          if(state == null) {
            this.invis();
          } else {
            this.warpTo(this.oscstates[this.oscindex], -this.y);
            this.vis();
          }
          this.osctimer = this.oscspeed;
        }
      }
      
      if(this.state == "split" && this.split < 1) {
        this.split+= time.delta/30;
        if(this.split >= 1) {
          this.split = 1;
          this.state = "merge";
          this.x = this.tgtX;
          this.y = this.tgtY;
          this.visible = this.visible_tgt;
          if(this.dying) {
            this.dead = true;
          }
        } else if(this.split >= 0.2 && this.tgtX == this.x && this.tgtY == this.y && this.visible == this.visible_tgt && !this.dying) {
          this.split = 0.2;
          this.state = "merge";
          this.visible = this.visible_tgt;
        }
      } else if(this.state == "merge" && this.split > 0) {
        this.split-= time.delta/30;
        if(this.split < 0) {
          this.split = 0;
        }
      }
    }

    if(this.visible) {
      this.tmpmat.load(s.imm_mat);
      s.imm_mat.translate(this.x, this.y);
      s.imm_mat.rotate(this.grid.orientation*Math.PI/2);
      this.tmpmat2.load(s.imm_mat);
      let split = this.split/4;
      
      for(let x = -1/4; x < 1/4; x+= 1/20) {
        s.imm_mat.translate(0, split);
        s.imm_mat.scale(sf);
        this.trapezoid(s, x, x+1/20);
        split*= -1;
        s.imm_mat.load(this.tmpmat2);
      }

      if(this.hit) {
        s.imm_mat.load(this.tmpmat);
        s.imm_mat.translate(this.x, this.y);
        s.imm_mat.rotate(this.grid.orientation*Math.PI/2);
        s.imm_mat.scale(sf);

        s.rect(-1/8, -1/8, 1/8, 1/8);
      }
      
      s.imm_mat.load(this.tmpmat);
    }
  }

}

