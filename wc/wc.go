// Copyright 2010 The Go Authors.  All rights reserved.
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

package wc

import (
	"bytes"
	"fmt"
	"http"
	"io"
	"log"
	"sort"
	"template"
	"runtime/debug"
)

func frontPageHandler(c http.ResponseWriter, req *http.Request) {
	frontPage.Execute(c, "a man a plan a canal panama")
}

var wcFunc func(string)map[string]int

func runwc(s string) (m map[string]int, err string) {
	defer func() {
		if v := recover(); v != nil {
			err = fmt.Sprintln("panic: ", v)
			err += "\nCall stack:\n" + string(debug.Stack())
		}
	}()
	return wcFunc(s), ""
}

type wordCount struct {
	Word string
	Count int
}

type wordCounts []wordCount

func (wc wordCounts) Less(i, j int) bool {
	return wc[i].Count > wc[j].Count ||
		wc[i].Count == wc[j].Count && wc[i].Word < wc[j].Word
}

func (wc wordCounts) Swap(i, j int) {
	wc[i], wc[j] = wc[j], wc[i]
}

func (wc wordCounts) Len() int {
	return len(wc)
}

func wcHandler(c http.ResponseWriter, req *http.Request) {
	var buf bytes.Buffer
	io.Copy(&buf, req.Body)
	m, err := runwc(buf.String())
	if err != "" {
		c.WriteHeader(404)
		c.Write([]byte("<pre>"))
		template.HTMLEscape(c, []byte(err))
		c.Write([]byte("</pre>"))
		return
	}
	w := make([]wordCount, len(m))
	n := 0
	for word, count := range m {
		w[n] = wordCount{word, count}
		n++
	}
	sort.Sort(wordCounts(w))
	table.Execute(c, w)
}

// Serve runs a web server on port 4000 counting words using f.
func Serve(f func(string)map[string]int) {
	wcFunc = f
	http.HandleFunc("/", frontPageHandler)
	http.HandleFunc("/wc", wcHandler)
	err := http.ListenAndServe("127.0.0.1:4000", nil)
	log.Fatal(err)
}

var frontPage, table *template.Template

func init() {
	frontPage = template.New(nil)
	frontPage.SetDelims("«", "»")
	err := frontPage.Parse(frontPageText)
	if err != nil {
		panic(err)
	}

	table = template.New(nil)
	table.SetDelims("«", "»")
	err = table.Parse(tableText)
	if err != nil {
		panic(err)
	}
}

var frontPageText = `<!doctype html>
<html>
<head>
<style>
h1 { font-family: monospace; }
</style>
<script>
var xmlreq;

function runwc() {
	var prog = document.getElementById("edit").value;
	var req = new XMLHttpRequest();
	xmlreq = req;
	req.onreadystatechange = wcUpdate;
	req.open("POST", "/wc", true);
	req.setRequestHeader("Content-Type", "text/plain; charset=utf-8");
	req.send(prog);	
}

function wcUpdate() {
	var req = xmlreq;
	if(!req || req.readyState != 4) {
		return;
	}
	if(req.status == 200) {
		document.getElementById("output").innerHTML = req.responseText;
		document.getElementById("errors").innerHTML = "";
	} else {
		document.getElementById("errors").innerHTML = req.responseText;
		document.getElementById("output").innerHTML = "";
	}
}
</script>
</head>
<body>
<h1>Interactive Word Count</h1>
<table width="100%"><tr><td width="60%" valign="top">
<textarea autofocus="true" id="edit" style="width: 100%; height: 200px; font-size: 100%;" spellcheck="false" contenteditable="true" onkeyup="runwc();">«@|html»
</textarea>
<br/>
<td width="3%">
<td width="27%" align="right" valign="top">
<div id="output" align="left" style="width: 100%; font-size: 100%;">
</div>
</table>
<div id="errors" align="left" style="width: 100%; font-family: monaco; font-size: 100%; color: #800;">
</div>
</body>
</html>
`

var tableText = `map [
<table>
«.repeated section @»
<tr><td width=20><td>«Word»<td>«Count»</tr>
«.end»
</table>
]
`

