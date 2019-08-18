import { Request, Response } from "express";

export const error404 = (req: Request, res: Response) => {
	res.status(404).send(
		`<center>
		<h1>
			Error 404
			<br/>
			Requested path '${req.path}' is not found on the server.
		</h1>
	</center>`
	);
};

export const error401 = (req: Request, res: Response) => {
	res.status(401).send(
		`<center>
		<h1>
			Error 401
			<br/>
			Unauthorized. You are not allowed to see this page.
		</h1>
	</center>`
	);
};
