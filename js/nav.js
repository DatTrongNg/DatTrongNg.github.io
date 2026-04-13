document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('#site-nav');
  if (!nav) return;
  nav.innerHTML = `
    <div class="nav-inner">
      <a class="nav-name" href="index.html">Dat Nguyen</a>
      <ul class="nav-links">
        <li><a href="index.html">About</a></li>
        <li><a href="experience.html">Experience</a></li>
        <li><a href="publications.html">Publications</a></li>
        <li><a href="skills.html">Skills</a></li>
        <li><a href="blog.html">Blog</a></li>
      </ul>
      <button class="nav-toggle" aria-label="Menu">☰</button>
    </div>
  `;
});
