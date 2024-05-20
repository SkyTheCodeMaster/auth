async function login() {
  const login_username_text = document.getElementById("login_username_text");
  const login_password_text = document.getElementById("login_password_text");
  const login_checkbox_rememberme = document.getElementById("login_checkbox_rememberme");
  const login_button_login = document.getElementById("login_button_login");
  login_button_login.setAttribute("disabled",true);
  login_button_login.classList.add("is-loading");

  let packet = {
    "name": login_username_text.value,
    "password": login_password_text.value,
    "rememberme": login_checkbox_rememberme.checked,
  };

  try {
    let request = await fetch("/api/user/login/", {
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": JSON.stringify(packet)
    });

    if (request.status == 200) {
      show_popup("Logged in!", false, 2500, 100);
    } else {
      show_popup("Failed to log in!", true, 3000, 100);
    }
  } catch (e) {
    show_popup("Failed to log in! " + e, true, 3000, 100);
  }

  login_button_login.removeAttribute("disabled");
  login_button_login.classList.remove("is-loading");
}

function set_button(disabled, reason) {
  const login_button_login = document.getElementById("login_button_login");
  if (!disabled) {
    login_button_login.removeAttribute("disabled");
    login_button_login.title = null;
  } else {
    login_button_login.setAttribute("disabled", null);
    login_button_login.title = reason;
  }
}

async function setup() {
  let config_request;
  try {
    config_request = await fetch("/api/srv/config/");
  } catch (e) {
    show_popup(format("Failed to fetch config! {0}", e), true, 5000);
  }
  if (config_request.status == 200) {
    // Attach hooks
    let button_disabled = false;
    let button_reason = "";
    let config = await config_request.json();
    const login_username_text = document.getElementById("login_username_text");
    login_username_text.addEventListener("input", function(e) {
      if (login_username_text.value.length > config.username.max) {
        if (!button_disabled) {
          button_disabled = true;
          button_reason = format("Username must be a maxiumum of {0}!",config.username.max);
        }
      } else if (login_username_text.value.length < config.username.min) {
        if (!button_disabled) {
          button_disabled = true;
          button_reason = format("Username must be a minimum of {0}!",config.username.min);
        }
      } else {
        button_disabled = false;
      }
      set_button(button_disabled, button_reason);
    })
  }

}

if (document.readyState == "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup().catch(error => {
    console.error("Setup failed:", error);
  });
}