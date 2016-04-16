import {Preresolve} from "./util.js";

export class AssetManager {
  constructor(resourceManager, dbg) {
    this.resourceManager = resourceManager;
    this.dbg = dbg;
    this.assets = {};
    this.directAssets = {};
    this.providers = [];
    this.assetList = [];

    this._postInitPromise = new Promise((resolve, reject) => {
      this._postInitResolve = resolve;
    });
    
    /* PROVIDER DOCS
        A provider is called with three arguments:
          - def: the asset defition in assets.map that triggered the invocation
          - ast: the asset manager
          - res: the resource manager
        And is expected to return either a falsy value to indicate that this provider cannot handle
         asset definitions of the given type or a promise that resolves when the loading the
         provider started has finished. (Loading can be in the form of downloading resources
         via the resource manager, decompressing audio, pretty much anything)
        It is an error for an asset provided by a provider to not be loaded by the time its provider's
         promise has resolved.
        To provide an asset, the provider calls ast.getAsset(id) which returns an Asset object.
         An Asset object represents an Asset through the stages of being loaded. The asset
         represented by the given object may not be loaded yet. Call the promise() function on
         the asset object to get a promise that resolves when it is loaded. To provide the asset,
         call provide() on it with a promise that resolves when the asset's loading is done. The
         provide function returns a promise that resolves when it is loaded and rejects with additional
         information when the given promise is rejected. The loader can return this promise, or
         add it to a Promise.all() array.
        To add a dependency to an Asset, use the addDependency() function.
        
        Example:
          this.addProvider((def, ast, res) => {
            if(def.type == "test") {
              let promises = [];
              promises.push(ast.getAsset("test.foo").provide(Promise.resolve("asset test.foo value")));
              
              let bar = ast.getAsset("test.bar");
              let baz = ast.getAsset("test.baz");
              let qux = ast.getAsset("test.qux");
              bar.addDependency(baz);
              baz.addDependency(qux);
              //qux.addDependency(bar); // dependency loop tester
              
              promises.push(bar.provide(Promise.resolve("bar")));
              promises.push(baz.provide(Promise.resolve("baz")));
              promises.push(qux.provide(Promise.resolve("qux")));
              return Promise.all(promises);
            }
            return false;
          });
    */
  }

  inPost() {
    return this._postInitPromise;
  }

  postInit() {
    this._postInitResolve();
  }
  
  addProvider(provider) {
    this.providers.push(provider);
  }

  getAsset(id) {
    if(!this.directAssets[id]) {
      this.dbg.log("created asset stub for '" + id + "'");
      let ast = new Asset(this, id);
      this.directAssets[id] = ast;
      this.assetList.push(ast);

      let o = this.assets;
      let a = id.split(".");
      let i = 0;
      for(i = 0; i < a.length-1; i++) {
        if(o[a[i]] == undefined) {
          o[a[i]] = {};
        }
        o = o[a[i]];
      }
      ast.promise().then((value) => {
        o[a[i]] = value;
      });
    }
    return this.directAssets[id];
  }
  
  load(def) {
    return new Promise((resolve, reject) => {
      for(let i = 0; i < this.providers.length; i++) {
        let p = this.providers[i](def, this, this.resourceManager);
        if(p) {
          resolve(p);
          return;
        }
      }
      reject("no provider accepted definition");
    });
  }
  
  reload(asset) {
    asset.reload();
  }
  
  reloadAll() {
    for(let a in this.assetList) {
      this.reload(this.assetList[a]);
    }
  }

  blankAssets() {
    return this.assetList.filter((ast) => {
      return ast.state == "blank";
    });
  }

  loadingAssets() {
    return this.assetList.filter((ast) => {
      return ast.state == "provided";
    });
  }
}

class Asset {
  constructor(mgr, id) {
    this.mgr = mgr;
    this.id = id;
    this.dependencies = [];
    this.dependants = [];
    this.state = "blank";
    /* States:
         - blank: asset is freshly created, has not been provided yet; it has only been requested
         - provided: asset has been provided, is loading
         - ready: is done loading
    */
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  provide(promise) {
    if(this.state != "blank") {
      throw "asset '" + this.id + "' has already been provided";
    }
    this.mgr.dbg.log("provided asset '" + this.id + "'");
    this.state = "provided";
    promise.then(this._resolve, this._reject);
    promise.then((value) => {
      this.state = "ready";
      this.value = value;
      this.mgr.dbg.log("loaded asset '" + this.id + "'");
    });
    return new Promise((resolve, reject) => {
      promise.then(resolve, (reason) => {
        this.mgr.dbg.log("asset rejected: " + this.id);
        reject("failed to load asset '" + this.id + "': " + reason);
      });
    }); // for chaining
  }

  promise() {
    return this._promise;
  }

  depCheck(dep) {
    if(this.dependants.includes(dep)) { return [dep, this]; }
    for(let i = 0; i < this.dependants.length; i++) {
      let result = this.dependants[i].depCheck(dep);
      if(result) {
        result.push(this);
        return result;
      }
    };
    return false;
  }
  
  addDependency(dep) {
    let result = this.depCheck(dep);
    if(result) {
      throw "dependency loop detected: " + result.map((ast) => { return ast.id; }).join(" <-> ");
    }
    this.dependencies.push(dep);
    dep.dependants.push(this);
  }
}
