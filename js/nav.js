// Inject sidebar into any page that calls this
document.addEventListener('DOMContentLoaded', () => {
  const nav = document.querySelector('.sidebar');
  if (!nav) return;

  nav.innerHTML = `
    <div class="sidebar-name">Dat Nguyen</div>
    <div class="sidebar-title">ML Engineer · Paris</div>
    <div class="sidebar-rule"></div>
    <nav>
      <ul>
        <li><a href="index.html"><span class="nav-icon">◈</span> About</a></li>
        <li><a href="experience.html"><span class="nav-icon">◈</span> Experience</a></li>
        <li><a href="publications.html"><span class="nav-icon">◈</span> Publications</a></li>
        <li><a href="skills.html"><span class="nav-icon">◈</span> Skills</a></li>
        <li><a href="blog.html"><span class="nav-icon">◈</span> Blog</a></li>
      </ul>
    </nav>
    <div style="margin-top:auto; padding-top:2rem;">
      <div class="sidebar-socials">
        <a href="mailto:dattrong121099@gmail.com" title="Email">✉</a>
        <a href="https://github.com/DatTrongNg" title="GitHub" target="_blank">⌥</a>
        <a href="https://www.linkedin.com/in/dat-nguyen-18001b213/" title="LinkedIn" target="_blank">in</a>
      </div>
      <div class="sidebar-footer">© 2025 Dat Nguyen</div>
    </div>
  `;

  // Mark active
  const current = location.pathname.split('/').pop() || 'index.html';
  nav.querySelectorAll('a').forEach(a => {
    if (a.getAttribute('href') === current) a.classList.add('active');
  });
});
