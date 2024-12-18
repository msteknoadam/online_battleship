export type gamePlayer = {
	uid: string | undefined;
	ships: {
		[s: string]: "hit" | "miss";
	};
	bombarded: {
		[s: string]: "hit" | "miss";
	};
	predicted: {
		[s: string]: "hit" | "miss";
	};
	turn: boolean;
	won: boolean;
};

export type activeGame = {
	userA: gamePlayer & { uid: string };
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
	[s: string]: "hit" | "miss";
};
