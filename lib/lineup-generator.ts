export type PlayerMatchStatInput = {
  matchDate?: string | null;
  goals: number;
  assists: number;
  distance: number;
  saves: number;
};

export type LineupGeneratorPlayerInput = {
  userId: number;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  matches: PlayerMatchStatInput[];
};

export type GeneratedPlayerProfile = {
  userId: number;
  firstName: string;
  lastName: string;
  zawodnik: string;
  profilePhotoPath: string | null;
  displayName: string;
  initials: string;
  sampleMatches: number;
  confidence: number;
  weightedGoalsPerMatch: number;
  weightedAssistsPerMatch: number;
  weightedDistancePerMatch: number;
  weightedSavesPerMatch: number;
  attackScore: number;
  creationScore: number;
  engineScore: number;
  defenseScore: number;
  overallMMR: number;
  selectionScore: number;
  archetype: "finisher" | "creator" | "engine" | "anchor" | "balanced";
};

export type GeneratedTeamSummary = {
  avgMMR: number;
  attack: number;
  creation: number;
  engine: number;
  defense: number;
  avgConfidence: number;
  topTierShare: number;
  archetypes: string[];
};

export type GeneratedLineupProposal = {
  home: (number | null)[];
  away: (number | null)[];
  bench: number[];
  players: Array<{
    userId: number;
    displayName: string;
    firstName: string;
    lastName: string;
    zawodnik: string;
    initials: string;
    profilePhotoPath: string | null;
  }>;
  profiles: GeneratedPlayerProfile[];
  diagnostics: {
    balanceScore: number;
    summary: string;
    home: GeneratedTeamSummary;
    away: GeneratedTeamSummary;
    mmrGap: number;
  };
};

type RosterRole = "attack" | "mid" | "support" | "defense";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function variance(values: number[]): number {
  if (values.length <= 1) return 0;
  const mean = avg(values);
  return avg(values.map((value) => (value - mean) ** 2));
}

function relativeScore(value: number, baseline: number, confidence: number, epsilon = 0.15): number {
  const ratio = (value + epsilon) / (baseline + epsilon);
  return 1 + (ratio - 1) * clamp(confidence, 0, 1);
}

function initialsFor(firstName: string, lastName: string, zawodnik: string): string {
  const fn = firstName.trim();
  const ln = lastName.trim();
  let value = "";
  if (fn) value += fn[0];
  if (ln) value += ln[0];
  if (!value && zawodnik.trim()) value = zawodnik.trim().slice(0, 2);
  return value.toUpperCase() || "?";
}

function displayNameFor(firstName: string, lastName: string, zawodnik: string): string {
  const full = `${firstName} ${lastName}`.trim();
  return full || zawodnik.trim() || "Zawodnik";
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWindowed<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = 0; i < copy.length; i += 3) {
    const end = Math.min(copy.length, i + 3);
    for (let j = end - 1; j > i; j--) {
      const k = i + Math.floor(rng() * (j - i + 1));
      [copy[j], copy[k]] = [copy[k], copy[j]];
    }
  }
  return copy;
}

function roleTemplate(slotCount: number): RosterRole[] {
  const template6: RosterRole[] = ["attack", "mid", "mid", "mid", "defense", "defense"];
  const template7: RosterRole[] = ["attack", "mid", "mid", "mid", "support", "defense", "defense"];
  const template8: RosterRole[] = ["attack", "mid", "mid", "mid", "support", "defense", "defense", "defense"];
  if (slotCount >= 8) return template8;
  if (slotCount >= 7) return template7;
  return template6.slice(0, Math.max(0, slotCount));
}

function roleFit(role: RosterRole, player: GeneratedPlayerProfile): number {
  switch (role) {
    case "attack":
      return player.attackScore * 0.56 + player.creationScore * 0.22 + player.engineScore * 0.14 + player.defenseScore * 0.08;
    case "mid":
      return player.engineScore * 0.4 + player.creationScore * 0.3 + player.attackScore * 0.18 + player.defenseScore * 0.12;
    case "support":
      return player.creationScore * 0.34 + player.engineScore * 0.31 + player.attackScore * 0.17 + player.defenseScore * 0.18;
    case "defense":
      return player.defenseScore * 0.56 + player.engineScore * 0.22 + player.creationScore * 0.12 + player.attackScore * 0.1;
  }
}

function topTierShare(players: GeneratedPlayerProfile[]): number {
  return players
    .slice()
    .sort((a, b) => b.overallMMR - a.overallMMR)
    .slice(0, 2)
    .reduce((sum, player) => sum + player.overallMMR, 0);
}

function archetypePenalty(home: GeneratedPlayerProfile[], away: GeneratedPlayerProfile[]): number {
  const buckets = ["finisher", "creator", "engine", "anchor", "balanced"] as const;
  let penalty = 0;
  for (const key of buckets) {
    const homeCount = home.filter((player) => player.archetype === key).length;
    const awayCount = away.filter((player) => player.archetype === key).length;
    penalty += Math.abs(homeCount - awayCount) * 0.08;
  }
  return penalty;
}

function teamSummary(players: GeneratedPlayerProfile[]): GeneratedTeamSummary {
  if (players.length === 0) {
    return {
      avgMMR: 0,
      attack: 0,
      creation: 0,
      engine: 0,
      defense: 0,
      avgConfidence: 0,
      topTierShare: 0,
      archetypes: [],
    };
  }

  const attack = avg(players.map((player) => player.attackScore));
  const creation = avg(players.map((player) => player.creationScore));
  const engine = avg(players.map((player) => player.engineScore));
  const defense = avg(players.map((player) => player.defenseScore));

  return {
    avgMMR: avg(players.map((player) => player.overallMMR)),
    attack,
    creation,
    engine,
    defense,
    avgConfidence: avg(players.map((player) => player.confidence)),
    topTierShare: topTierShare(players),
    archetypes: [...new Set(players.map((player) => player.archetype))],
  };
}

function teamCost(home: GeneratedPlayerProfile[], away: GeneratedPlayerProfile[]): number {
  const homeSummary = teamSummary(home);
  const awaySummary = teamSummary(away);
  const mmrGap = Math.abs(homeSummary.avgMMR - awaySummary.avgMMR);
  const attackGap = Math.abs(homeSummary.attack - awaySummary.attack);
  const creationGap = Math.abs(homeSummary.creation - awaySummary.creation);
  const engineGap = Math.abs(homeSummary.engine - awaySummary.engine);
  const defenseGap = Math.abs(homeSummary.defense - awaySummary.defense);
  const confidenceGap = Math.abs(homeSummary.avgConfidence - awaySummary.avgConfidence);
  const starGap = Math.abs(homeSummary.topTierShare - awaySummary.topTierShare);

  return (
    mmrGap * 4 +
    attackGap * 2.6 +
    creationGap * 2.1 +
    engineGap * 1.7 +
    defenseGap * 2.4 +
    confidenceGap * 0.8 +
    starGap * 1.3 +
    archetypePenalty(home, away)
  );
}

function balanceScoreForCost(cost: number): number {
  return Math.round(clamp(100 - cost * 18, 1, 100));
}

function playerProfileNeedsPenalty(candidate: GeneratedPlayerProfile, ownTeam: GeneratedPlayerProfile[], otherTeam: GeneratedPlayerProfile[]): number {
  const sameArchetypeOwn = ownTeam.filter((player) => player.archetype === candidate.archetype).length;
  const sameArchetypeOther = otherTeam.filter((player) => player.archetype === candidate.archetype).length;
  const ownMmr = ownTeam.reduce((sum, player) => sum + player.overallMMR, 0);
  const otherMmr = otherTeam.reduce((sum, player) => sum + player.overallMMR, 0);
  return sameArchetypeOwn * 0.06 + Math.max(0, ownMmr - otherMmr) * 0.08 + Math.max(0, sameArchetypeOwn - sameArchetypeOther) * 0.05;
}

function seedTeams(
  players: GeneratedPlayerProfile[],
  homeSlotCount: number,
  awaySlotCount: number,
  rng: () => number
): { home: GeneratedPlayerProfile[]; away: GeneratedPlayerProfile[] } {
  const ordered = shuffleWindowed(
    [...players].sort((a, b) => b.selectionScore - a.selectionScore || a.userId - b.userId),
    rng
  );

  const home: GeneratedPlayerProfile[] = [];
  const away: GeneratedPlayerProfile[] = [];

  for (const player of ordered) {
    const canHome = home.length < homeSlotCount;
    const canAway = away.length < awaySlotCount;
    if (canHome && !canAway) {
      home.push(player);
      continue;
    }
    if (canAway && !canHome) {
      away.push(player);
      continue;
    }
    if (!canHome && !canAway) break;

    const homePenalty = playerProfileNeedsPenalty(player, home, away) + (rng() - 0.5) * 0.03;
    const awayPenalty = playerProfileNeedsPenalty(player, away, home) + (rng() - 0.5) * 0.03;
    if (homePenalty <= awayPenalty) home.push(player);
    else away.push(player);
  }

  return { home, away };
}

function optimizeTeams(
  homeSeed: GeneratedPlayerProfile[],
  awaySeed: GeneratedPlayerProfile[]
): { home: GeneratedPlayerProfile[]; away: GeneratedPlayerProfile[]; cost: number } {
  let home = [...homeSeed];
  let away = [...awaySeed];
  let bestCost = teamCost(home, away);
  let improved = true;

  while (improved) {
    improved = false;
    for (let i = 0; i < home.length; i++) {
      for (let j = 0; j < away.length; j++) {
        const nextHome = [...home];
        const nextAway = [...away];
        [nextHome[i], nextAway[j]] = [nextAway[j], nextHome[i]];
        const nextCost = teamCost(nextHome, nextAway);
        if (nextCost + 0.0001 < bestCost) {
          home = nextHome;
          away = nextAway;
          bestCost = nextCost;
          improved = true;
        }
      }
    }
  }

  return { home, away, cost: bestCost };
}

function chooseArchetype(scores: {
  attack: number;
  creation: number;
  engine: number;
  defense: number;
}): GeneratedPlayerProfile["archetype"] {
  const ranked = [
    { key: "finisher" as const, value: scores.attack },
    { key: "creator" as const, value: scores.creation },
    { key: "engine" as const, value: scores.engine },
    { key: "anchor" as const, value: scores.defense },
  ].sort((a, b) => b.value - a.value);

  if (ranked[0].value - ranked[1].value < 0.08) return "balanced";
  return ranked[0].key;
}

export function buildLineupPlayerProfiles(players: LineupGeneratorPlayerInput[]): GeneratedPlayerProfile[] {
  const raw = players.map((player) => {
    const matches = [...player.matches].sort((a, b) => String(b.matchDate ?? "").localeCompare(String(a.matchDate ?? "")));
    const weights = matches.map((_, index) => Math.pow(0.88, index));
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const weightedGoalsPerMatch = matches.reduce((sum, match, index) => sum + match.goals * weights[index], 0) / totalWeight;
    const weightedAssistsPerMatch = matches.reduce((sum, match, index) => sum + match.assists * weights[index], 0) / totalWeight;
    const weightedDistancePerMatch = matches.reduce((sum, match, index) => sum + match.distance * weights[index], 0) / totalWeight;
    const weightedSavesPerMatch = matches.reduce((sum, match, index) => sum + match.saves * weights[index], 0) / totalWeight;
    const impactSamples = matches.map((match) => match.goals * 1.5 + match.assists * 1.1 + match.distance * 0.35 + match.saves * 1.25);
    const confidence = clamp(matches.length / 8, 0, 1);
    const consistencyScore = clamp(1 - variance(impactSamples) / Math.max(avg(impactSamples), 1.2), 0, 1);

    return {
      player,
      sampleMatches: matches.length,
      confidence,
      consistencyScore,
      weightedGoalsPerMatch,
      weightedAssistsPerMatch,
      weightedDistancePerMatch,
      weightedSavesPerMatch,
      attackRaw: weightedGoalsPerMatch * 1.35 + weightedAssistsPerMatch * 0.42,
      creationRaw: weightedAssistsPerMatch * 1.4 + weightedGoalsPerMatch * 0.2 + weightedDistancePerMatch * 0.08,
      engineRaw: weightedDistancePerMatch * 1.05 + (weightedGoalsPerMatch + weightedAssistsPerMatch) * 0.18,
      defenseRaw: weightedSavesPerMatch * 1.5 + weightedDistancePerMatch * 0.12 + weightedAssistsPerMatch * 0.08,
    };
  });

  const baselineAttack = Math.max(avg(raw.map((item) => item.attackRaw)), 0.35);
  const baselineCreation = Math.max(avg(raw.map((item) => item.creationRaw)), 0.28);
  const baselineEngine = Math.max(avg(raw.map((item) => item.engineRaw)), 0.55);
  const baselineDefense = Math.max(avg(raw.map((item) => item.defenseRaw)), 0.25);

  return raw.map((item) => {
    const attackScore = relativeScore(item.attackRaw, baselineAttack, item.confidence);
    const creationScore = relativeScore(item.creationRaw, baselineCreation, item.confidence);
    const engineScore = relativeScore(item.engineRaw, baselineEngine, item.confidence);
    const defenseScore = relativeScore(item.defenseRaw, baselineDefense, item.confidence);
    const stabilityBoost = item.consistencyScore * item.confidence * 0.08;
    const overallMMR =
      attackScore * 0.31 +
      creationScore * 0.22 +
      engineScore * 0.2 +
      defenseScore * 0.27 +
      stabilityBoost;
    const selectionScore = overallMMR + item.confidence * 0.05;
    const archetype = chooseArchetype({
      attack: attackScore,
      creation: creationScore,
      engine: engineScore,
      defense: defenseScore,
    });

    return {
      userId: item.player.userId,
      firstName: item.player.firstName,
      lastName: item.player.lastName,
      zawodnik: item.player.zawodnik,
      profilePhotoPath: item.player.profilePhotoPath,
      displayName: displayNameFor(item.player.firstName, item.player.lastName, item.player.zawodnik),
      initials: initialsFor(item.player.firstName, item.player.lastName, item.player.zawodnik),
      sampleMatches: item.sampleMatches,
      confidence: round2(item.confidence),
      weightedGoalsPerMatch: round2(item.weightedGoalsPerMatch),
      weightedAssistsPerMatch: round2(item.weightedAssistsPerMatch),
      weightedDistancePerMatch: round2(item.weightedDistancePerMatch),
      weightedSavesPerMatch: round2(item.weightedSavesPerMatch),
      attackScore: round2(attackScore),
      creationScore: round2(creationScore),
      engineScore: round2(engineScore),
      defenseScore: round2(defenseScore),
      overallMMR: round2(overallMMR),
      selectionScore: round2(selectionScore),
      archetype,
    };
  });
}

function assignPlayersToSlots(players: GeneratedPlayerProfile[], slotCount: number): (number | null)[] {
  const remaining = [...players];
  const slots: (number | null)[] = Array(slotCount).fill(null);
  const template = roleTemplate(slotCount);

  for (let index = 0; index < template.length; index++) {
    const role = template[index];
    if (remaining.length === 0) break;
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i]!;
      const score = roleFit(role, candidate) + candidate.overallMMR * 0.12;
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const [picked] = remaining.splice(bestIdx, 1);
    slots[index] = picked?.userId ?? null;
  }

  return slots;
}

export function generateBalancedLineupProposal(args: {
  players: LineupGeneratorPlayerInput[];
  pitchSlotTotal: number;
  homeSlotCount: number;
  awaySlotCount: number;
  seed?: number;
  attempts?: number;
}): GeneratedLineupProposal {
  const profiles = buildLineupPlayerProfiles(args.players);
  const orderedBySelection = [...profiles].sort(
    (a, b) => b.selectionScore - a.selectionScore || b.confidence - a.confidence || a.userId - b.userId
  );
  const onPitch = orderedBySelection.slice(0, args.pitchSlotTotal);
  const bench = orderedBySelection.slice(args.pitchSlotTotal).map((player) => player.userId);

  const baseSeed = args.seed ?? Date.now();
  const attempts = Math.max(args.attempts ?? onPitch.length * 90, 160);

  let bestHome = onPitch.slice(0, args.homeSlotCount);
  let bestAway = onPitch.slice(args.homeSlotCount, args.homeSlotCount + args.awaySlotCount);
  let bestCost = teamCost(bestHome, bestAway);

  for (let attempt = 0; attempt < attempts; attempt++) {
    const rng = mulberry32(baseSeed + attempt * 97 + onPitch.length * 17);
    const seed = seedTeams(onPitch, args.homeSlotCount, args.awaySlotCount, rng);
    const optimized = optimizeTeams(seed.home, seed.away);
    if (optimized.cost < bestCost) {
      bestCost = optimized.cost;
      bestHome = optimized.home;
      bestAway = optimized.away;
    }
  }

  const home = assignPlayersToSlots(bestHome, args.homeSlotCount);
  const away = assignPlayersToSlots(bestAway, args.awaySlotCount);
  const homeSummary = teamSummary(bestHome);
  const awaySummary = teamSummary(bestAway);
  const balanceScore = balanceScoreForCost(bestCost);
  const mmrGap = round2(Math.abs(homeSummary.avgMMR - awaySummary.avgMMR));

  return {
    home,
    away,
    bench,
    players: orderedBySelection.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      firstName: player.firstName,
      lastName: player.lastName,
      zawodnik: player.zawodnik,
      initials: player.initials,
      profilePhotoPath: player.profilePhotoPath,
    })),
    profiles: orderedBySelection,
    diagnostics: {
      balanceScore,
      summary: `Balans ${balanceScore}% · roznica MMR ${mmrGap} · atak ${round2(
        Math.abs(homeSummary.attack - awaySummary.attack)
      )} · kreatywnosc ${round2(Math.abs(homeSummary.creation - awaySummary.creation))} · defensywa ${round2(
        Math.abs(homeSummary.defense - awaySummary.defense)
      )}`,
      home: {
        avgMMR: round2(homeSummary.avgMMR),
        attack: round2(homeSummary.attack),
        creation: round2(homeSummary.creation),
        engine: round2(homeSummary.engine),
        defense: round2(homeSummary.defense),
        avgConfidence: round2(homeSummary.avgConfidence),
        topTierShare: round2(homeSummary.topTierShare),
        archetypes: homeSummary.archetypes,
      },
      away: {
        avgMMR: round2(awaySummary.avgMMR),
        attack: round2(awaySummary.attack),
        creation: round2(awaySummary.creation),
        engine: round2(awaySummary.engine),
        defense: round2(awaySummary.defense),
        avgConfidence: round2(awaySummary.avgConfidence),
        topTierShare: round2(awaySummary.topTierShare),
        archetypes: awaySummary.archetypes,
      },
      mmrGap,
    },
  };
}
