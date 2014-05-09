window.addEventListener("load",function() {
  
  var interval_ss, interval_ns;
  var SCALE = 18;
  
  // Config
  var Q = Quintus({ audioSupported: ['ogg', 'wav', 'mp3'] })
  .include("Sprites, Scenes, Input, 2D, Anim, Audio, Touch, UI");

  Q.setup({
    width:   32 * SCALE, 
    height:  32 * SCALE
  }).controls(false).enableSound().touch();
  
  Q.input.mouseControls({ cursor: 'on' });
  Q.setImageSmoothing(false);
  
  // Game Stuff
  Q.inputSelected = 'mouse';
  Q.colors = [
    'FF0000',
    'FF7F00', 
    'FFFF00', 
    '00FF00', 
    '00FFFF',
    '0000FF',
    '7F00FF',
    'FF007F'
  ];
  
  Q.randomColor = function( ignoreColor ) {
    var color = Q.colors[Math.floor(Math.random() * Q.colors.length)];
    
    if(ignoreColor == '#' + color) {
      return Q.randomColor(ignoreColor);
    }
    
    return '#' + color;
  }
  
  Q.randomPosition = function( pos ) {
    return Math.floor(Math.random() * pos);
  }

  // Sprite and Scenes configuration.
  
  Q.Sprite.extend('Bar', {
    init: function(p) {
      this._super(p, {
        sheet: 'bar',
        sprite: 'bar',
        w: 30,
        h: 1,
        cx: 0,
        cy: 0,
        x: Q.el.width / 2,
        y: 10,
        type: 0
        
        // mode
        // time: 3  (Pseudo)
        
        , scale: SCALE
      });
      
      this.p.fw = this.p.w * SCALE;
      
      this.add('animation');
      this.play(this.p.mode);
      this.on('inserted');
    },
    inserted: function() {
      Q.audio.stop('bonus_' + this.p.mode + '.mp3');
      Q.audio.play('bonus_' + this.p.mode + '.mp3', { loop: true });
    },
    destroyed: function() {
      Q.audio.stop('bonus_' + this.p.mode + '.mp3');
      Q('Kodotick').trigger('finish_bonus', this.p.mode);
    },
    draw: function(ctx) {
      ctx.fillStyle = this.p.color;
      ctx.fillRect(-this.p.cx, -this.p.cy, this.p.w, this.p.h);
    },
    step: function(dt) {
      this.p.fw -= this.p.time / 2;
      this.p.w   = this.p.fw - this.p.fw % SCALE;
      this.p.cx  = this.p.w / 2;
      
      if(this.p.mode == 'special') {
        this.p.color = Q.randomColor();
      }
      
      if(this.p.w <= 0) {
        this.destroy();
      }
    }
  });

  Q.animations('bar', {
    special: {
      frames: [0, 1, 2, 3, 4, 5, 6, 7],
      rate: 0.1
    },
    block: {
      frames: [8],
    }
  });
  
  Q.Sprite.extend("Square", {
    init: function(p) {
      this._super(p,{ 
        w: 1,
        h: 1,
        cx: 0,
        cy: 0,
        gravityY: 0,
        speed: 0,
        special: false
        
        , scale: SCALE
      });
      
      this.add('2d');
      this.on('hit');
      
      if( ! this.p.color) {
        this.p.color = Q.randomColor();
      }
      // 0: Top, 1: Right, 2: bottom, 3: left
      this.p.direction = Math.round(Math.random() * 3);
      this.p.speed     = Math.random() * 3 + 1;
      
      switch(this.p.direction) {
          case 0:
            this.p.x = Q.randomPosition(Q.el.width);
            this.p.y = 0;
          break;
          case 1:
            this.p.y = Q.randomPosition(Q.el.height);
            this.p.x = Q.el.width;
            this.p.speed *= -1;
          break;
          case 2:
            this.p.x = Q.randomPosition(Q.el.width);
            this.p.y = Q.el.height;
            this.p.speed *= -1;
          break;
          case 3:
            this.p.y = Q.randomPosition(Q.el.height);
            this.p.x = 0;
          break;
      }
      
      this.p.fx = this.p.x = this.p.x - this.p.x % SCALE;
      this.p.fy = this.p.y = this.p.y - this.p.y % SCALE;
    },
    hit: function(col) {
      if( col.obj.isA('Square') && !col.obj.p.special) {
        Q.audio.play('hit.mp3');
        col.obj.destroy();
      }
    },
    draw: function(ctx) {
      ctx.fillStyle = this.p.color;
      ctx.fillRect(-this.p.cx, -this.p.cy, this.p.w, this.p.h);
    },
    step: function(dt) {
      
      if(
        (this.p.vx > 0 && this.p.x > Q.el.width) ||
        (this.p.vx < 0 && this.p.x < 0) ||
        (this.p.vy > 0 && this.p.y > Q.el.height) ||
        (this.p.vy < 0 && this.p.y < 0)
      ) {
        this.destroy();
      }
      
      if(this.p.direction % 2 == 0) {
        this.p.fy += this.p.speed;
        this.p.y = this.p.fy - this.p.fy % SCALE;
        // this.p.vy = Math.round(this.p.speed);
      } else {
        this.p.fx += this.p.speed;
        this.p.x = this.p.fx - this.p.fx % SCALE;
        // this.p.vx = this.p.speed;
      }
      
      if(this.p.special) {
        this.p.color = Q.randomColor();
      }
    }
  });

  Q.Sprite.extend("Kodotick",{
    init: function(p) {
      this._super(p,{ 
        w: 1,
        h: 1,
        x: Q.el.width / 2,
        y: Q.el.height / 2,
        cx: 0,
        cy: 0,
        gravityY: 0,
        
        block: false
        
        , scale: SCALE
      });
      
      this.p.color = Q.randomColor();
      
      this.on('hit');
      this.on('finish_bonus');
      
      if(Q.inputSelected == 'keyboard') {
        Q.input.on('left,right,up,down', this, 'move');
      }
    },
    hit : function(col) {
      var p = this.p;
      
      if(p.color != col.obj.p.color && !col.obj.p.special && !this.p.special 
         && col.obj.p.color != '#000000' && col.obj.p.color != '#FFFFFF') {
        Q.stageScene('GameOver');
      } else {
        
        
        if(col.obj.p.special){
          p.special = true;
          this.stage.insert(new Q.Bar({ mode: 'special', time: 3 }));
        }
        
        if(p.special) {
          Q.audio.play('point_special.mp3');
          Q.state.inc("points", 100);
        } else if(col.obj.p.color == '#FFFFFF' ) {
          // Destroy all the squares
          Q.state.inc("points", 10 * Q('Square').length);
          Q('Square').destroy();
        } else if(col.obj.p.color == '#000000') {
          this.p.block = true;
          this.p.color = '#000000';
          this.stage.insert(new Q.Bar({ mode: 'block', time: 5 }));
        } else {
          p.color = Q.randomColor(this.p.color);
          Q.audio.play('point.mp3');
          Q.state.inc("points", 10);
        }
        
        col.obj.destroy();
      }
    },
    finish_bonus: function(mode) {
      this.p[mode] = false;
      
      if(mode == 'block') {
        this.p.color = Q.randomColor();
      }
    },
    move: function() {
      if(this.p.block) {
        return;
      }
      
      if(Q.inputs['left'] || Q.inputs['right']) {
        this.p.x += (Q.inputs['left'] ? - 1 : 1) * SCALE;
      }
      
      if(Q.inputs['up'] || Q.inputs['down']) {
        this.p.y += (Q.inputs['up'] ? -1 : 1) * SCALE; 
      }
    },
    draw: function(ctx) {
      ctx.fillStyle = this.p.color;
      ctx.fillRect(-this.p.cx, -this.p.cy, this.p.w, this.p.h);
    },
    step: function(dt) {
      if(this.p.block) {
        return;
      }
      
      if(Q.inputSelected == 'mouse' && (Q.inputs['mouseX'] && Q.inputs['mouseY'])) {
        this.p.x = Math.floor(Q.inputs['mouseX']);
        this.p.y = Math.floor(Q.inputs['mouseY']);
        
        this.p.x = this.p.x - this.p.x % SCALE;
        this.p.y = this.p.y - this.p.y % SCALE;
      }
      
      if(this.p.x < 0) {
        this.p.x = 0;
      } else if(this.p.x >= Q.el.width) {
        this.p.x = Q.el.width - 1;
      }
      
      if(this.p.y < 0) {
        this.p.y = 0;
      } else if( this.p.y > Q.el.height - 1) {
        this.p.y = Q.el.height - 1;
      }
      
      if(this.p.special) {
        this.p.color = Q.randomColor();
      }
    }
  });
  
  Q.Sprite.extend("Element",{
    init: function(p) {
      this._super(p,{
        x: Q.width/2,
        y: Q.height/2,
        type: 0,
        scale: SCALE
      });
    }
  });
  
  Q.Sprite.extend("Digit", {
    init: function(p) {
      this._super(p, {
        cx: 0,
        sprite: 'digits',
        sheet: 'digit' + p.digit, 
        x: Q.width/2, 
        y: Q.height/2,
        scale: SCALE
      });
      
      this.p.x += this.p.move * this.p.w * SCALE;
    }
  });
  
  Q.controlClick = function(arrow, angle, inputSelected) {
    Q.inputSelected = inputSelected;
    
    arrow.p.angle = angle;

    return setTimeout(function() {
      Q.stageScene('Game');
    }, 1000);
  }
  
  Q.scene('Menu', function(stage) {
    // on Click => Game
    stage.insert(new Q.Element({ asset: 'background.png' }));
    stage.insert(new Q.Element({ asset: 'main.png' }));
    
    var arrow = stage.insert(new Q.Element({ asset: 'arrow.png', x: 27.5 * SCALE, y: 21.5 * SCALE, angle: 180 }));
    var selected = null;
    
    stage.insert(new Q.UI.Button({ x: 10 * SCALE, y: 22 * SCALE, w: 18 * SCALE, h: 4 * SCALE }, function() {
      if(selected == null) selected = Q.controlClick(arrow, 90, 'mouse');
    }));
    
    stage.insert(new Q.UI.Button({ x: 16 * SCALE, y: 29 * SCALE, w: 30 * SCALE, h: 5 * SCALE }, function() {
      if( selected == null) selected = Q.controlClick(arrow, 0, 'keyboard');
    }));
  });

  Q.scene('GameOver', function(stage) {
    // No more squares
    if(interval_ns) {
      clearInterval(interval_ns);
    }
    if(interval_ss) {
      clearInterval(interval_ss);
    }
    
    // Destroying everything
    Q('Square').destroy();
    Q('Kodotick').destroy();
    Q('Bar').destroy();
    
    // Stop all sounds and play the gameover sound
    Q.audio.stop();
    Q.audio.play('gameover.mp3');
    
    stage.insert(new Q.Element({ asset: 'background.png' }));
    stage.insert(new Q.Element({ asset: 'gameover.png' }));
   
    // "Custom font"
    var points = "" + Q.state.get('points');
    points = points.split("");

    for(i = 0; i < points.length; i++) {
      stage.insert(new Q.Digit({ digit: points[i], move: i - points.length/2 }));
    }
    
    // Buttons: Menu / Play Again
    stage.insert(new Q.UI.Button({ x: 4 * SCALE, y: 22 * SCALE, cx: 0 * SCALE, cy: 0 * SCALE, w: 15 * SCALE, h: 15 * SCALE, radius: 0 }, function() {
      Q.stageScene('Menu');
    }));

    stage.insert(new Q.UI.Button({ x: 19 * SCALE, y: 22 * SCALE, cx: 0 * SCALE, cy: 0 * SCALE, w: 15 * SCALE, h: 15 * SCALE, radius: 0 }, function() {
      Q.stageScene('Game');
    }));
    
  });
  
  Q.scene('Game', function(stage) {
    Q.state.reset({ points: 0 });
    
    stage.insert(new Q.Element({ asset: 'background.png' }));
    
    stage.insert(new Q.Kodotick());
    
    // Normal Squares
    interval_ns = setInterval(function() {
      stage.insert(new Q.Square());
    }, 1e2);
    
    // Special Squares
    interval_ss = setInterval(function() {
      var opts;
      
      if(Math.random() < 0.5) {
        opts = { special: true };
      } else {
        opts = { color: Math.random() < 0.5 ? '#000000' : '#FFFFFF' };
      }
      
      stage.insert(new Q.Square(opts));
    }, 1e4);
  });

  // Ready...
  Q.load([
    // images
    'background.png', 'main.png', 'arrow.png', 'bar.png', 'gameover.png', 'digits.png',
    // data
    'bar.json', 'digits.json',
    // audios
    'hit.mp3', 'point_special.mp3', 'point.mp3', 'explosion.mp3', 'gameover.mp3', 
    'bonus_special.mp3', 'bonus_block.mp3'
  ], function() {
    Q.compileSheets('bar.png', 'bar.json');
    Q.compileSheets('digits.png', 'digits.json');
    
    Q.stageScene('Menu');
  });

});