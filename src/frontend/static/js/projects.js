var api_projects_list = []

function fill_projects(projects, element) {
  var topdiv = document.getElementById("projects_list");
  while (topdiv.firstChild) {
    topdiv.removeChild(topdiv.lastChild);
  }

  for (var project of projects) {
    var panel_block = document.createElement("a");
    panel_block.classList.add("panel-block");
    const name = project["name"];
    panel_block.onclick = function() {
      window.location.hash = name;
      display_project(name);
    }

    var panel_icon = document.createElement("span");
    panel_icon.classList.add("panel-icon");

    var icon = document.createElement("iconify-icon");
    icon.setAttribute("icon", project["public"] ? "material-symbols:public" : "material-symbols:public-off")
    panel_icon.appendChild(icon);

    panel_block.appendChild(panel_icon);

    var txt = document.createElement("p");
    txt.innerText = project["name"];

    panel_block.appendChild(txt);

    topdiv.appendChild(panel_block);
  }

  element.replaceWith(topdiv);
}

function display_project(project_name) {
  fetch("/api/project/details/"+encodeURIComponent(project_name)+"/")
    .then(res => {
      if (res.status == 200) {
        // happy path
        res.text().then(text => {
          var project_column = document.getElementById("project_details_box");
          var project_title = document.getElementById("project_details_name");
          var project_image = document.getElementById("project_details_image");
          var project_tag_user_count = document.getElementById("project_details_tag_user_count");
          var project_tag_public = document.getElementById("project_details_tag_public");
          var project_tag_open = document.getElementById("project_details_tag_open");
          var project_tag_public_icon = document.getElementById("project_details_tag_public_icon");
          var project_tag_status = document.getElementById("project_details_tag_status");
          var project_tag_open_icon = document.getElementById("project_details_tag_open_icon");
          var project_button_enroll = document.getElementById("project_details_button_enroll");
          var project_description = document.getElementById("project_details_description");
          project_column.classList.add("is-hidden");

          var data_project = JSON.parse(text);

          project_column.classList.add("is-hidden");
          
          var data_project_name = data_project["name"];
          var data_project_url = data_project["url"];
          var data_project_open = data_project["open"];
          var data_project_public = data_project["public"];
          var data_project_user = data_project["user_count"];
          var data_project_description = data_project["description"];

          project_title.innerText = data_project_name;
          project_title.setAttribute("href", data_project_url);
          project_image.setAttribute("src", new URL("/favicon.ico", data_project_url));
          project_tag_user_count.innerText = data_project_user;
          
          if (data_project_open) {
            project_tag_open.classList.remove("is-danger");
            project_tag_open.classList.add("is-success");
            project_button_enroll.classList.add("disabled");
            project_button_enroll.setAttribute("disabled",true);

            project_tag_open_icon.setAttribute("icon","material-symbols:lock-open");
          } else {
            project_tag_open.classList.remove("is-success");
            project_tag_open.classList.add("is-danger");
            project_button_enroll.classList.remove("disabled");
            project_button_enroll.removeAttribute("disabled");

            project_tag_open_icon.setAttribute("icon","material-symbols:lock");
          }

          if (data_project_public) {
            project_tag_public.classList.remove("is-danger");
            project_tag_public.classList.add("is-success");

            project_tag_public_icon.setAttribute("icon","material-symbols:public");
          } else {
            project_tag_public.classList.remove("is-success");
            project_tag_public.classList.add("is-danger");

            project_tag_public_icon.setAttribute("icon","material-symbols:public-off");
          }

          project_description.mdContent = data_project_description;

          fetch("/api/project/status/"+encodeURIComponent(project_name)+"/")
            .then(res => res.text())
            .then(text => {
              var status_data = JSON.parse(text);
              var approval = status_data["approval"]; // one of: approved, denied, pending, inactive
              if (["approved","denied","pending"].includes(approval)) {
                project_button_enroll.classList.add("disabled");
                project_button_enroll.setAttribute("disabled",true);
              } else {
                project_button_enroll.classList.remove("disabled");
                project_button_enroll.removeAttribute("disabled");
              }
              project_tag_status.className = "";
              if (approval == "approved") { // User allowed for project, all is good.
                project_tag_status.innerText = "Approved";
                project_tag_status.classList.add("tag","is-success");
              } else if (approval == "denied") { // user denied / banned from project
                project_tag_status.innerText = "Denied";
                project_tag_status.classList.add("tag","is-danger");
              } else if (approval == "pending") { // Project is not open, user has applied, awaiting admin response.
                project_tag_status.innerText = "Pending";
                project_tag_status.classList.add("tag","is-warning");
              } else if (approval == "inactive") { // user hasn't enrolled / applied for project.
                project_tag_status.innerText = "Inactive";
                project_tag_status.classList.add("tag");
              }
            })
            
          project_button_enroll.onclick = function() { enroll(project_name); };
          project_column.classList.remove("is-hidden");
        })
      }
    })
}

function enroll(project_name) {
  var data_packet = {
    "name": project_name
  }

  var post_enroll_request = new XMLHttpRequest();
  post_enroll_request.open("POST","/api/project/enroll/");
  post_enroll_request.send(JSON.stringify(data_packet));
  post_enroll_request.addEventListener("load", function() {
    if ([200,202,204].includes(post_enroll_request.status)) {
      create_popup("Successfully enrolled!");
      display_project(project_name);
    } else {
      create_popup("Failed to enroll.", true);
    }
  })
}

// Get a list of public projects and fill out the sidebar.
window.addEventListener("load", function() {

  // Now try to see if we're authenticated, and if so, fill in the projects list.
  // Else, use public project search list.
  var projects_list = document.getElementById("projects_list");
  var fetch_public = false;

  if (this.sessionStorage.getItem("auth") != "false") {
    this.fetch("/api/user/projects/all/")
      .then(res => {
        if (res.status == 200) {
          // Ok, fill in projects table
          res.text().then(text => {
            var projects = JSON.parse(text);
            api_projects_list = projects;
            fill_projects(projects, projects_list);
          })
        } else {
          // We don't have projects available (Maybe auth is invalid?).
          // Either way, make the network request for public projects.
          fetch_public = true;
        }
      })
  }
  if (this.sessionStorage.getItem("auth") == "false" || fetch_public) {
    this.fetch("/api/project/search/")
      .then(res => {
        if (res.status == 200) {
          // Ok, fill in projects table
          res.text().then(text => {
            var projects = JSON.parse(text);
            api_projects_list = projects;
            fill_projects(projects, projects_list);
          })
        } else {
          // Uh.
          res.text().then(text => {
            projects.innerText = format("Error encountered while fetching projects. HTTP{0}: {1}.", res.status, text);
          })
        }
      })
  }

  // Lastly, check our hash to see if we need to pre load a project.
  if (this.window.location.hash != "") {
    var project_name = window.location.hash.slice(1);
    display_project(project_name);
  }
})