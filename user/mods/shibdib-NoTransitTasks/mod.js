"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const fs = require('fs');
let count = 0;

class NoTransitTasks
{
	postDBLoad(container) {
		const logger = container.resolve("WinstonLogger");
		const DB = container.resolve("DatabaseService").getTables();
		const quests = Object.values(DB.templates.quests);
		const text = Object.keys(DB.locales.global);

		const fixTask = (questId, transitId, oneSession = false, taskText = undefined) => {
			const quest = quests.find((q) => q._id === questId);
			quest.conditions.AvailableForFinish = quest.conditions.AvailableForFinish.filter((c) => c.id !== transitId);
			if (oneSession) {
				quest.conditions.AvailableForFinish.forEach((c) => c.oneSessionOnly = false);
				if (taskText) {
					for (const entry of taskText) {
						for (const language of text) {
							DB.locales.global[language][entry] = DB.locales.global[language][entry].replace(/\([^)]*\)/g, "");
						}
					}
				}
			}
			count++;
		};

		// Special Comms
		fixTask("66ab970848ddbe9d4a0c49a8", "66ab970848ddbe9d4a0c49ab");

		// Cream of the Crop
		fixTask("66e01ae0c391e4c94903d220", "66e2c832596e2895181e1bd4");

		// Sample IV
		fixTask("67040c78bf4be8a4ef041a65", "67262b4023c03479138728fa");

		// Foresters Duty
		fixTask("66ab9da7eb102b9bcd08591c", "66ab9da7eb102b9bcd08591f", true,
			["66ab9da7eb102b9bcd08591d" , "66ab9da7eb102b9bcd08591f", "66ab9da7eb102b9bcd085922"]);

		// New Day New Paths
		fixTask("66aa58245ab22944110db6e9", "66aa5be8035c6a410dc570b2", true,
			["66aa5b2cecad9c067780924b" , "66aa5bb281dff8466b076894", "66aa5be8035c6a410dc570b2",
				"66aa5c88c085db7d8158db4a", "66aa5c8ba8c36eaef492ef92", "66b0e57eddc25d8d17e3e3c0"])

		// Know your place
		fixTask("66aa61663aa37705c5024277", "66aa61663aa37705c502427c", true,
			["66aa61663aa37705c5024278" , "66aa61663aa37705c502427e"]);

		// Secrets of Polikhim
		fixTask("66aa74571e5e199ecd094f18", "66aa74571e5e199ecd094f1b", true,
			["66aa74571e5e199ecd094f1e"]);

		// Beneath the streets
		fixTask("66aba85403e0ee3101042877", "66aba85403e0ee310104287a", true,
			["66aba85403e0ee3101042878" , "66aba97b1000025218c82ea8", "66b090f5723e7bbe8b518ca8",
				"66b0910951c5294b9d213918", "66b10eef0951e90ec383850b"])

		// Choose your friends wisely
		fixTask("67460662d0fbbc74ca0f7229", "674606bac840f707bea6242f", true);
		fixTask("67460662d0fbbc74ca0f7229", "674606ccff406a9f6a28e26f", true);
		fixTask("67460662d0fbbc74ca0f7229", "674606f1c63637e54bede3a6", true);
		fixTask("67460662d0fbbc74ca0f7229", "6746071002dfd67c0629a379", true);

		// Inevitable Response
		fixTask("673f6027352b4da8e00322d2", "67499a4f03b8295863172dea", true);

		// The Price of Independence
		fixTask("6744af0969a58fceba101fed", "6745c8ee54d6972417ad7bad", true);
		fixTask("6744af0969a58fceba101fed", "6745c90842db81af412eae97", true);
		fixTask("6744af0969a58fceba101fed", "6745c9623d362cd373b1de93", true);

		// Seizing the initiative
		fixTask("675c1d6d59b0575973008fc7", "675c1d6d59b0575973008fc9", true);


		logger.info(`[NoTransitTasks]: Altered ${count} transit tasks.`);
	}
}

module.exports = { mod: new NoTransitTasks() };