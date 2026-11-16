export type BalancePlayer = {
  id: string;
  position: string;
  technicalLevel: number;
};

function evaluate<T extends BalancePlayer>(teamOne: T[], teamTwo: T[]): number {
  const counts = (team: T[]) => {
    const map = new Map<string, number>();
    for (const player of team) map.set(player.position, (map.get(player.position) ?? 0) + 1);
    return map;
  };
  const one = counts(teamOne), two = counts(teamTwo);
  const allPositions = new Set([...one.keys(), ...two.keys()]);
  const positionalPenalty = [...allPositions].reduce((sum, pos) => {
    const difference = Math.abs((one.get(pos) ?? 0) - (two.get(pos) ?? 0));
    return sum + difference * difference * (pos === "goalkeeper" ? 18 : 7);
  }, 0);
  const skillOne = teamOne.reduce((sum, p) => sum + p.technicalLevel, 0);
  const skillTwo = teamTwo.reduce((sum, p) => sum + p.technicalLevel, 0);
  const sizePenalty = Math.pow(teamOne.length - teamTwo.length, 2) * 120;
  return sizePenalty + positionalPenalty + Math.pow(skillOne - skillTwo, 2) * 3;
}

/** Find an allocation balancing player count, goalkeeper coverage, positions and ability.
 * Stable bounded search for larger rosters; exhaustive for typical futsal groups.
 */
export function balanceGameTeams<T extends BalancePlayer>(players: T[]): { one: T[]; two: T[] } {
  if (players.length < 2) throw new Error("É necessário ter pelo menos dois jogadores.");
  const countOne = Math.ceil(players.length / 2);
  const countTwo = Math.floor(players.length / 2);
  const ordered = [...players].sort((a, b) => a.id.localeCompare(b.id));
  let bestScore = Infinity;
  let bestOne: T[] = [];
  let bestTwo: T[] = [];

  const tryTeam = (one: T[], two: T[]) => {
    const score = evaluate(one, two);
    if (score < bestScore) {
      bestScore = score;
      bestOne = [...one];
      bestTwo = [...two];
    }
  };

  if (ordered.length <= 20) {
    // Anchor the first player to avoid evaluating symmetric assignments twice.
    const visit = (index: number, one: T[], two: T[]) => {
      if (one.length > countOne || two.length > countTwo) return;
      if (index === ordered.length) {
        if (one.length === countOne && two.length === countTwo) tryTeam(one, two);
        return;
      }
      one.push(ordered[index]); visit(index + 1, one, two); one.pop();
      two.push(ordered[index]); visit(index + 1, one, two); two.pop();
    };
    visit(1, [ordered[0]], []);
  } else {
    // For unusually large groups, use deterministic local improvements without exponential cost.
    const one = ordered.filter((_, i) => i % 2 === 0);
    const two = ordered.filter((_, i) => i % 2 === 1);
    let improved = true;
    while (improved) {
      improved = false;
      let current = evaluate(one, two);
      for (let i = 0; i < one.length && !improved; i++) {
        for (let j = 0; j < two.length; j++) {
          [one[i], two[j]] = [two[j], one[i]];
          const score = evaluate(one, two);
          if (score < current) { current = score; improved = true; break; }
          [one[i], two[j]] = [two[j], one[i]];
        }
      }
    }
    tryTeam(one, two);
  }
  return { one: bestOne, two: bestTwo };
}
