import * as io from "socket.io-client";

const socket = io();

socket.on("initialize", (data: string) => {
	document.body.innerHTML = data;
});
