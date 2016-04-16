export class Camera {
  constructor(viewport) {
    this.pos = {};
    this.pos.x = 0;
    this.pos.y = 0;
    this.scale = 1;
    this.rotate = 0;
    
    this._px = 0;
    this._py = 0;
  }
  centerOnPoint(x, y) {
    this.pos.x = x;
    this.pos.y = y;
  }
  setScale(s) {
    this.scale = s;
  }

  update(viewport) {
    this._px = this.pos.x - Math.floor(viewport.width/2);
    this._py = this.pos.y - Math.floor(viewport.height/2);
    this.width = viewport.width/this.scale;
    this.height = viewport.height/this.scale;

    viewport.ctx.resetTransform();
    viewport.ctx.translate(-this._px, -this._py);
    viewport.ctx.scale(this.scale, this.scale);
    viewport.ctx.rotate(this.rotate);
  }  
}

export class NullCamera {
  constructor(viewport) { }
  update(viewport) {
    viewport.ctx.resetTransform();
  }
}
