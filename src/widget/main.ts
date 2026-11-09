import { App } from "@modelcontextprotocol/ext-apps";
import type { Restaurant } from "../domain/restaurants.js";
import { sortRestaurants, type Sort } from "../domain/recommend.js";

type LunchResult = { candidates?: Restaurant[]; votes?: Record<string, number> };

const root = document.querySelector<HTMLDivElement>("#root")!;
const app = new App({ name: "lunch-widget", version: "0.1.0" }, {});

let recommendationOrder: Restaurant[] = [];
let candidates: Restaurant[] = [];
let sort: Sort | undefined;
let votes: Record<string, number> = {};
let selectedId: string | null = null;
let spinning = false;

function updateCandidates(): void {
    candidates = sort ? sortRestaurants(recommendationOrder, sort) : recommendationOrder;
}

app.addEventListener("toolinput", ({ arguments: input }) => {
    const requestedSort = input?.sort;
    sort = requestedSort === "price" || requestedSort === "walk" ? requestedSort : undefined;
    updateCandidates();
    render();
});

app.addEventListener("toolresult", ({ structuredContent }) => {
    const result = (structuredContent ?? {}) as LunchResult;
    if (result.candidates) {
        recommendationOrder = result.candidates;
        updateCandidates();
    }
    votes = result.votes ?? votes;
    render();
});

function card(restaurant: Restaurant): string {
    return `
      <li class="card${restaurant.id === selectedId ? " selected" : ""}" data-id="${restaurant.id}">
        <div class="card-heading">
          <span class="emoji" aria-hidden="true">${restaurant.emoji}</span>
          <div class="details">
            <strong class="name">${restaurant.name}</strong>
            <span class="meta">${restaurant.category} · 도보 ${restaurant.walkMinutes}분</span>
          </div>
        </div>
        <strong class="price">${restaurant.price.toLocaleString("ko-KR")}원</strong>
        <button type="button" class="vote" data-id="${restaurant.id}">👍 ${votes[restaurant.id] ?? 0}</button>
      </li>`;
}

function render(): void {
    const selected = candidates.find((c) => c.id === selectedId);
    root.innerHTML = `
      <header class="widget-header">
        <h1>오늘의 점심 후보</h1>
        <div class="sort-controls" role="group" aria-label="후보 정렬">
          <button type="button" class="sort-option${sort === "price" ? " active" : ""}" data-sort="price" aria-pressed="${sort === "price"}" ${candidates.length === 0 ? "disabled" : ""}>가격순</button>
          <button type="button" class="sort-option${sort === "walk" ? " active" : ""}" data-sort="walk" aria-pressed="${sort === "walk"}" ${candidates.length === 0 ? "disabled" : ""}>도보순</button>
        </div>
        <button type="button" class="spin" ${candidates.length === 0 || spinning ? "disabled" : ""}>🎲 룰렛 돌리기</button>
      </header>
      ${candidates.length === 0
        ? `<p class="empty">조건에 맞는 식당이 없어요. 예산이나 거리를 늘려 보세요.</p>`
        : `<ul class="cards">${candidates.map(card).join("")}</ul>`}
      <footer class="widget-footer">
        <span>${selected ? `🎉 오늘은 <b>${selected.name}</b>!` : "룰렛을 돌리거나 마음에 드는 곳에 투표하세요."}</span>
        <button type="button" class="share" ${selected ? "" : "disabled"}>팀에 공유</button>
      </footer>`;
    root.querySelectorAll<HTMLButtonElement>(".sort-option").forEach((button) => button.addEventListener("click", () => {
        const nextSort = button.dataset.sort === "price" ? "price" : "walk";
        sort = nextSort;
        updateCandidates();
        render();
    }));
    root.querySelector(".spin")?.addEventListener("click", spin);
    root.querySelector(".share")?.addEventListener("click", share);
    root.querySelectorAll<HTMLButtonElement>(".vote").forEach((button) => button.addEventListener("click", () => vote(button.dataset.id!)));
}

/** 카드를 차례로 강조하다가 하나에 멈춘다. */
function spin(): void {
    spinning = true;
    const target = Math.floor(Math.random() * candidates.length);
    const steps = candidates.length * 3 + target;
    let step = 0;
    const timer = setInterval(() => {
        selectedId = candidates[step % candidates.length].id;
        render();
        if (++step > steps) {
            clearInterval(timer);
            spinning = false;
            render();
        }
    }, 90);
}

async function vote(restaurantId: string): Promise<void> {
    const result = await app.callServerTool({ name: "vote_lunch", arguments: { restaurantId, voter: "나" } });
    votes = (result.structuredContent as LunchResult | undefined)?.votes ?? votes;
    render();
}

async function share(): Promise<void> {
    const selected = candidates.find((c) => c.id === selectedId);
    if (!selected) return;
    await app.sendMessage({ role: "user", content: [{ type: "text", text: `오늘 점심은 ${selected.name}(으)로 정했어요! 팀원들에게 공지 문구를 써 줘.` }] });
}

render();
await app.connect();
