import { describe, expect, it } from "vitest";
function canAcceptAnswer(status:string,expiresAt:number,now:number){return status==="IN_PROGRESS"&&now<expiresAt;}
describe("assessment rules",()=>{it("rejects answers at expiry",()=>{expect(canAcceptAnswer("IN_PROGRESS",100,100)).toBe(false);});it("rejects answers after finalization",()=>{expect(canAcceptAnswer("SUBMITTED",200,100)).toBe(false);});});
