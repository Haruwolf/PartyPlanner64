import { createEvent, IEventParseInfo, IEvent, IEventWriteInfo } from "../events";
import { EventActivationType, EventExecutionType, Game } from "../../types";
import { hashEqual, copyRange } from "../../utils/arrays";
import { assemble } from "mips-assembler";
import { prepAsm } from "../prepAsm";

// This pseudo-event handles when the player lands on a previously visited star space.
// The space had turned into a Chance Time space.
const StarChanceEvent = createEvent("STARCHANCE", "Chance Time from old star space");
StarChanceEvent.activationType = EventActivationType.LANDON;
StarChanceEvent.executionType = EventExecutionType.DIRECT;
StarChanceEvent.fakeEvent = true;
StarChanceEvent.supportedGames = [
  Game.MP1_USA,
];
StarChanceEvent.parse = function(dataView: DataView, info: IEventParseInfo) {
  let hashes = {
    // DK  0x2449CC, 0x800F970C
    METHOD: "7E32BF9C855085A03CF3A8D208A6AB94", // +0x8C
  };

  if (hashEqual([dataView.buffer, info.offset, 0x8C], hashes.METHOD)) {
    return true;
  }

  return false;
};
StarChanceEvent.write = function(dataView: DataView, event: IEvent, info: IEventWriteInfo, temp: any) {
  const asm = prepAsm(`
  addiu SP, SP, -0x20
  sw    RA, 0x18(SP)
  sw    S1, 0x14(SP)
  jal   GetCurrentSpaceIndex
   sw    S0, 0x10(SP)
  sll   V0, V0, 0x10
  jal   __PP64_STAR_SPACE_INTERNAL
   sra   A0, V0, 0x10
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  addiu  V1, R0, 2
  bne   V0, V1, L800F9784
   addu  S1, R0, R0
L800F9740:
  jal   GetPlayerStruct
   addu  A0, S1, R0
  jal   GetCurrentPlayerIndex
   addu  S0, V0, R0
  sll   V0, V0, 0x10
  sra   V0, V0, 0x10
  xor   V0, S1, V0
  sltu  V0, R0, V0
  sb    V0, 0(S0)
  addiu S1, S1, 1
  slti  V0, S1, 4 ; total players
  bne  V0, R0, L800F9740
   addiu    A0, R0, 1
  addu  A1, R0, R0
  addiu    A2, R0, 5
  jal   0x800587BC
   addiu    A3, R0, 1
L800F9784:
  lw    RA, 0x18(SP)
  lw    S1, 0x14(SP)
  lw    S0, 0x10(SP)
  jr    RA
   addiu SP, SP, 0x20
  `, undefined, info);
  const bytes = assemble(asm) as ArrayBuffer;
  copyRange(dataView, bytes, 0, 0, bytes.byteLength);
  return [info.offset, bytes.byteLength];
};