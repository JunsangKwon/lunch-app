import { RESTAURANTS, type Restaurant } from "./restaurants.js";

/** 한 번에 추천하는 후보 수. */
export const DEFAULT_COUNT = 8;

export type Visit = { restaurantId: string; date: string };
export type Sort = "price" | "walk";

export type RecommendInput = {
    /** 1인 예산(원). 이 금액 이하인 식당만 추천한다. */
    budget?: number;
    /** 최대 도보 시간(분). */
    maxWalkMinutes?: number;
    /** 최근 방문 기록. excludeDays일 안에 간 식당은 제외한다. */
    recentVisits?: Visit[];
    excludeDays?: number;
    /** 기준 날짜(YYYY-MM-DD). */
    today: string;
    count?: number;
    /** 선택한 후보 정렬 기준. 생략하면 가중 추첨 순서를 유지한다. */
    sort?: Sort;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

/** 조건에 맞는 식당만 남긴다. */
export function filterRestaurants(restaurants: Restaurant[], input: RecommendInput): Restaurant[] {
    const { budget, maxWalkMinutes, recentVisits = [], excludeDays = 3, today } = input;
    return restaurants.filter((restaurant) =>
        (budget === undefined || restaurant.price < budget)
        && (maxWalkMinutes === undefined || restaurant.walkMinutes <= maxWalkMinutes)
        && !recentVisits.some((visit) => visit.restaurantId === restaurant.id && daysBetween(visit.date, today) < excludeDays));
}

/** 가까울수록 높은 가중치를 준다. */
export function weightOf(restaurant: Restaurant): number {
    return Math.max(1, 15 - restaurant.walkMinutes);
}

/** 후보를 오름차순으로 정렬한다. 동점은 입력 순서대로 유지한다. */
export function sortRestaurants(restaurants: readonly Restaurant[], sort: Sort): Restaurant[] {
    const key = sort === "price" ? "price" : "walkMinutes";
    return [...restaurants].sort((a, b) => a[key] - b[key]);
}

/** 가중치에 따라 하나를 고른다. random은 0 이상 1 미만의 값을 돌려줘야 한다. */
export function pickByWeight<T>(items: T[], weight: (item: T) => number, random: () => number): T {
    const total = items.reduce((sum, item) => sum + weight(item), 0);
    let point = random() * total;
    for (const item of items) {
        point -= weight(item);
        if (point < 0) return item;
    }
    return items[items.length - 1];
}

/** 조건에 맞는 식당 중에서 서로 다른 후보를 count개 고른다. */
export function recommendLunch(input: RecommendInput, restaurants: Restaurant[] = RESTAURANTS, random: () => number = Math.random): Restaurant[] {
    const pool = filterRestaurants(restaurants, input);
    const picked: Restaurant[] = [];
    while (picked.length < (input.count ?? DEFAULT_COUNT) && pool.length > 0) {
        const choice = pickByWeight(pool, weightOf, random);
        picked.push(choice);
        pool.splice(pool.indexOf(choice), 1);
    }
    return input.sort ? sortRestaurants(picked, input.sort) : picked;
}
