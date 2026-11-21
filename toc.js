(function () {
  const toc = document.getElementById('toc');
  if (!toc) return;

  const headings = [...document.querySelectorAll('article h2')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const links = headings.map((heading, index) => {
    heading.id = 's' + (index + 1);

    const link = document.createElement('a');
    link.href = '#' + heading.id;
    link.textContent = heading.textContent;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      heading.scrollIntoView({
        behavior: reducedMotion.matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    toc.appendChild(link);
    return link;
  });

  function updateActiveLink() {
    let active = 0;
    headings.forEach((heading, index) => {
      if (heading.getBoundingClientRect().top < 140) active = index;
    });
    links.forEach((link, index) => link.classList.toggle('on', index === active));
  }

  window.addEventListener('scroll', () => requestAnimationFrame(updateActiveLink), { passive: true });
  updateActiveLink();
})();

(function () {
  const search = document.getElementById('q');
  if (!search) return;

  const questions = [...document.querySelectorAll('details')];
  const count = document.getElementById('count');

  function filterQuestions() {
    const query = search.value.trim();
    const needle = query.toLowerCase();
    let matches = 0;

    questions.forEach((question) => {
      const hit = !needle || question.textContent.toLowerCase().includes(needle);
      question.hidden = !hit;
      if (hit) matches++;
      if (needle) question.open = hit && matches <= 3;
    });

    count.textContent = needle
      ? matches + (matches === 1 ? ' answer mentions "' : ' answers mention "') + query + '"'
      : questions.length + ' questions';
  }

  search.addEventListener('input', filterQuestions);
  filterQuestions();
})();
