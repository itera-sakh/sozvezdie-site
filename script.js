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
  var sections = Array.prototype.map.call(navLinks, function(a){
    return document.querySelector(a.getAttribute("href"));
  });
  function spy(){
    var pos = (window.scrollY || 0) + 120;
    var current = 0;
    sections.forEach(function(sec, i){ if (sec && sec.offsetTop <= pos) current = i; });
    navLinks.forEach(function(a, i){ a.classList.toggle("active", i === current); });
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
})();
