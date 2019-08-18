declare global {
	interface Window {
		socket: SocketIOClient.Socket;
	}
}

import * as io from "socket.io-client";
import * as utils from "./utils";

const socket = io("//" + window.location.host, {
	query: "session_id=" + utils.getCookie("USERDATA")
});
window.socket = socket;

socket.on("initialize", (data: string) => {
	(<HTMLDivElement>(
		document.body.querySelector(".initializeMessage")
	)).innerText = data;
	const createGameButton = document.createElement("button");
	createGameButton.innerText = "Create Game";
	createGameButton.onclick = () => {
		socket.emit("createGame");
	};
	document.body.insertBefore(
		createGameButton,
		document.body.querySelector(".activeGames")
	);
});

socket.on("gameCreated", (gameId: number) => {
	console.log("gameCreated", gameId);
	location.href = location.origin + `/game/${gameId}`;
});
