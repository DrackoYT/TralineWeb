(function () {
  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  canvas.id = 'particles-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '0';

  document.body.prepend(canvas);

  var particles = [];
  var mouse = { x: null, y: null, radius: 120 };

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', function (e) {
    mouse.x = e.x;
    mouse.y = e.y;
  });

  function Particle() {
    this.reset = function () {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.size = Math.random() * 2.5 + 0.5;
      this.speedX = (Math.random() - 0.5) * 0.4;
      this.speedY = -Math.random() * 0.25 - 0.05;
      this.opacity = Math.random() * 0.5 + 0.15;
      this.hue = Math.random() * 40 + 200;
    };

    this.update = function () {
      this.x += this.speedX;
      this.y += this.speedY;

      if (this.x < -10) this.x = canvas.width + 10;
      if (this.x > canvas.width + 10) this.x = -10;
      if (this.y < -10) this.y = canvas.height + 10;
      if (this.y > canvas.height + 10) this.y = -10;

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

    this.reset();
  }

  var particleCount = Math.min(80, Math.floor((window.innerWidth * window.innerHeight) / 12000));

  function init() {
    for (var i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }
    animate();
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  resize();
  init();
})();
