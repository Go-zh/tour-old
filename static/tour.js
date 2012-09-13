/* Copyright 2012 The Go Authors.  All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */
(function() {
"use strict";

var slides, editor, $editor, $output;
var slide = null;
var slidenum = 0;

function init() {
	if (tourMode === 'local') {
		$('.appengineMode').remove();
	} else {
		$('.localMode').remove();
	}

	var $tocdiv = $('<div id="toc" />').insertBefore('#slides').hide();
	$tocdiv.append($('<h2>Table of Contents</h2>'));
	var $toc = $('<ol />').appendTo($tocdiv);
	$("#tocbtn").click(toggleToc);

	slides = $("div.slide");
	slides.each(function(i, slide) {
		var $s = $(slide).hide();

		var $h2 = $s.find("h2").first();
		var $nav;
		if ($h2.length > 0) {
			$("<div/>").addClass("clear").insertAfter($h2);
			$nav = $("<div/>").addClass("nav");
			if (i > 0) {
				$nav.append($("<a>◀</a>").click(function() {
					show(i-1);
					return false;
				}).attr("href", "#"+(i)).attr("title", "Previous"));
			} else {
				$nav.append($("<span>◀</span>"));
			}
			if (i+1 < slides.length) {
				$nav.append($("<a>▶</a>").click(function() {
					show(i+1);
					return false;
				}).attr("href", "#"+(i+2)).attr("title", "Next"));
			} else {
				$nav.append($("<span>▶</span>"));
			}
			$nav.insertBefore($h2);

			var thisI = i;
			var $entry = $("<a />").text($h2.text()).click(function() {
				show(thisI);
			}).attr('href', '#'+(i+1));
			$toc.append($entry);
			$entry.wrap('<li />');

		}
	});

	// set up playground editor
	editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
		theme: "plain",
		matchBrackets: true,
		indentUnit: 8,
		tabSize: 8,
		indentWithTabs: true,
		mode: "text/x-go",
		lineNumbers: true,
		extraKeys: {
			"Shift-Enter": function() {
				run();
			}
		}
	});
	$editor = $(editor.getWrapperElement()).attr('id', 'code');
	$output = $('#output');

	$('#more').click(function() {
		$('.controls').toggleClass('expanded');
		return false;
	});
	$('html').click(function() {
		$('.controls').removeClass('expanded');
	});

	$('#run').click(function() {
		run();
		$('.controls').removeClass('expanded');
		return false;
	});

	$('#reset').click(function() {
		reset();
		$('.controls').removeClass('expanded');
		return false;
	});

	$('#kill').click(function() {
		kill();
		$('.controls').removeClass('expanded');
		return false;
	});

	$('#format').click(function() {
		format();
		$('.controls').removeClass('expanded');
		return false;
	});

	$('#togglesyntax').click(function() {
		if (editor.getOption('theme') === 'default') {
			editor.setOption('theme', 'plain');
			$('#togglesyntax').text('Syntax-Highlighting: off');
		} else {
			editor.setOption('theme', 'default');
			$('#togglesyntax').text('Syntax-Highlighting: on');
		}
		setcookie('theme', editor.getOption('theme'), 14);
		$('.controls').removeClass('expanded');
		return false;
	});

	$('#togglelineno').click(function() {
		if (editor.getOption('lineNumbers')) {
			editor.setOption('lineNumbers', false);
			$('#togglelineno').text('Line-Numbers: off');
		} else {
			editor.setOption('lineNumbers', true);
			$('#togglelineno').text('Line-Numbers: on');
		}
		setcookie('lineno', editor.getOption('lineNumbers'), 14);
		$('.controls').removeClass('expanded');
		return false;
	});

	if (getcookie('lineno') === 'false') {
		$('#togglelineno').trigger('click');
	}

	if (getcookie('theme') === 'plain') {
		$('#togglesyntax').trigger('click');
	}
}

function toggleToc() {
	if ($('#toc').is(':visible')) {
		show(slidenum);
	} else {
		$('#slides, #workspace, #slidenum').hide();
		$('#toc').show();
	}
	return false;
}

function show(i) {
	if(i < 0 || i >= slides.length) {
		return;
	}

	// if a slide is already onscreen, hide it and store its code
	if(slide !== null) {
		var $oldSlide = $(slide).hide();
		if (!$oldSlide.hasClass("nocode")) {
			save(slidenum);
		}
	}

	$('#toc').hide();
	$('#slidenum, #slides').show();

	// switch to new slide
	slidenum = i;
	$("#slidenum").text(i+1);
	slide = slides[i];
	var $s = $(slide).show();

	// load stored code, or hide code box
	if ($s.hasClass("nocode")) {
		$('#workspace').hide();
	} else {
		$('#workspace').show();
		$output.empty();
		editor.setValue(load(i) || $s.find('pre.source').text());
		editor.focus();
	}

	// update url fragment
	var url = location.href;
	var j = url.indexOf("#");
	if(j >= 0) {
		url = url.substr(0, j);
	}
	url += "#" + (slidenum+1).toString();
	location.href = url;
}

function reset() {
	editor.setValue($(slide).find('pre.source').text());
	save(slidenum);
}

function save(page) {
	// TODO: store editor.getValue() using localStorage or something similar
	return false;
}

function load(page) {
	// TODO: retrieve a previously stored code snippet from localStorage
	return false;
}

function urlSlideNumber(url) {
	var i = url.indexOf("#");
	if(i < 0) {
		return 0;
	}
	var frag = decodeURIComponent(url.substr(i+1));
	if(/^\d+$/.test(frag)) {
		i = parseInt(frag, 10);
		if(i-1 < 0 || i-1 >= slides.length) {
			return 0;
		}
		return i-1;
	}
	return 0;
}

function pageUpDown(event) {
	var e = window.event || event;
	if (e.keyCode === 33) { // page up
		e.preventDefault();
		show(slidenum-1);
		return false;
	}
	if (e.keyCode === 34) { // page down
		e.preventDefault();
		show(slidenum+1);
		return false;
	}
	return true;
}

$(document).ready(function() {
	init();
	if (location.href.indexOf('#') < 0) {
		show(0);
	} else {
		show(urlSlideNumber(location.href));
	}
	document.onkeydown = pageUpDown;
});

$(window).unload(function() {
	save(slidenum);
});


var seq = 0;

function run() {
	seq++;
	var cur = seq;
	$output.html('<div class="loading">Waiting for remote server...</div>');
	$.ajax("/compile", {
		data: {"body": editor.getValue()},
		type: "POST",
		dataType: "json",
		success: function(data) {
			if (seq !== cur) {
				return;
			}
			$output.empty();
			if (data.compile_errors) {
				$('<pre class="error" />').text(data.compile_errors).appendTo($output);
				highlightErrors(data.compile_errors);
			}
			if (/^IMAGE:/.exec(data.output)) {
				var img = $('<img />').attr('src',
					'data:image/png;base64,' + data.output.substr(6));
				$output.empty().append(img);
				return;
			}
			$('<pre />').text(data.output).appendTo($output);
		},
		error: function() {
			$output.empty();
			$('<pre class="error" />').text("Error communicating with remote server.").appendTo($output);
		}
	});
}

function format() {
	seq++;
	var cur = seq;
	$output.html('<div class="loading">Waiting for remote server...</div>');
	$.ajax("/fmt", {
		data: {"body": editor.getValue()},
		type: "POST",
		dataType: "json",
		success: function(data) {
			if (seq !== cur) {
				return;
			}
			$output.empty();
			if (data.Error) {
				$('<pre class="error" />').text(data.Error).appendTo($output);
				highlightErrors(data.Error);
			} else {
				editor.setValue(data.Body);
			}
		},
		error: function() {
			$('<pre class="error" />').text("Error communicating with remote server.").appendTo($output);
		}
	});
}

function kill() {
	$.ajax("/kill");
}

function highlightErrors(text) {
	if (!editor || !text) {
		return;
	}
	var errorRe = /[a-z0-9]+\.go:([0-9]+):/g;
	var result;
	while ((result = errorRe.exec(text)) !== null) {
		var line = result[1]*1-1;
		editor.setLineClass(line, null, 'errLine');
	}
	editor.setOption('onChange', function() {
		for (var i = 0; i < editor.lineCount(); i++) {
			editor.setLineClass(i, null, null);
		}
		editor.setOption('onChange', null);
	});
}

function getcookie(name) {
	if (document.cookie.length > 0) {
		var start = document.cookie.indexOf(name + '=');
		if (start >= 0) {
			start += name.length + 1;
			var end = document.cookie.indexOf(';', start);
			if (end < 0) {
				end = document.cookie.length;
			}
			return decodeURIComponent(document.cookie.substring(start, end));
		}
	}
	return null;
}

function setcookie(name, value, expire) {
	var expdate = new Date();
	expdate.setDate(expdate.getDate() + expire);
	document.cookie = name + '=' + encodeURIComponent(value) +
		((expire === undefined) ? '' : ';expires=' + expdate.toGMTString());
}

}());
