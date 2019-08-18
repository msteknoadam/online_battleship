export type activeGames = {
	[s: string]: {
		userA: {
			uid: string;
			ships: Array<number>;
			preds: Array<number>;
		};
		userB: {
			uid: string;
			ships: Array<number>;
			preds: Array<number>;
		};
	};
};
