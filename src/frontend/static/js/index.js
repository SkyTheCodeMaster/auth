function fill_projects(projects, element) {
  let topdiv = document.createElement("div");
  for (let project of projects) {
    let subdiv = document.createElement("div");
    subdiv.classList.add("box", "pb-1");
    subdiv.style.align = "center";
    let h1 = document.createElement("h1");
    h1.classList.add("title", "is-5");
    h1.innerText = project["name"];
    h1.style.display = "inline-block";
    h1.innerHTML = format("<a href='/projects#{0}'>{1}</a>", encodeURIComponent(project["name"]), project["name"]);

    let public_icon = document.createElement("iconify-icon");
    public_icon.setAttribute("icon", project["public"] ? "material-symbols:public" : "material-symbols:public-off")
    public_icon.setAttribute("title", project["public"] ? "This project is publically viewable." : "This project is private.")
    public_icon.style.display = "inline-block";
    public_icon.classList.add("pl-1");
    let open_icon = document.createElement("iconify-icon");
    open_icon.setAttribute("icon", project["open"] ? "material-symbols:lock-open" : "material-symbols:lock");
    open_icon.setAttribute("title", project["open"] ? "Anybody can join this project freely." : "Users must be approved by an admin for this project.");
    open_icon.style.display = "inline-block";

    subdiv.appendChild(h1);
    subdiv.appendChild(public_icon);
    subdiv.appendChild(open_icon);

    topdiv.appendChild(subdiv);
  }

  element.replaceWith(topdiv);
}

// Get a list of public projects and fill out the sidebar.
async function fill_sidebar() {
  
  let public_search_request = await fetch("/api/project/search/");
  let public_search_data = await public_search_request.json();
  const public_projects = document.getElementById("public_projects");
  fill_projects(public_search_data, public_projects);

  // Now try to see if we're authenticated, and if so, present Your Projects.
  // Else, hide Your Projects.
  // The navbar will be handled in `nav.js`
  let authenticated_projects_column = document.getElementById("authenticated_projects_column");

  let user_project_request = await fetch("/api/user/projects/");
  if (user_project_request.status == 401) {
    authenticated_projects_column.style.display = "none";
  } else if (user_project_request.status == 200) {
    // We are logged in, lets get our projects and display them.
    authenticated_projects_column.style.display = "block";
    let user_project_data = await user_project_request.json();
    const authenticated_projects = document.getElementById("authenticated_projects");
    fill_projects(user_project_data, authenticated_projects);
  }
}

async function setup() {
  await fill_sidebar();
}

if (document.readyState == "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup().catch(error => {
    console.error("Setup failed:", error);
  });
}