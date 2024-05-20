const EMAIL_REGEX = /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*\")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/;
const USERNAME_REGEX = /[^A-Za-z0-9]/;

let config = {
  "username": {
    "min": 3,
    "max": 20
  },
  "password": {
    "min": 12,
    "max": 1024,
    "require_mixed_case": true,
    "require_number": true,
    "numbers_required": 1,
    "require_special": true,
    "special_required": 1
  },
  "production": true
}

async function signup() {
  const signup_username_text = document.getElementById("signup_username_text");
  const signup_email_text = document.getElementById("signup_email_text");
  const signup_password_text = document.getElementById("signup_password_text");
  const signup_agree_tos_checkbox = document.getElementById("signup_agree_tos_checkbox");
  const signup_button_signup = document.getElementById("signup_button_signup");
  signup_button_signup.setAttribute("disabled",true);
  signup_button_signup.classList.add("is-loading");

  // Sanity check all the inputs one last time.
  let username = signup_username_text.value;
  let email = signup_email_text.value;
  let password = signup_password_text.value;
  let tosbox = signup_agree_tos_checkbox.checked;

  // Check agreeance to ToS / PP
  if (!tosbox) {
    return show_popup("You must agree to the Terms of Service and Privacy Policy!", true, 5000);
  }

  // Check username in bounds
  if (config.username.min > username.length) {
    return show_popup("Username is too short!", true, 5000);
  }
  if (config.username.max < username.length) {
    return show_popup("Username is too long!", true, 5000);
  }
  if (!/^[A-Za-z0-9]+$/.test(username)) {
    return show_popup("Username must be alphanumeric!", true, 5000);
  }

  // Check email validity
  if (!EMAIL_REGEX.test(email)) {
    return show_popup("Email address is invalid!");
  }

  // Password analysis
  let _is_mixed_lower = false;
  let _is_mixed_upper = false;
  let _has_enough_numbers_count = 0;
  let _has_enough_special_count = 0;


  for (const char of password) {
    if (/[a-z]/i.test(char)) {
      _is_mixed_upper ||= char === char.toUpperCase();
      _is_mixed_lower ||= char === char.toLowerCase();
    }
    if (!(/[a-zA-Z0-9]/.test(char))) {
      _has_enough_special_count++;
    }
    if (!isNaN(char)) {
      _has_enough_numbers_count++;
    }
  }

  let is_mixed = _is_mixed_lower && _is_mixed_upper;
  let has_enough_numbers = _has_enough_numbers_count >= config.password.numbers_required;
  let has_enough_special = _has_enough_special_count >= config.password.special_required;

  // Check password against the rules.
  if (password.length < config.password.min) {
    return show_popup(format("Password must be a minimum length of {0}!",config.password.min), true, 5000);
  }
  if (password.length > config.password.max) {
    return show_popup(format("Password must be a maximum length of {0}!",config.password.max), true, 5000);
  }
  if (config.password.require_mixed_case && !is_mixed) {
    return show_popup("Password must be mixed case!", true, 5000);
  }
  if (config.password.require_number && !has_enough_numbers) {
    return show_popup(format("Password must contain {0} numbers, only has {1}!", config.password.numbers_required, _has_enough_numbers_count), true, 5000);
  }
  if (config.password.require_special && !has_enough_special) {
    return show_popup(format("Password must contain {0} special characters, only has {1}!", config.password.special_required, _has_enough_special_count), true, 5000);
  }

  let packet = {
    "name": username,
    "password": password,
    "email": email,
    "accepted_tos": tosbox
  };

  let request;
  try {
    request = await fetch("/api/user/create/", {
      "method": "POST",
      "headers": {
        "Content-Type": "application/json"
      },
      "body": JSON.stringify(packet)
    });

    if (request.status == 200) {
      show_popup("Created user!", false, 2500, 100);
    } else {
      show_popup(format("Failed to create user! HTTP{0}: {1}", request.status, await request.text()), true, 3000);
    }
  } catch (e) {
    show_popup("Failed to log in! " + e, true, 3000, 100);
  }

  if (request.status == 200) {
    // Log in to set cookies
    try {
      let login_request = await fetch("/api/user/login/", {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": JSON.stringify({
          "name": username,
          "password": password
        })
      });

      if (request.status == 200) {
        window.location.assign("/");
      } else {
        show_popup(format("Failed to log in! HTTP{0}: {1}", login_request.status, await login_request.text()), true, 3000);
      }
    } catch (e) {
      show_popup("Failed to log in! " + e, true, 3000);
    }
  }

  signup_button_signup.removeAttribute("disabled");
  signup_button_signup.classList.remove("is-loading");
}

function set_button(disabled, reason) {
  const signup_button_signup = document.getElementById("signup_button_signup");
  if (!disabled) {
    signup_button_signup.classList.remove("is-danger");
    signup_button_signup.classList.add("is-link");
    signup_button_signup.removeAttribute("disabled");
    signup_button_signup.title = null;
  } else {
    signup_button_signup.classList.remove("is-link");
    signup_button_signup.classList.add("is-danger");
    signup_button_signup.setAttribute("disabled", null);
    signup_button_signup.title = reason;
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
    config = await config_request.json();
  }

  let password_strength_config = [
    {
      id: 0,
      value: "Too weak",
      min_diversity: 0,
      min_length: 0,
      colour: "is-danger"
    },
    {
      id: 1,
      value: "Weak",
      min_diversity: 2,
      min_length: config.password.min, // 12
      colour: "is-warning"
    },
    {
      id: 2,
      value: "Medium",
      min_diversity: 4,
      min_length: Math.floor(config.password.min*1.34), // 16
      colour: "is-primary"
    },
    {
      id: 3,
      value: "Strong",
      min_diversity: 4,
      min_length: Math.floor(config.password.min*1.67), // 20
      colour: "is-success"
    },
    {
      id: 4,
      value: "Very strong",
      min_diversity: 4,
      min_length: Math.floor(config.password.min*2.67), // 32
      colour: "is-success"
    }
  ];

  // Attach hooks
  let button_disabled_username = false;
  let button_disabled_email = false;
  let button_disabled_password = false;
  let button_disabled_tos = false;
  let button_reason = "";
  const signup_username_text = document.getElementById("signup_username_text");
  const signup_email_text = document.getElementById("signup_email_text");
  const signup_password_text = document.getElementById("signup_password_text");
  const signup_agree_tos_checkbox = document.getElementById("signup_agree_tos_checkbox");

  const signup_password_too_short = document.getElementById("signup_password_too_short");
  const signup_password_too_long = document.getElementById("signup_password_too_long");
  const signup_password_mixed_case = document.getElementById("signup_password_mixed_case");
  const signup_password_min_numbers = document.getElementById("signup_password_min_numbers");
  const signup_password_min_special = document.getElementById("signup_password_min_special");

  signup_username_text.addEventListener("input", function(e) {
    if (signup_username_text.value.length > config.username.max) {
      button_disabled_username = true;
      button_reason = format("Username must be a maxiumum of {0}!",config.username.max);
    } else if (signup_username_text.value.length < config.username.min) {
      button_disabled_username = true;
      button_reason = format("Username must be a minimum of {0}!",config.username.min);
    } else if (!/^[A-Za-z0-9]+$/.test(signup_username_text.value)) {
      button_disabled_username = true;
      button_reason = "Username must be alphanumeric!";
    } else {
      button_disabled_username = false;
    }
    if (button_disabled_username) {
      signup_username_text.classList.add("is-danger");
    } else {
      signup_username_text.classList.remove("is-danger");
    }
    check_button();
  });

  signup_email_text.addEventListener("input", function(e) {
    if (!EMAIL_REGEX.test(signup_email_text.value)) {
      button_disabled_email = true;
      button_reason = "Invalid email!";
    } else {
      button_disabled_email = false;
    }
    if (button_disabled_email) {
      signup_email_text.classList.add("is-danger");
    } else {
      signup_email_text.classList.remove("is-danger");
    }
    check_button();
  });

  signup_password_text.addEventListener("input", function(e) {
    let text = signup_password_text.value;
    let _is_mixed_lower = false;
    let _is_mixed_upper = false;
    let _has_enough_numbers_count = 0;
    let _has_enough_special_count = 0;


    for (const char of text) {
      if (/[a-z]/i.test(char)) {
        _is_mixed_upper ||= char === char.toUpperCase();
        _is_mixed_lower ||= char === char.toLowerCase();
      }
      if (!(/[a-zA-Z0-9]/.test(char))) {
        _has_enough_special_count++;
      }
      if (!isNaN(char)) {
        _has_enough_numbers_count++;
      }
    }

    let is_mixed = _is_mixed_lower && _is_mixed_upper;
    let has_enough_numbers = _has_enough_numbers_count >= config.password.numbers_required;
    let has_enough_special = _has_enough_special_count >= config.password.special_required;

    signup_password_too_short.style.display = "none";
    signup_password_mixed_case.style.display = "none";
    signup_password_min_numbers.style.display = "none";
    signup_password_min_special.style.display = "none";
    if (text.length < config.password.min) {
      button_disabled_password = true;
      signup_password_too_short.innerText = format("Password must be a minimum length of {0}!",config.password.min);
      signup_password_too_short.style.display = null;
    } else if (text.length > config.password.max) {
      button_disabled_password = true;
      signup_password_too_long.innerText = format("Password must be a maximum length of {0}!",config.password.min);;
      signup_password_too_long.style.display = null;
    } else if (config.password.require_mixed_case && !is_mixed) {
      button_disabled_password = true;
      signup_password_mixed_case.innerText = "Password must be mixed case!";
      signup_password_mixed_case.style.display = null;
    } else if (config.password.require_number && !has_enough_numbers) {
      button_disabled_password = true;
      signup_password_min_numbers.innerText = format("Password must contain {0} numbers, only has {1}!", config.password.numbers_required, _has_enough_numbers_count);
      signup_password_min_numbers.style.display = null;
    } else if (config.password.require_special && !has_enough_special) {
      button_disabled_password = true;
      signup_password_min_special.innerText = format("Password must contain {0} special characters, only has {1}!", config.password.special_required, _has_enough_special_count);
      signup_password_min_special.style.display = null;
    } else {
      button_disabled_password = false;
    }
    if (button_disabled_password) {
      signup_password_text.classList.add("is-danger");
    } else {
      signup_password_text.classList.remove("is-danger");
    }
    check_button();

    // Funny password strength meter
    let strength = password_strength(text, password_strength_config);
    console.log(strength);
    const signup_password_strength_bar = document.getElementById("signup_password_strength_bar");
    const signup_password_strength_text = document.getElementById("signup_password_strength_text");
    signup_password_strength_bar.removeAttribute("class");
    signup_password_strength_bar.setAttribute("value", (strength.id+1)*20);
    signup_password_strength_bar.classList.add(strength.colour, "mt-4", "mb-0", "progress");
    signup_password_strength_text.innerText = strength.value;
  });

  signup_agree_tos_checkbox.addEventListener("click", function(e) {
    button_disabled_tos = !signup_agree_tos_checkbox.checked;

    if (button_disabled_tos) {
      button_reason = "You must agree to the Terms of Service!";
    }
    check_button();
  })

  function check_button() {
    let disabled = button_disabled_username || button_disabled_email || button_disabled_password || button_disabled_tos;
    set_button(disabled, button_reason);
  }

  const event = new Event("input");
  signup_username_text.dispatchEvent(event);
  signup_email_text.dispatchEvent(event);
  signup_password_text.dispatchEvent(event);
  signup_agree_tos_checkbox.dispatchEvent(new Event("click"));
}

if (document.readyState == "loading") {
  document.addEventListener("DOMContentLoaded", setup);
} else {
  setup().catch(error => {
    console.error("Setup failed:", error);
  });
}