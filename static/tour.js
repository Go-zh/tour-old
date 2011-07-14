window.onload = init;

var slides;
var slide = null;
var slidenum = 0;
var codebox = null;
var output = null;
var errors = null;

function findclass(el, name) {
	var x = el.getElementsByClassName(name);
	if (x.length == 0)
		return null;
	return x[0];
}

function initSlides() {
	var $slides = $("div.slide");
	$slides.each(function(i, slide) {
		var $s = $(slide).hide();

		var $code = null;
		var $sdiv = $s.find("div");
		if (!$s.hasClass("nocode") && $sdiv.length > 0) {
			$code = $sdiv.last();
			$code.remove();
		}

		var $h2 = $s.find("h2").first();
		if ($h2.length > 0) {
			$("<div/>").addClass("clear").insertAfter($h2);
			var $nav = $("<div/>").addClass("nav")
			if (i > 0) {
				$nav.append($("<button>").click(function() {
					show(i-1);
				}).text("PREV").addClass("prev"));
			}
			if (i+1 < $slides.length) {
				$nav.append($("<button>").click(function() {
					show(i+1);
				}).text("NEXT").addClass("next"));
			}
			$nav.insertBefore($h2);
		}
		if ($s.hasClass("nocode"))
			$h2.addClass("nocode");

		if ($code == null)
			return;

		var $codebox = $("<textarea/>").html($code.html().trim());
		var $codenav = $("<div/>").addClass("nav");
		$codenav.append($("<button>").click(function() {
			compile($codebox[0]);
		}).text("COMPILE").addClass("compile"));
		$code.empty().addClass("code");
		$code.append($codenav).append($codebox);
		$s.prepend($code);

		$s.append("<hr/>");
		$s.append('<div class="compileerrors"/>')
		$s.append('<div class="programoutput"/>')
	});
	return $slides;
}

function show(i) {
	console.log("show", i);
	if(i < 0 || i >= slides.length)
		return;
	if(slide != null) {
		$(slide).hide();
	}
	document.onkeydown = null;
	if(codebox != null) {
		codebox.onkeydown = null;
		codebox.onkeyup = null;
	}
	slidenum = i;

	$("#num").text(i+1);

	var url = location.href;
	var j = url.indexOf("#");
	if(j >= 0)
		url = url.substr(0, j);
	url += "#" + (slidenum+1).toString();
	location.href = url;

	slide = slides[i];
	$(slide).show();
	if ($(slide).hasClass("nocode")) {
		setTimeout(function() {
			document.onkeydown = pageUpDown;
		}, 1);
		return;
	}
	var $code = $("div.code", slide);
	if ($code.length == 0)
		return;
	codebox = $code.find("textarea")[0];
	if (codebox != null) {
		codebox.spellcheck = false;
		codebox.onkeydown = keyDown;
		codebox.onkeyup = keyUp;
		codebox.focus();
		document.onclick = null;
	}
	output = $("div.programoutput", slide)[0];
	errors = $("div.compileerrors", slide)[0];
	document.onclick = function() { codebox.focus(); }
}

function urlSlideNumber(url) {
	var i = url.indexOf("#");
	if(i < 0)
		return 0;
	var frag = unescape(url.substr(i+1));
	if(/^\d+$/.test(frag)) {
		i = parseInt(frag);
		if(i-1 < 0 || i-1 >= slides.length)
			return 0;
		return i-1;
	}
	return 0;
}

function insertTabs(cont, n) {
	// find the selection start and end
	var start = cont.selectionStart;
	var end   = cont.selectionEnd;
	// split the textarea content into two, and insert n tabs
	var v = cont.value;
	var u = v.substr(0, start);
	for (var i=0; i<n; i++) {
		u += "\t";
	}
	u += v.substr(end);
	// set revised content
	cont.value = u;
	// reset caret position after inserted tabs
	cont.selectionStart = start+n;
	cont.selectionEnd = start+n;
}

function autoindent(el) {
	var curpos = el.selectionStart;
	var tabs = 0;
	while (curpos > 0) {
		curpos--;
		if (el.value[curpos] == "\t") {
			tabs++;
		} else if (tabs > 0 || el.value[curpos] == "\n") {
			break;
		}
	}
	setTimeout(function() {
		insertTabs(el, tabs);
	}, 1);
}

var keySeq = 0;
var keyWaiting = false;

function keyDown(event) {
	var e = window.event || event;
	if (e.keyCode == 9) {  // tab
		insertTabs(e.target, 1);
		e.preventDefault();
		return false;
	}
	if (e.keyCode == 13) { // enter
		if (e.shiftKey) {
			compile(e.target);
			e.preventDefault();
			return false;
		}
		autoindent(e.target);
	}
	if (e.keyCode == 33) { // page up
		e.preventDefault();
		show(slidenum-1);
		return false;
	}
	if (e.keyCode == 34) { // page down
		e.preventDefault();
		show(slidenum+1);
		return false;
	}
	return true;
}

function pageUpDown(event) {
	var e = window.event || event;
	if (e.keyCode == 33) { // page up
		e.preventDefault();
		show(slidenum-1);
		return false;
	}
	if (e.keyCode == 34) { // page down
		e.preventDefault();
		show(slidenum+1);
		return false;
	}
	return true;
}

var autocompile = false;

function keyUp(event) {
	var e = window.event || event;
	keySeq++;
	if(!autocompile || codebox == null)
		return;
	if (!keyWaiting) {
		var seq = keySeq;
		keyWaiting = true;
		setTimeout(function() { keyTimeout(seq, 50); }, 50)
	}
}

var waitTime = 200;	// wait 200 ms before compiling

function keyTimeout(seq, n) {
	ks1 = seq;
	ks2 = n;
	if (keySeq != seq) {
		seq = keySeq;
		setTimeout(function() { keyTimeout(seq, 50); }, 50)
		return;
	}
	if (n < waitTime) {
		setTimeout(function() { keyTimeout(seq, n+50); }, 50)
		return;
	}
	keyWaiting = false;
	if (codebox != null)
		compile(codebox);
}

var compileSeq = 0;

function compile(el) {
	var prog = $(el).val();
	var req = new XMLHttpRequest();
	var seq = compileSeq++;
	req.onreadystatechange = function() { compileUpdate(req, seq); }
	req.open("POST", "/compile", true);
	req.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
	req.send(prog);
	if (output) {
		var seq = compileSeq;
		if (errors)
			errors.innerHTML = "";
		output.innerHTML = "";
		setTimeout(function() {
			if (seq == compileSeq) {
				output.innerHTML = "running...";
			}
		}, 1000);
	}
}

function compileUpdate(req, seq) {
	if(!req || req.readyState != 4 || compileSeq != seq)
		return;
	var out = req.responseText;
	var err = "";
	if(req.status != 200) {
		err = out;
		out = "";
	}
	if (output)
		output.innerHTML = out;
	if (errors)
		errors.innerHTML = err;
	compileSeq++;
}

function init() {
	slides = initSlides();
	show(urlSlideNumber(location.href));
}
