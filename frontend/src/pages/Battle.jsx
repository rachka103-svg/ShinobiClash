import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Bot, Gauge, Settings } from "lucide-react";
import BattleFighter from "@/components/BattleFighter";
import BattleCommandPanel from "@/components/BattleCommandPanel";
import { BattleTurnOrder, BattleInfoPanel } from "@/components/BattleSidePanels";
import BattlefieldEnv from "@/components/cinematic/BattlefieldEnv";
import BattleEntry from "@/components/cinematic/BattleEntry";
import BattleAttackFx from "@/components/cinematic/BattleAttackFx";
import BattleUltimate from "@/components/cinematic/BattleUltimate";
import BattleVictory from "@/components/cinematic/BattleVictory";
import { useAuth } from "@/context/AuthContext";
import { useGame } from "@/context/GameContext";
import { useAudio } from "@/context/AudioContext";

import {
  buildCombatant,
  buildOrder,
  resolveDamage,
  resolveOnHitEffects,
  resolveDeath,
  resolveCounterattack,
  resolveOnKillEffects,
  applyDamage as applyCombatDamage,
  checkLowHpPassives,
  tickStatuses,
  applyBattleStartPassives,
  checkBossPhaseTransitions,
  makeEvent,
  spireEnemies,
  isStunned,
} from "@/lib/battle";

import api from "@/lib/api";

let _uid = 0;

const nextUid = () => `c${_uid++}`;

const cloneArr = (arr) =>
  arr.map((c) => ({
    ...c,
    statuses: (c.statuses || []).map((s) => ({ ...s })),
  }));

/**
 * Shared AI decision making.
 *
 * Used by:
 * - Enemy AI
 * - Player Auto Battle
 *
 * Priority:
 * 1. Heal badly wounded allies
 * 2. Use AoE when multiple enemies exist
 * 3. Use strongest affordable single-target attack
 * 4. Focus lowest HP enemy
 */
function pickAiAction(actor, arr) {
  const enemies = arr.filter(
    (c) => c.side !== actor.side && c.alive
  );

  const allies = arr.filter(
    (c) => c.side === actor.side && c.alive
  );

  const affordable = actor.jutsus.filter(
    (j) =>
      j.type !== "passive" &&
      j.chakra_cost <= actor.chakra
  );

  const healJ = affordable
    .filter((j) => j.type === "heal")
    .sort((a, b) => b.power - a.power)[0];

  const woundedAlly = [...allies]
    .filter((a) => a.hp / a.maxHp < 0.45)
    .sort(
      (a, b) =>
        a.hp / a.maxHp -
        b.hp / b.maxHp
    )[0];

  let jutsu;
  let targetUid = null;

  // Heal priority
  if (healJ && woundedAlly) {
    jutsu = healJ;
    targetUid = woundedAlly.uid;

    return {
      jutsu,
      targetUid,
    };
  }

  const offensive = affordable.filter(
    (j) =>
      j.type === "attack" ||
      j.type === "aoe"
  );

  const aoe = offensive
    .filter((j) => j.type === "aoe")
    .sort((a, b) => b.power - a.power)[0];

  if (
    aoe &&
    enemies.length >= 2 &&
    Math.random() < 0.6
  ) {
    return {
      jutsu: aoe,
      targetUid: null,
    };
  }

  const attacks = offensive
    .filter((j) => j.type === "attack")
    .sort((a, b) => b.power - a.power);

  jutsu =
    attacks[0] ||
    actor.jutsus.find(
      (j) => j.type !== "passive"
    );

  const target = [...enemies].sort(
    (a, b) => a.hp - b.hp
  )[0];

  targetUid = target?.uid || null;

  return {
    jutsu,
    targetUid,
  };
}

export default function Battle() {
  const { mode = "campaign", id } = useParams();

  const navigate = useNavigate();

  const { user, setUser } = useAuth();

  const {
    catalogById,
    advantage,
    stages,
    trials,
    catalog,
    bossMechanics,
  } = useGame();

  const { playSfx } = useAudio();

  // --------------------------------------------------
  // Arena battle data
  // --------------------------------------------------

  const arenaOpponent =
    mode === "arena"
      ? JSON.parse(
          sessionStorage.getItem(
            "arena_opponent"
          ) || "null"
        )
      : null;

  // --------------------------------------------------
  // Tsukuyomi battle data
  // --------------------------------------------------

  const tsukuFight =
    mode === "tsukuyomi"
      ? JSON.parse(
          sessionStorage.getItem(
            "tsukuyomi_fight"
          ) || "null"
        )
      : null;

  // --------------------------------------------------
  // Resolve battle definition
  // --------------------------------------------------

  const floor =
    mode === "spire"
      ? parseInt(id, 10)
      : null;

  const stage =
    mode === "campaign"
      ? stages.find((s) => s.id === id)
      : null;

  const trial =
    mode === "trial"
      ? trials.find((t) => t.id === id)
      : null;

  const enemiesDef =
    mode === "spire"
      ? catalog.length
        ? spireEnemies(
            floor,
            catalog
          )
        : []

      : mode === "trial"
        ? trial?.enemies || []

        : mode === "arena"
          ? arenaOpponent?.team || []

          : mode === "tsukuyomi"
            ? tsukuFight?.enemies || []

            : stage?.enemies || [];

  const title =
    mode === "spire"
      ? `SPIRE · FLOOR ${floor}`

      : mode === "trial"
        ? trial?.name || "TRIAL"

        : mode === "arena"
          ? `ARENA · vs ${
              arenaOpponent?.name ||
              "???"
            }`

          : mode === "tsukuyomi"
            ? tsukuFight?.boss?.name ||
              "TSUKUYOMI"

            : stage?.name || "BATTLE";

  const ready =
    mode === "spire"
      ? !!floor && catalog.length > 0

      : mode === "trial"
        ? !!trial

        : mode === "arena"
          ? !!arenaOpponent &&
            Object.keys(catalogById).length > 0

          : mode === "tsukuyomi"
            ? !!tsukuFight &&
              Object.keys(catalogById).length > 0

            : !!stage;

  const backTo =
    mode === "campaign"
      ? "/campaign"

      : mode === "arena"
        ? "/arena"

        : mode === "tsukuyomi"
          ? "/tsukuyomi"

          : mode === "trial"
            ? "/dungeons"

            : "/spire";

  // --------------------------------------------------
  // State
  // --------------------------------------------------

  const [combs, setCombsState] =
    useState([]);

  const [activeUid, setActiveUid] =
    useState(null);

  const [phase, setPhase] =
    useState("intro");

  const [targeting, setTargeting] =
    useState(null);

  const [log, setLog] =
    useState([]);

  const [round, setRound] =
    useState(1);

  const [floaters, setFloaters] =
    useState([]);

  const [resultData, setResultData] =
    useState(null);

  const [shakeUid, setShakeUid] =
    useState(null);

  const [events, setEvents] =
    useState([]);

  const [auto, setAutoState] =
    useState(() => {
      try {
        return (
          localStorage.getItem(
            "sc_battle_auto"
          ) === "1"
        );
      } catch {
        return false;
      }
    });

  const [speed, setSpeedState] =
    useState(() => {
      try {
        return (
          Number(
            localStorage.getItem(
              "sc_battle_speed"
            )
          ) || 1
        );
      } catch {
        return 1;
      }
    });

  // --------------------------------------------------
  // Cinematic state
  // --------------------------------------------------

  const [cinematicAction, setCinematicAction] =
    useState(null);

  const [ultimateData, setUltimateData] =
    useState(null);

  const [screenShake, setScreenShake] =
    useState(false);

  const actionCounterRef =
    useRef(0);

  // --------------------------------------------------
  // Refs
  // --------------------------------------------------

  const combRef =
    useRef([]);

  const orderRef =
    useRef([]);

  const ptrRef =
    useRef(0);

  const reportedRef =
    useRef(false);

  const actionLockRef =
    useRef(false);

  const autoRef =
    useRef(false);

  const speedRef =
    useRef(1);

  useEffect(() => {
    autoRef.current = auto;
    speedRef.current = speed;
  }, []);

  // --------------------------------------------------
  // Helpers
  // --------------------------------------------------

  const setCombs = (next) => {
    combRef.current = next;
    setCombsState(next);
  };

  const pushLog = (msg) => {
    setLog((l) =>
      [msg, ...l].slice(0, 30)
    );
  };

  const pushEvents = (evs) => {
    if (!evs?.length) return;

    setEvents((e) =>
      [...e, ...evs].slice(-80)
    );
  };

  const ms = useCallback(
    (base) =>
      Math.max(
        60,
        Math.round(
          base /
            speedRef.current
        )
      ),
    []
  );

  const setAuto = (value) => {
    autoRef.current = value;

    setAutoState(value);

    try {
      localStorage.setItem(
        "sc_battle_auto",
        value ? "1" : "0"
      );
    } catch {
      // Ignore storage errors
    }
  };

  const cycleSpeed = () => {
    const next =
      speed >= 3
        ? 1
        : speed + 1;

    speedRef.current = next;

    setSpeedState(next);

    try {
      localStorage.setItem(
        "sc_battle_speed",
        String(next)
      );
    } catch {
      // Ignore storage errors
    }
  };

  const aliveSide = (
    arr,
    side
  ) =>
    arr.some(
      (c) =>
        c.side === side &&
        c.alive
    );

  // ==================================================
  // INITIALIZE BATTLE
  // ==================================================

  useEffect(() => {
    if (
      !ready ||
      !user ||
      Object.keys(catalogById).length === 0
    ) {
      return;
    }

    reportedRef.current = false;

    const allies = (
      user.team || []
    )
      .map((tid) =>
        user.ninjas.find(
          (n) =>
            n.instance_id === tid
        )
      )
      .filter(Boolean)
      .map((inst) =>
        buildCombatant(
          nextUid(),
          "ally",
          catalogById[
            inst.template_id
          ],
          inst.level,
          inst.ascension || 0,
          inst.instance_id,
          inst.stats || null,
          inst.skill_rank || 1,
          !inst.passive_locked,
          inst.reforge || null
        )
      );

    const enemies =
      enemiesDef.map((e) =>
        buildCombatant(
          nextUid(),
          "enemy",
          catalogById[
            e.template_id
          ],
          e.level,
          e.ascension || 0
        )
      );

    // Campaign boss mechanics
    if (
      mode === "campaign" &&
      stage?.is_boss &&
      stage?.boss_mechanic &&
      enemies[0]
    ) {
      enemies[0].bossMechanicId =
        stage.boss_mechanic;

      enemies[0].bossPhaseIndex =
        -1;
    }

    // Tsukuyomi mechanics
    if (
      mode === "tsukuyomi" &&
      tsukuFight?.boss
        ?.boss_mechanic &&
      enemies[0]
    ) {
      enemies[0].bossMechanicId =
        tsukuFight.boss
          .boss_mechanic;

      enemies[0].bossPhaseIndex =
        -1;
    }

    const all = [
      ...allies,
      ...enemies,
    ];

    // Battle-start passives
    const startEvents =
      applyBattleStartPassives(
        all
      );

    if (startEvents.length) {
      pushEvents(startEvents);

      startEvents.forEach((e) => {
        if (e.text) {
          pushLog(e.text);
        }
      });
    }

    setCombs(all);

    const initialOrder =
      buildOrder(all);

    orderRef.current =
      initialOrder;

    ptrRef.current = 0;

    setRound(1);

    setPhase("intro");

    const timer = setTimeout(
      () =>
        beginTurnAt(
          0,
          all,
          initialOrder
        ),
      ms(900)
    );

    return () =>
      clearTimeout(timer);
  }, [
    mode,
    id,
    catalogById,
    ready,
  ]);

  // ==================================================
  // TURN SYSTEM
  // ==================================================

  const beginTurnAt =
    useCallback(
      (
        ptr,
        arr,
        order
      ) => {
        if (
          !aliveSide(
            arr,
            "ally"
          )
        ) {
          setPhase("lose");
          return;
        }

        if (
          !aliveSide(
            arr,
            "enemy"
          )
        ) {
          setPhase("win");
          return;
        }

        const work =
          cloneArr(arr);

        let p = ptr;

        let ord = order;

        // Skip dead combatants
        while (
          p < ord.length &&
          !work.find(
            (c) =>
              c.uid ===
              ord[p]
          )?.alive
        ) {
          p++;
        }

        // New round
        if (
          p >= ord.length
        ) {
          ord =
            buildOrder(work);

          p = 0;

          setRound(
            (r) => r + 1
          );
        }

        orderRef.current =
          ord;

        ptrRef.current = p;

        const actor =
          work.find(
            (c) =>
              c.uid ===
              ord[p]
          );

        if (!actor) {
          setTimeout(
            () =>
              beginTurnAt(
                p + 1,
                work,
                ord
              ),
            ms(200)
          );

          return;
        }

        // ----------------------------------------------
        // Status ticks
        // ----------------------------------------------

        const evs = [];

        const {
          dmg: dotDmg,
        } = tickStatuses(actor);

        if (
          dotDmg > 0 &&
          actor.alive
        ) {
          actor.hp =
            Math.max(
              0,
              actor.hp -
                dotDmg
            );

          pushLog(
            `${actor.name} suffers ${dotDmg} from a lingering effect.`
          );

          evs.push(
            makeEvent(
              "DOT_TRIGGERED",
              {
                targetUid:
                  actor.uid,
                value:
                  dotDmg,
              }
            )
          );

          if (
            actor.hp === 0
          ) {
            const revived =
              resolveDeath(
                actor,
                evs
              );

            pushLog(
              revived
                ? `${actor.name} refuses to fall!`
                : `${actor.name} succumbs to the effect.`
            );
          }
        }

        pushEvents(evs);

        // ----------------------------------------------
        // Reset action lock
        // ----------------------------------------------

        actionLockRef.current =
          false;

        // Died to DoT
        if (!actor.alive) {
          setCombs(work);

          setTimeout(
            () =>
              beginTurnAt(
                p + 1,
                work,
                ord
              ),
            ms(300)
          );

          return;
        }

        // ----------------------------------------------
        // Chakra regeneration
        // ----------------------------------------------

        actor.chakra =
          Math.min(
            actor.maxChakra,
            actor.chakra + 20
          );

        // ----------------------------------------------
        // Stun / freeze
        // ----------------------------------------------

        if (
          isStunned(actor)
        ) {
          const stunStatus =
            actor.statuses.find(
              (s) =>
                (
                  s.effectType ===
                    "stun" ||
                  s.effectType ===
                    "freeze"
                ) &&
                (
                  s.duration ??
                  0
                ) > 0
            );

          if (stunStatus) {
            pushLog(
              `${actor.name} is ${
                stunStatus.effectType ===
                "freeze"
                  ? "frozen"
                  : "stunned"
              } and cannot act!`
            );
          }

          setCombs(work);

          setTimeout(
            () =>
              beginTurnAt(
                p + 1,
                work,
                ord
              ),
            ms(600)
          );

          return;
        }

        setCombs(work);

        setActiveUid(
          actor.uid
        );

        setTargeting(null);

        if (
          actor.side ===
          "ally"
        ) {
          setPhase("select");
        } else {
          setPhase("enemy");
        }
      },
      [ms]
    );

  const advance =
    useCallback(
      (arr) => {
        setTimeout(
          () =>
            beginTurnAt(
              ptrRef.current +
                1,
              arr,
              orderRef.current
            ),
          ms(400)
        );
      },
      [
        beginTurnAt,
        ms,
      ]
    );

  // ==================================================
  // APPLY ACTION
  // ==================================================

  const applyAction =
    useCallback(
      (
        actor,
        jutsu,
        targetUid
      ) => {
        actionLockRef.current =
          true;

        setPhase("busy");

        playSfx(
          jutsu.type ===
            "heal"
            ? "heal"
            : jutsu.type ===
                "shield"
              ? "shield"
              : "hit"
        );

        // ----------------------------------------------
        // Cinematic FX
        // ----------------------------------------------

        actionCounterRef.current +=
          1;

        const isUltimate =
          jutsu.chakra_cost >=
          70;

        setCinematicAction({
          key:
            actionCounterRef.current,
          jutsuName:
            jutsu.name,
          element:
            actor.element,
          isAoe:
            jutsu.type ===
            "aoe",
        });

        // ----------------------------------------------
        // Fresh battle state
        // ----------------------------------------------

        const arr =
          cloneArr(
            combRef.current
          );

        const act =
          arr.find(
            (c) =>
              c.uid ===
              actor.uid
          );

        if (!act || !act.alive) {
          advance(arr);
          return;
        }

        // ----------------------------------------------
        // Chakra
        // ----------------------------------------------

        act.chakra =
          Math.max(
            0,
            act.chakra -
              jutsu.chakra_cost +
              (
                jutsu.chakra_gain ||
                0
              )
          );

        act.chakra =
          Math.min(
            act.maxChakra,
            act.chakra
          );

        const newFloaters =
          [];

        const newEvents =
          [];

        const killedTargets =
          [];

        const addFloat = (
          uid,
          text,
          color
        ) => {
          newFloaters.push({
            id: `${Date.now()}-${uid}-${Math.random()}`,
            uid,
            text,
            color,
          });
        };

        // ==============================================
        // DAMAGE HELPER
        // ==============================================

        const dealDamage = (
          target,
          allowCounter = true
        ) => {
          if (
            !target ||
            !target.alive
          ) {
            return;
          }

          // --------------------------------------------
          // Calculate raw damage
          // --------------------------------------------

          const {
            dmg,
            crit,
            mult,
            notes,
          } =
            resolveDamage(
              act,
              target,
              jutsu,
              advantage
            );

          // --------------------------------------------
          // Apply damage through central battle engine
          // --------------------------------------------

          const damageResult =
            applyCombatDamage(
              target,
              dmg,
              newEvents
            );

          const actualDamage =
            damageResult?.damage ??
            damageResult?.hpDamage ??
            dmg;

          const shieldDamage =
            damageResult?.shieldDamage ??
            0;

          // --------------------------------------------
          // Boss shield break mechanic
          // --------------------------------------------

          if (
            target.bossMechanicId &&
            target.shieldPhaseActive &&
            jutsu.type === "aoe"
          ) {
            target.aoeHitsTaken =
              (
                target.aoeHitsTaken ||
                0
              ) + 1;

            if (
              target.aoeHitsTaken >=
                3 &&
              target.shield > 0
            ) {
              target.shield = 0;

              target.shieldBrokenPhase =
                target.bossPhaseIndex;

              target.shieldPhaseActive =
                false;

              newEvents.push(
                makeEvent(
                  "SHIELD_BROKEN",
                  {
                    targetUid:
                      target.uid,
                  }
                )
              );

              pushLog(
                `${target.name}'s shield shatters!`
              );
            }
          }

          // --------------------------------------------
          // Damage floater
          // --------------------------------------------

          const color =
            notes?.includes(
              "execute"
            )
              ? "#E040FB"
              : mult > 1
                ? "#FFCA28"
                : mult < 1
                  ? "#94A3B8"
                  : "#FF1744";

          const displayDamage =
            actualDamage > 0
              ? actualDamage
              : shieldDamage;

          if (
            displayDamage > 0
          ) {
            addFloat(
              target.uid,
              `${
                crit
                  ? "CRIT "
                  : ""
              }${
                notes?.includes(
                  "execute"
                )
                  ? "EXECUTE "
                  : ""
              }-${displayDamage}`,
              color
            );
          }

          // --------------------------------------------
          // Damage event
          // --------------------------------------------

          newEvents.push(
            makeEvent(
              crit
                ? "CRITICAL"
                : "DAMAGE",
              {
                actorUid:
                  act.uid,
                targetUid:
                  target.uid,
                value:
                  displayDamage,
              }
            )
          );

          setShakeUid(
            target.uid
          );

          setTimeout(
            () =>
              setShakeUid(
                null
              ),
            ms(300)
          );

          // --------------------------------------------
          // LOW HP PASSIVES
          // Example:
          // emergency shield
          // rage effects
          // threshold buffs
          // --------------------------------------------

          if (
            target.alive &&
            target.hp > 0
          ) {
            const lowHpEvents =
              checkLowHpPassives(
                target
              ) || [];

            if (
              lowHpEvents.length
            ) {
              newEvents.push(
                ...lowHpEvents
              );

              lowHpEvents.forEach(
                (event) => {
                  if (
                    event.text
                  ) {
                    pushLog(
                      event.text
                    );
                  }

                  if (
                    event.type ===
                    "SHIELD_APPLIED"
                  ) {
                    addFloat(
                      target.uid,
                      "EMERGENCY SHIELD!",
                      "#29B6F6"
                    );
                  }
                }
              );
            }
          }

          // --------------------------------------------
          // Death
          // --------------------------------------------

          if (
            target.hp === 0
          ) {
            const revived =
              resolveDeath(
                target,
                newEvents
              );

            if (revived) {
              addFloat(
                target.uid,
                "REVIVED!",
                "#FFD54F"
              );
            } else {
              killedTargets.push(
                target
              );
            }

            return;
          }

          // --------------------------------------------
          // On-hit effects
          // --------------------------------------------

          const {
            burstDamage,
            events:
              hitEvents,
          } =
            resolveOnHitEffects(
              act,
              target,
              jutsu
            );

          if (
            hitEvents?.length
          ) {
            newEvents.push(
              ...hitEvents
            );

            hitEvents.forEach(
              (event) => {
                if (
                  event.text
                ) {
                  pushLog(
                    event.text
                  );
                }
              }
            );
          }

          // --------------------------------------------
          // Burst damage
          // --------------------------------------------

          if (
            burstDamage > 0
          ) {
            const burstResult =
              applyCombatDamage(
                target,
                burstDamage,
                newEvents
              );

            const burstActual =
              burstResult?.damage ??
              burstResult?.hpDamage ??
              burstDamage;

            addFloat(
              target.uid,
              `MARK -${burstActual}`,
              "#E040FB"
            );

            if (
              target.hp === 0
            ) {
              const revived =
                resolveDeath(
                  target,
                  newEvents
                );

              if (revived) {
                addFloat(
                  target.uid,
                  "REVIVED!",
                  "#FFD54F"
                );
              } else {
                killedTargets.push(
                  target
                );
              }
            }
          }

          // --------------------------------------------
          // Counterattack
          // --------------------------------------------

          if (
            allowCounter &&
            target.alive &&
            act.alive
          ) {
            const counter =
              resolveCounterattack(
                target,
                act,
                advantage
              );

            if (
              counter
            ) {
              const counterDamage =
                counter.damage ??
                counter.dmg ??
                0;

              if (
                counterDamage > 0
              ) {
                applyCombatDamage(
                  act,
                  counterDamage,
                  newEvents
                );

                addFloat(
                  act.uid,
                  `COUNTER -${counterDamage}`,
                  "#FF9800"
                );

                newEvents.push(
                  makeEvent(
                    "COUNTERATTACK",
                    {
                      actorUid:
                        target.uid,
                      targetUid:
                        act.uid,
                      value:
                        counterDamage,
                    }
                  )
                );

                pushLog(
                  `${target.name} counterattacks!`
                );

                if (
                  act.hp === 0
                ) {
                  const revived =
                    resolveDeath(
                      act,
                      newEvents
                    );

                  if (
                    revived
                  ) {
                    addFloat(
                      act.uid,
                      "REVIVED!",
                      "#FFD54F"
                    );
                  }
                }
              }
            }
          }
        };

        // ==============================================
        // SINGLE TARGET ATTACK
        // ==============================================

        if (
          jutsu.type ===
          "attack"
        ) {
          const target =
            arr.find(
              (c) =>
                c.uid ===
                targetUid
            );

          if (
            target &&
            target.alive
          ) {
            newEvents.push(
              makeEvent(
                "ATTACK",
                {
                  actorUid:
                    act.uid,
                  targetUid:
                    target.uid,
                  jutsuId:
                    jutsu.id,
                }
              )
            );

            dealDamage(
              target
            );

            pushLog(
              `${act.name} used ${jutsu.name}.`
            );
          }
        }

        // ==============================================
        // AOE ATTACK
        // ==============================================

        else if (
          jutsu.type ===
          "aoe"
        ) {
          const targets =
            arr.filter(
              (c) =>
                c.side !==
                  act.side &&
                c.alive
            );

          newEvents.push(
            makeEvent(
              "SKILL",
              {
                actorUid:
                  act.uid,
                jutsuId:
                  jutsu.id,
              }
            )
          );

          targets.forEach(
            (target) =>
              dealDamage(
                target,
                false
              )
          );

          pushLog(
            `${act.name} unleashed ${jutsu.name}!`
          );
        }

        // ==============================================
        // HEAL
        // ==============================================

        else if (
          jutsu.type ===
          "heal"
        ) {
          const target =
            arr.find(
              (c) =>
                c.uid ===
                targetUid
            );

          if (
            target &&
            target.alive
          ) {
            const heal =
              Math.round(
                (
                  jutsu.power /
                  100
                ) *
                  act.atk +
                  jutsu.power
              );

            const oldHp =
              target.hp;

            target.hp =
              Math.min(
                target.maxHp,
                target.hp + heal
              );

            const actualHeal =
              target.hp -
              oldHp;

            addFloat(
              target.uid,
              `+${actualHeal}`,
              "#00E676"
            );

            newEvents.push(
              makeEvent(
                "HEAL",
                {
                  actorUid:
                    act.uid,
                  targetUid:
                    target.uid,
                  value:
                    actualHeal,
                }
              )
            );

            pushLog(
              `${act.name} healed ${target.name} with ${jutsu.name}.`
            );
          }
        }

        // ==============================================
        // SHIELD
        // ==============================================

        else if (
          jutsu.type ===
          "shield"
        ) {
          const target =
            arr.find(
              (c) =>
                c.uid ===
                targetUid
            );

          if (
            target &&
            target.alive
          ) {
            const shieldAmount =
              Math.round(
                act.def *
                  2.5 +
                  150
              );

            target.shield =
              (
                target.shield ||
                0
              ) +
              shieldAmount;

            addFloat(
              target.uid,
              "SHIELD",
              "#29B6F6"
            );

            newEvents.push(
              makeEvent(
                "SHIELD_APPLIED",
                {
                  actorUid:
                    act.uid,
                  targetUid:
                    target.uid,
                  value:
                    shieldAmount,
                }
              )
            );

            pushLog(
              `${act.name} shielded ${target.name}.`
            );
          }
        }

        // ==============================================
        // ON-KILL PASSIVES
        // ==============================================

        if (
          killedTargets.length &&
          act.alive
        ) {
          killedTargets.forEach(
            (deadTarget) => {
              const killEvents =
                resolveOnKillEffects(
                  act,
                  deadTarget
                ) || [];

              if (
                killEvents.length
              ) {
                newEvents.push(
                  ...killEvents
                );

                killEvents.forEach(
                  (event) => {
                    if (
                      event.text
                    ) {
                      pushLog(
                        event.text
                      );
                    }

                    if (
                      event.type ===
                      "HEAL"
                    ) {
                      const healValue =
                        event.value ||
                        event.amount ||
                        0;

                      if (
                        healValue >
                        0
                      ) {
                        addFloat(
                          act.uid,
                          `+${healValue}`,
                          "#00E676"
                        );
                      }
                    }
                  }
                );
              }
            }
          );
        }

        // ==============================================
        // BOSS PHASE TRANSITIONS
        // ==============================================

        const bossEvents =
          checkBossPhaseTransitions(
            arr,
            bossMechanics
          ) || [];

        bossEvents.forEach(
          (event) => {
            newEvents.push(
              event
            );

            if (
              event.text
            ) {
              pushLog(
                `${event.text}!`
              );
            }
          }
        );

        // ==============================================
        // FLOATERS
        // ==============================================

        setFloaters(
          (current) => [
            ...current,
            ...newFloaters,
          ]
        );

        newFloaters.forEach(
          (floater) => {
            setTimeout(
              () =>
                setFloaters(
                  (
                    current
                  ) =>
                    current.filter(
                      (x) =>
                        x.id !==
                        floater.id
                    )
                ),
              ms(750)
            );
          }
        );

        pushEvents(
          newEvents
        );

        setCombs(
          arr
        );

        // ==============================================
        // ULTIMATE CINEMATIC
        // ==============================================

        if (
          isUltimate
        ) {
          setUltimateData({
            key:
              actionCounterRef.current,
            actorName:
              actor.name,
            jutsuName:
              jutsu.name,
            element:
              actor.element,
            portrait:
              actor.portrait,
          });

          setTimeout(
            () =>
              advance(
                arr
              ),
            ms(1200)
          );
        } else {
          advance(arr);
        }
      },
      [
        advantage,
        advance,
        bossMechanics,
        ms,
        playSfx,
      ]
    );

  // ==================================================
  // ENEMY AI
  // ==================================================

  useEffect(() => {
    if (
      phase !==
      "enemy"
    ) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          const arr =
            combRef.current;

          const actor =
            arr.find(
              (c) =>
                c.uid ===
                activeUid
            );

          if (
            !actor ||
            !actor.alive
          ) {
            advance(arr);
            return;
          }

          if (
            actionLockRef.current
          ) {
            return;
          }

          const {
            jutsu,
            targetUid,
          } =
            pickAiAction(
              actor,
              arr
            );

          if (
            jutsu
          ) {
            applyAction(
              actor,
              jutsu,
              targetUid
            );
          } else {
            advance(arr);
          }
        },
        ms(550)
      );

    return () =>
      clearTimeout(timer);
  }, [
    phase,
    activeUid,
    applyAction,
    advance,
    ms,
  ]);

  // ==================================================
  // AUTO BATTLE
  // ==================================================

  useEffect(() => {
    if (
      phase !==
        "select" ||
      !auto
    ) {
      return;
    }

    const timer =
      setTimeout(
        () => {
          if (
            actionLockRef.current
          ) {
            return;
          }

          const arr =
            combRef.current;

          const actor =
            arr.find(
              (c) =>
                c.uid ===
                activeUid
            );

          if (
            !actor ||
            !actor.alive
          ) {
            return;
          }

          const {
            jutsu,
            targetUid,
          } =
            pickAiAction(
              actor,
              arr
            );

          if (
            jutsu
          ) {
            applyAction(
              actor,
              jutsu,
              targetUid
            );
          }
        },
        ms(450)
      );

    return () =>
      clearTimeout(timer);
  }, [
    phase,
    activeUid,
    auto,
    applyAction,
    ms,
  ]);

  // ==================================================
  // REPORT RESULT
  // ==================================================

  useEffect(() => {
    if (
      (
        phase === "win" ||
        phase === "lose"
      ) &&
      !reportedRef.current
    ) {
      reportedRef.current =
        true;

      playSfx(
        phase === "win"
          ? "win"
          : "lose"
      );

      pushEvents([
        makeEvent(
          phase === "win"
            ? "VICTORY"
            : "DEFEAT",
          {}
        ),
      ]);

      const allyCombs =
        combRef.current.filter(
          (c) =>
            c.side ===
            "ally"
        );

      const participants =
        allyCombs
          .map(
            (c) =>
              c.instanceId
          )
          .filter(Boolean);

      const survivors =
        allyCombs
          .filter(
            (c) =>
              c.alive
          )
          .map(
            (c) =>
              c.instanceId
          )
          .filter(Boolean);

      const result =
        phase === "win"
          ? "win"
          : "lose";

      const reqs = {
        campaign: [
          "/game/battle/complete",
          {
            stage_id: id,
            result,
            participants,
            survivors,
          },
        ],

        spire: [
          "/game/spire/complete",
          {
            floor,
            result,
            participants,
            survivors,
          },
        ],

        trial: [
          "/game/trial/complete",
          {
            trial_id: id,
            result,
            participants,
            survivors,
          },
        ],

        tsukuyomi: [
          "/game/tsukuyomi/complete",
          {
            boss_id:
              tsukuFight?.boss?.id,
            difficulty:
              tsukuFight?.difficulty,
            result,
            participants,
            survivors,
          },
        ],

        arena: [
          "/arena/battle/complete",
          {
            opponent_user_id:
              arenaOpponent?.user_id,
            result,
            participants,
            survivors,
          },
        ],
      };

      const [
        url,
        body,
      ] =
        reqs[mode] ||
        reqs.campaign;

      api
        .post(
          url,
          body
        )
        .then(
          ({
            data,
          }) => {
            if (
              data.profile
            ) {
              setUser(
                data.profile
              );
            }

            setResultData(
              data
            );
          }
        )
        .catch(
          () =>
            setResultData({
              result:
                phase,
            })
        );
    }
  }, [
    phase,
    playSfx,
    mode,
    id,
    floor,
    arenaOpponent,
    tsukuFight,
    setUser,
  ]);

  // ==================================================
  // PLAYER INPUT
  // ==================================================

  const onJutsuClick =
    (jutsu) => {
      if (
        actionLockRef.current ||
        phase !== "select" ||
        auto
      ) {
        return;
      }

      const actor =
        combRef.current.find(
          (c) =>
            c.uid ===
            activeUid
        );

      if (
        !actor ||
        jutsu.type ===
          "passive" ||
        jutsu.chakra_cost >
          actor.chakra
      ) {
        return;
      }

      if (
        jutsu.type ===
        "aoe"
      ) {
        applyAction(
          actor,
          jutsu,
          null
        );
      } else {
        setTargeting(
          jutsu
        );
      }
    };

  const onTargetClick =
    (target) => {
      if (
        actionLockRef.current ||
        phase !== "select" ||
        auto ||
        !targeting
      ) {
        return;
      }

      const valid =
        (
          targeting.type ===
            "heal" ||
          targeting.type ===
            "shield"
        )
          ? target.side ===
            "ally"
          : target.side ===
            "enemy";

      if (
        !valid ||
        !target.alive
      ) {
        return;
      }

      const actor =
        combRef.current.find(
          (c) =>
            c.uid ===
            activeUid
        );

      setTargeting(
        null
      );

      applyAction(
        actor,
        targeting,
        target.uid
      );
    };

  // ==================================================
  // NOT READY
  // ==================================================

  if (!ready) {
    return (
      <div className="p-10 text-center text-slate-400">
        Battle not found.
      </div>
    );
  }

  // ==================================================
  // DERIVED STATE
  // ==================================================

  const allies =
    combs.filter(
      (c) =>
        c.side ===
        "ally"
    );

  const enemies =
    combs.filter(
      (c) =>
        c.side ===
        "enemy"
    );

  const activeActor =
    combs.find(
      (c) =>
        c.uid ===
        activeUid
    );

  const isValidTarget =
    (c) =>
      targeting &&
      !auto &&
      phase === "select" &&
      c.alive &&
      (
        (
          targeting.type ===
            "heal" ||
          targeting.type ===
            "shield"
        )
          ? c.side ===
            "ally"
          : c.side ===
            "enemy"
      );

  const dominantElement =
    enemies[0]?.element ||
    "Dark";

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${
        screenShake
          ? "screen-shake"
          : ""
      }`}
      data-testid="battle-page"
    >
      {/* Battlefield */}
      <BattlefieldEnv
        element={
          dominantElement
        }
      />

      {/* Battle entry */}
      <BattleEntry
        title={title}
        chapter={
          mode ===
          "campaign"
            ? `CHAPTER ${
                stage?.chapter ||
                "I"
              }`
            : mode ===
                "spire"
              ? `FLOOR ${floor}`
              : mode.toUpperCase()
        }
      />

      {/* Attack effects */}
      <BattleAttackFx
        action={
          cinematicAction
        }
        onShake={(
          strength
        ) => {
          setScreenShake(
            true
          );

          setTimeout(
            () =>
              setScreenShake(
                false
              ),
            strength ===
            "strong"
              ? 500
              : 400
          );
        }}
      />

      {/* Ultimate */}
      <BattleUltimate
        data={
          ultimateData
        }
        onDone={() =>
          setUltimateData(
            null
          )
        }
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 glass border-b border-white/10 px-4 py-1.5 flex items-center justify-between">
        <button
          onClick={() =>
            navigate(backTo)
          }
          data-testid="battle-exit"
          className="text-slate-400 hover:text-white text-sm font-semibold"
        >
          ← Retreat
        </button>

        <div className="text-center">
          <div className="font-display text-lg tracking-widest text-white leading-none truncate max-w-[45vw]">
            {title}
          </div>

          <div className="text-[10px] text-chakra font-semibold">
            ROUND {round}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={
              cycleSpeed
            }
            data-testid="battle-speed-toggle"
            title="Battle speed"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border border-white/15 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
          >
            <Gauge className="w-3.5 h-3.5" />
            {speed}X
          </button>

          <button
            onClick={() =>
              setAuto(
                !auto
              )
            }
            data-testid="battle-auto-toggle"
            title="Auto-battle"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-display tracking-wide border transition-colors ${
              auto
                ? "border-chakra text-chakra bg-cyan-500/15"
                : "border-white/15 text-slate-300 hover:text-white hover:border-white/30"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            AUTO
          </button>

          <button
            title="Settings"
            className="flex items-center px-2 py-1.5 rounded-lg border border-white/15 text-slate-300 hover:text-white hover:border-white/30 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Battlefield */}
      <div className="absolute inset-0 z-10 flex pt-10 pb-36">

        <BattleTurnOrder
          combs={combs}
          order={
            orderRef.current
          }
          ptr={
            ptrRef.current
          }
          className="hidden lg:flex"
        />

        <div className="flex-1 flex flex-col justify-center min-w-0">

          {/* Enemies */}
          <div className="flex justify-center gap-3 sm:gap-5 px-4 mb-3">
            {enemies.map(
              (c) => (
                <BattleFighter
                  key={c.uid}
                  c={c}
                  active={
                    c.uid ===
                    activeUid
                  }
                  shake={
                    shakeUid ===
                    c.uid
                  }
                  floaters={floaters.filter(
                    (f) =>
                      f.uid ===
                      c.uid
                  )}
                  highlight={isValidTarget(
                    c
                  )}
                  onClick={() =>
                    onTargetClick(
                      c
                    )
                  }
                  flip
                  subdued
                />
              )
            )}
          </div>

          {/* SIMPLE TURN INDICATOR — NO CHARACTER NAME */}
          <div className="text-center my-2 min-h-[24px]">
            {phase ===
              "select" &&
              !auto && (
                <span className="text-[10px] uppercase tracking-widest text-chakra font-bold">
                  YOUR TURN
                </span>
              )}

            {phase ===
              "enemy" && (
                <span className="text-[10px] uppercase tracking-widest text-fox font-bold">
                  ENEMY TURN
                </span>
              )}

            {phase ===
              "intro" && (
                <span className="font-display text-2xl tracking-widest text-white animate-pulse">
                  BATTLE START!
                </span>
              )}
          </div>

          {/* Allies */}
          <div className="flex justify-center gap-3 sm:gap-5 px-4 mt-3">
            {allies.map(
              (c) => (
                <BattleFighter
                  key={c.uid}
                  c={c}
                  active={
                    c.uid ===
                    activeUid
                  }
                  shake={
                    shakeUid ===
                    c.uid
                  }
                  floaters={floaters.filter(
                    (f) =>
                      f.uid ===
                      c.uid
                  )}
                  highlight={isValidTarget(
                    c
                  )}
                  onClick={() =>
                    onTargetClick(
                      c
                    )
                  }
                />
              )
            )}
          </div>
        </div>

        <BattleInfoPanel
          log={log}
          enemies={enemies}
          className="hidden lg:flex"
        />
      </div>

      {/* Commands */}
      <BattleCommandPanel
        activeActor={
          activeActor
        }
        phase={phase}
        targeting={
          targeting
        }
        auto={auto}
        onJutsuClick={
          onJutsuClick
        }
      />

      {/* Victory */}
      <BattleVictory
        open={
          phase === "win" ||
          phase === "lose"
        }
        result={
          resultData
        }
        mode={mode}
        floor={floor}
        isWin={
          phase === "win"
        }
        onBack={() =>
          navigate(backTo)
        }
        onNext={
          mode === "spire"
            ? () =>
                window.location.assign(
                  `/battle/spire/${
                    floor + 1
                  }`
                )
            : mode === "trial"
              ? () =>
                  window.location.reload()
              : mode === "arena"
                ? () =>
                    navigate(
                      "/arena"
                    )
                : mode ===
                    "tsukuyomi"
                  ? () =>
                      navigate(
                        "/tsukuyomi"
                      )
                  : () =>
                      navigate("/")
        }
        onLobby={() =>
          navigate("/")
        }
        onRetry={() =>
          window.location.reload()
        }
      />
    </div>
  );
}
