import * as express from "express";
import * as socketio from "socket.io";
import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import * as session from "express-session";
import * as passport from "passport";
import * as sessionstore from "sessionstore";
import * as utils from "./utils";

const app = express();
const secretKey = "TOTALLY_SECRET_XKCD";
const sessionStore = sessionstore.createSessionStore();
const sessionMiddleware = session({
	name: "USERDATA",
	secret: secretKey,
	store: sessionStore
});
const server = http.createServer(app);
const io = socketio(server);
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
io.use((socket, next) =>
	sessionMiddleware(socket.request, socket.request.res, next)
);

const activeGames: Array<{
	userA: {
		uid: string;
		ships: Array<number>;
		preds: Array<number>;
	};
	userB: {
		uid: string;
		ships: Array<number>;
		preds: Array<number>;
	};
}> = [];

const createGame = (creatorUserid: string) => {
	const gameId = Math.floor(Math.random() * 10000);
	if (!activeGames[gameId]) {
		activeGames[gameId] = {
			userA: {
				uid: creatorUserid,
				ships: [],
				preds: []
			},
			userB: {
				uid: undefined,
				ships: [],
				preds: []
			}
		};
		return gameId;
	} else return createGame(creatorUserid);
};

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.get("/game/*", (req, res) => {
	const requestedGame = req.path.replace("/game/", "");
	if (isNaN(+requestedGame) || !activeGames[+requestedGame])
		utils.error404(req, res);
	else if (
		req.session.id !== activeGames[+requestedGame].userA.uid &&
		req.session.id !== activeGames[+requestedGame].userB.uid
	)
		utils.error401(req, res);
	else {
		res.send(
			`<h1>Game #${requestedGame}</h1>${Object.keys(
				activeGames[requestedGame]
			).map(key => {
				const val = activeGames[requestedGame][key];
				return `<h2>Key: ${key}</h2>|<h2>Value: ${JSON.stringify(
					val
				)}</h2><br />`;
			})}`
		);
	}
});

app.get("*", (req, res) => {
	const filePath = path.join(__dirname, "..", "client", req.path);
	fs.exists(filePath, exists => {
		if (exists) res.sendFile(filePath);
		else utils.error404(req, res);
	});
});

io.on("connection", socket => {
	// console.log(socket.request.session.id);
	// console.log(`New connection: ${socket.id}`);
	socket.emit("initialize", `Hello #${socket.request.session.id}`);
	socket.on("createGame", () => {
		socket.emit("gameCreated", createGame(socket.request.session.id));
	});
	socket.on("disconnect", () => {
		// console.log(`Dropped connection: ${socket.id}`);
	});
});

server.listen(3000, () => {
	console.log(`Listening on *:${3000}`);
});
