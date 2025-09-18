// noinspection SpellCheckingInspection

import { IPostDBLoadMod } from "@spt/models/external/IPostDBLoadMod";
import { ILogger } from "@spt/models/spt/utils/ILogger";
import { DatabaseServer } from "@spt/servers/DatabaseServer";
import { PreSptModLoader } from "@spt/loaders/PreSptModLoader";
import { DependencyContainer } from "tsyringe";
import { jsonc } from "jsonc";
import path from "path";
import fs from "node:fs";


class AmmoStats implements IPostDBLoadMod
{

	private config;

	private CalculateArmorLevel(penetrationValue, realismMode)
	{

		if (realismMode)
		{
			let tier = Math.floor(penetrationValue / 10);
			return Math.max(0, Math.min(tier, 10));
		}

		return this.CalculateVanillaArmorClass(penetrationValue);
	}

	private CalculateVanillaArmorClass(penetrationValue)
	{
		let penTier = 1;

		while (penTier <= 6)
		{
			let armorStrength = (penTier * 10);

			if (armorStrength >= penetrationValue + 15) 
			{
				// Even with a +15 variance, it's weaker than the armor tier's strength. (0% pen chance)
				break;
			};
			if (armorStrength <= penetrationValue - 15) 
			{
				// Even with its lowest possible roll, it surpasses the armor tier's strength. (100% pen chance)
				penTier++;
				continue;
			};

			// Calculate the penetration chance.
			// Formulas are taken directly from the assembly.
			let penetrationChance = 0.0;

			if (armorStrength >= penetrationValue)
			{
				penetrationChance = 0.4 * Math.pow(armorStrength - penetrationValue - 15.0, 2);
			}
			else
			{
				penetrationChance = 100.0 + penetrationValue / (0.9 * armorStrength - penetrationValue);
			};

			// Check to see if the penetration chance is higher than 50%.
			if (penetrationChance >= 50.0)
			{
				penTier++;
				continue;
			}
			break;
		}
		return (penTier - 1);
	}

	private static IsPluginLoaded(): boolean
	{
		const fs = require('fs');
		const pluginName = "rairai.colorconverterapi.dll";

		// Fails if there's no ./BepInEx/plugins/ folder
		try
		{
			const pluginList = fs.readdirSync("./BepInEx/plugins").map(plugin => plugin.toLowerCase());
			return pluginList.includes(pluginName);
		}
		catch
		{
			return false;
		}
	}

	public postDBLoad(container: DependencyContainer): void
	{
		const logger = container.resolve<ILogger>("WinstonLogger");
		const itemTables = container.resolve<DatabaseServer>("DatabaseServer").getTables().templates.items;
		const databaseServer = container.resolve<DatabaseServer>("DatabaseServer");
		const locales = Object.values(container.resolve<DatabaseServer>("DatabaseServer").getTables().locales.global);
		const localeKeys = Object.keys(container.resolve<DatabaseServer>("DatabaseServer").getTables().locales.global);
		const preSptModLoader = container.resolve<PreSptModLoader>("PreSptModLoader");
		this.config = jsonc.parse(fs.readFileSync(path.resolve(__dirname, "../config/config.jsonc"), "utf-8"));

		let realismMode = false;
		const modList = preSptModLoader.getImportedModDetails();

		for (const mod in modList)
		{
			if (modList[mod].name == "SPT Realism Mod" && !this.config.disableRealismSupport)
			{
				realismMode = true;
			}
		}

		//Checking for config proper config option, killing the mod if it's improper.
		if (this.config.MODE.toLowerCase() !== "prepend" && this.config.MODE.toLowerCase() !== "append")
		{
			return logger.error(`[AmmoStats] Error in src/this.config.json, MODE must be append or prepend.`);
		}
		if (this.config.SEPARATOR.toLowerCase() !== "oneline" && this.config.SEPARATOR.toLowerCase() !== "newline")
		{
			return logger.error(`[AmmoStats] Error in src/config.json, SEPARATOR must be oneline or newline.`);
		}


		let ammoStatDict = {};																		//Building our key,value dict
		let colorProfile = {};

		for (const itemID in itemTables)
		{	                                                        // Iterate through all itemIDs
			if (itemTables[itemID]._props.ammoType === "bullet" || itemTables[itemID]._props.ammoType === "buckshot")
			{
				let bulletDamage: number = itemTables[itemID]._props.Damage;	                        // Store its damage...
				let bulletPenetration: number = itemTables[itemID]._props.PenetrationPower;	        // Store its penetration...
				let bulletArmorTier: number = this.CalculateArmorLevel(bulletPenetration, realismMode);	    // Calculate what the best tier is for that penetration value
				let bulletType: String = "bullet";
				let bulletProjectiles: number = 1;

				if (itemTables[itemID]._props.ammoType === "buckshot")
				{	                        // Override bulletType and bulletProjectiles if it's a buckshot type ammo
					bulletType = "buckshot";
					bulletProjectiles = itemTables[itemID]._props.buckshotBullets;
				}
				ammoStatDict[itemID] = [bulletDamage, bulletPenetration, bulletArmorTier, bulletType, bulletProjectiles];	// Write the values into our dict

				// Fetch the proper color profile for background colors
				// For custom hex value colors...
				if (AmmoStats.IsPluginLoaded() && this.config.enableCustomBackgroundColors == true)
				{
					if (realismMode)
					{
						colorProfile = this.config.ColorProfilesRealism[this.config.ColorProfileRealism];
					}
					else
					{
						colorProfile = this.config.ColorProfiles[this.config.ColorProfile];
					}

					itemTables[itemID]._props.BackgroundColor = colorProfile[bulletArmorTier.toString()];
				}
				// For those without the plugin/without the functionality enabled...
				else if (this.config.enableCustomBackgroundColors == true)
				{
					if (realismMode)
					{
						colorProfile = this.config.realismBackgroundColors;
					}
					else
					{
						colorProfile = this.config.backgroundColors;
					}

					itemTables[itemID]._props.BackgroundColor = colorProfile[bulletArmorTier.toString()];
				}
			}

			// Ammo boxes
			if (itemTables[itemID]._parent === "543be5cb4bdc2deb348b4568")
			{
				let subAmmoID = itemTables[itemID]._props.StackSlots[0]._props.filters[0].Filter[0];
				let armorPenTier = this.CalculateArmorLevel(itemTables[subAmmoID]._props.PenetrationPower, realismMode);


				if (AmmoStats.IsPluginLoaded() && this.config.enableCustomBackgroundColors == true)
				{
					if (realismMode)
					{
						colorProfile = this.config.ColorProfilesRealism[this.config.ColorProfileRealism];
					}
					else
					{
						colorProfile = this.config.ColorProfiles[this.config.ColorProfile];
					}

					itemTables[itemID]._props.BackgroundColor = colorProfile[armorPenTier.toString()];
				}
				// For those without the plugin/without the functionality enabled...
				else if (this.config.enableCustomBackgroundColors == true)
				{
					if (realismMode)
					{
						colorProfile = this.config.realismBackgroundColors;
					}
					else
					{
						colorProfile = this.config.backgroundColors;
					}

					itemTables[itemID]._props.BackgroundColor = colorProfile[armorPenTier.toString()];
				}

			}
		}


		for (const localeID in locales)
		{	                                                    // Iterate through all language options
			let langText = localeKeys[localeID];				// Getting the text "en", "ru", etc

			let locDamage = this.config.Locales.en.Damage;
			let locPenetration = this.config.Locales.en.Penetration;
			let locBestArmorLv = this.config.Locales.en.TextEffectArmorLv;
			let locEffectNone = this.config.Locales.en.EffectNone;
			let locPellets = this.config.Locales.en.Pellets;
			let separatorChar = "";

			if (this.config.SEPARATOR.toLowerCase() == "newline")
			{
				separatorChar = "\n";
			}
			else if (this.config.SEPARATOR.toLowerCase() == "oneline")
			{
				separatorChar = " | ";
			}

			if (this.config.Locales[langText] && Object.keys(this.config.Locales[langText]).length == Object.keys(this.config.Locales.en).length)
			{
				locDamage = this.config.Locales[langText].Damage;
				locPenetration = this.config.Locales[langText].Penetration;
				locBestArmorLv = this.config.Locales[langText].TextEffectArmorLv;
				locEffectNone = this.config.Locales[langText].EffectNone;
				locPellets = this.config.Locales[langText].Pellets;
			}

			if (this.config.Locales[langText] && Object.keys(this.config.Locales[langText]).length != Object.keys(this.config.Locales.en).length)
			{
				if (this.config.debugLogging)
				{
					logger.warning(`[AmmoStats]: WARNING! Locale for language key "${langText}" is not complete and will not be properly applied.`);
					logger.warning(`[AmmoStats]: Please ask the author to update the localization for this language, or manually update the config file and add all missing entries for the language.`);
				}
			}

			for (const key in ammoStatDict)
			{
				let stringToAdd = "";
				let desc = "";

				try
				{
					desc = databaseServer.getTables().locales.global[langText][`${key} Description`]; 	                    // Copy the description
					if (this.config.debugLogging) logger.success(`[AmmoStats]: Editing description for ${JSON.stringify(key)} in lang ${langText}`);
				}
				catch (exception)
				{
					if (this.config.debugLogging) logger.warning(`[AmmoStats]: WARNING! Error with item "${JSON.stringify(key)}" in lang ${langText}, skipping entry!`);
					continue;
				}

				// Damage string
				if (ammoStatDict[key][3] === "bullet" && this.config.addDamage === true)
				{
					stringToAdd += `${locDamage}: ${ammoStatDict[key][0]}${separatorChar}`;
				}
				else if (ammoStatDict[key][3] === "buckshot" && this.config.addDamage === true)
				{
					stringToAdd += `${locDamage}: ${ammoStatDict[key][0]} * ${ammoStatDict[key][4]} ${locPellets} (${ammoStatDict[key][0] * ammoStatDict[key][4]})${separatorChar}`;
				}

				// Penetration string
				if (this.config.addPen === true)
				{
					stringToAdd += `${locPenetration}: ${ammoStatDict[key][1]}${separatorChar}`;
				}

				if (this.config.addEffectArmorLv === true)
				{											// Armor level string
					if (ammoStatDict[key][2] !== 0)
					{
						stringToAdd += `${locBestArmorLv}: ${ammoStatDict[key][2]}${separatorChar}`;
					}
					else
					{
						stringToAdd += `${locBestArmorLv}: ${locEffectNone}${separatorChar}`;
					}
				}

				if (stringToAdd.length > 0)	// Only add locale data if there's anything to add
				{
					stringToAdd = stringToAdd.slice(0, stringToAdd.length - separatorChar.length);		// Trim the last separator off, used to get around issues where a user disables certain stats in config

					if (this.config.MODE.toLowerCase() === "prepend" && (this.config.addDamage || this.config.addPen || this.config.addEffectArmorLv))
					{	                                	// Checking which mode was selected in the config
						databaseServer.getTables().locales.global[langText][`${key} Description`] = stringToAdd + "\n\n" + desc;	// Putting our new string with weapon info in front, newlines, then the original description
					}
					else if (this.config.MODE.toLowerCase() === "append" && (this.config.addDamage || this.config.addPen || this.config.addEffectArmorLv))
					{																				// Append mode
						databaseServer.getTables().locales.global[langText][`${key} Description`] = desc + "\n\n" + stringToAdd;	// Putting the description first, newlines, then our string appended to the end
					}
				}

				if (this.config.showPenInName === true)
				{												// Add pen tier to the name
					let namePen = `  -  (${ammoStatDict[key][2]})`;
					databaseServer.getTables().locales.global[langText][`${key} Name`] += namePen;
				}
			}
		}

		if (this.config.addDamage || this.config.addPen || this.config.addEffectArmorLv)
		{
			logger.success(`[AmmoStats]: Loaded successfully. Running in ${this.config.MODE.toLowerCase()} mode.`);
		}
		else 
		{
			logger.success(`[AmmoStats]: Loaded successfully.`);
		}

		if (AmmoStats.IsPluginLoaded())
		{
			logger.success(`[AmmoStats]: ColorConverter Plugin loaded! Extended functionality enabled.`);
		}
		if (realismMode)
		{
			logger.success(`[AmmoStats]: Realism compatibility enabled.`);
		}

	}
}

module.exports = { mod: new AmmoStats() };