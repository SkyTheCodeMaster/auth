let api_projects_list = []

function fill_projects(projects, element) {
  let topdiv = document.getElementById("projects_list");
  remove_children(topdiv);

  for (let project of projects) {
    let panel_block = document.createElement("a");
    panel_block.classList.add("panel-block");
    const name = project["name"];
    panel_block.onclick = async function() {
      window.location.hash = name;
      await display_project(name);
    }

    let panel_icon = document.createElement("span");
    panel_icon.classList.add("panel-icon");

    let icon = document.createElement("iconify-icon");
    icon.setAttribute("icon", project["public"] ? "material-symbols:public" : "material-symbols:public-off")
    panel_icon.appendChild(icon);

    panel_block.appendChild(panel_icon);

    let txt = document.createElement("p");
    txt.innerText = project["name"];

    panel_block.appendChild(txt);

    topdiv.appendChild(panel_block);
  }

  element.replaceWith(topdiv);
}

async function display_project(project_name) {
  // Get all the required elements.
  const project_column = document.getElementById("project_details_box");
  const project_title = document.getElementById("project_details_name");
  const project_image = document.getElementById("project_details_image");
  const project_tag_user_count = document.getElementById("project_details_tag_user_count");
  const project_tag_public = document.getElementById("project_details_tag_public");
  const project_tag_open = document.getElementById("project_details_tag_open");
  const project_tag_public_icon = document.getElementById("project_details_tag_public_icon");
  const project_tag_status = document.getElementById("project_details_tag_status");
  const project_tag_open_icon = document.getElementById("project_details_tag_open_icon");
  const project_button_enroll = document.getElementById("project_details_button_enroll");
  const project_description = document.getElementById("project_details_description");

  let project_details_request;
  let data_project;
  try {
    project_details_request = await fetch("/api/project/details/"+encodeURIComponent(project_name));
    data_project = await project_details_request.json();
  } catch (e) {}
  if (project_details_request.status == 200) {
    project_column.classList.add("is-hidden");
    
    let data_project_name = data_project["name"];
    let data_project_url = data_project["url"];
    let data_project_open = data_project["open"];
    let data_project_public = data_project["public"];
    let data_project_user = data_project["user_count"];
    let data_project_description = data_project["description"];

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

    let project_status_request;
    try {
      project_status_request = await fetch("/api/project/status/"+encodeURIComponent(project_name));
    } catch (e) {
      let popup_id = create_popup(format("Error while making status request. {0}", e), true);
      setTimeout(function() { remove_popup(popup_id); }, 10000);
    }
    try {
      let project_status_data = await project_status_request.json();
      let approval = project_status_data["approval"]; // one of: approved, denied, pending, inactive
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
    } catch (e) {
      if (project_status_request.status != 401) {
        let popup_id = create_popup(format("Error while fetching project status. {0}", e), true);
        setTimeout(function() { remove_popup(popup_id); }, 10000);
      } else {
        let popup_id = create_popup(format("Failed to fetch project status. Please log in."), true);
        setTimeout(function() { remove_popup(popup_id); }, 5000);
      }
    }

    project_button_enroll.onclick = function() { enroll(project_name); };
    project_column.classList.remove("is-hidden");
  }
}

function enroll(project_name) {
  let data_packet = {
    "name": project_name
  }

  let post_enroll_request = new XMLHttpRequest();
  post_enroll_request.open("POST","/api/project/enroll/");
  post_enroll_request.send(JSON.stringify(data_packet));
  post_enroll_request.addEventListener("load", function() {
    if ([200,202,204].includes(post_enroll_request.status)) {
      let popup_id = create_popup("Successfully enrolled!");
      setTimeout(function() { remove_popup(popup_id); }, 10000);
      display_project(project_name);
    } else {
      let popup_id = create_popup("Failed to enroll.", true);
      setTimeout(function() { remove_popup(popup_id); }, 5000);
    }
  })
}

async function fill_project_list() {
    // Now try to see if we're authenticated, and if so, fill in the projects list.
  // Else, use public project search list.
  const projects_list = document.getElementById("projects_list");
  let fetch_public = false;

  let auth = window.sessionStorage.getItem("auth");
  if (auth != "false" && auth != "null") {
    let all_user_project_request = await fetch("/api/user/projects/all/");
    if (all_user_project_request.status == 200) {
      // Ok, fill in projects table
      let projects = await all_user_project_request.json();
      api_projects_list = projects;
      fill_projects(projects, projects_list);
    } else {
      // We don't have projects available (Maybe auth is invalid?).
      // Either way, make the network request for public projects.
      fetch_public = true;
    }
  }
  if (auth == "false" || auth == null || fetch_public) {
    let public_project_search = await fetch("/api/project/search/");
    if (public_project_search.status == 200) {
      // Ok, fill in projects table
      let projects = await public_project_search.json();
      api_projects_list = projects;
      fill_projects(projects, projects_list);
    } else {
      // Some unknown error has occurred. Display it to the user.
      let popup_id = create_popup(
        format(
          "Error encountered while fetching projects. HTTP{0}: {1}.",
          public_project_search.status,
          await public_project_search.text()
        ), true);
      setTimeout(function() { remove_popup(popup_id); }, 10000);
    }
  }

  // Lastly, check our hash to see if we need to pre load a project.
  if (window.location.hash != "") {
    let project_name = window.location.hash.slice(1);
    await display_project(project_name);
  }
}

async function setup() {
  await fill_project_list();
}

if (document.readyState == "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup().catch(error => {
    console.error("Setup failed:", error);
  });
}