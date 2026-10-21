import { describe,expect,it } from "vitest";
import { gameEventSchema,gameExpenseSchema,gamePlayersSchema,gameSchema,publicGameConfirmationSchema } from "./games";
describe("game-only player events", () => {
  const guest = { guest_confirmation_id: "550e8400-e29b-41d4-a716-446655440000", event_type: "goal", quantity: "2" };
  it("accepts a guest without a permanent participant", () => expect(gameEventSchema.safeParse(guest).success).toBe(true));
  it("rejects two identities", () => expect(gameEventSchema.safeParse({ ...guest, player_id: guest.guest_confirmation_id }).success).toBe(false));
  it("rejects no identity", () => expect(gameEventSchema.safeParse({ ...guest, guest_confirmation_id: null }).success).toBe(false));
  it("rejects invalid guest ids", () => expect(gameEventSchema.safeParse({ ...guest, guest_confirmation_id: "guest:invalid" }).success).toBe(false));
});
const game={title:"Baba",game_date:"2026-10-08",start_time:"20:00",location:"Quadra",player_price:10,notes:"",status:"scheduled",game_format:"court"};
describe("gameSchema",()=>{it("accepts a valid game",()=>expect(gameSchema.safeParse(game).success).toBe(true));it.each([{...game,title:""},{...game,game_date:"08/10/2026"},{...game,player_price:0},{...game,status:"open"}])("rejects invalid game %#",input=>expect(gameSchema.safeParse(input).success).toBe(false));});
describe("game expense and players",()=>{it("requires a positive expense",()=>expect(gameExpenseSchema.safeParse({description:"Aluguel",category:"rental",amount:100}).success).toBe(true));it("rejects zero expense",()=>expect(gameExpenseSchema.safeParse({description:"Aluguel",category:"rental",amount:0}).success).toBe(false));it("requires selected players",()=>expect(gamePlayersSchema.safeParse({player_ids:[]}).success).toBe(false));});


describe("gameEventSchema",()=>{it.each(["goal","yellow_card","red_card"])("accepts %s",(event_type)=>expect(gameEventSchema.safeParse({player_id:"550e8400-e29b-41d4-a716-446655440000",event_type,quantity:1}).success).toBe(true));it("rejects invalid event quantity",()=>expect(gameEventSchema.safeParse({player_id:"550e8400-e29b-41d4-a716-446655440000",event_type:"goal",quantity:0}).success).toBe(false));});


describe("publicGameConfirmationSchema",()=>{it("accepts confirmed futsal position",()=>expect(publicGameConfirmationSchema.safeParse({name:"João",attendance_status:"confirmed",sport_type:"futsal",position:"pivot"}).success).toBe(true));it("accepts confirmed football position",()=>expect(publicGameConfirmationSchema.safeParse({name:"Carlos",attendance_status:"confirmed",sport_type:"football",position:"striker"}).success).toBe(true));it("accepts declined without sport and position",()=>expect(publicGameConfirmationSchema.safeParse({name:"Pedro",attendance_status:"declined",sport_type:null,position:null}).success).toBe(true));it("requires sport type when confirmed",()=>expect(publicGameConfirmationSchema.safeParse({name:"João",attendance_status:"confirmed",sport_type:null,position:null}).success).toBe(false));});
