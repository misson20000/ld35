import {Camera} from "../camera.js";
import {ResourceDownloader} from "../resourcemanager.js";
import {PlayState} from "./play.js";

export class LoaderState {
  constructor(game, resmgr, assetmgr) {
    this.resmgr = resmgr;
    this.assetmgr = assetmgr;
    this.game = game;
    this.dl = new ResourceDownloader();

    this.status = "Disovering assets...";
    
    this.camera = new Camera();
    
    this.resmgr.addResourceProvider(0, this.dl);
    this.resmgr.queue("assets.map").then((resource) => {
      return resource.json();
    }).then((assetMap) => {
      let promises = [];
      for(let asset in assetMap) {
        let a = assetMap[asset];
        let p = this.assetmgr.load(a);
        promises.push(p);
      }
      this.status = "Downloading assets...";

      let blanks = this.assetmgr.blankAssets();
      if(blanks.length > 0) {
        throw (blanks.length + " asset" + (blanks.length == 1 ? " has" : "s have") + " not been provided.\n" + blanks.map((ast) => {
          return ast.id + " is depended upon by: \n" + ast.dependants.map((dep) => {
            return "  - " + dep.id;
          }).join("\n")
        }).join("\n"));
      }
      
      
      Promise.all(promises).then(() => {
        // run some sanity checks on asset states
        let mgr = this.assetmgr;

        let loading = mgr.loadingAssets();
        if(loading.length > 0) {
          throw (loading.length + " asset" + (loading.length == 1 ? " was" : "s were") + " not promised properly.\n" + loading.map((ast) => {
            return "  - " + ast.id;
          }).join("\n"));
        }
        
        this.game.state = new PlayState(this.game);
      }, (reason) => {
        this.game.dbg.log("error: \n" + reason);
        throw reason;
      });
    });
  }

  render() {
    /*
    this.game.gfx.lookThrough(this.camera);
    let color;
    if(this.resmgr.status == "idle") { color = this.game.gfx.green; }
    if(this.resmgr.status == "failed") { color = this.game.gfx.red; }
    if(this.resmgr.status == "loading") { color = this.game.gfx.blue; }
    this.game.gfx.fillRect(-50, -50, 100, 100, color);
    */
  }
}
