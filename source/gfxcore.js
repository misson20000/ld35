import {Asset} from "./assetmanager.js";
import {JSONAssertions, FilePromiseReader} from "./util.js";

export class GFXCore {
  constructor(game, canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    
    this.black = new Color(0, 0, 0);
    this.red = new Color(255, 0, 0);
    this.green = new Color(0, 255, 0);
    this.blue = new Color(0, 0, 255);
    this.white = new Color(255, 255, 255);
    
    this.game = game;

    this.img = {data: canvas};
    
    this.ctx.save();
  }

  static createBuffer(w, h) {
    let c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    let gfx = new GFXCore(null, c);
    gfx.width = w;
    gfx.height = h;
    return gfx;
  }

  getImage() {
    return this.img;
  }
  
  resize() {
    let pw = this.width;
    let ph = this.height;
    this.width  = this.canvas.width  = window.innerWidth ;
    this.height = this.canvas.height = window.innerHeight;
    if(this.currentCamera) {
      this.lookThrough(this.currentCamera);
    }
    if(this.game) {
      if((pw != this.width || ph != this.height) && this.game.state && this.game.state.resize) {
        this.game.state.resize();
      }
    }
  }

  lookThrough(camera) {
    this.currentCamera = camera;
    this.currentCamera.update(this);
  }

  clearScreen(color) {
    this.ctx.fillStyle = color.toCSS();
    this.ctx.globalAlpha = color.alpha;
    this.ctx.save();
    this.ctx.resetTransform();
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
    this.ctx.globalAlpha = 1;
  }

  fillCircle(x, y, r, color) {
    this.ctx.fillStyle = color.toCSS();
    this.ctx.globalAlpha = color.alpha;
    this.ctx.strokeStyle = "none";
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, 2*Math.PI, false);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
  }
  
  fillRect(x, y, w, h, color) {
    this.ctx.fillStyle = color.toCSS();
    this.ctx.globalAlpha = color.alpha;
    this.ctx.strokeStyle = "none";
    this.ctx.fillRect(x, y, w, h);
    this.ctx.globalAlpha = 1;
  }

  outlineRect(x, y, w, h, color) {
    this.ctx.strokeStyle = "1px solid " + color.toCSS();
    this.ctx.globalAlpha = color.alpha;
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.globalAlpha = 1;
  }

  setTranslucency(t) {
    this.ctx.globalAlpha = t;
  }

  setBlendMode(b) {
    this.ctx.globalCompositeOperation = b;
  }
  
  drawImage(img, x, y, spin=0) {
    //for some reason it doesn't work it I put this somewhere else?
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;

    if(spin == 0) {
      this.ctx.drawImage(
        img.data, x, y);
    } else {
      this.ctx.save();
      this.ctx.translate(x+(img.data.width/2), y+(img.data.width/2));
      this.ctx.rotate(spin);
      this.ctx.drawImage(img.data, -img.data.width/2, -img.data.height/2);
      this.ctx.restore();
    }
  }

  drawSubImage(img, x, y, sx, sy, sw, sh) {
    this.ctx.mozImageSmoothingEnabled = false;
    this.ctx.webkitImageSmoothingEnabled = false;
    this.ctx.msImageSmoothingEnabled = false;
    this.ctx.imageSmoothingEnabled = false;

    this.ctx.drawImage(img.data, sx, sy, sw, sh, x, y, sw, sh);
  }
  
  drawText(txt, x, y, color) {
    this.ctx.fillStyle = color.toCSS();
    this.ctx.globalAlpha = color.alpha;
    this.ctx.font = "12px monospace";
    this.ctx.fillText(
      txt, x, y);
    this.ctx.globalAlpha = 1;

    return this.textWidth(txt);
  }

  textWidth(txt) {
    return this.ctx.measureText(txt).width;
  }
  
  imageLoader() {
    let loader = {load: (res, mgr, opt) => {
      let img = new Image();
      img.src = URL.createObjectURL(res.blob);
      return new Promise((resolve, reject) => {
        img.onload = () => {resolve(img);};
        img.onerror = reject;
        if(img.complete) { resolve(img); }
      });
    }};

    return loader;
  }

  spriteLoader() {
    let loader = {load: (res, mgr, opt) => {
      return new FilePromiseReader(res.blob).text().then((txt) => {
        return JSON.parse(txt)
      }).then((json) => {
        return mgr.promiseAsset(opt.image).then((img) => {
          return [img, json];
        });
      }).then((arr) => {
        let img = arr[0];
        let json = arr[1];
        let a = new JSONAssertions(json);
        a.isObject(json.bbox);
        a.isNumber(json.bbox.x);
        a.isNumber(json.bbox.y);
        a.isNumber(json.bbox.w);
        a.isNumber(json.bbox.h);

        a.isObject(json.size);
        a.isNumber(json.size.w);
        a.isNumber(json.size.h);
        
        let s = new Sprite(img,
                           json.size.w, json.size.h,
                           json.bbox.x, json.bbox.y,
                           json.bbox.w, json.bbox.h);
        a.isArray(json.frames);
        json.frames.forEach((frame) => {
          a.isObject(frame);
          a.isObject(frame.source);
          a.isNumber(frame.source.x);
          a.isNumber(frame.source.y);
          let sx = frame.source.x;
          let sy = frame.source.y;
          let ax, ay;
          if(frame.action_point) {
            a.isObject(frame.action_point);
            a.isNumber(frame.action_point.x);
            a.isNumber(frame.action_point.y);
            ax = frame.action_point.x;
            ay = frame.action_point.y;
          }
          s.addFrame(sx, sy, ax, ay);
        });

        a.isObject(json.animations);
        for(let name in json.animations) {
          let aj = json.animations[name];
          a.isArray(aj);
          let anim = new Animation();
          aj.forEach((instruction) => {
            a.isObject(instruction);
            if(instruction.frame != undefined) {
              a.isNumber(instruction.frame);
              let frame = instruction.frame;
              let length;
              if(instruction.length) {
                a.isNumber(instruction.length);
                length = instruction.length;
              }
              anim.addInstruction("frame", frame, length);
            } else if(instruction.loop != undefined) {
              a.isNumber(instruction.loop);
              anim.addInstruction("loop", instruction.loop);
            } else {
              throw "invalid instruction";
            }
          });
          s.addAnimation(name, anim);
        };

        return s;
      });
    }};
    return loader;
  }
}

export class Sprite {
  constructor(asset, w, h, bx, by, bw, bh) {
    this.image = asset;
    this.w = w;
    this.h = h;
    this.bx = bx;
    this.by = by;
    this.bw = bw;
    this.bh = bh;

    this.frames = [];
    this.animations = {};
  }

  addFrame(sx, sy, ax, ay) {
    this.frames.push({sx, sy, ax, ay});
  }

  addAnimation(name, anim) {
    this.animations[name] = anim;
  }
}

export class Animation {
  constructor() {
    this.instructions = [];
  }

  addInstruction(type, frame, length=null) {
    this.instructions.push({type, frame, length});
  }
}

export class Animator {
  constructor(asset) {
    this.timer = 0;
    this.frame = 0;
    this.instructionIndex = 0;
    this.sprite = asset;
    this.currentAnimation = null;
    this.nextAnimation = null;
  }

  beginNextAnimation() {
    this.currentAnimation = this.nextAnimation;
    this.nextAnimation = null;
    this.instructionIndex = 0;
    this.runInstruction();
  }

  runInstruction() {
    if(this.currentAnimation != null) {
      let a = this.sprite.data.animations[this.currentAnimation];
      if(a == null) { return; }
      if(this.instructionIndex >= a.instructions.length) {
        this.beginNextAnimation();
        return;
      }
      let i = a.instructions[this.instructionIndex++];
      if(i.type == "frame") {
        this.frame = i.frame;
        this.timer+= i.length;
        if(this.timer <= 0) {
          this.runInstruction();
        }
      }
      if(i.type == "loop") {
        if(this.nextAnimation == this.currentAnimation) {
          this.instructionIndex = i.frame;
        }
        this.runInstruction();
      }
    }
  }

  render(gfx, x, y) {
    let f = this.sprite.data.frames[this.frame];
    gfx.drawSubImage(this.sprite.data.image,
                     Math.floor(x),
                     Math.floor(y),
                     Math.floor(f.sx),
                     Math.floor(f.sy),
                     Math.floor(this.sprite.data.w),
                     Math.floor(this.sprite.data.h));
  }
  
  run(t) {
    if(this.timer != null) {
      this.timer-= t;
      if(this.timer <= 0) {
        this.runInstruction();
      }
    }
  }
  
  play(a) {
    this.nextAnimation = a;
    if(this.currentAnimation == null || this.timer == null) {
      this.beginNextAnimation();
    }
  }
}

export class Color {
  constructor(r, g, b, a=255) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
    this.alpha = a/255;
    this.css = "#" +
      (this.r < 16 ? "0" : "") + this.r.toString(16) +
      (this.g < 16 ? "0" : "") + this.g.toString(16) +
      (this.b < 16 ? "0" : "") + this.b.toString(16);
  }

  toCSS() {
    return this.css;
  }
}
