async function fill_stats_cell() {
  try {
    let request = await fetch("/api/srv/stats/");
    let data = await request.json();

    format_element_text("stats_cell_db_size", data["dbsize"]);
    format_element_text("stats_cell_users", data["users"]);
    format_element_text("stats_cell_projects", data["projects"]);
    format_element_text("stats_cell_authorizations", data["authorizations"]);
    format_element_text("stats_cell_apikeys", data["apikeys"]);

  } catch (e) {
    show_popup("Failed to get stats!", true, 5000);
    console.error("failed to get stats", e);
  }
}

/** Set user approval for the current project.
 * 
 * @param {String} project Project to set level for.
 * @param {String} name User to set level for.
 * @param {number} level Level to set. 0 = default, 1 = approved, 2 = pending, 3 = banned
 * @returns {boolean} Whether or not user level was set.
 */
async function set_user_approval(project, name, level=0) {
  let packet = {
    "project": project,
    "user": name,
    "approved": level
  }

  let request = await fetch("/api/project/approve/", {
    "method": "POST",
    "headers": {
      "Content-Type": "application/json"
    },
    "body": JSON.stringify(packet)
  });

  return [200,204].includes(request.status);
}

async function fill_set_approval_cell() {
  try {
    let request = await fetch("/api/project/all/");
    let data = await request.json();

    const set_approval_dropdown_button = document.getElementById("set_approval_dropdown_button");
    const set_approval_project_select = document.getElementById("set_approval_project_select");
    const set_approval_button = document.getElementById("set_approval_button");
    const set_approval_username_text = document.getElementById("set_approval_username_text");
    const set_approval_select_box = document.getElementById("set_approval_select_box");

    let current_project;
    function _set_current_project(project_name) {
      current_project = project_name;
      const set_approval_project_selected_project = document.getElementById("set_approval_project_selected_project");
      set_approval_project_selected_project.innerText = current_project;
      set_approval_project_select.classList.remove("is-active");
    }

    set_approval_button.onclick = async function() {
      set_approval_button.setAttribute("disabled",true);
      set_approval_button.classList.add("is-loading");

      try {
        let username = set_approval_username_text.value;
        let approval = Number(set_approval_select_box.value);

        let success = set_user_approval(current_project, username, approval);

        if (success) {
          show_popup("Set user approval!", false, 2000);
        } else {
          show_popup("Failed to set approval!", true, 2000);
        }
      } catch (e) {
        show_popup("Failed to set approval!", true, 5000);
        console.error("failed to set approval", e);
      }

      set_approval_button.removeAttribute("disabled");
      set_approval_button.classList.remove("is-loading");
    }

    set_approval_dropdown_button.onclick = function() {
      set_approval_project_select.classList.toggle("is-active");
    }

    const set_approval_dropdown_projects = document.getElementById("set_approval_dropdown_projects");
    remove_children(set_approval_dropdown_projects);
    for (let project of data) {
      let a = create_element("a",{"inner_text":to_title_case(project.name)});
      a.onclick = function() { _set_current_project(""+project.name);  }
      let dropdown_div = create_element("div",{"classes":["dropdown-item"],"children":[a]});
      set_approval_dropdown_projects.appendChild(dropdown_div);
    }
  } catch (e) {
    show_popup("Failed to get projects!", true, 5000);
    console.error("failed to get projects", e);
  }
}

async function create_project(button) {
  button.classList.add("is-loading");
  button.setAttribute("disabled",true);
  try {
    const create_project_name_text = document.getElementById("create_project_name_text");
    const create_project_url_text = document.getElementById("create_project_url_text");
    const create_project_open_checkbox = document.getElementById("create_project_open_checkbox");
    const create_project_public_checkbox = document.getElementById("create_project_public_checkbox");
    const create_project_description_textarea = document.getElementById("create_project_description_textarea");

    if (create_project_name_text.value === "") {
      throw new Error("Project name must not be empty!");
    }

    let packet = {
      "name": create_project_name_text.value,
      "open": create_project_open_checkbox.checked,
      "public": create_project_public_checkbox.checked,
      "url": create_project_url_text.value,
      "description": create_project_description_textarea.value
    }

    let request = await fetch("/api/project/create/", {
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": JSON.stringify(packet)
    });

    if ([200,204].includes(request.status)) {
      show_popup("Successfully created!", false, 2500);
    } else {
      show_popup(format("Failed to create! HTTP{0}: {1}", request.status, await request.text()), true, 5000);
    }

  } catch (e) {
    show_popup("Failed to create project! " + e, true, 10000);
    console.error("Failed to create project", e);
  }
  button.classList.remove("is-loading");
  button.removeAttribute("disabled");
}

async function setup() {
  await fill_stats_cell();
  await fill_set_approval_cell();
}

if (document.readyState == "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup().catch(error => {
    console.error("Setup failed:", error);
  });
}