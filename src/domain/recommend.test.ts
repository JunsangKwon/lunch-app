import { describe, expect, it } from "vitest";
import { filterRestaurants, pickByWeight, recommendLunch } from "./recommend.js";
import { RESTAURANTS } from "./restaurants.js";

const today = "2026-09-24";
const sortFixture = [
    { ...RESTAURANTS[0]!, id: "a", price: 100, walkMinutes: 5 },
    { ...RESTAURANTS[1]!, id: "b", price: 50, walkMinutes: 3 },
    { ...RESTAURANTS[2]!, id: "c", price: 50, walkMinutes: 2 },
    { ...RESTAURANTS[3]!, id: "d", price: 100, walkMinutes: 3 },
];

describe("filterRestaurants", () => {
    it("도보 시간 조건을 넘는 식당은 제외한다", () => {
        const result = filterRestaurants(RESTAURANTS, { today, maxWalkMinutes: 3 });
        expect(result.map((r) => r.id)).toEqual(["r02", "r08", "r10", "r12"]);
    });

    it("최근 3일 안에 방문한 식당은 제외한다", () => {
        const result = filterRestaurants(RESTAURANTS, { today, recentVisits: [{ restaurantId: "r02", date: "2026-09-23" }] });
        expect(result.some((r) => r.id === "r02")).toBe(false);
    });
});

describe("recommendLunch", () => {
    it("서로 다른 후보를 요청한 개수만큼 고른다", () => {
        const result = recommendLunch({ today, count: 3 }, RESTAURANTS, () => 0.5);
        expect(new Set(result.map((r) => r.id)).size).toBe(3);
    });

    it("정렬을 지정하지 않으면 기존 가중 추첨 순서를 유지한다", () => {
        const result = recommendLunch({ today, count: 3 }, RESTAURANTS, () => 0.5);
        expect(result.map((r) => r.id)).toEqual(["r07", "r06", "r08"]);
    });

    it("가격순은 오름차순으로 정렬하고 동점은 추첨 순서를 유지한다", () => {
        const result = recommendLunch({ today, count: 4, sort: "price" }, sortFixture, () => 0);
        expect(result.map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
    });

    it("도보순은 오름차순으로 정렬하고 동점은 추첨 순서를 유지한다", () => {
        const result = recommendLunch({ today, count: 4, sort: "walk" }, sortFixture, () => 0);
        expect(result.map((r) => r.id)).toEqual(["c", "b", "d", "a"]);
    });

    it("정렬 기준이 후보 선택 결과를 바꾸지 않는다", () => {
        const price = recommendLunch({ today, count: 5, sort: "price" }, RESTAURANTS, () => 0.5);
        const walk = recommendLunch({ today, count: 5, sort: "walk" }, RESTAURANTS, () => 0.5);
        expect(new Set(price.map((r) => r.id))).toEqual(new Set(walk.map((r) => r.id)));
    });

    it("가중치가 큰 항목이 먼저 뽑힌다", () => {
        expect(pickByWeight(["a", "b"], (item) => (item === "a" ? 9 : 1), () => 0.5)).toBe("a");
    });
});
