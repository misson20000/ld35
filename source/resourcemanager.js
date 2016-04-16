export class ResourceManager {
  constructor(dbg) {
    this.providers = [];
    this._queue = [];
    this.resources = {};
    this.status = "idle";
    this.dbg = dbg;
  }

  addResourceProvider(priority, provider) {
    this.providers.push({priority, provider});
    this.providers.sort((a, b) => {
      if(a[0] < b[0]) { return 1; }
      if(a[0] > b[0]) { return -1; }
      return 0;
    });
  }

  _tryDL(job, providerNum, errors=[]) {
    if(providerNum >= this.providers.length) { //ran out of providers
      this.dbg.log("ran out of providers");
      this.status = "failed";
      job.reject("could not obtain resource at '" + job.url + "': " + errors);
      this.failedResource = job.url;
      return;
    }
    this.dbg.log("Trying to load '" + job.url + "' with provider " + providerNum);
    
    this.loading = job.url;
    this.providers[providerNum].provider.provide(job.url, this.dbg).then((resource) => {
      // success
      this.dbg.log("success");
      let fin = new Resource(job.url, resource);
      this.resources[job.url] = fin;
      job.resolve(fin);
      this._queue.shift();
      if(this._queue.length > 0) {
        this._tryDL(this._queue[0], 0);
      } else {
        this.dbg.log("finished queue");
        this.status = "idle";
        return;
      }
    }, (reason) => {
      // failiure
      this.dbg.log("failiure, trying next provider");
      errors.push(reason);
      this._tryDL(job, providerNum+1, errors);
    });
  }

  flush() {
    this.status = "loading";
    this._tryDL(this._queue[0], 0);
  }

  reload(resource) {
    this.status = "loading";
    return new Promise((resolve, reject) => {
      this._tryDL({url: resource, resolve, reject}, 0);
    });
  }
  
  queue(resource) {
    if(!this.resources[resource]) {
      this.dbg.log("Queued " + resource);
      return new Promise((resolve, reject) => {
        this._queue.push({url: resource, resolve, reject});
        if(this._queue.length == 1) {
          this.flush();
        }
      });
    } else {
      return new Promise((resolve, reject) => { resolve(this.resources[resource]); });
    }
  }
}

export class Resource {
  constructor(url, blob) {
    this.url = url;
    this._blob = blob;
  }

  _read(fnc) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.onerror = () => {
        reject(reader.error);
      };
      reader[fnc](this._blob);
    });
  }

  blob() {
    return Promise.resolve(this._blob);
  }
  
  text() {
    return this._read("readAsText");
  }

  json() {
    return this.text().then((txt) => {
      return JSON.parse(txt);
    });
  }
  
  xml() {
    return this.text().then((txt) => {
      return new DOMParser().parseFromString(txt, "application/xml");
    });
  }

  arrayBuffer() {
    return this._read("readAsArrayBuffer");
  }

  image() {
    return new Promise((resolve, reject) => {
      let img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = () => {
        reject("could not load image");
      };
      img.src = this.blobUrl();
    });
  }
  
  blobUrl() {
    return URL.createObjectURL(this._blob);
  }
}

export class ResourceDownloader {
  provide(url, dbg) {
    dbg.log("dl " + url);
    return new Promise((resolve, reject) => {
      fetch(url).then((response) => {
        dbg.log("got response");
        if(response.ok) {
          dbg.log("ok, resolving");
          resolve(response.blob());
        } else {
          dbg.log("failed, rejecting");
          reject(response.status + " " + response.statusText);
        }
      }, (fail) => {
        dbg.log("fetch rejected");
        reject(fail);
      });
    });
  }
}
