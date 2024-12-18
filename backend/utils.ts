import { Request, Response } from "express";
import { readFile } from "fs";
import { join } from "path";
import * as types from "../typings";

type colorTypes = "red" | "yellow" | "green" | "black";

const colors: { [c in colorTypes]: string } = {
	red: "\x1B[31m",
	yellow: "\x1B[33m",
	green: "\x1B[32m",
	black: "\x1B[39m",
};

export const error404 = (req: Request, res: Response) => {
	readFile(join(__dirname, "..", "client", "404.html"), (err, data) => {
		if (err) res.sendStatus(500);
		res.status(404).send(data.toString().replace("{{ req.path }}", req.path));
	});
};

export const error401 = (req: Request, res: Response) => {
	readFile(join(__dirname, "..", "client", "401.html"), (err, data) => {
		if (err) res.sendStatus(500);
		res.status(401).send(data.toString());
	});
};

export const sendOpenSourcePage = (req: Request, res: Response) => {
	readFile(join(__dirname, "..", "client", "openSource.html"), (err, data) => {
		if (err) res.sendStatus(500);
		res.send(data.toString());
	});
};

export const makeid = (length: number = 15) => {
	var result = "";
	var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return result;
};

export const emitClientSideGame = (activeGame: types.activeGame, gameSocket: SocketIO.Namespace) => {
	for (let socketId in gameSocket.connected) {
		const socket = gameSocket.connected[socketId];
		const user = socket.request.session.id === activeGame.userA.uid ? "userA" : "userB";
		const clientSideGame = { ...activeGame };
		if (user === "userA") delete clientSideGame.userB;
		else delete clientSideGame.userA;
		socket.emit("currentGame", clientSideGame);
	}
};

export const coloredConsoleLog = (text: string, color: colorTypes = "black") => {
	console.log(`${colors[color]}${text}${colors.black}`);
};

export const boxIdRegex = /^[A-Z][0-9]+$/;

export const getUsername = (userList: Map<string, string>, userId: string): string => {
	return userList.get(userId) || userId;
};
