declare global {
	interface Window {
		socket: SocketIOClient.Socket;
		io: SocketIOClientStatic;
		utils: any;
	}
}

import * as io from "socket.io-client";
import * as utils from "./utils";
import * as types from "../typings";

const socket = io("//" + window.location.host, {
	query: "session_id=" + utils.getCookie("USERDATA")
});
window.socket = socket;
window.io = io;
window.utils = utils;

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
	
    const setUsernameButton = document.createElement("button");
	setUsernameButton.innerText = "Set Username";
	setUsernameButton.onclick = () => {
		const newUsername = prompt("Set your username"); 
		socket.emit("setUsername", newUsername);
		console.log(newUsername);
		
	};
	setUsernameButton.title = uid;
	setUsernameButton.className = "loginbutton";
	document.body
		.querySelector(".initializeMessage")
		.appendChild(createGameButton);
		document.body.appendChild(setUsernameButton);		
});
socket.on("gameCreateSuccessful", (gameId: string) => {
	location.href = location.origin + `/game/${gameId}`;
});

socket.on("gameCreated", (gameId: string) => {
	utils.addJoinGameButton(gameId, socket);
});

socket.on("activeGames", (activeGames: types.activeGames) => {
	Object.keys(activeGames).forEach(key => {
		if (activeGames[key].state === "WAITING") {
			utils.addJoinGameButton(key, socket);
		}
	});
});

socket.on("clientError", (error: string) => {
	utils.error(error);
});

socket.on("joinSuccess", (gameId: string) => {
	location.href = `${location.origin}/game/${gameId}`;
});

socket.on("gameClosedForJoin", (gameId: string) => {
	utils.removeButtonIfExists(`.joinGame[title=${gameId}]`);
});

socket.on("redirectJoin", (gameId: string) => {
	location.href = `${location.origin}/game/${gameId}`;
});

socket.on("onlineCount", (onlineCount: number) => {
	utils.setOnlineCount(onlineCount);
});
