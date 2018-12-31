/**
 * Sleeves are clones of the player that can be used to perform
 * different tasks synchronously.
 *
 * Each sleeve is its own individual, meaning it has its own stats/exp
 *
 * Sleeves are unlocked in BitNode-10.
 */
import { SleeveTaskType } from "./SleeveTaskTypesEnum";

import { Person,
         IPlayer,
         ICrime,
         IFaction,
         ITaskTracker,
         createTaskTracker } from "../Person";

import { BitNodeMultipliers } from "../../BitNodeMultipliers";
import { Cities } from "../../Locations/Cities";
import { Companies } from "../../Company/Companies";
import { Company } from "../../Company/Company";
import { CONSTANTS } from "../../Constants";
import { Faction } from "../../Faction/Faction";
import { Factions } from "../../Faction/Factions";
import { FactionWorkType } from "../../Faction/FactionWorkTypeEnum";
import { Locations } from "../../Locations";

import { Generic_fromJSON, Generic_toJSON, Reviver } from "../../../utils/JSONReviver";

export class Sleeve extends Person {
    /**
     * Initiatizes a Sleeve object from a JSON save state.
     */
    static fromJSON(value: any): Sleeve {
        return Generic_fromJSON(Sleeve, value.data);
    }

    /**
     * Enum value for current task
     */
    currentTask: SleeveTaskType = SleeveTaskType.Idle;

    /**
     * Description of current task. Used only for logging purposes
     */
    currentTaskDescription: string = "";

    /**
     * For what company/faction the current task is assigned to.
     * Only applicable when working for faction or company, obviously
     */
    currentTaskLocation: string = "";

    /**
     * Maximum amount of time (in milliseconds) that can  be spent on current task.
     */
    currentTaskMaxTime: number = 0;

    /**
     * Milliseconds spent on current task
     */
    currentTaskTime: number = 0;

    /**
     * Keeps track of experience earned for other sleeves
     */
    earningsForSleeves: ITaskTracker = createTaskTracker();

    /**
     * Keeps track of experience + money earned for player
     */
    earningsForPlayer: ITaskTracker = createTaskTracker();

    /**
     * Keeps track of experienced earned in the current task/action
     */
    earningsForTask: ITaskTracker = createTaskTracker();

    /**
     * Keeps track of what type of work sleeve is doing for faction, if applicable
     */
    factionWorkType: FactionWorkType = FactionWorkType.None;

    /**
     * Records experience gain rate for the current task
     */
    gainRatesForTask: ITaskTracker = createTaskTracker();

    /**
     * Keeps track of events/notifications for this sleeve
     */
    logs: string[] = [];

    /**
     * Clone retains memory% of exp upon prestige. If exp would be lower than previously
     * kept exp, nothing happens
     */
    memory: number = 0;

    /**
     * Sleeve shock. Number between 1 and 100
     * Trauma/shock that comes with being in a sleeve. Experience earned
     * is multipled by shock%. This gets applied before synchronization
     */
    shock: number = 1;

    /**
     * Stored number of game "loop" cycles
     */
    storedCycles: number = 0;

    /**
     * Synchronization. Number between 0 and 100
     * When experience is earned  by sleeve, both the player and the sleeve get
     * sync% of the experience earned. Other sleeves get sync^2% of exp
     */
    sync: number = 1;

    constructor() {
        super();
        /*
        this.currentTask = SleeveTaskType.Idle;
        this.currentTaskDescription = "";
        this.currentTaskTime = 0;
        this.currentTaskMaxTime = 0;
        this.earningsForSleeves = createTaskTracker();
        this.earningsForPlayer = createTaskTracker();
        this.earningsForTask = createTaskTracker();
        this.gainRatesForTask = createTaskTracker();
        this.logs = [];
        this.memory = 0;
        this.shock = 1;
        this.storedCycles = 0;
        this.sync = 1;
        */
    }

    /**
     * Commit crimes
     */
    commitCrime(p: IPlayer, crime: ICrime): void {
        if (this.currentTask !== SleeveTaskType.Idle) {
            this.finishTask();
        } else {
            this.resetTaskStatus();
        }

        this.gainRatesForTask.hack = crime.hacking_exp * this.hacking_exp_mult * BitNodeMultipliers.CrimeExpGain;
        this.gainRatesForTask.str = crime.strength_exp * this.strength_exp_mult * BitNodeMultipliers.CrimeExpGain;
        this.gainRatesForTask.def = crime.defense_exp * this.defense_exp_mult * BitNodeMultipliers.CrimeExpGain;
        this.gainRatesForTask.dex = crime.dexterity_exp * this.dexterity_exp_mult * BitNodeMultipliers.CrimeExpGain;
        this.gainRatesForTask.agi = crime.agility_exp * this.agility_exp_mult * BitNodeMultipliers.CrimeExpGain;
        this.gainRatesForTask.cha = crime.charisma_exp * this.charisma_exp_mult * BitNodeMultipliers.CrimeExpGain;

        this.currentTaskMaxTime = crime.time;

        this.currentTask = SleeveTaskType.Crime;
    }

    /**
     * Called to stop the current task
     */
    finishTask(): void {
        if (this.currentTask === SleeveTaskType.Crime) {
        } else {

        }

        this.resetTaskStatus();
    }

    /**
     * Earn experience for any stats (supports multiple)
     * This function also handles experience propogating to Player and other sleeves
     */
    gainExperience(p: IPlayer, exp: ITaskTracker, numCycles: number=1): ITaskTracker {
        // Experience is first multiplied by shock. Then 'synchronization'
        // is accounted for
        const multFac = (this.shock / 100) * (this.sync / 100) * numCycles;
        const pHackExp = exp.hack * multFac;
        const pStrExp = exp.str * multFac;
        const pDefExp = exp.def * multFac;
        const pDexExp = exp.dex * multFac;
        const pAgiExp = exp.agi * multFac;
        const pChaExp = exp.cha * multFac;

        // Experience is gained by both this sleeve and player
        if (pHackExp > 0) {
            this.hacking_exp += pHackExp;
            p.gainHackingExp(pHackExp);
            this.earningsForPlayer.hack += pHackExp;
            this.earningsForTask.hack += pHackExp;
        }

        if (pStrExp > 0) {
            this.strength_exp += pStrExp;
            p.gainStrengthExp(pStrExp);
            this.earningsForPlayer.str += pStrExp;
            this.earningsForTask.str += pStrExp;
        }

        if (pDefExp > 0) {
            this.defense_exp += pDefExp;
            p.gainDefenseExp(pDefExp);
            this.earningsForPlayer.def += pDefExp;
            this.earningsForTask.dex += pDefExp;
        }

        if (pDexExp > 0) {
            this.dexterity_exp += pDexExp;
            p.gainDexterityExp(pDexExp);
            this.earningsForPlayer.dex += pDexExp;
            this.earningsForTask.dex += pDexExp;
        }

        if (pAgiExp > 0) {
            this.agility_exp += pAgiExp;
            p.gainAgilityExp(pAgiExp);
            this.earningsForPlayer.agi += pAgiExp;
            this.earningsForTask.agi += pAgiExp;
        }

        if (pChaExp > 0) {
            this.charisma_exp += pChaExp;
            p.gainCharismaExp(pChaExp);
            this.earningsForPlayer.cha += pChaExp;
            this.earningsForTask.cha += pChaExp;
        }

        // Record earnings for other sleeves
        this.earningsForSleeves.hack += (pHackExp * (this.sync / 100));
        this.earningsForSleeves.str += (pStrExp * (this.sync / 100));
        this.earningsForSleeves.def += (pDefExp * (this.sync / 100));
        this.earningsForSleeves.dex += (pDexExp * (this.sync / 100));
        this.earningsForSleeves.agi += (pAgiExp * (this.sync / 100));
        this.earningsForSleeves.cha += (pChaExp * (this.sync / 100));

        // Return the experience to be gained by other sleeves
        return {
            hack: pHackExp * (this.sync / 100),
            str: pStrExp * (this.sync / 100),
            def: pDefExp * (this.sync / 100),
            dex: pDexExp * (this.sync / 100),
            agi: pAgiExp * (this.sync / 100),
            cha: pChaExp * (this.sync / 100),
            money: 0,
        }
    }

    /**
     * Earn money for player
     */
    gainMoney(p: IPlayer, task: ITaskTracker, numCycles: number=1): void {
        p.gainMoney(task.money * numCycles);
    }

    /**
     * Gets reputation gain for the current task
     * Only applicable when working for company or faction
     */
    getRepGain(): number {
        if (this.currentTask === SleeveTaskType.Faction) {
            switch (this.factionWorkType) {
                case FactionWorkType.Hacking:
                    return this.getFactionHackingWorkRepGain();
                case FactionWorkType.Field:
                    return this.getFactionFieldWorkRepGain();
                case FactionWorkType.Security:
                    return this.getFactionSecurityWorkRepGain();
                default:
                    console.warn(`Invalid Sleeve.factionWorkType property in Sleeve.getRepGain(): ${this.factionWorkType}`);
                    return 0;
            }
        } else if (this.currentTask === SleeveTaskType.Company) {
            return 0;
        } else {
            console.warn(`Sleeve.getRepGain() called for invalid task type: ${this.currentTask}`);
            return 0;
        }
    }

    log(entry: string): void {
        const MaxLogSize: number = 50;
        this.logs.push(entry);
        if (this.logs.length > MaxLogSize) {
            this.logs.shift();
        }
    }

    /**
     * Process loop
     * Returns an object containing the amount of experience that should be
     * transferred to all other sleeves
     */
    process(p: IPlayer, numCycles: number=1): ITaskTracker | null {
        // Only process once every second (5 cycles)
        const CyclesPerSecond = 1000 / CONSTANTS.MilliPerCycle;
        this.storedCycles += numCycles;
        if (this.storedCycles < CyclesPerSecond) { return null; }

        // Shock gradually goes towards 100
        this.shock = Math.max(100, this.shock + (0.0001 * this.storedCycles));

        if (this.currentTask === SleeveTaskType.Idle) { return null; }

        let time = this.storedCycles * CONSTANTS.MilliPerCycle;
        let cyclesUsed = this.storedCycles;
        if (this.currentTaskTime + time > this.currentTaskMaxTime) {
            time = this.currentTaskMaxTime - this.currentTaskTime;
            cyclesUsed = Math.floor(time / CONSTANTS.MilliPerCycle);

            if (time < 0 || cyclesUsed < 0) {
                console.warn(`Sleeve.process() calculated negative cycle usage`);
                time = 0;
                cyclesUsed = 0;
            }
        }
        this.currentTaskTime += time;

        let retValue: ITaskTracker = createTaskTracker();
        switch (this.currentTask) {
            case SleeveTaskType.Class:
                retValue = this.gainExperience(p, this.gainRatesForTask, cyclesUsed);
                this.gainMoney(p, this.gainRatesForTask, cyclesUsed);
                break;
            case SleeveTaskType.Faction:
                retValue = this.gainExperience(p, this.gainRatesForTask, cyclesUsed);
                this.gainMoney(p, this.gainRatesForTask, cyclesUsed);

                // TODO REP for both this and company
                const fac = Factions[this.currentTaskLocation];
                if (!(fac instanceof Faction)) {
                    console.error(`Invalid faction for Sleeve task: ${this.currentTaskLocation}`);
                    break;
                }
                break;
            case SleeveTaskType.Company:
                retValue = this.gainExperience(p, this.gainRatesForTask, cyclesUsed);
                this.gainMoney(p, this.gainRatesForTask, cyclesUsed);
                break;
            case SleeveTaskType.Recovery:
                this.shock = Math.max(100, this.shock + (0.001 * this.storedCycles));
                break;
            case SleeveTaskType.Sync:
                this.sync = Math.max(100, this.sync + (0.001 * this.storedCycles));
                break;
            default:
                break;
        }

        if (this.currentTaskMaxTime !== 0 && this.currentTaskTime >= this.currentTaskMaxTime) {
            this.finishTask();
        }

        this.storedCycles -= cyclesUsed;

        // TODO Finish this
        return retValue;
    }

    /**
     * Resets all parameters used to keep information about the current task
     */
    resetTaskStatus(): void {
        this.earningsForTask = createTaskTracker();
        this.gainRatesForTask = createTaskTracker();
        this.currentTask = SleeveTaskType.Idle;
        this.currentTaskTime = 0;
        this.currentTaskMaxTime = 0;
        this.factionWorkType = FactionWorkType.None;
    }

    /**
     * Take a course at a university
     */
    takeUniversityCourse(p: IPlayer, universityName: string, className: string): boolean {
        if (this.currentTask !== SleeveTaskType.Idle) {
            this.finishTask();
        } else {
            this.resetTaskStatus();
        }

        // Set exp/money multipliers based on which university.
        // Also check that the sleeve is in the right city
        let costMult: number = 1;
        let expMult: number = 1;
        switch (universityName.toLowerCase()) {
            case Locations.AevumSummitUniversity.toLowerCase():
                if (this.city !== Cities.Aevum) { return false; }
                costMult = 4;
                expMult = 3;
                break;
            case Locations.Sector12RothmanUniversity.toLowerCase():
                if (this.city !== Cities.Sector12) { return false; }
                costMult = 3;
                expMult = 2;
                break;
            case Locations.VolhavenZBInstituteOfTechnology.toLowerCase():
                if (this.city !== Cities.Volhaven) { return false; }
                costMult = 5;
                expMult = 4;
                break;
            default:
                return false;
        }

        // Number of game cycles in a second
        const cps: number = 1000 / CONSTANTS.MilliPerCycle;

        // Set experience/money gains based on class
        // TODO Refactor University Courses into its own class or something
        const baseStudyComputerScienceExp: number   = 0.5;
        const baseDataStructuresExp: number         = 1;
        const baseNetworksExp: number               = 2;
        const baseAlgorithmsExp: number             = 4;
        const baseManagementExp: number             = 2;
        const baseLeadershipExp: number             = 4;

        switch (className.toLowerCase()) {
            case "study computer science":
                this.gainRatesForTask.hack = (baseStudyComputerScienceExp * expMult * this.hacking_exp_mult);
                break;
            case "data structures":
                this.gainRatesForTask.hack = (baseDataStructuresExp * expMult * this.hacking_exp_mult);
                this.gainRatesForTask.money = -1 * (CONSTANTS.ClassDataStructuresBaseCost * costMult);
                break;
            case "networks":
                this.gainRatesForTask.hack = (baseNetworksExp * expMult * this.hacking_exp_mult);
                this.gainRatesForTask.money = -1 * (CONSTANTS.ClassNetworksBaseCost * costMult);
                break;
            case "algorithms":
                this.gainRatesForTask.hack = (baseAlgorithmsExp * expMult * this.hacking_exp_mult);
                this.gainRatesForTask.money = -1 *  (CONSTANTS.ClassAlgorithmsBaseCost * costMult);
                break;
            case "management":
                this.gainRatesForTask.cha = (baseManagementExp * expMult * this.charisma_exp_mult);
                this.gainRatesForTask.money = -1 * (CONSTANTS.ClassManagementBaseCost * costMult);
                break;
            case "leadership":
                this.gainRatesForTask.cha = (baseLeadershipExp * expMult * this.charisma_exp_mult);
                this.gainRatesForTask.money = -1 * (CONSTANTS.ClassLeadershipBaseCost * costMult);
                break;
            default:
                return false;
        }

        this.currentTask = SleeveTaskType.Class;
        return true;
    }

    /**
     * Travel to another City. Costs money from player
     */
    travel(p: IPlayer, newCity: string): boolean {
        if (Cities[newCity] == null) {
            console.error(`Invalid city ${newCity} passed into Sleeve.travel()`);
            return false;
        }

        p.loseMoney(CONSTANTS.TravelCost);
        this.city = newCity;

        return true;
    }

    /**
     * Work for a company
     */
    workForCompany(p: IPlayer): boolean {
        return true;
    }

    /**
     * Work for one of the player's factions
     */
    workForFaction(p: IPlayer, factionName: string, workType: string): boolean {
        if (!(Factions[factionName] instanceof Faction) || !p.factions.includes(factionName)) {
            return false;
        }

        if (this.currentTask !== SleeveTaskType.Idle) {
            this.finishTask();
        } else {
            this.resetTaskStatus();
        }

        // Set type of work (hacking/field/security), and the experience gains
        const sanitizedWorkType: string = workType.toLowerCase();
        if (sanitizedWorkType.includes("hack")) {
            this.factionWorkType = FactionWorkType.Hacking;
            this.gainRatesForTask.hack = .15 * this.hacking_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
        } else if (sanitizedWorkType.includes("field")) {
            this.factionWorkType = FactionWorkType.Field;
            this.gainRatesForTask.hack = .1 * this.hacking_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.str = .1 * this.strength_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.def = .1 * this.defense_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.dex = .1 * this.dexterity_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.agi = .1 * this.agility_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.cha = .1 * this.charisma_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
        } else if (sanitizedWorkType.includes("security")) {
            this.factionWorkType = FactionWorkType.Security;
            this.gainRatesForTask.hack = .1 * this.hacking_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.str = .15 * this.strength_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.def = .15 * this.defense_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.dex = .15 * this.dexterity_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
            this.gainRatesForTask.agi = .15 * this.agility_exp_mult * BitNodeMultipliers.FactionWorkExpGain;
        } else {
            return false;
        }

        this.currentTaskLocation = factionName;
        this.currentTask = SleeveTaskType.Faction;

        return true;
    }

    /**
     * Begin a gym workout task
     */
    workoutAtGym(p: IPlayer, gymName: string, stat: string): boolean {
        if (this.currentTask !== SleeveTaskType.Idle) {
            this.finishTask();
        } else {
            this.resetTaskStatus();
        }

        // Set exp/money multipliers based on which university.
        // Also check that the sleeve is in the right city
        let costMult: number = 1;
        let expMult: number = 1;
        switch (gymName.toLowerCase()) {
            case Locations.AevumCrushFitnessGym.toLowerCase():
                if (this.city != Cities.Aevum) { return false; }
                costMult = 3;
                expMult = 2;
                break;
            case Locations.AevumSnapFitnessGym.toLowerCase():
                if (this.city != Cities.Aevum) { return false; }
                costMult = 10;
                expMult = 5;
                break;
            case Locations.Sector12IronGym.toLowerCase():
                if (this.city != Cities.Sector12) { return false; }
                costMult = 1;
                expMult = 1;
                break;
            case Locations.Sector12PowerhouseGym.toLowerCase():
                if (this.city != Cities.Sector12) { return false; }
                costMult = 20;
                expMult = 10;
                break;
            case Locations.VolhavenMilleniumFitnessGym:
                if (this.city != Cities.Volhaven) { return false; }
                costMult = 7;
                expMult = 4;
                break;
            default:
                return false;
        }

        // Number of game cycles in a second
        const cps = 1000 / CONSTANTS.MilliPerCycle;

        // Set experience/money gains based on class
        // TODO Refactor University Courses into its own class or something
        const baseGymExp: number = 1;
        const sanitizedStat: string = stat.toLowerCase();

        // Set cost
        this.gainRatesForTask.money = -1 * (CONSTANTS.ClassGymBaseCost * costMult);

        // Set stat gain rate
        if (sanitizedStat.includes("str")) {
            this.gainRatesForTask.str = (baseGymExp * expMult);
        } else if (sanitizedStat.includes("def")) {
            this.gainRatesForTask.def = (baseGymExp * expMult);
        } else if (sanitizedStat.includes("dex")) {
            this.gainRatesForTask.dex = (baseGymExp * expMult);
        } else if (sanitizedStat.includes("agi")) {
            this.gainRatesForTask.agi = (baseGymExp * expMult);
        } else {
            return false;
        }

        this.currentTask = SleeveTaskType.Class;

        return true;
    }

    /**
     * Serialize the current object to a JSON save state.
     */
    toJSON(): any {
        return Generic_toJSON("Sleeve", this);
    }
}

Reviver.constructors.Sleeve = Sleeve;
