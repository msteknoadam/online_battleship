export type gamePlayer = {
	uid: string | undefined;
	ships: {
		[s: string]: boolean;
	};
	bombarded: {
		[s: string]: boolean;
	};
	turn: boolean;
};

export type activeGame = {
	userA: gamePlayer;
	userB: gamePlayer;
	state: "WAITING" | "PICKING" | "STARTED" | "FINISHED";
};

export type activeGames = {
	[s: string]: activeGame;
};

export type playingUsers = {
	[s: string]: string;
};

export type pickedButtons = {
	[s: string]: boolean;
};
