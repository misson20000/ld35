import {Batch} from "./webglcore.js";
import {b64toArrayBuffer} from "./util.js";

export class Tmx {
  constructor(doc, assetMgr, ast) {
    this.assetMgr = assetMgr;
    this.asset = ast;
    this.promises = [];

    let shader = assetMgr.getAsset("shader.flat.texture");
    this.promises.push(shader.promise());
    this.asset.addDependency(shader);
    
    let root = this.root = doc.documentElement;
    if(root.tagName != "map") {
      throw "TMX root tag name is not 'map'";
    }
    if(root.getAttribute("version") != "1.0") {
      throw "Unsupported TMX version '" + root.getAttribute("version") + "'";
    }
    if(root.getAttribute("orientation") != "orthogonal") {
      throw "Unsupported TMX orientation '" + root.getAttribute("orientation") + "'";
    }
    this.width  = parseInt(root.getAttribute("width"));
    this.height = parseInt(root.getAttribute("height"));
    this.tilewidth  = parseInt(root.getAttribute("tilewidth"));
    this.tileheight = parseInt(root.getAttribute("tileheight"));
    // ignore background color and render order

    this.tilesets = [];
    this.properties = {};
    this.tileLayers = [];
    this.objectLayers = [];
    
    let map = this;
    
    let parseFunctions = {
      tileset: (e) => {
        let firstgid = parseInt(e.getAttribute("firstgid"));
        if(e.hasAttribute("source")) {
          map.promises.push(assetMgr.resourceManager.queue(e.getAttribute("source")).then((res) => {
            return res.xml();
          }).then((xml) => {
            tileset = new TmxTileset(xml.documentElement, firstgid, this);
            map.tilesets.push(tileset);
          }));
        } else {
          map.tilesets.push(new TmxTileset(e, firstgid, this));
        }
      },
      layer: (e) => {
        map.tileLayers.push(new TmxLayer(e, this));
      },
      objectgroup: (e) => {
        map.objectLayers.push(new TmxObjectLayer(e));
      },
      properties: (e) => {
        map.properties = new TmxProperties(e);
      }
    };

    for(let i = 0; i < root.children.length; i++) {
      let child = root.children[i];
      if(!parseFunctions[child.tagName]) {
        throw "Invalid element '<" + child.tagName + ">' under <map>";
      }
      parseFunctions[child.tagName](child);
    };
  }

  getTileset(gid) {
    if(gid == 0) { return null; }
    let tsi = 0;
    for(let i = 0; i < this.tilesets.length; i++) {
      if(this.tilesets[i].firstgid <= gid) {
        tsi = i;
      } else { break; }
    }

    return this.tilesets[tsi];
  }
  
  getTileFromGID(gid) {
    if(gid == 0) { return null; }
    let ts = this.getTileset(gid);
    return ts.getTile(gid-ts.firstgid);
  }
  
  drawTile(batch, gid, x, y) {
    let ts = this.getTileset(gid);
    let t = ts.getTile(gid-ts.firstgid);
    batch.drawRect(ts.texture, x, y, ts.tilewidth, ts.tileheight, t.x, t.y, ts.tilewidth, ts.tileheight);
  }
  
  drawMapDirectly(batch) {
    for(let l = 0; l < this.tileLayers.length; l++) {
      this.tileLayers[l].render(batch);
    }
  }
  
  hasAssets() {
    console.log("has assets");
    this.tileLayers.forEach((l) => {
      l.bake();
    });
    console.log("finished bake");
  }
}

class TmxTileset {
  constructor(e, firstgid, map) {
    this.firstgid = firstgid;
    if(!e.hasAttribute("name")) {
      throw "Tileset has no name";
    }
    if(!e.hasAttribute("tilewidth")) {
      throw "Tileset has no tile width attribute";
    }
    if(!e.hasAttribute("tileheight")) {
      throw "Tileset has no tile height attribute";
    }
    if(!e.hasAttribute("tilecount")) {
      throw "Tileset has no tile count attribute";
    }
    
    this.spacing = 0;
    this.margin = 0;
    if(e.hasAttribute("spacing")) {
      this.spacing = parseInt(e.getAttribute("spacing"));
    }
    if(e.hasAttribute("margin")) {
      this.margin = parseInt(e.getAttribute("margin"));
      throw "margin is unsupported";
    }
    
    this.name = e.getAttribute("name");
    this.tilewidth = parseInt(e.getAttribute("tilewidth"));
    this.tileheight = parseInt(e.getAttribute("tileheight"));
    this.tilecount = parseInt(e.getAttribute("tilecount"));

    this.properties = {};
    let tileData = [];
    
    for(let i = 0; i < e.children.length; i++) {
      let child = e.children[i];
      if(child.tagName == "properties") {
        this.properties = new TmxProperties(child);
      } else if(child.tagName == "image") { //ignore
      } else if(child.tagName == "tile") {
        let tile = new TmxTileData(child, this);
        tileData[tile.id] = tile;
      } else {
        throw "Unsupported tileset child '<" + child.tagName + ">'";
      }
    }

    this.tiles = [];    
    
    if(!this.properties.asset) {
      throw "Tileset nas no asset property";
    }

    this.asset = map.assetMgr.getAsset(this.properties.asset);
    map.asset.addDependency(this.asset);
    map.promises.push(this.asset.promise().then((asset) => {
      this.texture = asset;
      let i = 0;
      for(let y = 0; y < this.texture.img.height; y+= this.tileheight + this.spacing) {
        for(let x = 0; x < this.texture.img.width; x+= this.tilewidth + this.spacing) {
          if(tileData[i]) {
            this.tiles[i] = new TmxTile(x, y, this, tileData[i]);
          } else {
            this.tiles[i] = new TmxTile(x, y, this);
          }
          i++;
        }
      }
    }));
  }

  getTile(t) {
    return this.tiles[t];
  }  
}

class TmxTileData {
  constructor(e, ts) {
    if(!e.hasAttribute("id")) {
      throw "tile tag with no id";
    }
    this.id = e.getAttribute("id");
    for(let i = 0; i < e.children.length; i++) {
      let c = e.children[i];
      if(c.tagName == "properties") {
        this.properties = new TmxProperties(c);
      } else {
        throw c.tagName
      }
    }
  }
}

class TmxTile {
  constructor(x, y, ts, data) {
    this.x = x;
    this.y = y;
    this.ts = ts;
    this.properties = data ? data.properties : {};
  }
}

class TmxLayer {
  constructor(e, map) {
    this.map = map;
    
    if(!e.hasAttribute("name")) {
      throw "Layer has no name attribute";
    }

    this.properties = {};
    
    for(let i = 0; i < e.children.length; i++) {
      let c = e.children[i];
      if(c.tagName == "properties") {
        this.properties = new TmxProperties(c);
      } else if(c.tagName == "data") {
        if(!c.hasAttribute("encoding") || c.getAttribute("encoding") != "base64") {
          throw "Unsupported encoding (try uncompressed base64)";
        }
        if(c.hasAttribute("compression")) {
          throw "Unsupported compression (try uncompressed base64)";
        }

        let ab = b64toArrayBuffer(c.innerHTML);
        this.tiles = new Uint32Array(ab);
      } else {
        throw "Invalid tag '<" + c.tagName + ">' under <layer>";
      }
    }
  }

  bake() {
    this.batch = new Batch(this.map.assetMgr.gfx);
    this.render(this.batch);
  }

  render(batch) {
    let i = 0;
    let d = this.tiles;
    for(let y = 0; y < this.map.height; y++) {
      for(let x = 0; x < this.map.width; x++) {
        if(d[i] != 0) {
          this.map.drawTile(batch, d[i], x*this.map.tilewidth, y*this.map.tileheight);
        }
        i++;
      }
    }
  }

  getTile(x, y) {
    return this.map.getTileFromGID(this.tiles[x+(y*this.map.width)]);
  }
}

class TmxObjectLayer {
  constructor(e) {
    if(!e.hasAttribute("name")) {
      throw "object layer has no name";
    }
    this.name = e.getAttribute("name");
    this.properties = {};
    this.objects = [];
    for(let i = 0; i < e.children.length; i++) {
      let c = e.children[i];
      if(c.tagName == "properties") {
        this.properties = new TmxProperties(c);
      } else if(c.tagName == "object") {
        this.objects.push(new TmxObject(c));
      } else {
        throw "invalid tag '<" + c.tagName + ">' in object layer";
      }
    }
  }
}

class TmxObject {
  constructor(e) {
    if(!e.hasAttribute("id")) {
      throw "object with no id";
    }
    if(!e.hasAttribute("type")) {
      throw "object with no type";
    }
    if(!e.hasAttribute("x")) {
      throw "object with no x";
    }
    if(!e.hasAttribute("y")) {
      throw "object with no y";
    }
    if(!e.hasAttribute("width")) {
      throw "object has no width";
    }
    if(!e.hasAttribute("height")) {
      throw "object has no height";
    }
    this.id = parseInt(e.getAttribute("id"));
    this.type = e.getAttribute("type");
    this.x = parseInt(e.getAttribute("x"));
    this.y = parseInt(e.getAttribute("y"));
    this.width = parseInt(e.getAttribute("width"));
    this.height = parseInt(e.getAttribute("height"));
    this.properties = {};
    
    for(let i = 0; i < e.children.length; i++) {
      let c = e.children[i];
      if(c.tagName == "properties") {
        this.properties = new TmxProperties(c);
      } else {
        throw "object shape '" + c.tagName + "' is unsupported";
      }
    }
  }
}

class TmxProperties {
  constructor(e) {
    if(e.tagName != "properties") {
      throw "Element is not 'properties'";
    }
    for(let i = 0; i < e.children.length; i++) {
      let p = e.children[i];
      if(p.tagName != "property") {
        throw "Non-<property> tag under <properties>";
      }
      if(!p.hasAttribute("name")) {
        throw "<property> tag has no 'name' attribute";
      }
      let v;
      if(p.hasAttribute("value")) {
        v = p.getAttribute("value");
      } else {
        v = p.innerHTML;
      }
      this[p.getAttribute("name")] = v;
    };
  }
}

export let TmxProvider = (def, astmgr, resmgr) => {
  if(def.type == "tmx") {
    if(!def.id) {
      throw "no id";
    }
    if(!def.src) {
      throw "no source";
    }
    
    let ast = astmgr.getAsset(def.id);
    
    return ast.provide(resmgr.queue(def.src).then((res) => {
      return res.xml();
    }).then((doc) => {
      let tmx = new Tmx(doc, astmgr, ast);
      
      return Promise.all(tmx.promises).then(() => {
        tmx.hasAssets();
        return tmx;
      });
    }));
  }
}
