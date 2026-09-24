// ===== YOUR PROJECTS DATA =====
// Edit this file to update projects on ALL pages automatically!

const projects = [
  {
    title: "Evade",
    description: "A survival game where you control a ball with your cursor and dodge increasingly chaotic bouncing balls. Features size-speed scaling (big balls are slow, small balls are fast), local high score tracking, and progressively harder gameplay as the screen fills up. I remembered playing a game like this when I was little so I tried to recreate it just for fun. I made it a while back but then just recently uploaded it so it can be played online.",
    tags: ["JavaScript", "HTML Canvas", "CSS", "Game Development", "Python",],
    demo: "game.html",
    source: "https://github.com/owenlatt9/evade",
    featured: true
  },
  {
    title: "Spotify Listening Dashboard Builder",
    description: "A tool that turns your Spotify streaming history into an interactive dashboard — top artists and tracks by year, a month-by-month timeline, how your taste shifted over time, and a day/hour heatmap of when you actually listen. Drop in the Extended Streaming History export Spotify emails you, pick a color theme, and it builds the whole thing client-side, with an option to exclude specific artists (handy for filtering out background/study music) before anything gets calculated. You can also bake the result into a standalone HTML file to host anywhere. I originally built this just to make the 'Listening Stats' page on this site, then cleaned it up so anyone can generate their own.",
    tags: ["JavaScript", "HTML", "CSS", "SVG", "Data Visualization"],
    demo: "https://owenlatt9.github.io/Spotify-Listening-Dashboard-Builder/",
    source: "https://github.com/owenlatt9/Spotify-Listening-Dashboard-Builder",
    featured: true
  },
  {
    title: "SheetPlay",
    description: "A local practice tool for musicians that runs entirely in the browser as a single HTML file. Load your own sheet music PDF and audio track, set a metronome count-in with custom BPM and time signature, and play along. Features a live beat ticker with bar counter, waveform scrubbing, an adjustable start point so the count-in hands off cleanly to the recording, and saveable presets. Everything stays client-side, so your files never leave your computer.",
    tags: ["JavaScript", "HTML", "CSS", "PDF.js", "Web Audio API", "localStorage"],
    demo: "sheetplay.html",
    source: "https://github.com/owenlatt9/SheetPlay",
    featured: true
  },
  {
    title: "Best Neighborhood in Pittsburgh",
    description: "Analysis of Pittsburgh's neighborhoods using Python code and datasets necessary to determine the 'best' neighborhood based on overall metric and research within three sub-metrics; Public Safety, Parks, Public schools.",
    tags: ["NumPy", "Jupyter", "Pandas", "Python", "Data Analysis", "MatPlotLib"],
    demo: null,
    source: "https://github.com/owenlatt9/BestNeighborhoodCS0010",
    featured: false
  }
];

// ===== RENDER FUNCTION =====
// Generates HTML for project cards

function renderProjects(containerId, showOnlyFeatured = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const projectsToShow = showOnlyFeatured 
    ? projects.filter(p => p.featured) 
    : projects;

  container.innerHTML = projectsToShow.map(project => `
    <div class="project-card">
      <h3>${project.title}</h3>
      <p>${project.description}</p>
      <div class="project-tags">
        ${project.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
      </div>
      <div class="project-links">
        ${project.demo ? `<a href="${project.demo}" target="_blank">🔗 Live Demo</a>` : ''}
        ${project.source ? `<a href="${project.source}" target="_blank">📂 Source Code</a>` : ''}
      </div>
    </div>
  `).join('');
}
