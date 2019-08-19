import * as types from "../typings";

export const setCookie = (
	cname: string,
	cvalue: string,
	exdays: number = 1
) => {
	var d = new Date();
	d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
	var expires = "expires=" + d.toUTCString();
	document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
};

export const getCookie = (cname: string) => {
	var name = cname + "=";
	var decodedCookie = decodeURIComponent(document.cookie);
	var ca = decodedCookie.split(";");
	for (var i = 0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0) == " ") {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
};

export const insertToArray = (arr: Array<any>, index: number, newItem: any) => [
	...arr.slice(0, index),
	newItem,
	...arr.slice(index)
];

export const error = (error: string) => {
	let errorBox = document.createElement("div");
	errorBox.style.zIndex = "1";
	errorBox.style.width = "50%";
	errorBox.style.height = "10%";
	errorBox.style.position = "absolute";
	errorBox.style.top = "10px";
	errorBox.style.left = "50%";
	errorBox.style.transform = "translateX(-50%)";
	errorBox.style.border = "2px black solid";
	errorBox.style.borderRadius = "4px";
	errorBox.style.background = "#FFFFFF";
	errorBox.style.fontSize = "30px";
	errorBox.style.textAlign = "center";
	errorBox.innerText = error;
	errorBox.onclick = () => {
		if (errorBox) {
			errorBox.parentElement.removeChild(errorBox);
			errorBox = undefined;
		}
	};
	setTimeout(() => {
		if (errorBox) {
			errorBox.parentElement.removeChild(errorBox);
			errorBox = undefined;
		}
	}, 10e3);
	document.body.appendChild(errorBox);
};

export const addJoinGameButton = (
	gameId: string,
	socket: SocketIOClient.Socket
) => {
	const joinButton = document.createElement("button");
	joinButton.innerText = `Join Game #${gameId}`;
	joinButton.onclick = () => socket.emit("joinGame", gameId);
	joinButton.className = "joinGame";
	joinButton.title = `${gameId}`;
	document.querySelector(".activeGames").append(joinButton);
};

export const boxIdRegex = /^[A-Z][0-9]+$/;

export const setGameEnded = () => {
	const statusText = <HTMLSpanElement>(
		document.querySelector(".topbar .status")
	);
	statusText.innerText = "The game has ended. You can now leave this page.";
	document.body.className = "ended";
	(<HTMLButtonElement>(
		document.body.querySelector(".leaveGame")
	)).onclick = () => (location.href = location.origin);
};

export const placeAlreadyPicked = (pickedShips: types.pickedButtons) => {
	Object.keys(pickedShips).forEach((boxId: string) => {
		const el = document.querySelector(`.playTable .boxtd${boxId}`);
		el.classList.add("picked");
	});
};

export const removeButtonIfExists = (buttonClass: string) => {
	const button = document.querySelector(buttonClass);
	if (button) button.parentElement.removeChild(button);
};

export const setOnlineCount = (onlineCount: number) => {
	(<HTMLSpanElement>(
		document.querySelector(".onlineCount")
	)).innerText = `${onlineCount}`;
};
