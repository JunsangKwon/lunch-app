import { beforeEach, expect, it } from "vitest";
import { castVote, resetVotes, voteSummary } from "./votes.js";

beforeEach(resetVotes);

it("식당별 득표 수를 센다", () => {
    castVote({ restaurantId: "r01", voter: "민지" });
    castVote({ restaurantId: "r01", voter: "준호" });
    castVote({ restaurantId: "r05", voter: "서연" });
    expect(voteSummary()).toEqual({ r01: 2, r05: 1 });
});
