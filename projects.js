// ===== YOUR PROJECTS DATA =====
// Edit this file to update projects on ALL pages automatically!

const projects = [
  {
    title: "SheetPlay",
    description: "A local practice tool for musicians that runs entirely in the browser as a single HTML file. Load your own sheet music PDF and audio track, set a metronome count-in with custom BPM and time signature, and play along. Features a live beat ticker with bar counter, waveform scrubbing, an adjustable start point so the count-in hands off cleanly to the recording, and saveable presets. Everything stays client-side, so your files never leave your computer.",
    tags: ["JavaScript", "HTML", "CSS", "PDF.js", "Web Audio API", "localStorage"],
    demo: "sheetplay.html",
    source: "https://github.com/owenlatt9/SheetPlay",
    featured: true
  },
  {
    title: "Evade",
    description: "A survival game where you control a ball with your cursor and dodge increasingly chaotic bouncing balls. Features size-speed scaling (big balls are slow, small balls are fast), local high score tracking, and progressively harder gameplay as the screen fills up. I remembered playing a game like this when I was little so I tried to recreate it just for fun. I made it a while back but then just recently uploaded it so it can be played online.",
    tags: ["JavaScript", "HTML Canvas", "CSS", "Game Development", "Python",],
    demo: "game.html",
    source: "https://github.com/owenlatt9/evade",
    featured: true
  },
  {
    title: "Best Neighborhood in Pittsburgh",
    description: "Analysis of Pittsburgh's neighborhoods using Python code and datasets necessary to determine the 'best' neighborhood based on overall metric and research within three sub-metrics; Public Safety, Parks, Public schools.",
    tags: ["NumPy", "Jupyter", "Pandas", "Python", "Data Analysis", "MatPlotLib"],
    demo: null,
    source: "https://github.com/owenlatt9/BestNeighborhoodCS0010",
    featured: false
  } /*,
  {
    title: "Project Four",
    description: "Room for more projects as you build them. Keep adding to your portfolio!",
    tags: ["Java", "Spring Boot"],
    demo: null,
    source: "#",
    featured: false
  } */
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
