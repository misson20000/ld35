import {Asset} from "./assetmanager.js";
import {Mat3} from "./math.js";

export class WebGLCore {
  constructor(game, canvas, dbg) {
    this.canvas = canvas;
    this.game = game;
    this.gl = canvas.getContext("webgl");
    this.dbg = dbg;
    
    if(!this.gl) {
      throw "Failed to initialize WebGL context";
    }

    let gl = this.gl;
    
    this.initialize();

    let texid = 1;

    this.post_vbo = gl.createBuffer();
    let data = Float32Array.from(
      [ 1.0,  1.0,
       -1.0,  1.0,
        1.0, -1.0,

       -1.0, -1.0,
        1.0, -1.0,
       -1.0,  1.0]);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.post_vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    
    game.assetManager.addProvider((def, astmgr, resmgr) => {
      // webglcore provider
      if(def.type == "textureatlas") {
        if(def.id) {
          if(!def.pack) {
            throw "no packfile"
          }
          return resmgr.queue(def.pack).then((res) => {
            return res.text();
          }).then((txt) => {
            return astmgr.getAsset(def.id).provide(new Promise((resolve, reject) => {
              let lines = txt.split("\n");
              let page = null;
              let sprite = null;
              let spriteName = null;
              let spriteIndex = null;

              let obj = {};

              let loadSprite = (spr, name, idx) => {
                if(name.startsWith("spr_")) {
                  name = name.slice(4);
                }
                if(!obj[name]) {
                  obj[name] = [];
                }
                obj[name][idx] = spr;
              }
              
              let readLine = (i) => {
                if(i >= lines.length) {
                  if(sprite && spriteName) {
                    loadSprite(sprite, spriteName, spriteIndex);
                  } else {
                    resolve(obj);
                  }
                  return;
                }
                let ln = lines[i];
                if(ln.length == 0) {
                  if(sprite && spriteName) {
                    loadSprite(sprite, spriteName, spriteIndex);
                  }
                  page = null;
                  sprite = null;
                  readLine(i+1);
                  return;
                }
                if(page == null) {
                  let fname = ln;
                  if(ln.lastIndexOf(".") > 0) {
                    fname = ln.slice(0, ln.lastIndexOf("."));
                  }
                  
                  astmgr.load({
                    type: "texture",
                    id: def.texid_root + "." + fname,
                    image: def.dir + "/" + ln
                  }).then((tex) => {
                    page = tex;
                    readLine(i+1);
                  });
                  return;
                }
                
                if(!ln.startsWith("  ")) {
                  if(ln.includes(": ")) {
                    // ignore
                  } else {
                    if(sprite && spriteName) {
                      loadSprite(sprite, spriteName, spriteIndex);
                    }
                    spriteName = ln;
                    spriteIndex = null;
                    sprite = new Sprite(page);
                  }
                  readLine(i+1);
                  return;
                }
                
                if(ln.startsWith("  ")) {
                  if(!sprite) {
                    throw "no active sprite";
                  }
                  let parts = ln.slice(2).split(": ");
                  if(parts[0] == "rotate") {
                    //ignore
                  } else if(parts[0] == "xy") {
                    let xy = parts[1].split(", ");
                    sprite.setSourcePos(parseInt(xy[0]), parseInt(xy[1]));
                  } else if(parts[0] == "size") {
                    let wh = parts[1].split(", ");
                    sprite.setDestSize(parseInt(wh[0]), parseInt(wh[1]));
                  } else if(parts[0] == "orig") {
                    let wh = parts[1].split(", ");
                    sprite.setSourceSize(parseInt(wh[0]), parseInt(wh[1]));
                  } else if(parts[0] == "offset") {
                    //ignore
                  } else if(parts[0] == "index") {
                    spriteIndex = parseInt(parts[1]);
                  }
                  readLine(i+1);
                  return;
                }
                
                throw "bad line: " + i;
              };
              
              readLine(0);
            }));
          });
        } else {
          throw "no id"
        }
      }
      
      if(def.type == "font") {
        if(def.id) {
          let ast = astmgr.getAsset(def.id);
          if(!def.tex) {
            throw "no texture specified";
          }
          if(!def.meta) {
            throw "no meta specified";
          }

          let tex = astmgr.getAsset(def.tex);
          ast.addDependency(tex);
          
          return ast.provide(resmgr.queue(def.meta).then((res) => {
            return res.xml();
          }).then((xml) => {
            return tex.promise().then((tex_obj) => {
              return new Font(this, xml, tex_obj, def.scale); //don't have to check def.scale
            });
          }));
        } else {
          throw "no id";
        }
      }
      if(def.type == "texture") {
        if(def.id) {
          let ast = astmgr.getAsset(def.id);
          if(!def.image) {
            throw "no source image";
          }
          
          return ast.provide(resmgr.queue(def.image).then((res) => {
            return res.image()
          }).then((img) => {
            let tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);

            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.bindTexture(gl.TEXTURE_2D, null);
            this.dbg.log("LOAD TEXTURE IMG <" + def.image + "> ID " + texid);
            return {
              tex,
              img,
              id: texid++
            };
          }));
          
          let texture = gl.createTexture();
        } else {
          throw "no asset id";
        }
      }
      if(def.type == "shader_program") {
        if(def.id) {
          let ast = astmgr.getAsset(def.id);
          if(!def.shaders) {
            throw "no shader list";
          }

          let program = gl.createProgram();
          let promises = [];
          for(let i = 0; i < def.shaders.length; i++) {
            let shader = astmgr.getAsset(def.shaders[i]);
            ast.addDependency(shader);
            promises.push(shader.promise().then((shd) => {
              gl.attachShader(program, shd);
            }));
          }

          return ast.provide(Promise.all(promises).then(() => {
            let obj = {
              program,
              uniforms: {},
              attributes: {}
            };

            for(let i in def.attributes) {
              let loc = def.attributes[i];
              obj.attributes[i] = loc;
              this.dbg.log("bind attrib " + i + " to " + loc);
              gl.bindAttribLocation(program, loc, i);
            }

            gl.linkProgram(program);
            if(!gl.getProgramParameter(program, gl.LINK_STATUS)) {
              throw "shader link error:\n" + gl.getProgramInfoLog(program);
            }
            
            for(let i = 0; i < def.uniforms.length; i++) {
              obj.uniforms[def.uniforms[i]] = gl.getUniformLocation(program, def.uniforms[i]);
            }
            return obj;
          }));
        } else {
          throw "no id";
        }
      }
      if(def.type == "shader") {
        if(def.id) {
          let ast = astmgr.getAsset(def.id);
          return ast.provide(new Promise((resolve, reject) => {
            let shader_type;
            if(def.shader_type == "vertex") {
              shader_type = gl.VERTEX_SHADER;
            } else if(def.shader_type == "fragment") {
              shader_type = gl.FRAGMENT_SHADER;
            } else {
              throw "unknown shader type '" + def.shader_type + "'";
            }
                        
            let shader = gl.createShader(shader_type);
            let sourcePromise;
            if(def.sources) {
              let promises = [];
              for(let i = 0; i < def.sources.length; i++) {
                promises.push(resmgr.queue(def.sources[i]).then((source_res) => {
                  return source_res.text();
                }).then((source_txt) => {                  
                  gl.shaderSource(shader, source_txt);
                }));
              }
              sourcePromise = Promise.all(promises);
            } else {
              if(!def.source) {
                throw "no source";
              }
              sourcePromise = resmgr.queue(def.source).then((source_res) => {
                return source_res.text();
              }).then((source_txt) => {
                dbg.log("recieved source '" + def.source + "'");
                gl.shaderSource(shader, source_txt);
              });
            }
            
            return sourcePromise.then(() => {
              dbg.log("compiling shader...");
              gl.compileShader(shader);
              if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                dbg.log("shader compile failed");
                throw "shader compile error:\n" + gl.getShaderInfoLog(shader);
              } else {
                dbg.log(gl.getShaderInfoLog(shader));
              }
              return shader;
            }).then(resolve, reject);
          }));
        } else {
          throw "no id";
        }
      }
    });
  }

  initialize() {
    let gl = this.gl;
  }

  resize() {
    if(this.width !== window.innerWidth || this.height !== window.innerHeight) {
      this.width  = this.canvas.width  = window.innerWidth ;
      this.height = this.canvas.height = window.innerHeight;
    }
  }
  
  beginFrame() {
    let gl = this.gl;
    this.bindScreen();
    gl.viewport(0.0, 0.0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);  
  }

  bindScreen() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
  }

  postProcess(shader, textures) {
    let gl = this.gl;
    gl.useProgram(shader.program);

    gl.enableVertexAttribArray(0);
    
    gl.uniform2f(shader.uniforms.viewport, this.width, this.height);

    let unit = 0;
    for(let uniform_name in textures) {
      if(textures.hasOwnProperty(uniform_name)) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, textures[uniform_name]);
        gl.uniform1i(shader.uniforms[uniform_name], unit);
        unit++;
      }
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.post_vbo);

    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    gl.disableVertexAttribArray(0);
  }

}

export class Framebuffer {
  constructor(gfx) {
    this.gfx = gfx;
    let gl = gfx.gl;
    this.framebuffer = gl.createFramebuffer();
    this.texture = gl.createTexture();
    this.renderbuffer = gl.createRenderbuffer();
    this.bind();
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);
  }

  updateSize() {
    if(this.width != this.gfx.width || this.height != this.gfx.height) {
      let gl = this.gfx.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
      gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, this.gfx.width, this.gfx.height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.gfx.width, this.gfx.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.width = this.gfx.width;
      this.height = this.gfx.height;
    }
  }
  
  bind() {
    this.updateSize();
    this.gfx.gl.bindFramebuffer(this.gfx.gl.FRAMEBUFFER, this.framebuffer);
  }
}

export class Batch {
  constructor(gfx, max) {
    this.gfx = gfx;
    this.gl = gfx.gl;
    this.texbuffers = [];
    this.x = 0;
    this.y = 0;
    
    if(max == undefined) {
      this.max = 256;
    } else {
      this.max = max;
    }

    this.mat = new Mat3();
  }

  setupTexture(tex) {
    let data = new Float32Array(this.max * 6 * 8);
    let buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.DYNAMIC_DRAW);
    
    return this.texbuffers[tex.id] = {
      data,
      pos: 0,
      buffer,
      numRects: 0,
      tex
    };
  }
  
  _drawQuad(tex, dx1, dy1, dx2, dy2, dx3, dy3, dx4, dy4, sx1, sy1, sx2, sy2, sx3, sy3, sx4, sy4, scale, r, g, b) {
    let buf = this.texbuffers[tex.id];
    if(!buf) {
      buf = this.setupTexture(tex);
    }
    if(!scale) {
      scale = 1;
    }
    buf.data[buf.pos++] = dx1;
    buf.data[buf.pos++] = dy1;
    buf.data[buf.pos++] = sx1;
    buf.data[buf.pos++] = sy1;
    buf.data[buf.pos++] = scale;
    buf.data[buf.pos++] = r;
    buf.data[buf.pos++] = g;
    buf.data[buf.pos++] = b;
    
    buf.data[buf.pos++] = dx2;
    buf.data[buf.pos++] = dy2;
    buf.data[buf.pos++] = sx2;
    buf.data[buf.pos++] = sy2;
    buf.data[buf.pos++] = scale;
    buf.data[buf.pos++] = r;
    buf.data[buf.pos++] = g;
    buf.data[buf.pos++] = b;

    buf.data[buf.pos++] = dx3;
    buf.data[buf.pos++] = dy3;
    buf.data[buf.pos++] = sx3;
    buf.data[buf.pos++] = sy3;
    buf.data[buf.pos++] = scale;
    buf.data[buf.pos++] = r;
    buf.data[buf.pos++] = g;
    buf.data[buf.pos++] = b;


    
    buf.data[buf.pos++] = dx2;
    buf.data[buf.pos++] = dy2;
    buf.data[buf.pos++] = sx2;
    buf.data[buf.pos++] = sy2;
    buf.data[buf.pos++] = scale;
    buf.data[buf.pos++] = r;
    buf.data[buf.pos++] = g;
    buf.data[buf.pos++] = b;

    buf.data[buf.pos++] = dx3;
    buf.data[buf.pos++] = dy3;
    buf.data[buf.pos++] = sx3;
    buf.data[buf.pos++] = sy3;
    buf.data[buf.pos++] = scale;
    buf.data[buf.pos++] = r;
    buf.data[buf.pos++] = g;
    buf.data[buf.pos++] = b;

    buf.data[buf.pos++] = dx4;
    buf.data[buf.pos++] = dy4;
    buf.data[buf.pos++] = sx4;
    buf.data[buf.pos++] = sy4;
    buf.data[buf.pos++] = scale;
    buf.data[buf.pos++] = r;
    buf.data[buf.pos++] = g;
    buf.data[buf.pos++] = b;
    
    buf.numRects++;
    if(buf.numRects >= this.max) {
      this.flush();
    }
  }

  drawRect(tex, dx, dy, dw, dh, sx, sy, sw, sh, scale, r, g, b, mat) {
    let m = mat;
    if(!m)     { m = Mat3.identity; }
    if(!scale) { scale = 1; }
    if(r == undefined) { r = 1; }
    if(g == undefined) { g = 1; }
    if(b == undefined) { b = 1; }
    dw*=scale;
    dh*=scale;
    
    this._drawQuad(tex,
                  m.vx(dx,    dy   ),  m.vy(dx,    dy   ),
                  m.vx(dx+dw, dy   ),  m.vy(dx+dw, dy   ),
                  m.vx(dx,    dy+dh),  m.vy(dx,    dy+dh),
                  m.vx(dx+dw, dy+dh),  m.vy(dx+dw, dy+dh),
                  
                  sx,    sy,
                  sx+sw, sy,
                  sx,    sy+sh,
                  sx+sw, sy+sh,
                  scale, r, g, b);
  }

  flush(keep) {
    let gl = this.gfx.gl;
    let shader = this.gfx.game.assetManager.getAsset("shader.flat.texture").value;

    gl.useProgram(shader.program);
    
    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);
    gl.enableVertexAttribArray(2);
    gl.enableVertexAttribArray(3);

    gl.uniform2f(shader.uniforms.viewport, this.gfx.width, this.gfx.height);
    gl.uniformMatrix3fv(shader.uniforms.matrix, gl.FALSE, this.mat.values);

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(shader.uniforms.tex, 0);
    
    for(let i = 0; i < this.texbuffers.length; i++) {
      let buf = this.texbuffers[i];
      if(buf && buf.numRects > 0) {
        gl.bindTexture(gl.TEXTURE_2D, buf.tex.tex);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf.buffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, buf.data);
        
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8 * 4, 0 * 4); //dst
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 8 * 4, 2 * 4); //src
        gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 8 * 4, 4 * 4); //scale
        gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 8 * 4, 5 * 4); //color
        
        gl.uniform2f(shader.uniforms.texres, buf.tex.img.width, buf.tex.img.height);
        
        gl.drawArrays(gl.TRIANGLES, 0, buf.numRects * 6);

        if(!keep) {
          buf.pos = 0;
          buf.numRects = 0;
        }
      }
    }
    gl.disableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
    gl.disableVertexAttribArray(2);
    gl.disableVertexAttribArray(3);
  }
}

class Font {
  constructor(gfx, xml, tex, scale) {
    this.tw = tex.img.width;
    this.th = tex.img.height;
    this.tex = tex;
    this.scale = scale;
    
    let gl = gfx.gl;
    
    let root = xml.documentElement;
    if(root.tagName != "Font") {
      throw "root tag is not <Font>";
    }

    if(!root.hasAttribute("height")) {
      throw "font has no height";
    }
    
    this.height = root.getAttribute("height");
    this.glyphs = [];
    
    for(let i = 0; i < root.children.length; i++) {
      let chtag = root.children[i];
      if(chtag.tagName != "Char") {
        throw "child tag is not <Char>";
      }

      if(!chtag.hasAttribute("offset")) {
        throw "char has no offset";
      }

      if(!chtag.hasAttribute("rect")) {
        throw "char has no rect";
      }

      if(!chtag.hasAttribute("code")) {
        throw "char has no code";
      }

      if(!chtag.hasAttribute("width")) {
        throw "char has no width";
      }
      
      let offset = chtag.getAttribute("offset").split(" ");
      let rect = chtag.getAttribute("rect").split(" ");
      
      let glyph = {
        ox: parseInt(offset[0]),
        oy: parseInt(offset[1]),
        sx: parseInt(rect[0]),
        sy: parseInt(rect[1]),
        sw: parseInt(rect[2]),
        sh: parseInt(rect[3]),
        width: parseInt(chtag.getAttribute("width"))
      };

      this.glyphs[chtag.getAttribute("code").charCodeAt(0)] = glyph;
    }
  }

  draw(batch, ix, iy, str, r, g, b) {
    var x = ix;
    var y = iy;
    for(var i = 0; i < str.length; i++) {
      var glyph = this.glyphs[str.charCodeAt(i)];
      batch.drawRect(this.tex,
                     x+(glyph.ox*this.scale), y+(glyph.oy*this.scale),
                     glyph.sw, glyph.sh,
                     glyph.sx/this.tw, glyph.sy/this.th,
                     glyph.sw/this.tw, glyph.sh/this.th, this.scale, r, g, b);
      x+= glyph.width * this.scale;
    }
    return x-ix;
  }
}

export class ShapeBatch {
  constructor(gfx, max) {
    this.gfx = gfx;
    this.gl = gfx.gl;

    if(max == undefined) {
      this.max = 256;
    } else {
      this.max = max;
    }

    this.mat = new Mat3();

    this.data = new Float32Array(this.max * 3 * 5);
    this.buffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.data, this.gl.DYNAMIC_DRAW);

    this.pos = 0;
    this.numTris = 0;
  }

  color(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  
  tri(x1, y1, x2, y2, x3, y3) {
    let buf = this.data;
    buf[this.pos++] = x1;//this.mat.vx(x1, y1);
    buf[this.pos++] = y1;//this.mat.vy(x1, y1);
    buf[this.pos++] = this.r;
    buf[this.pos++] = this.g;
    buf[this.pos++] = this.b;
    
    buf[this.pos++] = x2;//this.mat.vx(x2, y2);
    buf[this.pos++] = y2;//this.mat.vy(x2, y2);
    buf[this.pos++] = this.r;
    buf[this.pos++] = this.g;
    buf[this.pos++] = this.b;
    
    buf[this.pos++] = x3;//this.mat.vx(x3, y3);
    buf[this.pos++] = y3;//this.mat.vy(x3, y3);
    buf[this.pos++] = this.r;
    buf[this.pos++] = this.g;
    buf[this.pos++] = this.b;

    this.numTris++;
    if(this.numTris >= this.max) {
      this.flush();
    }
  }

  rect(x1, y1, x2, y2) {
    this.tri(x1, y1, x2, y1, x2, y2);
    this.tri(x2, y2, x1, y2, x1, y1);
  }
  
  flush(keep) {
    let gl = this.gfx.gl;
    let shader = this.gfx.flat_color_shader;

    gl.useProgram(shader.program);

    gl.enableVertexAttribArray(0);
    gl.enableVertexAttribArray(1);

    gl.uniformMatrix3fv(shader.uniforms.matrix, gl.FALSE, this.mat.values);
    gl.uniform2f(shader.uniforms.viewport, this.gfx.width, this.gfx.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data);

    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 5 * 4, 0 * 4); //pos
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 5 * 4, 2 * 4); //color

    gl.drawArrays(gl.TRIANGLES, 0, this.numTris * 3);

    if(!keep) {
      this.pos = 0;
      this.numTris = 0;
    }
    
    gl.disableVertexAttribArray(0);
    gl.disableVertexAttribArray(1);
  }
}

export class Sprite {
  constructor(tex) {
    this.dw = null;
    this.dh = null;
    this.sx = 0;
    this.sy = 0;
    this.sw = 0;
    this.sh = 0;
    this.tex = tex;
    this.mat = new Mat3();
    this.vertices = [];
  }

  setEntireSource() {
    this.sx = 0;
    this.sy = 0;
    this.sw = this.tex.img.width;
    this.sh = this.tex.img.height;
  }
  
  setSourceRegion(x, y, w, h) {
    this.sx = x;
    this.sy = y;
    this.sw = w;
    this.sh = h;
  }

  setSourcePos(x, y) {
    this.sx = x;
    this.sy = y;
  }

  setSourceSize(w, h) {
    this.sw = w;
    this.sh = h;
  }

  setDestSize(w, h) {
    this.dw = w;
    this.dh = h;
  }
  
  draw(batch, x, y, scale) {
    this.dx = x;
    this.dy = y;
    
    let tw = this.tex.img.width;
    let th = this.tex.img.height;

    let w = (this.dw == null ? this.sw : this.dw);
    let h = (this.dh == null ? this.sh : this.dh);
    
/*    batch.drawQuad(this.tex,
      this.tX(0, 0), this.tY(0, 0),
      this.tX(w, 0), this.tY(w, 0),
      this.tX(0, h), this.tY(0, h),
      this.tX(w, h), this.tY(w, h),
      
      (this.sx)/tw,         (this.sy)/th,
      (this.sx+this.sw)/tw, (this.sy)/th,
      (this.sx)/tw,         (this.sy+this.sh)/th,
      (this.sx+this.sw)/tw, (this.sy+this.sh)/th
      );*/

    batch.drawRect(this.tex,
                   x, y, w, h,
                   (this.sx)/tw, (this.sy)/th,
                   (this.sw)/tw, (this.sh)/th,
                   scale);
  }
}
