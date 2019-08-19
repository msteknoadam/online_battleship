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
import * as CONFIG from "../gameConfig";

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
let onlineSessions: string[] = [];
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());
io.use((socket, next) =>
	sessionMiddleware(socket.request, socket.request.res, next)
);

const activeGames: types.activeGames = {};
const gameSockets: { [s: string]: socketio.Namespace } = {};
const playingUsers: types.playingUsers = {};

setInterval(() => {
	utils.coloredConsoleLog(
		`Stats: Current online count: ${onlineSessions.length}`,
		"green"
	);
	io.emit("onlineCount", onlineSessions.length);
}, 60e3);

const createGame = (creatorUserid: string) => {
	const gameId = "g" + utils.makeid();
	if (!activeGames[gameId]) {
		activeGames[gameId] = {
			userA: {
				uid: creatorUserid,
				ships: {},
				bombarded: {},
				predicted: {},
				turn: true
			},
			userB: {
				uid: undefined,
				ships: {},
				bombarded: {},
				predicted: {},
				turn: false
			},
			state: "WAITING"
		};
		const gameNsp = io.of(`/${gameId}`);
		gameNsp.on("connection", socket => {
			const activeGame = activeGames[gameId];
			const user =
				activeGame.userA.uid === socket.request.session.id
					? "userA"
					: activeGame.userB.uid === socket.request.session.id
					? "userB"
					: "unauthorized";
			if (user !== "unauthorized") {
				const otherUser = user === "userA" ? "userB" : "userA";
				// console.log(socket.request.session.id);
				utils.emitClientSideGame(activeGame, gameNsp);
				socket.on(
					"setPlacement",
					(pickedButtons: types.pickedButtons) => {
						if (
							Object.keys(pickedButtons).length !==
							CONFIG.placesToPick
						) {
							socket.emit(
								"clientError",
								`Couldn't set your ship placements since there is a misconfiguration on your placements. Please refresh the page and try again.`
							);
							utils.coloredConsoleLog(
								`Warning: User #${
									socket.request.session.id
								} tried to set ${JSON.stringify(
									pickedButtons
								)} as their picked buttons which seems not ok.`,
								"yellow"
							);
						} else {
							if (
								Object.keys(activeGame[user].ships).length ===
								CONFIG.placesToPick
							) {
								socket.emit(
									"clientError",
									"You already have sent your placements. Please refresh your page."
								);
								utils.coloredConsoleLog(
									`Warning: User #${
										socket.request.session.id
									} tried to run "setPlacement" while that user has already picked placements.`,
									"yellow"
								);
							} else {
								Object.keys(pickedButtons).forEach(
									key => (pickedButtons[key] = "miss")
								);
								activeGame[user].ships = pickedButtons;
								socket.emit("pickSuccessful");
								utils.coloredConsoleLog(
									`Info: User #${
										socket.request.session.id
									} successfully set their placements as ${JSON.stringify(
										pickedButtons
									)}.`,
									"green"
								);
								if (
									Object.keys(activeGame[user].ships)
										.length === CONFIG.placesToPick &&
									Object.keys(
										activeGame[
											user === "userA" ? "userB" : "userA"
										].ships
									).length === CONFIG.placesToPick
								) {
									activeGame.state = "STARTED";
									utils.coloredConsoleLog(
										`Info: Game #${gameId} has started.`,
										"green"
									);
								}
								utils.emitClientSideGame(activeGame, gameNsp);
							}
						}
					}
				);
				socket.on("bombCoordinate", (coordinate: string) => {
					if (utils.boxIdRegex.test(coordinate)) {
						if (activeGame[user].turn) {
							if (!activeGame[user].predicted[coordinate]) {
								activeGame[user].predicted[
									coordinate
								] = activeGame[otherUser].ships[coordinate]
									? "hit"
									: "miss";
								activeGame[otherUser].bombarded[
									coordinate
								] = activeGame[otherUser].ships[coordinate]
									? "hit"
									: "miss";
								activeGame[user].turn = false;
								activeGame[otherUser].turn = true;
								utils.emitClientSideGame(activeGame, gameNsp);
								utils.coloredConsoleLog(
									`Info: User #${
										socket.request.session.id
									} bomed ${coordinate} coordinate successfully.`,
									"green"
								);
							} else {
								socket.emit(
									"clientError",
									"You have already bombed that coordinate. Please refresh your page."
								);
								utils.coloredConsoleLog(
									`Warning! User #${
										socket.request.session.id
									} tried to bomb ${coordinate} which is already bombed.`,
									"red"
								);
							}
						} else {
							socket.emit(
								"clientError",
								"It's not your turn yet. Please wait for your opponent's move."
							);
							utils.coloredConsoleLog(
								`Warning! User #${
									socket.request.session.id
								} tried to bomb ${coordinate} while it's not that user's turn.`,
								"red"
							);
						}
					} else {
						socket.emit(
							"clientError",
							"The coordinate you provided doesn't seem appropriate. Please try again."
						);
						utils.coloredConsoleLog(
							`Warning! User #${
								socket.request.session.id
							} tried to bomb ${coordinate} coordinate which doesn't seem ok.`,
							"red"
						);
					}
				});
			} else {
				utils.coloredConsoleLog(
					`Warning! User #${
						socket.request.session.id
					} tried to access to game #${gameId} which is a game that user doesn't belong to.`,
					"red"
				);
			}
		});
		gameSockets[gameId] = gameNsp;
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
	if (requestedGame.includes(".")) {
		res.sendFile(path.join(__dirname, "..", "client", requestedGame));
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
	if (!onlineSessions.includes(socket.request.session.id))
		onlineSessions.push(socket.request.session.id);
	socket.emit("initialize", `Hello #${socket.request.session.id}`);

	/**
	 * TODO: Feels like this needs to be replaced with currentlyJoinableGames
	 * so it doesn't iterate over every game and don't mess up with CPU, otherwise
	 * it will be same like the trivia site in the end.
	 */
	socket.emit("activeGames", activeGames);
	socket.emit("onlineCount", onlineSessions.length);

	socket.on("createGame", () => {
		const gameId = createGame(socket.request.session.id);
		socket.emit("gameCreateSuccessful", gameId);
		socket.broadcast.emit("gameCreated", gameId);
		playingUsers[socket.request.session.id] = gameId;
		utils.coloredConsoleLog(
			`Info: User #${
				socket.request.session.id
			} successfully created game #${gameId}`,
			"green"
		);
	});

	socket.on("joinGame", (gameId: string) => {
		if (!activeGames[gameId]) {
			socket.emit(
				"clientError",
				"There has been an error while trying to join the game. It seems like that game doesn't exist."
			);
			utils.coloredConsoleLog(
				`Warning! User #${
					socket.request.session.id
				} tried to join to game #${gameId} which doesn't exist.`,
				"red"
			);
		} else if (activeGames[gameId].state !== "WAITING") {
			socket.emit(
				"clientError",
				"Sorry, this game is already full/finished."
			);
			utils.coloredConsoleLog(
				`Warning: User #${
					socket.request.session.id
				} tried to join to game #${gameId} which is already full.`,
				"red"
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
			activeGames[gameId].state = "PICKING";
			socket.emit("joinSuccess", gameId);
			socket.broadcast.emit("gameClosedForJoin", gameId);
			playingUsers[socket.request.session.id] = gameId;
			utils.emitClientSideGame(activeGames[gameId], gameSockets[gameId]);
			utils.coloredConsoleLog(
				`Info: User #${
					socket.request.session.id
				} successfully joined to the game #${gameId}`,
				"green"
			);
		}
	});

	socket.on("leaveGame", () => {
		const gameId = playingUsers[socket.request.session.id];
		if (gameId) {
			const gameSocket = gameSockets[gameId];
			const user =
				activeGames[gameId].userA.uid === socket.request.session.id
					? "userA"
					: "userB";
			const otherUser = user === "userA" ? "userB" : "userA";
			gameSocket.emit("gameEnded");
			activeGames[gameId].state = "FINISHED";
			utils.coloredConsoleLog(
				`Info: User #${activeGames[gameId][user].uid} and #${
					activeGames[gameId][otherUser].uid
				} successfully left the game #${gameId}`,
				"green"
			);
			delete playingUsers[activeGames[gameId].userA.uid];
			delete playingUsers[activeGames[gameId].userB.uid];
		} else {
			socket.emit(
				"clientError",
				"You aren't currently playing any games."
			);
			utils.coloredConsoleLog(
				`Warning: User #${
					socket.request.session.id
				} tried to run "leaveGame" command while that user is not in any games at the moment.`,
				"red"
			);
		}
	});

	socket.on("disconnect", () => {
		onlineSessions = onlineSessions.filter(
			val => val !== socket.request.session.id
		);
	});
});

server.listen(3000, () => {
	console.log(`Listening on *:${3000}`);
});
