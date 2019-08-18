import { Request, Response } from "express";
import { readFile } from "fs";
import { join } from "path";

export const error404 = (req: Request, res: Response) => {
	readFile(join(__dirname, "..", "client", "404.html"), (err, data) => {
		if (err) res.sendStatus(500);
		res.status(404).send(
			data.toString().replace("{{ req.path }}", req.path)
		);
	});
};

export const error401 = (req: Request, res: Response) => {
	readFile(join(__dirname, "..", "client", "401.html"), (err, data) => {
		if (err) res.sendStatus(500);
		res.status(401).send(data.toString());
	});
};

export const makeid = (length: number = 15) => {
	var result = "";
	var characters =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	var charactersLength = characters.length;
	for (var i = 0; i < length; i++) {
		result += characters.charAt(
			Math.floor(Math.random() * charactersLength)
		);
	}
	return result;
};
