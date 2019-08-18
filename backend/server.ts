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

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

app.get("/game/*", (req, res) => {
	const requestedGame = req.path.replace("/game/", "");
	if (!activeGames[requestedGame]) utils.error404(req, res);
	else if (
		req.session.id !== activeGames[requestedGame].userA.uid &&
		req.session.id !== activeGames[requestedGame].userB.uid
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
			/**
			 * TODO: Add another check if that user is currently playing in another game.
			 * A way to succeed that would be adding that userid to currentlyPlaying kind of
			 * array and remove both users when the game is over. This could be also done by
			 * looping through the activeGames and checking if that userid exists in anywhere
			 * but that may take some & CPU so the first approach is prob. better.
			 */
		} else if (activeGames[gameId].userA.uid === socket.request.session.id)
			socket.emit("redirectJoin", gameId);
		else {
			activeGames[gameId].userB.uid = socket.request.session.id;
			socket.emit("joinSuccess", gameId);
			socket.broadcast.emit("gameClosedForJoin", gameId);
		}
	});
	socket.on("disconnect", () => {
		// console.log(`Dropped connection: ${socket.id}`);
	});
});

server.listen(3000, () => {
	console.log(`Listening on *:${3000}`);
});
