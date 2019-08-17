import * as express from "express";
import * as socketio from "socket.io";
import * as http from "http";
import * as path from "path";
import * as fs from "fs";

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.get("*", (req, res) => {
	const filePath = path.join(__dirname, "..", "client", req.path);
	fs.exists(filePath, exists => {
		if (exists) res.sendFile(filePath);
		else
			res.status(404).send(
				`<center>
                <h1>
                    Error 404
                    <br/>
                    Requested path '${req.path}' is not found on the server.
                </h1>
            </center>`
			);
	});
});

io.on("connection", socket => {
	console.log(`New connection: ${socket.id}`);
	socket.emit("initialize", `Hello #${socket.id}`);
	socket.on("disconnect", () => {
		console.log(`Dropped connection: ${socket.id}`);
	});
});

server.listen(3000, () => {
	console.log(`Listening on *:${3000}`);
});
