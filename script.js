(function(){
  "use strict";

  /* --- Шапка: матовое стекло при скролле --- */
  var header = document.getElementById("header");
  var toTop = document.getElementById("toTop");
  function onScroll(){
    var y = window.scrollY || 0;
    header.classList.toggle("scrolled", y > 40);
    toTop.classList.toggle("show", y > 700);
  }
  window.addEventListener("scroll", onScroll, {passive:true});
  onScroll();
  toTop.addEventListener("click", function(){ window.scrollTo({top:0, behavior:"smooth"}); });

  /* --- Бургер-меню --- */
  var burger = document.getElementById("burger");
  var mobileMenu = document.getElementById("mobileMenu");
  function closeMenu(){ burger.classList.remove("open"); mobileMenu.classList.remove("open"); document.body.style.overflow=""; }
  burger.addEventListener("click", function(){
    var open = mobileMenu.classList.toggle("open");
    burger.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  mobileMenu.querySelectorAll("a").forEach(function(a){ a.addEventListener("click", closeMenu); });
  document.getElementById("mmClose").addEventListener("click", closeMenu);

  /* --- Scroll-spy: подсветка активного раздела --- */
  var navLinks = document.querySelectorAll("#nav a[href^='#'], #mobileMenu a[href^='#']");
  var sectionIds = ["about", "houses", "gallery", "prices", "contacts"];
  function spy(){
    var pos = (window.scrollY || 0) + 120;
    var currentId = null;
    sectionIds.forEach(function(id){
      var s = document.getElementById(id);
      if (s && s.offsetTop <= pos) currentId = id;
    });
    if (!currentId) currentId = "about";
    navLinks.forEach(function(a){
      a.classList.toggle("active", a.getAttribute("href") === "#" + currentId);
    });
  }
  window.addEventListener("scroll", spy, {passive:true});
  spy();

  /* --- Появление блоков при скролле --- */
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting){ e.target.classList.add("visible"); io.unobserve(e.target); }
    });
  }, {threshold:0.12});
  document.querySelectorAll(".reveal").forEach(function(el){ io.observe(el); });

  /* --- Лайтбокс --- */
  var items = Array.prototype.slice.call(document.querySelectorAll(".gallery-item img"));
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbCount = document.getElementById("lbCount");
  var index = 0;

  function show(i){
    index = (i + items.length) % items.length;
    lbImg.src = items[index].src;
    lbImg.alt = items[index].alt || "";
    lbCount.textContent = (index + 1) + " / " + items.length;
  }
  function openLb(i){ show(i); lb.classList.add("open"); document.body.style.overflow="hidden"; }
  function closeLb(){ lb.classList.remove("open"); document.body.style.overflow=""; }

  items.forEach(function(img, i){ img.parentElement.addEventListener("click", function(){ openLb(i); }); });
  document.getElementById("lbClose").addEventListener("click", closeLb);
  document.getElementById("lbPrev").addEventListener("click", function(){ show(index - 1); });
  document.getElementById("lbNext").addEventListener("click", function(){ show(index + 1); });
  lb.addEventListener("click", function(e){ if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function(e){
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") show(index - 1);
    if (e.key === "ArrowRight") show(index + 1);
  });
  /* Свайп на мобильных */
  var touchX = null;
  lb.addEventListener("touchstart", function(e){ touchX = e.touches[0].clientX; }, {passive:true});
  lb.addEventListener("touchend", function(e){
    if (touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  }, {passive:true});

  /* --- Созвездие: ночное небо в hero ---
     Один кадрированный момент: тёплые звёзды + Большая Медведица (медведь из логотипа).
     Лёгкость: ~90 точек, DPR <= 1.5, свечение через кэш-спрайт, rAF паузится
     вне экрана и на скрытой вкладке, reduced-motion -> один статичный кадр. */
  var canvas = document.getElementById("stars");
  if (canvas && canvas.getContext){
    var ctx = canvas.getContext("2d");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var coarse = window.matchMedia("(pointer: coarse)").matches;
    var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    var W = 0, H = 0, stars = [], running = false, raf = null;
    var par = {x:0, y:0, tx:0, ty:0};

    // Кэш-спрайт свечения (вместо дорогого shadowBlur)
    var glow = document.createElement("canvas");
    glow.width = glow.height = 64;
    var gc = glow.getContext("2d");
    var grad = gc.createRadialGradient(32,32,0,32,32,32);
    grad.addColorStop(0,"rgba(255,240,214,.95)");
    grad.addColorStop(.3,"rgba(255,217,160,.5)");
    grad.addColorStop(1,"rgba(255,217,160,0)");
    gc.fillStyle = grad;
    gc.fillRect(0,0,64,64);

    // Большая Медведица, пропорции как на атласных фото: широкая фигура (~1.85:1),
    // ковш справа вверху, ручка уходит влево. Локальный бокс: x 0.06-0.91, y 0.27-0.73.
    var DIPPER = [
      [0.06,0.62],[0.23,0.47],[0.39,0.53],[0.58,0.46],  // ручка: Алкайд, Мицар, Алиот, Мегрец
      [0.90,0.27],[0.91,0.51],[0.66,0.73]               // ковш: Дубхе, Мерак, Фекда
    ];
    var DIPPER_LINES = [[3,4],[4,5],[5,6],[6,3],[3,2],[2,1],[1,0]];
    var dipper = [];

    function build(){
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR,0,0,DPR,0,0);

      var n = Math.round(Math.min(110, Math.max(45, W * H / 16000)));
      if (W < 760) n = Math.round(n / 2);
      stars = [];
      for (var i = 0; i < n; i++){
        stars.push({
          x: Math.random(), y: Math.random() * 0.82,      // небо — верхняя часть кадра
          r: 0.5 + Math.random() * 0.9,
          base: 0.25 + Math.random() * 0.45,
          amp: 0.12 + Math.random() * 0.22,
          spd: 0.4 + Math.random() * 1.1,
          ph: Math.random() * 6.283,
          warm: Math.random() < 0.75
        });
      }

      // Медведица — в открытом куске неба справа вверху; на мобильных компактнее, у верхнего края
      var small = W < 760;
      var ox, oy, bw, bh;
      if (small){
        bw = W * 0.66; bh = bw / 1.85;
        ox = W - bw - W * 0.04;
        oy = H * 0.09;
      } else {
        bw = W * 0.34; bh = Math.min(H * 0.40, bw / 1.85);
        ox = W - bw - W * 0.035;
        oy = H * 0.05;
      }
      dipper = DIPPER.map(function(p, i){
        return {
          x: ox + (p[0] - 0.06) / 0.85 * bw,
          y: oy + (p[1] - 0.27) / 0.46 * bh,
          r: 2.1 + (i === 3 ? -0.4 : 0.3),   // Мегрец (угол ковша) чуть тусклее остальных
          ph: i * 1.3
        };
      });
    }

    function drawStar(s, x, y, a, core, flare){
      ctx.globalAlpha = a;
      var d = s.r * 7;
      ctx.drawImage(glow, x - d, y - d, d * 2, d * 2);
      if (flare){
        var l = s.r * 5;
        ctx.globalAlpha = a * 0.55;
        ctx.strokeStyle = core;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
        ctx.moveTo(x, y - l); ctx.lineTo(x, y + l);
        ctx.moveTo(x - l * .55, y - l * .55); ctx.lineTo(x + l * .55, y + l * .55);
        ctx.moveTo(x - l * .55, y + l * .55); ctx.lineTo(x + l * .55, y - l * .55);
        ctx.stroke();
      }
      ctx.globalAlpha = Math.min(1, a * 1.4);
      ctx.fillStyle = core || "#FFF8EC";
      ctx.beginPath();
      ctx.arc(x, y, s.r, 0, 6.283);
      ctx.fill();
    }

    function paint(t){
      ctx.clearRect(0,0,W,H);
      var dx = Math.sin(t * 0.045) * 6 + par.x;
      var dy = Math.cos(t * 0.035) * 3 + par.y;

      for (var i = 0; i < stars.length; i++){
        var s = stars[i];
        var a = s.base + s.amp * Math.sin(t * s.spd + s.ph);
        if (a <= 0.02) continue;
        drawStar(s, s.x * W + dx * (0.4 + s.r * 0.4), s.y * H + dy * 0.6, a);
      }

      // линии созвездия: толще, но с затуханием к середине каждого отрезка
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      for (var j = 0; j < DIPPER_LINES.length; j++){
        var p1 = dipper[DIPPER_LINES[j][0]], p2 = dipper[DIPPER_LINES[j][1]];
        var gg = ctx.createLinearGradient(p1.x + dx, p1.y + dy, p2.x + dx, p2.y + dy);
        var edge = 0.60 + 0.08 * Math.sin(t * 0.5 + j);
        gg.addColorStop(0, "rgba(214,168,116," + edge.toFixed(3) + ")");
        gg.addColorStop(0.5, "rgba(214,168,116,0.22)");
        gg.addColorStop(1, "rgba(214,168,116," + edge.toFixed(3) + ")");
        ctx.strokeStyle = gg;
        ctx.beginPath();
        ctx.moveTo(p1.x + dx, p1.y + dy);
        ctx.lineTo(p2.x + dx, p2.y + dy);
        ctx.stroke();
      }

      for (var k = 0; k < dipper.length; k++){
        var d2 = dipper[k];
        drawStar(d2, d2.x + dx, d2.y + dy, 0.85 + 0.15 * Math.sin(t * 0.8 + d2.ph), "#FFF3DC", true);
      }
      ctx.globalAlpha = 1;
    }

    function loop(now){
      if (!running) return;
      par.x += (par.tx - par.x) * 0.04;
      par.y += (par.ty - par.y) * 0.04;
      paint(now / 1000);
      raf = requestAnimationFrame(loop);
    }
    function start(){
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }
    function stop(){
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    build();
    if (reduce){
      paint(2.4);                       // один статичный кадр
    } else {
      if (!coarse){
        canvas.parentElement.addEventListener("mousemove", function(e){
          var r = canvas.getBoundingClientRect();
          par.tx = ((e.clientX - r.left) / r.width - 0.5) * 12;
          par.ty = ((e.clientY - r.top) / r.height - 0.5) * 7;
        }, {passive:true});
      }
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){ e.isIntersecting ? start() : stop(); });
      }, {threshold:0.02}).observe(canvas);
      document.addEventListener("visibilitychange", function(){
        if (document.hidden) stop();
        else {
          var r = canvas.getBoundingClientRect();
          if (r.bottom > 0 && r.top < window.innerHeight) start();
        }
      });
      var rsz;
      window.addEventListener("resize", function(){
        clearTimeout(rsz);
        rsz = setTimeout(function(){
          build();
          if (reduce) paint(2.4);
        }, 180);
      });
      start();
    }
  }
})();
