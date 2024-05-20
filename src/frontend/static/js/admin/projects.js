let api_projects_list = []

/* {
  "name": string,
  "url": string,
  "public": bool,
  "open": bool,
  "description": string,
  "pending": [],
  "current": []
} */
let displayed_project_details;

let Approval = {
  "DEFAULT": 0,
  "APPROVED": 1,
  "PENDING": 2,
  "BANNED": 3,
}

/** Add a tag to the project box
 * 
 * @param {string} label 
 * @param {string} data 
 * @param {string} data_class 
 * @param {boolean} icon
 */
function add_project_details_tag(label, data, data_class=null, icon=false) {
  // Create the elements
  const left_span = create_element("span", {"classes":["tag","is-dark"],"inner_text":label});
  let right_span;
  if (!icon) {
    right_span = create_element("span", {"classes":["tag",data_class],"inner_text":data});
  } else {
    const icon = create_element("iconify-icon", {"attributes":{"icon":data}});
    right_span = create_element("span", {"classes":["tag",data_class],"children":[icon]});
  }
  const tags_div = create_element("div",{"classes":["tags","has-addons"],"children":[left_span,right_span]});
  const control_div = create_element("div",{"classes":["control"],"children":[tags_div]});

  // Add it to the project tags.
  const project_details_tags = document.getElementById("project_details_tags");
  project_details_tags.appendChild(control_div);
}

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

function open_edit_modal() {
  if (!displayed_project_details) {
    return show_popup("Please select a project!", true, 2500);
  }

  const modal_edit_project = document.getElementById("modal_edit_project");
  const modal_edit_project_name = document.getElementById("modal_edit_project_name");
  const modal_edit_project_project_name_text = document.getElementById("modal_edit_project_project_name_text");
  const modal_edit_project_project_url_text = document.getElementById("modal_edit_project_project_url_text");
  const modal_edit_project_project_open_checkbox = document.getElementById("modal_edit_project_project_open_checkbox");
  const modal_edit_project_project_public_checkbox = document.getElementById("modal_edit_project_project_public_checkbox");
  const modal_edit_project_project_description_textarea = document.getElementById("modal_edit_project_project_description_textarea");

  // Set modal title
  modal_edit_project_name.innerText = displayed_project_details["name"];

  // Fill the fields
  modal_edit_project_project_name_text.value = displayed_project_details["name"];
  modal_edit_project_project_url_text.value = displayed_project_details["url"];
  modal_edit_project_project_open_checkbox.checked = displayed_project_details["open"];
  modal_edit_project_project_public_checkbox.checked = displayed_project_details["public"];
  modal_edit_project_project_description_textarea.value = displayed_project_details["description"];

  // Show the modal
  modal_edit_project.classList.add("is-active");
}

function close_edit_modal() {
  const modal_edit_project = document.getElementById("modal_edit_project");
  const modal_edit_project_name = document.getElementById("modal_edit_project_name");
  const modal_edit_project_project_name_text = document.getElementById("modal_edit_project_project_name_text");
  const modal_edit_project_project_url_text = document.getElementById("modal_edit_project_project_url_text");
  const modal_edit_project_project_open_checkbox = document.getElementById("modal_edit_project_project_open_checkbox");
  const modal_edit_project_project_public_checkbox = document.getElementById("modal_edit_project_project_public_checkbox");
  const modal_edit_project_project_description_textarea = document.getElementById("modal_edit_project_project_description_textarea");

  // Close the modal
  modal_edit_project.classList.remove("is-active");

  // Empty the fields
  modal_edit_project_name.innerText = "";
  modal_edit_project_project_name_text.value = "";
  modal_edit_project_project_url_text.value = "";
  modal_edit_project_project_open_checkbox.checked = false;
  modal_edit_project_project_public_checkbox.checked = false;
  modal_edit_project_project_description_textarea.value = "";
}

async function save_project(button) {
  button.classList.add("is-loading");
  button.setAttribute("disabled",true);
  try {
    const modal_edit_project_project_name_text = document.getElementById("modal_edit_project_project_name_text");
    const modal_edit_project_project_url_text = document.getElementById("modal_edit_project_project_url_text");
    const modal_edit_project_project_open_checkbox = document.getElementById("modal_edit_project_project_open_checkbox");
    const modal_edit_project_project_public_checkbox = document.getElementById("modal_edit_project_project_public_checkbox");
    const modal_edit_project_project_description_textarea = document.getElementById("modal_edit_project_project_description_textarea");

    let packet = {
      "projectname": displayed_project_details["name"],
      "name": modal_edit_project_project_name_text.value,
      "open": modal_edit_project_project_open_checkbox.checked,
      "public": modal_edit_project_project_public_checkbox.checked,
      "url": modal_edit_project_project_url_text.value,
      "description": modal_edit_project_project_description_textarea.value
    }

    let save_request = await fetch("/api/project/edit/", {
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": JSON.stringify(packet)
    });

    if ([200,204].includes(save_request.status)) {
      show_popup("Successfully saved!", false, 2500);
    } else {
      show_popup(format("Failed to save! HTTP{0}: {1}", save_request.status, await save_request.text()), true, 5000);
    }

  } catch (e) {
    show_popup("Failed to save project! " + e, true, 10000);
    console.error("Failed to save project", e);
  }
  button.classList.remove("is-loading");
  button.removeAttribute("disabled");
}

async function open_pending_modal(page=0) {
  let request;
  try {
    request = await fetch("/api/project/getpending/"+encodeURIComponent(displayed_project_details["name"])+"?offset="+page*50);
    if (request.status != 200) {
      throw new Error("error in getting pending")
    }
    let pending = await request.json();

    // Fill page selector
    const modal_pending_pagination_previous = document.getElementById("modal_pending_pagination_previous");
    const modal_pending_pagination_next = document.getElementById("modal_pending_pagination_next");
    const modal_pending_pagination_list = document.getElementById("modal_pending_pagination_list");
    
    const modal_pending_pagination_previous_bottom = document.getElementById("modal_pending_pagination_previous_bottom");
    const modal_pending_pagination_next_bottom = document.getElementById("modal_pending_pagination_next_bottom");
    const modal_pending_pagination_list_bottom = document.getElementById("modal_pending_pagination_list_bottom");

    let visible_page = page+1;
    let total_pages = Math.ceil(pending["total"]/50);

    async function go_to_page(pg) {
      close_pending_modal();
      await open_pending_modal(pg);
    }

    modal_pending_pagination_previous.onclick = async function() { await go_to_page(page-1); }
    modal_pending_pagination_next.onclick = async function() { await go_to_page(page+1); }
    modal_pending_pagination_previous_bottom.onclick = async function() { await go_to_page(page-1); }
    modal_pending_pagination_next_bottom.onclick = async function() { await go_to_page(page+1); }

    if (page == 0) {
      modal_pending_pagination_previous.classList.add("is-disabled");
      modal_pending_pagination_previous.setAttribute("disabled",true);
      modal_pending_pagination_previous.onclick = function() {};
      modal_pending_pagination_previous_bottom.classList.add("is-disabled");
      modal_pending_pagination_previous_bottom.setAttribute("disabled",true);
      modal_pending_pagination_previous_bottom.onclick = function() {};
    }
    if (page == total_pages-1) {
      modal_pending_pagination_next.classList.add("is-disabled");
      modal_pending_pagination_next.setAttribute("disabled", true)
      modal_pending_pagination_next.onclick = function() {};
      modal_pending_pagination_next_bottom.classList.add("is-disabled");
      modal_pending_pagination_next_bottom.setAttribute("disabled", true)
      modal_pending_pagination_next_bottom.onclick = function() {};
    }

    let button_goto_one = create_element("a", {"classes":["pagination-link"],"inner_text":"1"});
    button_goto_one.onclick = async function() { await go_to_page(0); }
    let li_goto_one = create_element("li", {"children":[button_goto_one]});

    let span_ellipsis = create_element("span", {"classes":["pagination-ellipsis"],"inner_html":"&hellip;"});
    let li_ellipsis = create_element("li", {"children":[span_ellipsis]});

    let button_goto_end = create_element("a", {"classes":["pagination-link"],"inner_text":total_pages});
    button_goto_end.onclick = async function() { await go_to_page(total_pages-1); }
    let li_goto_end = create_element("li", {"children":[button_goto_end]});

    let button_previous_page = create_element("a", {"classes":["pagination-link"],"inner_text":visible_page-1});
    button_previous_page.onclick = async function() { await go_to_page(page-1); }
    let li_previous_page = create_element("li", {"children":[button_previous_page]});

    let button_current_page = create_element("a", {"classes":["pagination-link"],"inner_text":visible_page});
    let li_current_page = create_element("li", {"children":[button_current_page]});

    let button_next_page = create_element("a", {"classes":["pagination-link"],"inner_text":visible_page+1});
    button_next_page.onclick = async function() { await go_to_page(page+1); }
    let li_next_page = create_element("li", {"children":[button_next_page]});

    if (page != 0) {
      modal_pending_pagination_list.appendChild(li_goto_one.cloneNode(true));
      modal_pending_pagination_list_bottom.appendChild(li_goto_one.cloneNode(true));
    }
    if (page != 0 && page-1 != 0) {
      modal_pending_pagination_list.appendChild(li_ellipsis.cloneNode(true));
      modal_pending_pagination_list.appendChild(li_previous_page.cloneNode(true));
      modal_pending_pagination_list_bottom.appendChild(li_ellipsis.cloneNode(true));
      modal_pending_pagination_list_bottom.appendChild(li_previous_page.cloneNode(true));
    }

    modal_pending_pagination_list.appendChild(li_current_page.cloneNode(true));
    modal_pending_pagination_list_bottom.appendChild(li_current_page.cloneNode(true));

    if (page != total_pages-1) {
      modal_pending_pagination_list.appendChild(li_next_page.cloneNode(true));
      modal_pending_pagination_list_bottom.appendChild(li_next_page.cloneNode(true));
    }
    if (page+1 != total_pages && page+1 != total_pages-1) {
      modal_pending_pagination_list.appendChild(li_ellipsis.cloneNode(true));
      modal_pending_pagination_list.appendChild(li_goto_end.cloneNode(true));
      modal_pending_pagination_list_bottom.appendChild(li_ellipsis.cloneNode(true));
      modal_pending_pagination_list_bottom.appendChild(li_goto_end.cloneNode(true));
    }

    // Fill showing x_of_y texts
    const modal_pending_showing_users = document.getElementById("modal_pending_showing_users");
    const modal_pending_showing_pages = document.getElementById("modal_pending_showing_pages");

    modal_pending_showing_users.innerText = format(modal_pending_showing_users.dataset.text, pending["returned"], pending["total"]);
    modal_pending_showing_pages.innerText = format(modal_pending_showing_pages.dataset.text, visible_page, total_pages);

    // Add users
    const modal_pending_users_list = document.getElementById("modal_pending_users_list");

    for (let user of pending["authorizations"]) {
      // We want this to be a box, with avatar, name, approve, deny buttons.
      // TODO: Maybe add view user profile button?
      let user_name = user.user.name+"";
      let level_left_avatar = create_element("img",{"classes":["level-item"],"attributes":{"src":format("https://avatar.skystuff.cc/avatar/{0}",user_name)}});
      let level_left_username = create_element("p",{"classes":["level-item"],"inner_text":user_name});
      let level_left = create_element("div",{"classes":["level-left"],"children":[level_left_avatar,level_left_username]});

      let level_right_deny = create_element("button",{"classes":["level-item","button","is-danger"],"inner_text":"Deny"});
      level_right_deny.onclick = async function() {
        level_right_deny.classList.add("is-loading");
        level_right_deny.setAttribute("disabled",true);

        try {
          let success = set_user_approval(user_name, Approval.BANNED);
          if (success) {
            show_popup("Denied user!", false, 2000);
            await go_to_page(page);
          } else {
            show_popup("Failed to deny user!", true, 2000);
          }
        } catch (e) {
          show_popup("Failed to deny user!", true, 2000);
          console.error("failed to deny user",e);
        }

        level_right_deny.classList.remove("is-loading");
        level_right_deny.removeAttribute("disabled");
      }
      let level_right_approve = create_element("button",{"classes":["level-item","button","is-success"],"inner_text":"Approve"});
      level_right_approve.onclick = async function() {
        level_right_approve.classList.add("is-loading");
        level_right_approve.setAttribute("disabled",true);

        try {
          let success = set_user_approval(user_name, Approval.APPROVED);
          if (success) {
            show_popup("Approved user!", false, 2000);
            await go_to_page(page);
          } else {
            show_popup("Failed to approved user!", true, 2000);
          }
        } catch (e) {
          show_popup("Failed to approve user!", true, 2000);
          console.error("failed to deny user",e);
        }

        level_right_approve.classList.remove("is-loading");
        level_right_approve.removeAttribute("disabled");
      }

      let level_right = create_element("div",{"classes":["level-right"],"children":[level_right_approve,level_right_deny]});

      // Create main level
      let level = create_element("div",{"classes":["box","level"],children:[level_left,level_right]});

      modal_pending_users_list.appendChild(level);
    }

    // Show the modal
    const modal_pending_users = document.getElementById("modal_pending_users");
    modal_pending_users.classList.add("is-active");
  } catch (e) {
    show_popup(format("Failed to get pending users! HTTP{0}", request.status), true, 2500);
    console.error("Failed to get pending users",e);
  }
}

function close_pending_modal() {
  // Hide modal
  const modal_pending_users = document.getElementById("modal_pending_users");
  modal_pending_users.classList.remove("is-active");

  // Reset page selector
  const modal_pending_pagination_list = document.getElementById("modal_pending_pagination_list");
  const modal_pending_pagination_list_bottom = document.getElementById("modal_pending_pagination_list_bottom");

  remove_children(modal_pending_pagination_list);
  remove_children(modal_pending_pagination_list_bottom);

  // Reset children list
  const modal_pending_users_list = document.getElementById("modal_pending_users_list");
  remove_children(modal_pending_users_list);
}

async function open_current_modal(page=0) {
  let request;
  try {
    request = await fetch("/api/project/getusers/"+encodeURIComponent(displayed_project_details["name"])+"?offset="+page*50);
    if (request.status != 200) {
      throw new Error("error in getting current")
    }
    let current = await request.json();

    // Fill page selector
    const modal_current_pagination_previous = document.getElementById("modal_current_pagination_previous");
    const modal_current_pagination_next = document.getElementById("modal_current_pagination_next");
    const modal_current_pagination_list = document.getElementById("modal_current_pagination_list");
    
    const modal_current_pagination_previous_bottom = document.getElementById("modal_current_pagination_previous_bottom");
    const modal_current_pagination_next_bottom = document.getElementById("modal_current_pagination_next_bottom");
    const modal_current_pagination_list_bottom = document.getElementById("modal_current_pagination_list_bottom");

    let visible_page = page+1;
    let total_pages = Math.ceil(current["total"]/50);

    async function go_to_page(pg) {
      close_current_modal();
      await open_current_modal(pg);
    }

    modal_current_pagination_previous.onclick = async function() { await go_to_page(page-1); }
    modal_current_pagination_next.onclick = async function() { await go_to_page(page+1); }
    modal_current_pagination_previous_bottom.onclick = async function() { await go_to_page(page-1); }
    modal_current_pagination_next_bottom.onclick = async function() { await go_to_page(page+1); }

    if (page == 0) {
      modal_current_pagination_previous.classList.add("is-disabled");
      modal_current_pagination_previous.setAttribute("disabled",true);
      modal_current_pagination_previous.onclick = function() {};
      modal_current_pagination_previous_bottom.classList.add("is-disabled");
      modal_current_pagination_previous_bottom.setAttribute("disabled",true);
      modal_current_pagination_previous_bottom.onclick = function() {};
    }
    if (page == total_pages-1) {
      modal_current_pagination_next.classList.add("is-disabled");
      modal_current_pagination_next.setAttribute("disabled", true)
      modal_current_pagination_next.onclick = function() {};
      modal_current_pagination_next_bottom.classList.add("is-disabled");
      modal_current_pagination_next_bottom.setAttribute("disabled", true)
      modal_current_pagination_next_bottom.onclick = function() {};
    }

    let button_goto_one = create_element("a", {"classes":["pagination-link"],"inner_text":"1"});
    button_goto_one.onclick = async function() { await go_to_page(0); }
    let li_goto_one = create_element("li", {"children":[button_goto_one]});

    let span_ellipsis = create_element("span", {"classes":["pagination-ellipsis"],"inner_html":"&hellip;"});
    let li_ellipsis = create_element("li", {"children":[span_ellipsis]});

    let button_goto_end = create_element("a", {"classes":["pagination-link"],"inner_text":total_pages});
    button_goto_end.onclick = async function() { await go_to_page(total_pages-1); }
    let li_goto_end = create_element("li", {"children":[button_goto_end]});

    let button_previous_page = create_element("a", {"classes":["pagination-link"],"inner_text":visible_page-1});
    button_previous_page.onclick = async function() { await go_to_page(page-1); }
    let li_previous_page = create_element("li", {"children":[button_previous_page]});

    let button_current_page = create_element("a", {"classes":["pagination-link"],"inner_text":visible_page});
    let li_current_page = create_element("li", {"children":[button_current_page]});

    let button_next_page = create_element("a", {"classes":["pagination-link"],"inner_text":visible_page+1});
    button_next_page.onclick = async function() { await go_to_page(page+1); }
    let li_next_page = create_element("li", {"children":[button_next_page]});

    if (page != 0) {
      modal_current_pagination_list.appendChild(li_goto_one.cloneNode(true));
      modal_current_pagination_list_bottom.appendChild(li_goto_one.cloneNode(true));
    }
    if (page != 0 && page-1 != 0) {
      modal_current_pagination_list.appendChild(li_ellipsis.cloneNode(true));
      modal_current_pagination_list.appendChild(li_previous_page.cloneNode(true));
      modal_current_pagination_list_bottom.appendChild(li_ellipsis.cloneNode(true));
      modal_current_pagination_list_bottom.appendChild(li_previous_page.cloneNode(true));
    }

    modal_current_pagination_list.appendChild(li_current_page.cloneNode(true));
    modal_current_pagination_list_bottom.appendChild(li_current_page.cloneNode(true));

    if (page != total_pages-1) {
      modal_current_pagination_list.appendChild(li_next_page.cloneNode(true));
      modal_current_pagination_list_bottom.appendChild(li_next_page.cloneNode(true));
    }
    if (page+1 != total_pages && page+1 != total_pages-1) {
      modal_current_pagination_list.appendChild(li_ellipsis.cloneNode(true));
      modal_current_pagination_list.appendChild(li_goto_end.cloneNode(true));
      modal_current_pagination_list_bottom.appendChild(li_ellipsis.cloneNode(true));
      modal_current_pagination_list_bottom.appendChild(li_goto_end.cloneNode(true));
    }

    // Fill showing x_of_y texts
    const modal_current_showing_users = document.getElementById("modal_current_showing_users");
    const modal_current_showing_pages = document.getElementById("modal_current_showing_pages");

    modal_current_showing_users.innerText = format(modal_current_showing_users.dataset.text, current["returned"], current["total"]);
    modal_current_showing_pages.innerText = format(modal_current_showing_pages.dataset.text, visible_page, total_pages);

    // Add users
    const modal_current_users_list = document.getElementById("modal_current_users_list");

    for (let user of current["users"]) {
      // We want this to be a box, with avatar, name, approve, deny buttons.
      // TODO: Maybe add view user profile button?
      let user_name = user.name
      let level_left_avatar = create_element("img",{"classes":["level-item"],"attributes":{"src":format("https://avatar.skystuff.cc/avatar/{0}",user_name)}});
      let level_left_username = create_element("p",{"classes":["level-item"],"inner_text":user_name});
      let approved_text = ([
        "N/A",
        "Approved",
        "Pending",
        "Denied"
      ])[user.approved];
      let approved_class = ([
        "",
        "is-success",
        "is-warning",
        "is-danger"
      ])[user.approved];
      let level_left_status_tag = create_element("span",{"classes":["tag",approved_class],"inner_text":approved_text});
      let level_left = create_element("div",{"classes":["level-left"],"children":[level_left_avatar,level_left_username,level_left_status_tag]});

      let level_right;
      if (user.approved != 3) {
        let level_right_kick = create_element("button",{"classes":["level-item","button","is-danger"],"inner_text":"Kick"});
        // Add function
        level_right_kick.onclick = async function() {
          level_right_kick.classList.add("is-loading");
          level_right_kick.setAttribute("disabled",true);
  
          try {
            let success = set_user_approval(user_name, Approval.DEFAULT);;
            if (success) {
              show_popup("Removed user!", false, 2000);
              await go_to_page(page);
            } else {
              show_popup("Failed to remove user!", true, 2000);
            }
          } catch (e) {
            show_popup("Failed to remove user!", true, 2000);
            console.error("failed to remove user",e);
          }
  
          level_right_kick.classList.remove("is-loading");
          level_right_kick.removeAttribute("disabled");
        }
  
        let level_right_deny = create_element("button",{"classes":["level-item","button","is-danger"],"inner_text":"Ban"});
        // Add function
        level_right_deny.onclick = async function() {
          level_right_deny.classList.add("is-loading");
          level_right_deny.setAttribute("disabled",true);
  
          try {
            let success = set_user_approval(user_name, Approval.BANNED);;
            if (success) {
              show_popup("Banned user!", false, 2000);
              await go_to_page(page);
            } else {
              show_popup("Failed to remove user!", true, 2000);
            }
          } catch (e) {
            show_popup("Failed to remove user!", true, 2000);
            console.error("failed to remove user",e);
          }
  
          level_right_deny.classList.remove("is-loading");
          level_right_deny.removeAttribute("disabled");
        }
        level_right = create_element("div",{"classes":["level-right"],"children":[level_right_kick,level_right_deny]});
      } else {
        let level_right_unban = create_element("button",{"classes":["level-item","button","is-warning"],"inner_text":"Unban"});
        // Add function
        level_right_unban.onclick = async function() {
          level_right_unban.classList.add("is-loading");
          level_right_unban.setAttribute("disabled",true);
  
          try {
            let success = set_user_approval(user_name, Approval.PENDING);
            if (success) {
              show_popup("Unbanned user!", false, 2000);
              await go_to_page(page);
            } else {
              show_popup("Failed to unban user!", true, 2000);
            }
          } catch (e) {
            show_popup("Failed to unban user!", true, 2000);
            console.error("failed to unban user",e);
          }
  
          level_right_unban.classList.remove("is-loading");
          level_right_unban.removeAttribute("disabled");
        }
        level_right = create_element("div",{"classes":["level-right"],"children":[level_right_unban]});
      }

      // Create main level
      let level = create_element("div",{"classes":["box","level"],children:[level_left,level_right]});

      modal_current_users_list.appendChild(level);
    }

    // Show the modal
    const modal_current_users = document.getElementById("modal_current_users");
    modal_current_users.classList.add("is-active");
  } catch (e) {
    show_popup(format("Failed to get current users! HTTP{0}", request.status), true, 2500);
    console.error("Failed to get current users",e);
  }
}

/** Set user approval for the current project.
 * 
 * @param {String} name User to set level for.
 * @param {number} level Level to set. 0 = default, 1 = approved, 2 = pending, 3 = banned
 * @returns {boolean} Whether or not user level was set.
 */
async function set_user_approval(name, level=0) {
  let packet = {
    "project": displayed_project_details["name"],
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

function close_current_modal() {
  // Hide modal
  const modal_current_users = document.getElementById("modal_current_users");
  modal_current_users.classList.remove("is-active");

  // Reset page selector
  const modal_current_pagination_list = document.getElementById("modal_current_pagination_list");
  const modal_current_pagination_list_bottom = document.getElementById("modal_current_pagination_list_bottom");

  remove_children(modal_current_pagination_list);
  remove_children(modal_current_pagination_list_bottom);

  // Reset children list
  const modal_current_users_list = document.getElementById("modal_current_users_list");
  remove_children(modal_current_users_list);
}

function open_delete_modal() {
  const modal_delete_project = document.getElementById("modal_delete_project");
  const modal_delete_title = document.getElementById("modal_delete_title");
  const modal_delete_name = document.getElementById("modal_delete_name");

  modal_delete_title.innerText = displayed_project_details["name"];
  modal_delete_name.innerText = displayed_project_details["name"];
  modal_delete_project.classList.add("is-active");
}

function close_delete_modal() {
  const modal_delete_project = document.getElementById("modal_delete_project");
  const modal_delete_title = document.getElementById("modal_delete_title");
  const modal_delete_name = document.getElementById("modal_delete_name");

  modal_delete_title.innerText = "";
  modal_delete_name.innerText = "";
  modal_delete_project.classList.remove("is-active");
}

async function delete_project(button) {
  // RIP project
  button.classList.add("is-loading");
  button.setAttribute("disabled",true);
  try {
    let save_request = await fetch("/api/project/delete/"+displayed_project_details["name"], {
      "method": "DELETE"
    });

    if ([200,204].includes(save_request.status)) {
      show_popup("Successfully deleted!", false, 2500);
      setTimeout(function() {window.location.hash=null;window.location.reload()}, 2500);
    } else {
      show_popup(format("Failed to delete! HTTP{0}: {1}", save_request.status, await save_request.text()), true, 5000);
    }

  } catch (e) {
    show_popup("Failed to delete project! " + e, true, 10000);
    console.error("Failed to delete project", e);
  }
  button.classList.remove("is-loading");
  button.removeAttribute("disabled");
}

async function display_project(project_name) {
  // Get all the required elements.
  const project_column = document.getElementById("project_details_box");
  const project_title = document.getElementById("project_details_name");
  const project_image = document.getElementById("project_details_image");
  const project_description = document.getElementById("project_details_description");

  let project_details_request;
  let data_project;
  try {
    project_details_request = await fetch("/api/project/details/"+encodeURIComponent(project_name));
    data_project = await project_details_request.json();
  } catch (e) {}
  if (project_details_request.status == 200) {
    displayed_project_details = data_project;
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
    
    remove_children(document.getElementById("project_details_tags"));
    add_project_details_tag("Users", data_project_user);

    const project_details_navbar_check_current = document.getElementById("project_details_navbar_check_current");
    if (data_project_user > 0) {
      project_details_navbar_check_current.style.display = null;
    } else {
      project_details_navbar_check_current.style.display = "none";
    }
    
    if (data_project_public) {
      add_project_details_tag("Public", "material-symbols:public", "is-success", true);
    } else {
      add_project_details_tag("Public", "material-symbols:public-off", "is-danger", true);
    }

    if (data_project_open) {
      add_project_details_tag("Open", "material-symbols:lock-open", "is-success", true);
    } else {
      add_project_details_tag("Open", "material-symbols:lock", "is-danger", true);
    }

    project_description.mdContent = data_project_description;

    project_column.classList.remove("is-hidden");

    // Now that we have filled in the table, start trying to grab extra data for other functions
    // Such as the pending users, deleting the project, and showing the users of it.
    try {
      let get_pending_request = await fetch("/api/project/getpending/"+encodeURIComponent(project_name));
      if (get_pending_request.status != 200) {
        throw new Error();
      }
      let pending_data = await get_pending_request.json();
      displayed_project_details["pending"] = pending_data;
      const project_details_navbar_check_pending = document.getElementById("project_details_navbar_check_pending");
      if (pending_data.total > 0) {
        add_project_details_tag("Pending", pending_data.total, "is-warning");
        project_details_navbar_check_pending.style.display = null;
      } else {
        project_details_navbar_check_pending.style.display = "none";
      }
    } catch (e) {
      console.error("Error in fetching pending users for project!", e);
      show_popup("Error in fetching pending users for project!", true, 5000);
      const project_details_navbar_check_pending = document.getElementById("project_details_navbar_check_pending");
      project_details_navbar_check_pending.style.display = "none";
    }
  }
}

async function fill_project_list() {
    // Now try to see if we're authenticated, and if so, fill in the projects list.
  // Else, use public project search list.
  const projects_list = document.getElementById("projects_list");

  let auth = window.sessionStorage.getItem("auth");
  if (auth == "false" || auth == null) {
    window.location.replace("/");
  }
  let auth_data = JSON.parse(auth);
  if (!auth_data.super_admin) {
    window.location.replace("/");
  }
  let projects_list_request = await fetch("/api/project/all/");
  if (projects_list_request.status == 200) {
   // Ok, fill in projects table
    let projects = await projects_list_request.json();
    api_projects_list = projects;
    fill_projects(projects, projects_list);
  } else {
    show_popup(format("Failed to fetch projects! HTTP{0}: {1}", projects_list_request.status, projects_list_request.statusText), true, 10000);
    return;
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