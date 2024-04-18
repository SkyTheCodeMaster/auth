function format(_format) {
  var args = Array.prototype.slice.call(arguments, 1);
  return _format.replace(/{(\d+)}/g, function(match, number) { 
    return typeof args[number] != 'undefined'
      ? args[number] 
      : match
    ;
  });
};

function make_id(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (var i=0; i<length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}
function append_alert(reason) {
  // Get current alerts
  var data = JSON.parse(localStorage.getItem("popup_alert"));
  // Append our alert
  data.push(reason);
  // Write the alerts back
  localStorage.setItem("popup_alert",JSON.stringify(data));
}

function create_popup(reason, is_danger) {
  // Create the div
  const div = document.createElement("div");

  // Create a custom ID for removing only the targetted popup.
  var id = make_id(10);
  div.id = id;

  div.style.position = "fixed";
  div.style.top =    "25px";
  div.style.right =  "40%";
  div.style.width =  "20%";
  div.style.zIndex = "100";

  const notification = document.createElement("div")
  notification.classList.add("notification");
  if (!is_danger) {
    notification.classList.add("is-primary");
  } else {
    notification.classList.add("is-danger");
  }
  // Add a header to the div
  const text_node = document.createTextNode(reason);
  // Add the close button
  const button = document.createElement("button");
  button.classList.add("delete")
  button.onclick = function() { remove_popup(id,reason) };
  // Put everything together
  notification.appendChild(button);
  notification.appendChild(text_node)
  div.appendChild(notification);
  // Add it to the HTML page.
  const body = document.body;
  body.appendChild(div);
}

function remove_popup(popup,reason) {
  var elem = document.getElementById(popup)
  elem.parentNode.removeChild(elem);
  // Now remove the popup from local storage
  var data = JSON.parse(localStorage.getItem("popup_alert"));
  var idx = data.indexOf(reason);
  if (idx !== -1) { data.splice(idx, 1) }
  localStorage.setItem("popup_alert",JSON.stringify(data));
}

window.addEventListener("load",function() {
  if (!this.localStorage.getItem("popup_alert")) {
    this.localStorage.setItem("popup_alert","[]")
  }
  if (this.window.document.documentMode) {
    create_popup("Internet explorer is not a supported browser for this website.");
  }
  var data = localStorage.getItem("popup_alert");
  var arr = JSON.parse(data);
  for (const reason of arr) {
    create_popup(reason);
  }

  refresh_login();
});

function refresh_login() {
  // Return true or false if we managed to make this work.
  if (!window.sessionStorage.getItem("auth")) {
    fetch("/api/user/get/")
    .then(res => {
      if (res.status == 401) {
        // We don't have a signed in user.
        window.sessionStorage.setItem("auth","false");
        return false;
      } else if (res.status == 200) {
        // We are logged in, save the user json to disk.

        res.text().then(txt => {
          window.sessionStorage.setItem("auth",txt);
          window.sessionStorage.setItem("auth-time", Date.now() + 86400000);
          return true;
        })
      }
    })
  }
  if (window.sessionStorage.getItem("auth-time") < Date.now()) {
    // It's been a day. Refresh.
    this.fetch("/api/user/get/")
    .then(res => {
      if (res.status == 401) {
        // We don't have a signed in user.
        window.sessionStorage.setItem("auth","false");
        return false;
      } else if (res.status == 200) {
        // We are logged in, save the user json to disk.

        res.text().then(txt => {
          window.sessionStorage.setItem("auth",txt);
          window.sessionStorage.setItem("auth-time", Date.now() + 86400000);
          return true;
        })
      }
    })
  }
  return true;
}