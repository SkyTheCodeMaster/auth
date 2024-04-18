function fill_projects(projects, element) {
  var topdiv = document.createElement("div");
  for (var project of projects) {
    var subdiv = document.createElement("div");
    subdiv.classList.add("box", "pb-1");
    subdiv.style.align = "center";
    var h1 = document.createElement("h1");
    h1.classList.add("title", "is-5");
    h1.innerText = project["name"];
    h1.style.display = "inline-block";
    h1.innerHTML = format("<a href='/projects#{0}'>{1}</a>", encodeURIComponent(project["name"]), project["name"]);

    var public_icon = document.createElement("iconify-icon");
    public_icon.setAttribute("icon", project["public"] ? "material-symbols:public" : "material-symbols:public-off")
    public_icon.setAttribute("title", project["public"] ? "This project is publically viewable." : "This project is private.")
    public_icon.style.display = "inline-block";
    public_icon.classList.add("pl-1");
    var open_icon = document.createElement("iconify-icon");
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
window.addEventListener("load", function() {
  fetch("/api/project/search/")
    .then(res => res.text())
    .then(text => {
      var projects = JSON.parse(text);
      var element = document.getElementById("public_projects");
      fill_projects(projects, element);
    });

  // Now try to see if we're authenticated, and if so, present Your Projects.
  // Else, hide Your Projects.
  // The navbar will be handled in `nav.js`
  var your_projects_column = document.getElementById("authenticated_projects_column");

  fetch("/api/user/projects/")
    .then(res => {
      if (res.status == 401) {
        // We don't have a signed in user.
        your_projects_column.style.display = "none";
      } else if (res.status == 200) {
        // We are logged in, lets get our projects and display them.
        your_projects_column.style.display = "block";
        res.text().then(text => {
          var projects = JSON.parse(text);
          var element = document.getElementById("authenticated_projects");
          fill_projects(projects, element);
        })
      }
    });
})