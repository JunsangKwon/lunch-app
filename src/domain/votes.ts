export type Vote = { restaurantId: string; voter: string };

/** 서버가 켜져 있는 동안만 유지하는 투표함. */
const ballots: Vote[] = [];

/** 투표를 기록한다. */
export function castVote(vote: Vote): void {
    ballots.push(vote);
}

/** 식당별 득표 수를 돌려준다. */
export function voteSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    for (const { restaurantId } of ballots) {
        summary[restaurantId] = (summary[restaurantId] ?? 0) + 1;
    }
    return summary;
}

/** 테스트용: 투표함을 비운다. */
export function resetVotes(): void {
    ballots.length = 0;
}
