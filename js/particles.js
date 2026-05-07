(function () {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');
  var particles = [];
  var mouse = { x: null, y: null, radius: 120 };
  var w, h;

  canvas.id = 'particles-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';

  document.body.prepend(canvas);

  function resize() {
    w = document.documentElement.clientWidth;
    h = document.documentElement.clientHeight;
    canvas.width = w;
    canvas.height = h;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.x;
    mouse.y = e.y;
  });

  function Particle() {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.size = Math.random() * (1 + w / 900) + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.3;
    this.speedY = -Math.random() * 0.2 - 0.03;
    this.opacity = Math.random() * 0.45 + 0.15;
    this.hue = Math.random() * 40 + 200;

    this.update = function () {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < -10) this.x = w + 10;
      if (this.x > w + 10) this.x = -10;
      if (this.y < -10) this.y = h + 10;
      if (this.y > h + 10) this.y = -10;

      if (mouse.x !== null) {
        var dx = mouse.x - this.x;
        var dy = mouse.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          var force = (mouse.radius - dist) / mouse.radius;
          this.x -= dx * force * 0.015;
          this.y -= dy * force * 0.015;
        }
      }
    };

    this.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = 'hsla(' + this.hue + ', 80%, 70%, ' + this.opacity + ')';
      ctx.fill();
    };
  }

  function start() {
    resize();
    var count = Math.min(120, Math.floor((w * h) / 8000));
    for (var i = 0; i < count; i++) {
      particles.push(new Particle());
    }
    animate();
  }

  function animate() {
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();

      for (var j = i + 1; j < particles.length; j++) {
        var dx = particles[i].x - particles[j].x;
        var dy = particles[i].y - particles[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.strokeStyle = 'rgba(102, 163, 255, ' + (0.08 * (1 - dist / 120)) + ')';
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(animate);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    start();
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
