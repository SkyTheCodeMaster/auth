fetch("/sup/navbar")
.then(res => res.text())
.then(text => {
  let oldelem = document.querySelector("script#replace_with_navbar");
  let newelem = document.createElement("div");
  newelem.innerHTML = text;
  oldelem.replaceWith(newelem);
});
fetch("/sup/footer")
.then(res => res.text())
.then(text => {
  let oldelem = document.querySelector("div#replace_with_footer");
  let newelem = document.createElement("div");
  newelem.innerHTML = text;
  oldelem.replaceWith(newelem);

  // Now that footer exists, we can fill in the details
  fetch("/api/srv/get/")
    .then(res => res.json())
    .then(data => {
      const footer_frontend_p = document.getElementById("footer_frontend_p");
      const footer_backend_p = document.getElementById("footer_backend_p");
      footer_frontend_p.innerText = format(footer_frontend_p.getAttribute("data-text"), data["frontend_version"]);
      footer_backend_p.innerText = format(footer_backend_p.getAttribute("data-text"), data["api_version"]);
    })
})

// Toggle button for navbar.
function toggle_navmenu(burger) {
  let navbar_menu = document.getElementById("navbar_menu");
  navbar_menu.classList.toggle("is-active");
  burger.classList.toggle("is-active");
}                                                                       

function get_user_area() {
  // Now try to see if we're authenticated, and if so, present user data in navbar.
  // Else, present sign in / log in buttons.
  var navbar_authenticated = document.getElementById("navbar_authenticated");
  var navbar_unauthenticated = document.getElementById("navbar_unauthenticated");
  if (window.sessionStorage.getItem("auth") != "false") {
    // Visualize the correct fields.
    navbar_unauthenticated.style.display = "none";
    navbar_authenticated.style.display = "";

    // Now fill in user data.
    var data = JSON.parse(window.sessionStorage.getItem("auth"));
    var username = data["name"];
  
    // Place the username into the name field.
    var username_button = document.getElementById("navbar_authenticated_user");
    username_button.innerText = username;
    // Setup the correct avatar.
    var avatar = document.getElementById("navbar_authenticated_avatar");
    avatar.setAttribute("src", format("https://avatar.skystuff.cc/avatar/{0}", username));
  } else {
    // Visualize the correct fields.
    navbar_authenticated.style.display = "none";
    navbar_unauthenticated.style.display = ""
  }
}