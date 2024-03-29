// TODO: Determine cause of server occasionally freezing!!!

// Imports
const http = require('http');
const fs = require('fs');
const path = require('path');
const process = require('process');
const url = require('url');


// Constants
const hostname = 'localhost';
const port = 8080;


// Variables
var mysql = require('mysql');

// Pool because https://stackoverflow.com/a/37326025
var pool = mysql.createPool({
//   connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  debug: false
});

const server = http.createServer((req, res) => {
    console.log('Request for ' + req.url + ' by method ' + req.method);
	var path = url.parse(req.url).pathname;
	
	if (path == "/")
		sendIndex(req, res);
	else if (path == "/editor")
		streamFile(req, res, "editor.html", "text/html", "template");
	else if (path == "/web.css")
		streamFile(req, res, "web.css", "text/css", "css");
	else if (path == "/print.css")
		streamFile(req, res, "print.css", "text/css", "css");
	else if (path == "/scripts/jquery.js")
		streamFile(req, res, "jquery-3.6.3.min.js", "application/javascript", "scripts");
	else if (path == "/manifest.json")
		streamFile(req, res, "manifest.json", "application/manifest+json", "manifests");
	else if (path == "/images/100x.png")
		streamFile(req, res, "100x.png", "image/png", "images");
	else if (path == "/images/600x.svg")
		streamFile(req, res, "600x.svg", "image/svg+xml", "images");
	else if (path == "/images/1200x.png")
		streamFile(req, res, "1200x.png", "image/png", "images");
	else
		send404(req, res);
});


// Functions
function streamFile(req, res, file, mime, folder) {
	res.statusCode = 200;
	res.setHeader('Content-Type', mime);
// 	req.flushHeaders(); // Send headers out now
	
	stream = fs.createReadStream(path.join('site', folder, file));
	
	stream.on("data", function (chunk) {
		res.write(chunk);
	});

	// Send the buffer or you can put it into a var
	stream.on("end", function () {
		res.end();
	});
}

// Only to be used when reading whole file in at once (does not handle binary files well)
/*function sendFile(req, res, file, mime, folder) {
	res.statusCode = 200;
	res.setHeader('Content-Type', mime);
// 	req.flushHeaders(); // Send headers out now

	var stream = fs.createReadStream(path.join('site', folder, file));
	
	const chunks = [];
	stream.on("data", function (chunk) {
		chunks.push(chunk);
	});

	// Send the buffer or you can put it into a var
	stream.on("end", function () {
		var body = chunks.toString("utf8")
		
		res.write(body);
		res.end();
	});
}*/

function sendPage(req, res, content) {
// 	req.flushHeaders(); // Send headers out now

	var stream = fs.createReadStream(path.join('site', 'template', 'page.html'));
	
	const chunks = [];
	stream.on("data", function (chunk) {
		chunks.push(chunk);
	});

	// Send the buffer or you can put it into a var
	stream.on("end", function () {
		var body = chunks.toString("utf8").replace(new RegExp("{GOOGLE_ANALTICS_ID}", 'g'), process.env.GA_ID)
									.replace("{HTML_BODY}", content.join('')); // Always make sure to keep user data last to prevent injection
		
		res.write(body);
		res.end();
	});
}

function send404(req, res) {
	res.statusCode = 404;
	res.setHeader('Content-Type', 'text/html');
	
	
	const content = [];
	content.push("<h1 class='notfoundheader'>404 - Page Not Found</h1>");
	
	sendPage(req, res, content);
}

function sendIndex(req, res) {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/html');
	
	var sql = "select * from sellables;";
	pool.getConnection(function(err, con) {
		con.query(sql, function (err, result, fields) {
			try {
				if (err) throw err;
				
				// Debug
// 				console.log('Result: ');
// 				result.forEach(function(element, index, array) {
// 					console.log(JSON.stringify(element));
// 				});
				  
// 				console.log('Result: ' + JSON.stringify(result));
				
				const content = [];
				
				// For Printing The Results.
				// TODO: Cleanup
				content.push("<table>");
				content.push("<thead><tr class='first'><th>Piece</th><th>Company</th><th>Product</th><th>Product ID</th></tr></thead><tbody>");
				result.forEach(function(element, index, array) {
					// piece, company, product, product_id
					
					// Hide Hidden Products
					if (element["hidden"] == 1)
						return;
					
					if (element["company"] == "redbubble") {
						if (element["product"] != "transparent_sticker")
							return;
					}
					
					if (element["company"] == "spoonflower") {
						if (element["product"] != "fabric")
							return;
					}
					
					content.push("<tr><td>" + element["piece"] + "</td><td>" + element["company"] + "</td><td>" + element["product"] + "</td><td>");
					
					// Testing Link Generation
					if (element["company"] == "deviantart")
						content.push("<a href='https://www.deviantart.com/x/art/" + element["product_id"] + "'>" + element["product_id"] + "</a>");
					else if (element["company"] == "flickr")
						content.push("<a href='https://www.flickr.com/photos/alexis_art/" + element["product_id"] + "'>" + element["product_id"] + "</a>");
					else if (element["company"] == "printerstudio")
						content.push("<a href='https://www.printerstudio.com/sell/designs/" + element["product_id"] + ".html'>" + element["product_id"] + "</a>");
					else if (element["company"] == "spoonflower") // TODO: Get actual product instead of forcing it to be fabric
						content.push("<a href='https://www.spoonflower.com/en/fabric/" + element["product_id"] + "'>" + element["product_id"] + "</a>");
					else if (element["company"] == "redbubble") // TODO: Get actual product instead of forcing it to be stickers
						content.push("<a href='https://www.redbubble.com/i/x/x/" + element["product_id"] + ".OP1U7'>" + element["product_id"] + "</a>");
					else if (element["company"] == "guilded" && element["product"] == "artgroup")
						content.push("<a href='https://www.guilded.gg/Alexis-Art/groups/DkxYegJd/channels/e03fecfa-f21b-43da-a11f-d9858c7afe33/media/" + element["product_id"] + "'>" + element["product_id"] + "</a>");
					else
						content.push(element["product_id"]);
					
					content.push("</td></tr>");
				});
				content.push("</tbody></table>");
				
				sendPage(req, res, content);
			} catch (err) {
				console.error("Failed To Execute Query! " + err);
	// 			process.exit(1);
			}
		});
	});
	
}

function setupDatabase() {
	// For setting up database from scratch if needed and possible
// 	CREATE USER 'process.env.DB_USERNAME'@'process.env.DB_HOST' IDENTIFIED BY 'process.env.DB_PASSWORD';
// 	GRANT INSERT, UPDATE, DELETE, SELECT ON process.env.DB_NAME.* to 'process.env.DB_USERNAME'@'process.env.DB_HOST';
// 	CREATE DATABASE art;
// 	USE art;
// 	CREATE TABLE customers (name VARCHAR(255), address VARCHAR(255))
}

function startDatabase() {
	// Try to connect to database, else fail out
	
	// Check If Missing Environment Variables For Connecting To MySql Database
	if (process.env.DB_USERNAME === undefined || process.env.DB_PASSWORD === undefined || process.env.DB_HOST === undefined || process.env.DB_NAME === undefined) {
		var missing_vars = "";
		// TODO: Check if equivalent of Python list joining exists - See .join(",");
		if (process.env.DB_USERNAME === undefined)
			missing_vars += "DB_USERNAME, ";
		if (process.env.DB_PASSWORD === undefined)
			missing_vars += "DB_PASSWORD, ";
		if (process.env.DB_HOST === undefined)
			missing_vars += "DB_HOST, ";
		if (process.env.DB_NAME === undefined)
			missing_vars += "DB_NAME";
		
		console.error("Missing Environment Variable(s): " + missing_vars);
		process.exit(1);
	}
	
	pool.getConnection(function(err, con) {
		try {
			if (err) throw err;
				
			console.log("Connected!");
			setupDatabase();
		} catch (err) {
			console.error("Failed To Connect! " + err);
			process.exit(1);
		}
	});
}

function startServer() {
	// Start webserver
	
	server.listen(port, hostname, () => {
		console.log(`Server running at http://${hostname}:${port}/`);
		
		// For Initial Connection - We May Lose Connection During Runtime
		startDatabase();
	});
}

function main() {
	// We May Setup Configuration Here, We've Only Got The Server For Now Though
	startServer();
}


// Loose Functions
/* process.on('uncaughtException', function (err) {
	console.error((new Date).toUTCString() + ' uncaughtException:', err.message);
	console.error(err.stack);
	process.exit(1);
});*/


// Initiator
if (typeof require !== 'undefined' && require.main === module) {
	// Call Main Function If Script Ran Directly
	main();
}