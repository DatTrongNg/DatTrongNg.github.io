// Mobile nav toggle
const hamburger = document.querySelector('.hamburger');
const sidebar   = document.querySelector('.sidebar');

if (hamburger && sidebar) {
  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// Mark active nav link
const links = document.querySelectorAll('nav a');
const current = location.pathname.split('/').pop() || 'index.html';
links.forEach(a => {
  const href = a.getAttribute('href');
  if (href === current || (current === '' && href === 'index.html')) {
    a.classList.add('active');
  }
});

// Subtle fade-in on load
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = 0;
  requestAnimationFrame(() => {
    document.body.style.transition = 'opacity 0.35s ease';
    document.body.style.opacity = 1;
  });
});
