import * as express from "express";
import * as socketio from "socket.io";
import * as http from "http";
import * as path from "path";
import * as fs from "fs";
import * as session from "express-session";
import * as passport from "passport";
import * as sessionstore from "sessionstore";
import * as utils from "./utils";
import * as types from "../typings";

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

const activeGames: types.activeGames = {};
const playingUsers: types.playingUsers = {};

const createGame = (creatorUserid: string) => {
	const gameId = "g" + utils.makeid();
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

const endGame = (gameId: string, userAuid: string, userBuid: string) => {
	try {
		delete playingUsers[userAuid];
		delete playingUsers[userBuid];
	} catch (e) {
		console.error(
			`There has been an error while trying to end the game #${gameId}`
		);
	}
};

app.get("/", (req, res) => {
	if (!playingUsers[req.session.id])
		res.sendFile(path.join(__dirname, "..", "client", "index.html"));
	else
		res.send(
			`<script>location.href = location.origin + '/game/${
				playingUsers[req.session.id]
			}'</script>`
		);
});

app.get("/game/*", (req, res) => {
	const requestedGame = req.path.replace("/game/", "");
	if (requestedGame.endsWith(".js")) {
		res.sendFile(path.join(__dirname, "..", "client", "game.js"));
	} else {
		if (!activeGames[requestedGame]) utils.error404(req, res);
		else if (
			req.session.id !== activeGames[requestedGame].userA.uid &&
			req.session.id !== activeGames[requestedGame].userB.uid
		)
			utils.error401(req, res);
		else {
			fs.readFile(
				path.join(__dirname, "..", "client", "game.html"),
				(err, data) => {
					if (err) res.sendStatus(500);
					else
						res.send(
							data
								.toString()
								.replace("{{ gameId }}", requestedGame)
						);
				}
			);
		}
	}
});

app.get("*.ts", (req, res) => {
	utils.sendOpenSourcePage(req, res);
});

app.get("/node_modules*", (req, res) => {
	utils.sendOpenSourcePage(req, res);
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
	socket.emit("activeGames", activeGames);
	socket.on("createGame", () => {
		const gameId = createGame(socket.request.session.id);
		socket.emit("gameCreateSuccessful", gameId);
		socket.broadcast.emit("gameCreated", gameId);
		playingUsers[socket.request.session.id] = gameId;
	});
	socket.on("joinGame", (gameId: string) => {
		if (!activeGames[gameId]) {
			socket.emit(
				"joinError",
				"There has been an error while trying to join the game. It seems like that game doesn't exist."
			);
			console.log(
				`User #${
					socket.request.session.id
				} tried to join to game #${gameId} which doesn't exist.`
			);
		} else if (!!activeGames[gameId].userB.uid) {
			socket.emit("joinError", "Sorry, this game is already full.");
			console.log(
				`User #${
					socket.request.session.id
				} tried to join to a full game.`
			);
		} else if (activeGames[gameId].userA.uid === socket.request.session.id)
			socket.emit("redirectJoin", gameId);
		else if (playingUsers[socket.request.session.id])
			socket.emit(
				"redirectJoin",
				playingUsers[socket.request.session.id]
			);
		else {
			activeGames[gameId].userB.uid = socket.request.session.id;
			socket.emit("joinSuccess", gameId);
			socket.broadcast.emit("gameClosedForJoin", gameId);
			playingUsers[socket.request.session.id] = gameId;
		}
	});
	socket.on("disconnect", () => {
		// console.log(`Dropped connection: ${socket.id}`);
	});
});

server.listen(3000, () => {
	console.log(`Listening on *:${3000}`);
});
