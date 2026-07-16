const page=(location.pathname.split('/').pop()||'index.html');
document.querySelectorAll('.nav-link').forEach(a=>{if(a.getAttribute('href')===page)a.classList.add('active')});
const menu=document.querySelector('.menu'),links=document.querySelector('.nav-links');if(menu)menu.onclick=()=>links.classList.toggle('open');
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
window.initials=name=>name.split(' ').filter(Boolean).map(x=>x[0]).join('').slice(0,2).toUpperCase();
