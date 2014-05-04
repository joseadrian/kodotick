window.addEventListener("load",function() {
  
  var interval_ss, interval_ns;
  
  // Config
  var Q = Quintus({ development: true, audioSupported: ['ogg', 'wav', 'mp3'] })
  .include("Sprites, Scenes, Input, 2D, Anim, Audio, Touch, UI");

  Q.setup({
    width:   32, 
    height:  32,
    scaleToFit: true
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
        cx: 0,
        cy: 0,
        x: 1,
        y: 1,
        type: 0
        
        // mode
        // time: 3  (Pseudo)
      });
      
      this.add('animation');
      this.play(this.p.mode);
      this.on('inserted');
      this.on('loop');
    },
    inserted: function() {
      Q.audio.stop('bonus_' + this.p.mode + '.mp3');
      Q.audio.play('bonus_' + this.p.mode + '.mp3', { loop: true });
    },
    destroyed: function() {
      Q.audio.stop('bonus_' + this.p.mode + '.mp3');
      Q('Kodotick').trigger('finish_bonus', this.p.mode);
    },
    step: function(dt) {
      this.p.x -= this.p.time * dt;
      
      if(this.p.x < -this.p.w) {
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
      });
      
      this.add('2d');
      this.on('hit');
      
      if( ! this.p.color) {
        this.p.color = Q.randomColor();
      }
      // 0: Top, 1: Right, 2: bottom, 3: left
      this.p.direction = Math.round(Math.random() * 3);
      this.p.speed  = Math.floor(Math.random() * 5 + 5);
      
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
        this.p.vy = Math.round(this.p.speed);
      } else {
        this.p.vx = this.p.speed;
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
        this.p.x += Q.inputs['left'] ? - 1 : 1;
      }
      
      if(Q.inputs['up'] || Q.inputs['down']) {
        this.p.y += Q.inputs['up'] ? -1 : 1; 
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
        type: 0
      });
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
    
    var arrow = stage.insert(new Q.Element({ asset: 'arrow.png', x: 28, y: 22, angle: 180 }));
    var selected = null;
    
    stage.insert(new Q.UI.Button({ x: 10, y: 22, w: 18, h: 4 }, function() {
      if(selected == null) selected = Q.controlClick(arrow, 90, 'mouse');
    }));
    
    stage.insert(new Q.UI.Button({ x: 16, y: 29, w: 30, h: 5 }, function() {
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
   
    stage.insert(new Q.UI.Text({ 
      size: 10,
      label: "" + Q.state.get('points'),
      family: 'Vidya',
      color: 'black',
      x: Q.width/2, 
      y: Q.height/2,
      align: 'center'
    }));
    
    stage.insert(new Q.UI.Button({ x: 4, y: 22, cx: 0, cy: 0, w: 15, h: 15, radius: 0 }, function() {
      Q.stageScene('Menu');
    }));

    stage.insert(new Q.UI.Button({ x: 19, y: 22, cx: 0, cy: 0, w: 15, h: 15, radius: 0 }, function() {
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
    }, 100);
    
    // Special Squares
    interval_ss = setInterval(function() {
      var opts;
      
      if(Math.random() < 0.5) {
        opts = { special: true };
      } else {
        opts = { color: Math.random() < 0.5 ? '#000000' : '#FFFFFF' };
      }
      
      stage.insert(new Q.Square(opts));
    }, 3e4);
  });

  // Ready...
  Q.load([
    // images
    'background.png', 'main.png', 'arrow.png', 'bar.png', 'gameover.png',
    // data
    'bar.json',
    // audios
    'hit.mp3', 'point_special.mp3', 'point.mp3', 'explosion.mp3', 'gameover.mp3', 
    'bonus_special.mp3', 'bonus_block.mp3'
  ], function() {
    Q.compileSheets('bar.png', 'bar.json');
    
    Q.stageScene('Menu');
  });

});