function format(_format) {
  let args = Array.prototype.slice.call(arguments, 1);
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
  for (let i=0; i<length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function create_popup(reason, is_danger, width = null) {
  // Create the div
  const div = document.createElement("div");

  // Create a custom ID for removing only the targetted popup.
  let id = make_id(10);
  div.id = id;

  div.style.position = "fixed";
  div.style.top =    "25px";
  if (width != null) {
    let right = (100-width)/2;
    div.style.right = right + "%";
    div.style.width = width + "%";
  } else {
    div.style.right =  "40%";
    div.style.width =  "20%";
  }
  div.style.zIndex = "10000";

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
  return div.id;
}

function remove_popup(popup) {
  let elem = document.getElementById(popup)
  elem.parentNode.removeChild(elem);
}

function show_popup(text, danger, time = 10000, width = null) {
  let popup_id = create_popup(text, danger, width);
  setTimeout(function() { remove_popup(popup_id); }, time);
}

function format_human(human, decimals = 2) {
  if (+human < 1000) return human;
  if (!+human) return '0';

  const k = 1000;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['', 'k', 'M', 'B', 'T', 'Qd', 'Qt', 'Sx', 'Sp', 'Oc', 'No', 'De', 'Ud', 'Du'];

  const i = Math.floor(Math.log(human) / Math.log(k));

  return `${parseFloat((human / Math.pow(k, i)).toFixed(dm))}${sizes[i]}`;
}

function format_bytes(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function format_bytes_per_second(bytes, decimals = 2) {;
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B/s', 'Kbps', 'Mbps', 'Gbps', 'Tbps', 'Pbps', 'Ebps', 'Zbps', 'Ybps'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function format_hashes_per_second(bytes, decimals = 2) {
  if (!+bytes) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s', 'EH/s', 'ZH/s', 'YH/s'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function to_title_case(str) {
  return str.replace(
    /\w\S*/g,
    function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    }
  );
}

function _longdiv(numerator, denominator) {
  let remainder = numerator % denominator;
  let quotient = ((numerator-remainder)/denominator);

  return [quotient, remainder];
}

function parse_seconds(_seconds, decimal_length = 0) {
  // Turn seconds into year month day hour minute second, like
  // 1y 3m 2d 16h 13m 45s
  
  let [_minutes, seconds]  = _longdiv(_seconds, 60);
  let [_hours, minutes] = _longdiv(_minutes, 60);
  let [_days, hours] = _longdiv(_hours, 60);
  let [_months, days] = _longdiv(_days, 24);
  let [_years, months] = _longdiv(_months, 30);
  let years = Math.floor(_years/12);

  let out = ""

  if (years != 0) {
    out = out + format("{0}y ", years.toFixed(decimal_length))
  }
  if (months != 0) {
    out = out + format("{0}m ", months.toFixed(decimal_length))
  }
  if (days != 0) {
    out = out + format("{0}d ", days.toFixed(decimal_length))
  }
  if (hours != 0) {
    out = out + format("{0}h ", hours.toFixed(decimal_length))
  }
  if (minutes != 0) {
    out = out + format("{0}m ", minutes.toFixed(decimal_length))
  }
  if (seconds != 0) {
    out = out + format("{0}s ", seconds.toFixed(decimal_length))
  }

  return out
}

function remove_children(element) {
  while (element.firstChild) {
    element.removeChild(element.lastChild);
  }
}

function set_cookie(name,value,days) {
  var expires = "";
  if (days) {
      var date = new Date();
      date.setTime(date.getTime() + (days*24*60*60*1000));
      expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function get_cookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i=0;i < ca.length;i++) {
      var c = ca[i];
      while (c.charAt(0)==' ') c = c.substring(1,c.length);
      if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
  }
  return null;
}

function delete_cookie(name) {   
  document.cookie = name+'=; Max-Age=-99999999;';  
}

/** Create an element with predefined attributes
 * @param {string} type - The type of element to make.
 * @param {Object} opts - Options to instantiate the element with.
 * @param {string} opts.classes[] - Classes to add to the element.
 * @param {Object} opts.style - Default styles to apply.
 * @param {string} opts.id - ID to apply to the element.
 * @param {string} opts.inner_text - Inner text of the element. Mutually exclusive with `opts.inner_html` and `opts.children`.
 * @param {string} opts.inner_html - Inner HTML of the element. Mutually exclusive with `opts.inner_text` and `opts.children`.
 * @param {HTMLElement} opts.children[] - Children to add to the element. Mutually exclusive with `opts.inner_text` and `opts.inner_html`.
 * @param {Object} opts.attributes - Attributes to apply to the element.
 * @returns {HTMLElement}
 */
function create_element(type, opts={}) {
  const element = document.createElement(type);
  let keys = Object.keys(opts);

  if (keys.includes("classes")) {
    for (let cls of opts.classes) {
      element.classList.add(cls);
    }
  }
  if (keys.includes("style")) {
    for (let [k,v] of Object.entries(opts.style)) {
      element.style[k] = v;
    }
  }
  if (keys.includes("id")) {
    element.id = opts.id;
  }

  // Check for default filling
  let exclusive = false;

  const combinations = [
    ["inner_text", "inner_html"],
    ["inner_text", "children"],
    ["inner_html", "children"]
  ]

  for (const combo of combinations) {
    if (combo.every(key => keys.includes(key))) {
      exclusive = true;
      break;
    }
  }

  if (exclusive) {
    throw new Error("inner_text inner_html and children are mutually exclusive");
  }

  if (keys.includes("inner_text")) {
    element.innerText = opts.inner_text;
  } else if (keys.includes("inner_html")) {
    element.innerHTML = opts.inner_html;
  } else if (keys.includes("children")) {
    for (let child of opts.children) {
      element.appendChild(child);
    }
  }

  if (keys.includes("attributes")) {
    for (let [k,v] of Object.entries(opts.attributes)) {
      element.setAttribute(k,v);
    }
  }

  return element;
}

/** Format an element's innerText based on `data-text` attribute.
 * 
 * @param {HTMLElement|String} element Element to set innerText on  
 * @param  {...any} format_args Format args
 */
function format_element_text(element, ...format_args) {
  if (typeof(element) == "string") {
    element = document.getElementById(element);
  }

  if (element == null) {
    throw new Error("Pass an element object or id!");
  }

  element.innerText = format(element.dataset.text, ...format_args);
}