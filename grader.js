#!/usr/bin/env node
/*
Automatically grade files for the presence of specified HTML tags/attributes.
Uses commander.js and cheerio. Teaches command line application development
and basic DOM parsing.

References:

 + cheerio
   - https://github.com/MatthewMueller/cheerio
   - http://encosia.com/cheerio-faster-windows-friendly-alternative-jsdom/
   - http://maxogden.com/scraping-with-node.html

 + commander.js
   - https://github.com/visionmedia/commander.js
   - http://tjholowaychuk.com/post/9103188408/commander-js-nodejs-command-line-interfaces-made-easy

 + JSON
   - http://en.wikipedia.org/wiki/JSON
   - https://developer.mozilla.org/en-US/docs/JSON
   - https://developer.mozilla.org/en-US/docs/JSON#JSON_in_Firefox_2
*/

var util = require('util');
var fs = require('fs');
var program = require('commander');
var cheerio = require('cheerio');
var rest = require('restler');
var HTMLFILE_DEFAULT = "index.html";
var CHECKSFILE_DEFAULT = "checks.json";

var assertFileExists = function(infile) {
    var instr = infile.toString();
    if(!fs.existsSync(instr)) {
        console.log("%s does not exist. Exiting.", instr);
        process.exit(1); // http://nodejs.org/api/process.html#process_process_exit_code
    }
    return instr;
};

var assertIsUrl = function (url) {
    var pattern = new RegExp('^(https?:\\/\\/)?'		// protocol
    + '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'	// domain name
    + '((\\d{1,3}\\.){3}\\d{1,3}))'				// OR ip (v4) address
    + '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'				// port and path
    + '(\\?[;&a-z\\d%_.~+=-]*)?'				// query string
    + '(\\#[-a-z\\d_]*)?$','i');				// fragment locator
    
    if (!pattern.test(url)) {
	console.log("Invalid url  %s", url);
        process.exit(2);
    }
    
    return url;
}

var cheerioHtmlFile = function(fileData) {
    return cheerio.load(fileData);
};

var loadChecks = function(checksfile) {
    return JSON.parse(fs.readFileSync(checksfile));
};

var readLocalData = function(htmlfile) {
    return fs.readFileSync(htmlfile);
}

var readRemoteData = function(result, response) {
    if (result instanceof Error) {
	console.error('Error: ' + util.format(result.code));
	if (response != null) {
    	    console.error('Error: ' + util.format(response.message)); 
	}
	process.exit(3);
    }
    return result;
};

var checkHtmlFile = function(htmlFileData, checksfile) {
    $ = cheerioHtmlFile(htmlFileData);
    var checks = loadChecks(checksfile).sort();
    var out = {};
    for(var ii in checks) {
        var present = $(checks[ii]).length > 0;
        out[checks[ii]] = present;
    }
    return out;
};

var clone = function(fn) {
    // Workaround for commander.js issue.
    // http://stackoverflow.com/a/6772648
    return fn.bind({});
};

var showOutput = function (output) {
    console.log(JSON.stringify(output, null, 4));
}

var makeChecks = function (program) {
    if (program.url) {
	rest.get(program.url).on('complete', function(result, response){
	    var result = checkHtmlFile (readRemoteData(result, response), program.checks);
	    showOutput(result);
	});
    } else if (program.file) {
	var result = checkHtmlFile (fs.readFileSync(program.file), program.checks);
	showOutput(result);
    }
}

if(require.main == module) {
    program
        .option('-c, --checks <check_file>', 'Path to checks.json', clone(assertFileExists), CHECKSFILE_DEFAULT)
        .option('-f, --file <html_file>', 'Path to index.html', clone(assertFileExists), HTMLFILE_DEFAULT)
	.option('-u, --url <url_to_file>', 'Url to a remote html file', clone(assertIsUrl), "")
        .parse(process.argv);

    makeChecks(program);
} else {
    exports.checkHtmlFile = checkHtmlFile;
}
