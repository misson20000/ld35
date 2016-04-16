export class Mat3 {
  constructor(mat) {
    this.values = new Float32Array(9);
    for(let x = 0; x < 3; x++) {
      for(let y = 0; y < 3; y++) {
        if(mat) {
          this.values[x+(y*3)] = mat.values[x+(y*3)];
        } else {
          if(x == y) {
            this.values[x+(y*3)] = 1;
          } else {
            this.values[x+(y*3)] = 0;
          }
        }
      }
    }
  }

  load(mat) {
    for(let x = 0; x < 3; x++) {
      for(let y = 0; y < 3; y++) {
        this.values[x+(y*3)] = mat.values[x+(y*3)];
      }
    }
  }
  
  matmult(a, b) {
    for(let i = 0; i < 3; i++) {
      for(let j = 0; j < 3; j++) {
        let sum = 0;
        for(let k = 0; k < 3; k++) {
          sum+= a.values[i+(k*3)] * b.values[k+(j*3)];
        }
        this.values[i+(j*3)] = sum;
      }
    }
  }

  identity() {
    for(let x = 0; x < 3; x++) {
      for(let y = 0; y < 3; y++) {
        if(x == y) {
          this.values[x+(y*3)] = 1;
        } else {
          this.values[x+(y*3)] = 0;
        }
      }
    }    
  }
  
  rotate(ang) {
    tmp_mat1.identity();
    tmp_mat1.values[0+(0*3)] = Math.cos(ang);
    tmp_mat1.values[1+(0*3)] = -Math.sin(ang);
    tmp_mat1.values[0+(1*3)] = Math.sin(ang);
    tmp_mat1.values[1+(1*3)] = Math.cos(ang);

    //this.load(tmp_mat1);
    tmp_mat2.load(this);
    this.matmult(tmp_mat2, tmp_mat1);
  }

  translate(x, y) {
    tmp_mat1.identity();
    tmp_mat1.values[2+(0*3)] = x;
    tmp_mat1.values[2+(1*3)] = y;

    //this.load(tmp_mat1);
    tmp_mat2.load(this);
    this.matmult(tmp_mat2, tmp_mat1);
  }
  
  //vector multiply x
  vx(x, y) {
    return (this.values[0+(0*3)] * x)
      + (this.values[1+(0*3)] * y)
      + (this.values[2+(0*3)])
  }

  vy(x, y) {
    return (this.values[0+(1*3)] * x)
      + (this.values[1+(1*3)] * y)
      + (this.values[2+(1*3)])
  }
}

let tmp_mat1 = new Mat3();
let tmp_mat2 = new Mat3();
Mat3.identity = new Mat3();
