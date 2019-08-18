declare global {
	interface Window {
		socket: SocketIOClient.Socket;
	}
}

import * as io from "socket.io-client";
import * as utils from "./utils";
import * as types from "../typings";

const socket = io("//" + window.location.host, {
	query: "session_id=" + utils.getCookie("USERDATA")
});
window.socket = socket;

socket.on("initialize", (data: string) => {
	const uid = data.slice(7);
	(<HTMLDivElement>(
		document.body.querySelector(".initializeMessage")
	)).innerHTML = `${data}<br />`;
	const createGameButton = document.createElement("button");
	createGameButton.innerText = "Create Game";
	createGameButton.onclick = () => {
		socket.emit("createGame");
	};
	createGameButton.title = uid;
	createGameButton.className = "createGame";
	document.body
		.querySelector(".initializeMessage")
		.appendChild(createGameButton);
});

socket.on("gameCreateSuccessful", (gameId: string) => {
	location.href = location.origin + `/game/${gameId}`;
});

socket.on("gameCreated", (gameId: string) => {
	utils.addJoinGameButton(gameId, socket);
});

socket.on("activeGames", (activeGames: types.activeGames) => {
	Object.keys(activeGames).forEach(key => {
		if (!activeGames[key].userB.uid) {
			utils.addJoinGameButton(key, socket);
		}
	});
});

socket.on("joinError", (error: string) => {
	utils.error(error);
});

socket.on("joinSuccess", (gameId: string) => {
	location.href = `${location.origin}/game/${gameId}`;
});

socket.on("gameClosedForJoin", (gameId: string) => {
	utils.removeJoinGameButton(gameId);
});

socket.on("redirectJoin", (gameId: string) => {
	location.href = `${location.origin}/game/${gameId}`;
});
