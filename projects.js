// ===== YOUR PROJECTS DATA =====
// Edit this file to update projects on ALL pages automatically!

const projects = [
  {
    title: "Best Neighborhood in Pittsburgh",
    description: "Analysis of Pittsburgh's neighborhoods using Python code and datasets necessary to determine the 'best' neighborhood based on overall metric and research within three sub-metrics; Public Safety, Parks, Public schools.",
    tags: ["NumPy", "Jupyter", "Pandas", "Python", "Data Analysis", "MatPlotLib"],
    demo: null,
    source: "https://github.com/owenlatt9/BestNeighborhoodCS0010",
    featured: true
  },
  {
    title: "Evade",
    description: "A survival game where you control a ball with your cursor and dodge increasingly chaotic bouncing balls. Features size-speed scaling (big balls are slow, small balls are fast), local high score tracking, and progressively harder gameplay as the screen fills up.",
    tags: ["JavaScript", "HTML Canvas", "CSS", "Game Development"],
    demo: "game.html",
    source: "https://github.com/owenlatt9/evade",
    featured: true
  },
  {
    title: "Project Three",
    description: "A personal project, hackathon submission, or class project that showcases different skills.",
    tags: ["JavaScript", "HTML/CSS", "REST API"],
    demo: "#",
    source: "#",
    featured: false
  },
  {
    title: "Project Four",
    description: "Room for more projects as you build them. Keep adding to your portfolio!",
    tags: ["Java", "Spring Boot"],
    demo: null,
    source: "#",
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