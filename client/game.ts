declare global {
	interface Window {
		socket: SocketIOClient.Socket;
	}
}

import * as io from "socket.io-client";
import * as utils from "./utils";
import * as types from "../typings";
import * as CONFIG from "../gameConfig";

const socket = io("//" + window.location.host, {
	query: "session_id=" + utils.getCookie("USERDATA")
});
let placeToPick = CONFIG.placesToPick;

const gameSocket = io(
	"//" + window.location.host + `/${location.pathname.replace("/game/", "")}`,
	{
		query: "session_id=" + utils.getCookie("USERDATA")
	}
);

window.socket = socket;

socket.on("initialize", (data: string) => {
	utils.removeButtonIfExists(".leaveGame");
	const leaveButton = document.createElement("button");
	leaveButton.innerText = "Leave Game";
	leaveButton.className = "leaveGame";
	leaveButton.onclick = () => {
		socket.emit("leaveGame");
	};
	document.body.querySelector(".topbar").appendChild(leaveButton);
});

socket.on("clientError", (error: string) => {
	utils.error(error);
});

gameSocket.on("clientError", (error: string) => {
	utils.error(error);
});

gameSocket.on("pickSuccessful", () => {
	document.body.className = "pickSuccessful";
	utils.removeButtonIfExists(".confirmButton");
});

gameSocket.on("currentGame", (activeGame: types.activeGame) => {
	// console.log(activeGame);
	const statusText = <HTMLSpanElement>(
		document.querySelector(".topbar .status")
	);
	let user: "userA" | "userB";
	Object.keys(activeGame).forEach((key: "userA" | "userB" | "state") => {
		if (key !== "state") {
			user = key;
		}
	});
	if (activeGame.state === "WAITING") {
		statusText.innerText = "Waiting for some opponent to join.";
		document.body.className = "waiting";
	} else if (activeGame.state === "PICKING") {
		if (
			Object.keys(activeGame[user].ships).length === CONFIG.placesToPick
		) {
			utils.placeAlreadyPicked(activeGame[user].ships);
			statusText.innerText = `Your ship placements are confirmed. Please wait until your opponent confirms aswell.`;
			document.body.className = "pickSuccessful";
		} else {
			statusText.innerText = `Pick places of your ships. You need to choose ${placeToPick} more boxes.`;
			document.body.className = "picking";
			document.body
				.querySelectorAll("table.playTable button:not([class=picked])")
				.forEach((button: HTMLButtonElement) => {
					/**
					 * TODO: Make t only allow to select just like battleship game,
					 * so there should be 3x1, 3x1, 4x1 and 5x1 ships instead of just 1x1 ships.
					 */
					button.onclick = () => {
						if (button.parentElement.classList.contains("picked")) {
							button.parentElement.classList.remove("picked");
							if (placeToPick === 0) {
								utils.removeButtonIfExists(".confirmButton");
								document.body.className = "picking";
							}
							placeToPick++;
							statusText.innerText = `Pick places of your ships. You need to choose ${placeToPick} more boxes.`;
						} else {
							button.parentElement.classList.add("picked");
							placeToPick--;
							if (placeToPick === 0) {
								const confirmButton = document.createElement(
									"button"
								);
								confirmButton.innerText =
									"Click to Confirm Your Placements";
								confirmButton.className = "confirmButton";
								confirmButton.onclick = () => {
									const pickedButtons: types.pickedButtons = {};
									document
										.querySelectorAll(".picked button")
										.forEach(
											(
												pickedButton: HTMLButtonElement
											) => {
												if (
													utils.boxIdRegex.test(
														pickedButton.innerText
													)
												) {
													pickedButtons[
														pickedButton.innerText
													] = "miss";
												} else {
													utils.error(
														`Unidentified boxId: ${
															pickedButton.innerText
														}`
													);
												}
											}
										);
									gameSocket.emit(
										"setPlacement",
										pickedButtons
									);
								};
								statusText.innerText =
									"Waiting for you to confirm your placements.";
								statusText.parentElement.appendChild(
									confirmButton
								);
								document.body.className = "noPicksLeft";
							} else {
								statusText.innerText = `Pick places of your ships. You need to choose ${placeToPick} more boxes.`;
							}
						}
					};
				});
		}
	} else if (activeGame.state === "STARTED") {
		utils.placeAlreadyPicked(activeGame[user].ships);
		utils.placeAlreadyBombed(activeGame[user].bombarded);
		utils.placeAlreadyPredicted(activeGame[user].predicted);
		utils.removeButtonIfExists(".confirmButton");
		if (activeGame[user].turn) {
			document.body.className = "started turn";
			statusText.innerText =
				"It's your turn! Click to a button on prediction table to bomb that coordinate.";
		} else {
			document.body.className = "started noTurn";
			statusText.innerText =
				"It's your opponent's turn. Please wait while the other user is choosing a coordinate to bomb.";
		}
		document
			.querySelectorAll(`.predictionTable button:not([class=bombed])`)
			.forEach((button: HTMLButtonElement) => {
				button.onclick = () => {
					gameSocket.emit("bombCoordinate", button.innerText);
				};
			});
	} else if (activeGame.state === "FINISHED") {
		utils.placeAlreadyPicked(activeGame[user].ships);
		utils.placeAlreadyBombed(activeGame[user].bombarded);
		utils.placeAlreadyPredicted(activeGame[user].predicted);
		utils.setGameEnded(
			activeGame[user].won
				? "Congratulations! You won!"
				: "The other user won the game. You lost!"
		);
		document.body.className = "finished";
	}
});

gameSocket.on("gameEnded", (message?: string) => {
	utils.setGameEnded(message);
});

socket.on("onlineCount", (onlineCount: number) => {
	utils.setOnlineCount(onlineCount);
});

const columns = "ABCDEFGHIJ".split("");
const rows = Array.from(Array(11).keys()).slice(1);

const playTable = document.createElement("table");
playTable.className = "playTable";
const predictionTable = document.createElement("table");
predictionTable.className = "predictionTable";
for (let i = 0; i < rows.length + 1; i++) {
	const rowEl = document.createElement("tr");
	rowEl.className = `row${i}`;
	playTable.appendChild(rowEl);
	predictionTable.appendChild(rowEl.cloneNode(true));
	if (i === 0) {
		const playTableText = document.createElement("th");
		playTableText.innerText = "Play Table";
		const predictionTableText = document.createElement("th");
		predictionTableText.innerText = "Prediction Table";
		playTable.querySelector(`.row0`).appendChild(playTableText);
		predictionTable.querySelector(`.row0`).appendChild(predictionTableText);
	}
}
for (let i = 1; i < (columns.length + 1) * (rows.length + 1); i++) {
	const rowNum = Math.floor(i / (rows.length + 1));
	const columnTag = columns[(i % (rows.length + 1)) - 1];
	if (i <= columns.length) {
		// console.log(`Column Header: ${columnTag}`);
		const columnEl = document.createElement("th");
		columnEl.innerText = columnTag;
		columnEl.className = `columnth${columnTag}`;
		playTable.querySelector(`.row0`).appendChild(columnEl);
		predictionTable
			.querySelector(`.row0`)
			.appendChild(columnEl.cloneNode(true));
	} else if (i > columns.length && i % (rows.length + 1) === 0) {
		// console.log(`Row Header: ${rowNum}`);
		const rowEl = document.createElement("th");
		rowEl.innerText = `${rowNum}`;
		rowEl.className = `rowth${rowNum}`;
		playTable.querySelector(`.row${rowNum}`).appendChild(rowEl);
		predictionTable
			.querySelector(`.row${rowNum}`)
			.appendChild(rowEl.cloneNode(true));
	} else {
		const boxId = `${columnTag}${rowNum}`;
		// console.log(`Normal Box: ${boxId}`);
		const boxEl = document.createElement("td");
		const boxButton = document.createElement("button");
		boxEl.className = `boxtd${boxId}`;
		boxButton.className = `boxbutton${boxId}`;
		boxButton.innerText = boxId;
		boxEl.appendChild(boxButton);
		playTable.querySelector(`.row${rowNum}`).appendChild(boxEl);
		predictionTable
			.querySelector(`.row${rowNum}`)
			.appendChild(boxEl.cloneNode(true));
	}
}
document.body.appendChild(playTable);
document.body.appendChild(predictionTable);
