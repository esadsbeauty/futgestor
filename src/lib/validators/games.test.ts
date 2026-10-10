import { describe,expect,it } from "vitest";
import { gameEventSchema,gameExpenseSchema,gamePlayersSchema,gameSchema } from "./games";
const game={title:"Baba",game_date:"2026-10-08",start_time:"20:00",location:"Quadra",player_price:10,notes:"",status:"scheduled"};
describe("gameSchema",()=>{it("accepts a valid game",()=>expect(gameSchema.safeParse(game).success).toBe(true));it.each([{...game,title:""},{...game,game_date:"08/10/2026"},{...game,player_price:0},{...game,status:"open"}])("rejects invalid game %#",input=>expect(gameSchema.safeParse(input).success).toBe(false));});
describe("game expense and players",()=>{it("requires a positive expense",()=>expect(gameExpenseSchema.safeParse({description:"Aluguel",category:"rental",amount:100}).success).toBe(true));it("rejects zero expense",()=>expect(gameExpenseSchema.safeParse({description:"Aluguel",category:"rental",amount:0}).success).toBe(false));it("requires selected players",()=>expect(gamePlayersSchema.safeParse({player_ids:[]}).success).toBe(false));});


describe("gameEventSchema",()=>{it.each(["goal","yellow_card","red_card"])("accepts %s",(event_type)=>expect(gameEventSchema.safeParse({player_id:"550e8400-e29b-41d4-a716-446655440000",event_type,quantity:1}).success).toBe(true));it("rejects invalid event quantity",()=>expect(gameEventSchema.safeParse({player_id:"550e8400-e29b-41d4-a716-446655440000",event_type:"goal",quantity:0}).success).toBe(false));});
